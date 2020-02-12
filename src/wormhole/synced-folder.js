const fs = require("fs");

class SyncedFolder {
    constructor(path) {
        this.path = path;
        this.fileList = null;
        this.folderList = null;

        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.path);
        }

        this.loadInitialData();
    }

    loadInitialData() {
        this.fileList = {};
        this.folderList = {};

        let { files, folders } = this.listItems();

        for (let folder of folders) {
            this.folderList[folder] = true;
        }

        for (let file of files) {
            this.fileList[file.path] = {
                modificationTime: file.stats.mtime,
                size: file.stats.size
            }
        }
    }

    listItems(path = null) {
        let list = {
            files: [],
            folders: []
        };

        let aPath = this.path;
        if (path !== null) {
            aPath += "/" + path;
        }

        let items = fs.readdirSync(aPath, { withFileTypes: true });
        for (let item of items) {
            let filePath = `${aPath}/${item.name}`;

            let relativeFilePath = item.name;
            if (path !== null) {
                relativeFilePath = `${path}/${item.name}`;
            }

            if (item.isDirectory()) {
                list.folders.push(relativeFilePath);

                let merge = this.listItems(relativeFilePath);
                list.files = list.files.concat(merge.files);
                list.folders = list.folders.concat(merge.folders);
            } else {
                let fileStats = fs.statSync(filePath);

                list.files.push({
                    path: relativeFilePath,
                    stats: fileStats
                });
            }
        }

        return list;
    }

    getFileList() {
        return this.fileList;
    }

    getFolderList() {
        return this.folderList;
    }

    convertRelativePath(relativePath) {
        return this.path + "/" + relativePath;
    }

    applyFolderList(newFolderList) {
        // Create missing folders
        Object.keys(newFolderList).forEach((relativePath) => {
            if (this.folderList[relativePath] == null) {
                fs.mkdirSync(this.convertRelativePath(relativePath), {
                    recursive: true
                });
            }
        });

        // Delete existing folders
        Object.keys(this.folderList).forEach((relativePath) => {
            if (newFolderList[relativePath] == null) {
                fs.rmdirSync(this.convertRelativePath(relativePath), {
                    recursive: true
                });
            }
        });

        this.folderList = newFolderList;
    }

    removeFile(relativePath) {
        if (this.fileList[relativePath]) {
            fs.unlinkSync(this.convertRelativePath(relativePath))
            delete this.fileList[relativePath];
        }
    }

    removeFiles(files) {
        for (let relativePath of files) {
            let path = this.convertRelativePath(relativePath);
            if (fs.existsSync(path)) {
                fs.unlinkSync(path);
            }
            delete this.fileList[relativePath];
        }
    }

    getFile(relativePath) {
        return this.fileList[relativePath];
    }

    addFile(relativePath, stats) {
        if (this.fileList[relativePath] == null) {
            let path = this.convertRelativePath(relativePath);
            fs.writeFileSync(path, "", {
                flag: "w"
            });
            fs.utimesSync(path, stats.modificationTime, stats.modificationTime);
            this.fileList[relativePath] = stats;
        }
    }

    openFile(relativePath, flags) {
        return fs.openSync(this.convertRelativePath(relativePath), flags);
    }

    closeFile(relativePath, fd) {
        fs.closeSync(fd);
    }

    appendToFile(relativePath, fd, buffer) {
        fs.writeSync(fd, buffer, 0, buffer.length);
    }

    correctModificationTime(relativePath) {
        let file = this.getFile(relativePath);
        
        fs.utimesSync(this.convertRelativePath(relativePath), file.modificationTime, file.modificationTime);
    }
}

module.exports = {
    SyncedFolder
};