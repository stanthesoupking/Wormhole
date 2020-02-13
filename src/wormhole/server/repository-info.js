const fs = require("fs");
const path = require("path");

const repositoryInfoFile = ".wormhole-repo";

class RepositoryInfo {
    constructor(path, settings) {
        this.path = path;
        this.settings = settings;
    }

    getVersion() {
        return this.settings.version;
    }

    setVersion(version) {
        this.settings.version = version;
        this.write();
    }

    read() {
        let data = fs.readFileSync(this.path);
        this.settings = JSON.parse(data);
    }

    write() {
        fs.writeFileSync(
            this.path,
            JSON.stringify(this.settings, null, 2)
        );
    }
}

function getRepositoryInfo(repoPath) {
    let infoPath = path.join(repoPath, repositoryInfoFile);

    if (fs.existsSync(infoPath)) {
        let repo = new RepositoryInfo(infoPath, null);
        repo.read();
        return repo;
    } else {
        let repo = new RepositoryInfo(infoPath, {
            version: 1
        });

        return repo;
    }
}

module.exports = {
    getRepositoryInfo
};