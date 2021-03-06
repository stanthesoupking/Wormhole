const fs = require("fs");
const BSON = require("bson");
const { MessageType } = require("./message");
const { SyncedFolder } = require("./synced-folder");
const { getRepositoryInfo } = require("./server/repository-info");

function WormholeSocketDefaultDataHandler(data) {
    let message = BSON.deserialize(data);
    this.trace(
        `Recieved message from ${this.clientName}: ${JSON.stringify(message)}`
            .green
    );

    if (this.selectedRepository === null && this.options.master) {
        switch (message.messageType) {
            case MessageType.SELECT_REPOSITORY:
                this.selectRepository(message.payload.name);
                break;
            default:
                this.trace(
                    `Unhandled message(no repo selected) receieved from ${this.clientName}:'${message.messageType}'.`
                        .red
                );
        }
    } else {
        switch (message.messageType) {
            case MessageType.PULL_FINISHED:
                this.onPushComplete(message.payload.version);
                break;
            case MessageType.REQUEST_PULL:
                if (message.payload.version < this.repoInfo.getVersion()) {
                    console.error("Client is out of date and must pull");
                } else {
                    this.pullFiles();
                }
                break;
            case MessageType.FETCH_FOLDER_LIST:
                this.pushFolderList();
                break;
            case MessageType.FETCH_FILE_LIST:
                this.pushFileList();
                break;
            case MessageType.FETCH_FILE_INFO:
                this.pushFileInfo(message.payload.path);
                break;
            case MessageType.FETCH_FILE_DATA:
                this.pushFileData(message.payload.path);
                break;
            default:
                this.trace(
                    `Unhandled message receieved from ${this.clientName}:'${message.messageType}'.`
                        .red
                );
        }
    }
}

class WormholeSocket {
    constructor(socket, options) {
        this.socket = socket;
        this.user = options.user;
        this.options = options;
        this.setDataHandler(WormholeSocketDefaultDataHandler);
        this.options.blockSize = 16384;

        this.selectedRepository = null;
        this.syncedFolder = null;
        this.repoInfo = null;
        this.onPullComplete = () => {};
        this.onPushComplete = () => {};

        if (this.options.master) {
            this.socket.setMaxSendFragment(this.options.blockSize);
            this.clientName = `Client(${socket.remoteAddress}:${socket.remotePort})`;
        } else {
            this.clientName = `Server`;
        }

        this.trace(`${this.clientName} connected.`.yellow);

        this.socket.on("close", () => {
            this.trace(`${this.clientName} disconnected.`.red);
        });
    }

    setDataHandler(handler) {
        this.dataHandler = handler.bind(this);
        this.socket.removeAllListeners("data");
        this.socket.on("data", this.dataHandler);
    }

    trace(message) {
        if (this.options.verbose) {
            let now = new Date();
            console.log(
                `[${now.toLocaleString()}][WormholeSocket]:`.gray,
                message
            );
        }
    }

    selectRepository(repositoryName) {
        if (this.options.master) {
            return new Promise((resolve, reject) => {
                this.trace(
                    `Selecting repository '${repositoryName}' from client.`.cyan
                );

                let repoFolder =
                    this.user.baseDataDirectory + "/" + repositoryName;

                this.selectedRepository = repositoryName;
                this.syncedFolder = new SyncedFolder(repoFolder, [
                    ".wormhole-repo",
                ]);
                this.repoInfo = getRepositoryInfo(repoFolder);

                this.socket.write(
                    BSON.serialize({
                        messageType: MessageType.SELECT_REPOSITORY_RESPONSE,
                        payload: {
                            success: true,
                            name: repositoryName,
                            version: this.repoInfo.getVersion(),
                        },
                    })
                );
            });
        } else {
            return new Promise((resolve, reject) => {
                this.trace(
                    `Selecting repository '${repositoryName}' on server.`.cyan
                );

                this.setDataHandler(data => {
                    let message = BSON.deserialize(data);

                    this.setDataHandler(WormholeSocketDefaultDataHandler);

                    switch (message.messageType) {
                        case MessageType.SELECT_REPOSITORY_RESPONSE:
                            if (message.payload.success) {
                                this.trace(
                                    `Selected repository '${message.payload.name}'.`
                                        .green
                                );
                                this.selectedRepository = repositoryName;
                                this.selectedRepositoryVersion =
                                    message.payload.version;
                                this.syncedFolder = new SyncedFolder(
                                    process.cwd(),
                                    ".wormhole-repo"
                                );
                                resolve();
                            } else {
                                reject();
                                this.trace(`Failed selecting repository.`.red);
                            }
                            break;
                        default:
                            this.trace(
                                `Unhandled message(no repo selected) receieved from ${this.clientName}:'${message.messageType}'.`
                                    .red
                            );
                            reject();
                    }
                });

                this.socket.write(
                    BSON.serialize({
                        messageType: MessageType.SELECT_REPOSITORY,
                        payload: {
                            name: repositoryName,
                        },
                    })
                );
            });
        }
    }

