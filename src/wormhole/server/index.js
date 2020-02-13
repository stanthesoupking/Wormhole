const { createServer } = require("tls");
const colors = require("colors");
const fs = require("fs");
const { WormholeSocket } = require("../wormhole-socket");
const { CredentialReceiverSocket } = require("./credential-receiver-socket");

class WormholeServer {
    constructor(users, options = {}) {
        this.options = options;

        // May not need this
        // this.database = new Database();

        // Generate user map for faster access times
        this.trace("Generating user map.");
        this.users = {};
        for (let user of users) {
            if (this.users[user.username] == null) {
                this.users[user.username] = user;
            } else {
                this.trace(
                    `Warning: Duplicate user entry: ${user.username}`.yellow
                );
            }
        }

        this.onConnect = this.onConnect.bind(this);

        this.server = createServer(
            {
                key: fs.readFileSync(this.options.key),
                cert: fs.readFileSync(this.options.cert),
            },
            this.onConnect
        );
    }

    trace(message) {
        if (this.options.verbose) {
            let now = new Date();
            console.log(
                `[${now.toLocaleString()}][WormholeServer]:`.gray,
                message
            );
        }
    }

    listen(port, host) {
        this.server.listen(port, host);
        this.trace(`Listening on ${host}:${port}.`);
    }

    onConnect(socket) {
        // Start connection as credential receiver socket
        let credSocket = new CredentialReceiverSocket(
            socket,
            this,
            {
                verbose: this.options.verbose,
            },
            async user => {
                if (user) {
                    this.trace(
                        `Valid credentials received for user '${user.username}'.`
                            .green
                    );
                    let wormholeSocket = new WormholeSocket(socket, {
                        blockSize: this.options.blockSize,
                        verbose: this.options.verbose,
                        master: true,
                        user,
                        path: "test",
                    });
                } else {
                    this.trace(`Invalid credentials received.`.red);
                    await credSocket.close();
                }
            }
        );
    }

    getUser(username) {
        return this.users[username];
    }
}

module.exports = { WormholeServer };
