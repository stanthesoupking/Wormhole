const tls = require("tls");
const colors = require("colors");
const { WormholeSocket } = require("../wormhole-socket");
const { CredentialTransferSocket } = require("./credential-transfer-socket");

class WormholeClient {
    constructor(user, options) {
        this.user = user;
        this.options = options;
        this.signedIn = false;
    }

    trace(message, ignoreVerboseOption = false) {
        if (this.options.verbose || ignoreVerboseOption) {
            let now = new Date();
            console.log(
                `[${now.toLocaleString()}][WormholeClient]:`.gray,
                message
            );
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.options.strictSSL === false) {
                this.trace(
                    "WARNING: strictSSL is set to 'false', this may make you vulnerable to a man-in-the-middle attack!"
                        .bgYellow.red,
                    true
                );
            }

            let options = {
                rejectUnauthorized: this.options.strictSSL, // Strict SSL
            };

            try {
                this.signedIn = false;
                let tlsSocket = tls.connect(
                    this.options.port,
                    this.options.host,
                    options
                );

                // Start as credential transfer socket
                let credSocket = new CredentialTransferSocket(
                    tlsSocket,
                    {
                        verbose: this.options.verbose,
                    },
                    signedIn => {
                        // Upgrade to wormhole socket upon sign-in success
                        if (signedIn) {
                            this.socket = new WormholeSocket(tlsSocket, {
                                verbose: this.options.verbose,
                                path: this.options.path,
                                master: false,
                            });
                            this.signedIn = true;
                            resolve();
                        } else {
                            reject(Error("Sign in failed"));
                        }
                    }
                );

                credSocket.login(this.user.username, this.user.password);
            } catch (error) {
                if (error.code === "ECONNREFUSED") {
                    this.trace(`Connection refused at ${host}:${port}.`.red);
                } else {
                    this.trace(
                        `Error occured while connecting: ${error.message}`.red
                    );
                }
                reject(error);
            }
        });
    }

    selectRepository(name) {
        return this.socket.selectRepository(name);
    }

    pullFiles() {
        if (this.signedIn) {
            this.trace("Pulling files from server...".cyan);
            return this.socket.pullFiles();
        } else {
            throw Error("Cannot pull from server when not signed in.");
        }
    }

    close() {
        if (this.signedIn) {
            return this.socket.close();
        }
    }
}

module.exports = {
    WormholeClient,
};
