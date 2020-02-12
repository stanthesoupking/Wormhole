const { createServer } = require("tls");
const fs = require("fs");
const colors = require("colors");
const { WormholeSocket } = require("../wormhole-socket");

class WormholeServer {
    constructor(users, options = {}) {
        this.options = options;

        // Generate user map for faster access times
        this.trace("Generating user map.");
        this.users = {};
        for (let user of users) {
            if (this.users[user.username] == null) {
                this.users[user.username] = user;
            } else {
                this.trace(`Warning: Duplicate user entry: ${user.username}`.yellow);
            }
        }

        this.onConnect = this.onConnect.bind(this);

        this.server = createServer({
            key: fs.readFileSync(this.options.key),
            cert: fs.readFileSync(this.options.cert),
        }, this.onConnect);
    }

    trace(message) {
        if (this.options.verbose) {
            let now = new Date();
            console.log(`[${now.toLocaleString()}][WormholeServer]:`.gray, message);
        }
    }

    listen(port, host) {
        this.server.listen(port, host)
        this.trace(`Listening on ${host}:${port}.`)
    }

    onConnect(socket) {
        let wormholeSocket = new WormholeSocket(socket, {
            blockSize: this.options.blockSize,
            verbose: this.options.verbose,
            master: true,
            dataDirectory: this.options.dataDirectory
        });
    }

    getUser(username) {
        return this.users[username];
    }
}

module.exports = { WormholeServer };