const BSON = require("bson");
const { MessageType } = require("../message");

class CredentialReceiverSocket {
    constructor(socket, server, options, callback) {
        this.socket = socket;
        this.server = server;
        this.options = options;
        this.callback = callback;

        this.socket.on("data", data => {
            let message = BSON.deserialize(data);

            if (message.messageType !== MessageType.LOGIN) {
                this.trace(
                    `Invalid message received from client: "${message.messageType}"`
                        .red
                );
            } else {
                this.trace("Login information received from client.".green);

                // Check if credentials are valid
                let user = this.server.getUser(message.payload.username);

                let credentialsValid =
                    user && user.password === message.payload.password;

                this.socket.write(
                    BSON.serialize({
                        messageType: MessageType.LOGIN_RESPONSE,
                        payload: {
                            success: credentialsValid,
                        },
                    }),
                    () => {
                        this.callback(credentialsValid && user);
                    }
                );
            }
        });
    }

    trace(message) {
        if (this.options.verbose) {
            let now = new Date();
            console.log(
                `[${now.toLocaleString()}][CredentialReceiverSocket]:`.gray,
                message
            );
        }
    }

    close() {
        return this.socket.end();
    }
}

module.exports = {
    CredentialReceiverSocket,
};
