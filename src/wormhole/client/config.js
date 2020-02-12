const fs = require("fs");

const defaultConfig = {
    username: null,
    password: null,
    host: "localhost",
    port: 8585,
    verbose: false,
    strictSSL: true,
    syncInterval: 1000,
    dataDirectory: null
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