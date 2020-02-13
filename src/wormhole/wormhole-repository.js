const fs = require("fs");

const REPO_FILE = ".wormhole-repo";
const { WormholeClient } = require("./client");

class WormholeRepository {
    constructor(path, settings) {
        this.path = path;
        this.pathToDotFile = path + "/" + REPO_FILE;
        this.settings = settings;
    }

    getName() {
        return this.settings.name;
    }

    read() {
        let data = fs.readFileSync(this.pathToDotFile);
        this.settings = JSON.parse(data);
    }

    write() {
        fs.writeFileSync(
            this.pathToDotFile,
            JSON.stringify(this.settings, null, 2)
        );
    }

    pull(password) {
        return new Promise(async (resolve, reject) => {
            let user = {
                username: this.settings.username,
                password,
            };

            let options = {
                host: this.settings.host,
                port: this.settings.port,
                path: this.path,
                // TODO: Add these options to the repo's dot file or function args
                strictSSL: false,
                verbose: true,
            };

            let client = new WormholeClient(user, options);
            client
                .connect()
                .then(async () => {
                    await client.selectRepository(this.getName());
                    await client.pullFiles();
                    await client.close();
                    resolve(true);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }
}

function openRepository(path = process.cwd()) {
    if (fs.existsSync(path + "/" + REPO_FILE)) {
        let repo = new WormholeRepository(path, {});
        repo.read();
        return repo;
    } else {
        return null;
    }
}

function createRepository(settings, path = process.cwd()) {
    let repo = new WormholeRepository(path, settings);
    repo.write();
}

module.exports = {
    WormholeRepository,
    openRepository,
    createRepository,
};
