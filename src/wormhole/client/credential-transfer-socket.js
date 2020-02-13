const BSON = require("bson");
const { MessageType } = require("../message");

class CredentialTransferSocket {
    constructor(socket, options, callback) {
        this.socket = socket;
        this.options = options;
        this.callback = callback;
    }

    login(username, password) {
        this.setDataHandler(data => {
            let message = BSON.deserialize(data);
            if (message.messageType !== MessageType.LOGIN_RESPONSE) {
                console.error(
                    "Error: Invalid response recieved from server.".red
                );
                this.callback(false);
            } else {
                this.trace("Received login response from server.".green);
                if (message.payload.success) {
                    this.trace("Login was successful.".green);
                    this.callback(true);
                } else {
                    this.trace("Login failed.".red);
                    this.callback(false);
                }
            }

            this.socket.removeAllListeners("data");
        });

        this.socket.write(
            BSON.serialize({
                messageType: MessageType.LOGIN,
                payload: {
                    username,
                    password,
                },
            })
        );
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
                `[${now.toLocaleString()}][CredentialTransferSocket]:`.gray,
                message
            );
        }
    }
}

module.exports = {
    CredentialTransferSocket,
};