    pullFiles() {
        return new Promise((resolve, reject) => {
            this.onPullComplete = () => {
                // Increment repo version
                if (this.options.master) {
                    this.repoInfo.setVersion(this.repoInfo.getVersion() + 1);
                }

                this.socket.write(
                    BSON.serialize({
                        messageType: MessageType.PULL_FINISHED,
                        payload: {
                            version: this.options.master
                                ? this.repoInfo.getVersion()
                                : null,
                        },
                    }),
                    () => {
                        resolve(
                            this.options.master
                                ? true
                                : this.selectedRepositoryVersion
                        );
                    }
                );

                this.onPullComplete = () => {};
            };

            this.trace(`Fetching folder list from ${this.clientName}.`.cyan);
            this.socket.write(
                BSON.serialize({
                    messageType: MessageType.FETCH_FOLDER_LIST,
                })
            );

            // Set data handler to handle response
            this.setDataHandler(data => {
                let message = BSON.deserialize(data);

                if (
                    message.messageType !==
                    MessageType.FETCH_FOLDER_LIST_RESPONSE
                ) {
                    this.trace(
                        `Failed fetching folder list from ${this.clientName}.`
                            .red
                    );
                    this.setDataHandler(WormholeSocketDefaultDataHandler);
                } else {
                    this.trace(
                        `Recieved folder list from ${this.clientName}.`.green
                    );
                    this.syncedFolder.applyFolderList(
                        message.payload.folderList
                    );

                    this.trace(
                        `Fetching file list from ${this.clientName}.`.cyan
                    );

                    this.socket.write(
                        BSON.serialize({
                            messageType: MessageType.FETCH_FILE_LIST,
                        })
                    );

                    this.setDataHandler(data => {
                        let message = BSON.deserialize(data);

                        let buffer = Buffer.alloc(message.payload.size);
                        let currentBlock = 0;
                        let totalBlocks = Math.ceil(message.payload.size / message.payload.blockSize);
                        let blockSize = message.payload.blockSize;
                        this.setDataHandler(data => {
                            currentBlock += 1;
                            data.copy(buffer, blockSize * (currentBlock - 1));
                            if (currentBlock === totalBlocks) {
                                let message = BSON.deserialize(buffer);

                                if (
                                    message.messageType !==
                                    MessageType.FETCH_FILE_LIST_RESPONSE
                                ) {
                                    console.log(message);
                                    this.trace(
                                        `Failed fetching file list from ${this.clientName}.`
                                            .red
                                    );
                                    this.setDataHandler(
                                        WormholeSocketDefaultDataHandler
                                    );
                                } else {
                                    this.trace(
                                        `Recieved file list from ${this.clientName}.`
                                            .green
                                    );
                                    this.setDataHandler(
                                        WormholeSocketDefaultDataHandler
                                    );

                                    // Remove files not in list
                                    let toRemove = Object.keys(
                                        this.syncedFolder.getFileList()
                                    ).filter(
                                        file => message.payload.fileList[file] == null
                                    );

                                    this.syncedFolder.removeFiles(toRemove);

                                    let toFetch = [];

                                    for (let relativePath of Object.keys(
                                        message.payload.fileList
                                    )) {
                                        let clientFile =
                                            message.payload.fileList[relativePath];
                                        let existingFile = this.syncedFolder.getFile(
                                            relativePath
                                        );

                                        new Date().toLocaleString();
                                        if (existingFile != null) {
                                            // Replace file if old one already exists
                                            if (
                                                existingFile.modificationTime.getTime() !==
                                                clientFile.modificationTime.getTime() ||
                                                existingFile.size !== clientFile.size
                                            ) {
                                                this.syncedFolder.removeFile(
                                                    relativePath
                                                );
                                                this.syncedFolder.addFile(
                                                    relativePath,
                                                    clientFile
                                                );
                                                toFetch.push(relativePath);
                                            }
                                        } else {
                                            toFetch.push(relativePath);
                                            this.syncedFolder.addFile(
                                                relativePath,
                                                clientFile
                                            );
                                        }
                                    }

                                    if (toFetch.length === 0) {
                                        this.onPullComplete();
                                    }

                                    let fetchNextFileInfo = () => {
                                        if (toFetch.length > 0) {
                                            let currentFile = toFetch.pop();
                                            this.trace(
                                                `Fetching file info for '${currentFile}'.`
                                                    .cyan
                                            );
                                            this.socket.write(
                                                BSON.serialize({
                                                    messageType:
                                                        MessageType.FETCH_FILE_INFO,
                                                    payload: {
                                                        path: currentFile,
                                                    },
                                                })
                                            );

                                            this.setDataHandler(fetchInfoHandler);
                                        } else {
                                            this.onPullComplete();
                                            this.setDataHandler(
                                                WormholeSocketDefaultDataHandler
                                            );
                                            //resolve(true);
                                        }
                                    };

                                    let state = {};
                                    let fetchFileDataHandler = data => {
                                        this.syncedFolder.appendToFile(
                                            state.currentFile,
                                            state.fd,
                                            data
                                        );

                                        state.currentBlock += 1;

                                        if (state.currentBlock >= state.totalBlocks) {
                                            this.trace(
                                                `All blocks recieved for file '${state.currentFile}'.`
                                                    .green
                                            );
                                            this.syncedFolder.closeFile(
                                                state.currentFile,
                                                state.fd
                                            );
                                            this.syncedFolder.correctModificationTime(
                                                state.currentFile
                                            );
                                            fetchNextFileInfo();
                                        }
                                    };

                                    let fetchInfoHandler = data => {
                                        let message = BSON.deserialize(data);

                                        if (
                                            message.messageType !==
                                            MessageType.FETCH_FILE_INFO_RESPONSE
                                        ) {
                                            this.trace(
                                                `Failed fetching file info from ${this.clientName}.`
                                                    .red
                                            );
                                            this.setDataHandler(
                                                WormholeSocketDefaultDataHandler
                                            );
                                        } else {
                                            this.trace(
                                                `Recieved file info for '${message.payload.path}' from ${this.clientName}.`
                                                    .green
                                            );

                                            this.trace(
                                                `Fetching file data for '${message.payload.path}' from ${this.clientName}`
                                                    .cyan
                                            );

                                            state = {
                                                currentBlock: 0,
                                                totalBlocks:
                                                    message.payload.stats.blockCount,
                                                currentFile: message.payload.path,
                                                fd: this.syncedFolder.openFile(
                                                    message.payload.path,
                                                    "a"
                                                ),
                                            };

                                            this.setDataHandler(fetchFileDataHandler);

                                            this.socket.write(
                                                BSON.serialize({
                                                    messageType:
                                                        MessageType.FETCH_FILE_DATA,
                                                    payload: {
                                                        path: message.payload.path,
                                                    },
                                                })
                                            );
                                        }
                                    };

                                    fetchNextFileInfo();
                                }
                            }
                        });
                    });
                }
            });
        });
    }

