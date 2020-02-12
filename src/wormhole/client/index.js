const tls = require("tls");
const BSON = require("bson");
const colors = require("colors");
const { MessageType } = require("../message");
const { SyncedFolder } = require("../synced-folder");
const { WormholeSocket } = require("../wormhole-socket");

class WormholeClient {
    constructor(user, options) {
        this.user = user;
        this.options = options;

        // For testing
        //this.syncedFolder = null;
        this.syncedFolder = new SyncedFolder("./client-data");
    }

    trace(message, ignoreVerboseOption = false) {
        if (this.options.verbose || ignoreVerboseOption) {
            let now = new Date();
            console.log(`[${now.toLocaleString()}][WormholeClient]:`.gray, message);
        }
    }

    connect(port, host) {
        if (this.options.strictSSL === false) {
            this.trace("WARNING: strictSSL is set to 'false', this may make you vulnerable to a man-in-the-middle attack!".bgYellow.red, true);
        }

        let options = {
            rejectUnauthorized: this.options.strictSSL, // Strict SSL
        };

        try {
            let tlsSocket = tls.connect(port, host, options);
            this.socket = new WormholeSocket(tlsSocket, {
                verbose: this.options.verbose,
                master: false,
                dataDirectory: this.options.dataDirectory
            });
        } catch (error) {
            if (error.code === "ECONNREFUSED") {
                this.trace(`Connection refused at ${host}:${port}.`.red);
            } else {
                this.trace(`Error occured while connecting: ${error.message}`.red);
            }
        }
    }

    pullFiles() {
        this.trace("Pulling files from server...".cyan);

        this.socket.pullFiles();
    }
}

module.exports = {
    WormholeClient
};