# Wormhole
***WARNING: This project is a work in progress and should not be used with data that you care about. Use at your own risk.***

A file syncing solution that allows for files to be synced between computers over a network using basic `push` and `pull` commands.

# Installation
First make sure that you have Node.js (at least version 12.16) installed and the latest version of Yarn.

Before starting either the client or server you must first run:
```bash
yarn install
yarn link
```

After these commands have finished you will be able to run `wormhole` and `wormhole-server` from the terminal.

## Client Usage
### Creating a new repository
Run the following commands inside the folder that you want to turn into a repository:
```bash
wormhole init
wormhole push
```

### Pulling an existing repository
Run the following commands inside an empty folder to pull an existing repository:
```bash
wormhole init
wormhole pull
```

## Server Usage
Configuration options for the server can be found inside the `server-config.json` file in the project's root directory. Here you can configure the following options:
* users - User accounts stored on the server
    - username, password - Credentails for the user account
    - baseDataDirectory - The base directory that user repos will be stored inside.
* verbose - Should the server log actions taking place?
* key, cert - Paths to the SSL private key and certificate to be used
* host, port - The host address and port number that the server should listen for incoming connections on
* blockSize - The size of blocks to use when transferring files to clients

### TLS Certificates
Wormhole uses TLS to mitigate man-in-the-middle attacks. You must set the path to your private key and certificate in `server-config.json`. For a guide on how to create self-signed certificates [click here](https://nodejs.org/api/tls.html#tls_tls_ssl_concepts).



### Starting the Server
```bash
wormhole-server
```