#!/usr/bin/env node

const { WormholeServer } = require("./wormhole");
const { readConfig } = require("./wormhole/server/config");

let config = null;
try {
    config = readConfig("./server-config.json");
} catch (error) {
    console.error("Failed reading server-config.json:\n", error.message);
    return 1;
}

const server = new WormholeServer(config.users, {
    verbose: config.verbose,
    key: config.key,
    cert: config.cert,
    blockSize: config.blockSize,
    dataDirectory: "./server-data",
});

server.listen(config.port, config.host);
