const fs = require("fs");

const defaultConfig = {
    host: "localhost",
    port: "8585",
    users: [],
    verbose: false,
    key: "private-key.pem",
    cert: "public-cert.pem",
    blockSize: 16384
};

function readConfig(path) {
    // Read config file
    let userConfig = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));

    // Merge with default config
    let config = {};
    for (let key of Object.keys(defaultConfig)) {
        if (userConfig[key] != null) {
            config[key] = userConfig[key];
        } else {
            config[key] = defaultConfig[key];
        }
    }

    return config;
}

module.exports = {
    readConfig
};