    pushFiles(currentVersion) {
        return new Promise((resolve, reject) => {
            this.onPushComplete = version => {
                this.onPushComplete = () => {};
                resolve(version);
            };

            this.socket.write(
                BSON.serialize({
                    messageType: MessageType.REQUEST_PULL,
                    payload: {
                        version: currentVersion,
                    },
                })
            );
        });
    }

    pushFolderList() {
        this.trace(`Pushing folder list to ${this.clientName}.`.cyan);
        this.socket.write(
            BSON.serialize({
                messageType: MessageType.FETCH_FOLDER_LIST_RESPONSE,
                payload: {
                    folderList: this.syncedFolder.getFolderList(),
                },
            })
        );
    }

    pushFileList() {
        this.trace(`Pushing file list to ${this.clientName}.`.cyan);
        let message = BSON.serialize({
            messageType: MessageType.FETCH_FILE_LIST_RESPONSE,
            payload: {
                fileList: this.syncedFolder.getFileList(),
            },
        });

        this.socket.write(
            BSON.serialize({
                payload: {
                    size: message.byteLength,
                    blockSize: this.options.blockSize
                }
            })
        );

        this.socket.write(message);
    }

    pushFileInfo(path) {
        this.trace(
            `Pushing info for file '${path}' to ${this.clientName}.`.cyan
        );

        let file = this.syncedFolder.getFile(path);

        this.socket.write(
            BSON.serialize({
                messageType: MessageType.FETCH_FILE_INFO_RESPONSE,
                payload: {
                    path,
                    stats: {
                        ...file,
                        blockCount: Math.ceil(
                            file.size / this.options.blockSize
                        ),
                        blockSize: this.options.blockSize,
                    },
                },
            })
        );
    }

    pushFileData(path) {
        this.trace(
            `Pushing data for file '${path}' to ${this.clientName}.`.cyan
        );

        let file = this.syncedFolder.getFile(path);
        let fd = this.syncedFolder.openFile(path, "r");

        for (let pos = 0; pos < file.size; pos += this.options.blockSize) {
            let buffer = Buffer.alloc(this.options.blockSize);
            let bytesRead = fs.readSync(
                fd,
                buffer,
                0,
                this.options.blockSize,
                pos
            );

            // TODO: Only shrink buffer if needed

            let shrunkBuffer = Buffer.alloc(bytesRead);
            buffer.copy(shrunkBuffer, 0, 0, bytesRead);

            this.socket.write(shrunkBuffer);
        }

        this.syncedFolder.closeFile(path, fd);
    }

    close() {
        return new Promise((resolve, reject) => {
            this.socket.end(() => resolve(true));
        });
    }
}

module.exports = {
    WormholeSocket,
};
