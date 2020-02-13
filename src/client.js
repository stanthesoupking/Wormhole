#!/usr/bin/env node

const { ArgumentParser } = require("argparse");
const constants = require("./wormhole/constants");
const os = require("os");
const path = require("path");
const readline = require("readline");
const {
    createRepository,
    openRepository,
} = require("./wormhole/wormhole-repository");
const Writable = require("stream").Writable;

const mutableStdout = new Writable({
    write: function (chunk, encoding, callback) {
        if (!this.muted) process.stdout.write(chunk, encoding);
        callback();
    },
});

const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
});

const parser = new ArgumentParser({
    version: constants.WORMHOLE_VERSION,
    addHelp: true,
    description: `Wormhole client version ${constants.WORMHOLE_VERSION}`,
});

parser.addArgument("command", {
    choices: ["init", "pull", "push"],
    help: "Command to perform",
});

const args = parser.parseArgs();

switch (args.command) {
    case "init":
        initRepo();
        break;
    case "pull":
        pullRepo();
        break;
    case "push":
        pushRepo();
        break;
}

function passwordPrompt() {
    return new Promise((resolve, reject) => {
        rl.question("Password: ", password => {
            mutableStdout.muted = false; // Unmute terminal output
            console.log(); // Insert newline after password
            resolve(password);
        });
        mutableStdout.muted = true;
    });
}

function initRepo() {
    // Check if a repository already exists in this folder
    let existingRepo = openRepository();
    if (existingRepo != null) {
        console.error(
            `Error: A repository(${existingRepo.getName()}) already exists in this folder.`
                .red
        );
        process.exit(1);
    }

    // Generate repository file
    console.log("Initialising a new repository.");

    // Get name of current folder
    let repoName = path.basename(process.cwd());

    rl.question(`name (${repoName}): `, answer => {
        answer = answer.trim();
        if (answer.length !== 0) {
            repoName = answer;
        }

        let repoHost = "localhost";
        rl.question(`host-address (${repoHost}): `, answer => {
            answer = answer.trim();
            if (answer.length !== 0) {
                repoHost = answer;
            }

            let repoPort = constants.WORMHOLE_DEFAULT_PORT;
            rl.question(`port (${repoPort}): `, answer => {
                answer = answer.trim();
                if (answer.length !== 0) {
                    repoPort = answer;
                }

                let repoUsername = os.userInfo().username;
                rl.question(`username (${repoUsername}): `, answer => {
                    answer = answer.trim();
                    if (answer.length !== 0) {
                        repoUsername = answer;
                    }

                    createRepository({
                        name: repoName,
                        host: repoHost,
                        port: repoPort,
                        username: repoUsername,
                    });

                    rl.close();

                    console.log(
                        "Repository initialised, to push to server run 'wormhole push'."
                            .green
                    );
                });
            });
        });
    });
}

async function pullRepo() {
    let repo = openRepository();
    if (!repo) {
        console.error(
            "Error: No existing repository was found in this folder.".red
        );
        console.error(
            "  To initialise a repository in this folder run 'wormhole init'"
                .red
        );
        exit(1);
    }

    let password = await passwordPrompt();

    console.log("Pulling from server...".cyan);
    repo.pull(password)
        .then(() => {
            console.log("Pull complete, now on version ".green + `${repo.getVersion().toString()}`.yellow + ".".green);
            process.exit(0);
        })
        .catch(error => {
            console.error(`Error: ${error.message}.`.red);
            process.exit(1);
        });
}

async function pushRepo() {
    let repo = openRepository();
    if (!repo) {
        console.error(
            "Error: No existing repository was found in this folder.".red
        );
        console.error(
            "  To initialise a repository in this folder run 'wormhole init'"
                .red
        );
        exit(1);
    }

    let password = await passwordPrompt();

    console.log("Pushing to server...".cyan);
    repo.push(password)
        .then(() => {
            console.log("Push complete, now on version ".green + `${repo.getVersion().toString()}`.yellow + ".".green);
            process.exit(0);
        })
        .catch(error => {
            console.error(`Error: ${error.message}.`.red);
            process.exit(1);
        });
}
