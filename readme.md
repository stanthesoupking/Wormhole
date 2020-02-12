# Wormhole
***WARNING: This project is a work in progress and should not be used with data that you care about. Use at your own risk.***

A simple file syncing solution that allows for files to be synced between computers over a network using basic `push` and `pull` commands.

# Getting started
First make sure that you have Node.js (at least version 12.16) installed and the latest version of Yarn.

Before starting either the client or server you must first run:
```bash
yarn install
```

## Client Setup
Configuration options for the client can be found inside the `client-config.json` file in the project's root directory. Here you can configure the following options:
* username, password - The credentials used to gain access the server
* dataDirectory - Directory to sync with the server
* strictSSL - Should the program not allow connections to unauthorised SSL certificates?
* verbose - Should the client log actions taking place?

### Starting the Client
```bash
yarn start-client
```

## Server Setup
Configuration options for the server can be found inside the `server-config.json` file in the project's root directory. Here you can configure the following options:
* users - User accounts stored on the server
    - username, password - Credentails for the user account
    - dataDirectory - Directory to sync with the user
* verbose - Should the server log actions taking place?
* key, cert - Paths to the SSL private key and certificate to be used
* host, port - The host address and port number that the server should listen for incoming connections on
* blockSize - The size of blocks to use when transferring files to clients

### TLS Certificates
Wormhole uses TLS to mitigate man-in-the-middle attacks. You must set the path to your private key and certificate in `server-config.json`. For a guide on how to create self-signed certificates [click here](https://nodejs.org/api/tls.html#tls_tls_ssl_concepts).



### Starting the Client
```bash
yarn start-server
```