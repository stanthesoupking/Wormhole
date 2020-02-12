const { WormholeClient } = require("./wormhole");
const { readConfig } = require("./wormhole/client/config");

let config = null;
try {
    config = readConfig("./client-config.json");
} catch (error) {
    console.error("Failed reading client-config.json:\n", error.message);
    return 1;
}

// Check if data directory was supplied
if (config.dataDirectory == null) {
    console.error("Error: No data directory was supplied in 'client-config.json'.");
    return 1;
}

const client = new WormholeClient({
    username: config.username, password: config.password
}, {
    verbose: config.verbose,
    strictSSL: config.strictSSL,
    syncInterval: config.syncInterval,
    dataDirectory: config.dataDirectory,
});

client.connect(config.port, config.host);
client.pullFiles();