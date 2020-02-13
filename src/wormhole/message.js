const MessageType = {
    LOGIN: "LOGIN",
    LOGIN_RESPONSE: "LOGIN_RESPONSE",
    GET_REPOSITORY_INFO: "GET_REPOSITORY_INFO",
    GET_REPOSITORY_INFO_RESPONSE: "GET_REPOSITORY_INFO_RESPONSE",
    SELECT_REPOSITORY: "SELECT_REPOSITORY",
    SELECT_REPOSITORY_RESPONSE: "SELECT_REPOSITORY_RESPONSE",
    REQUEST_PULL: "REQUEST_PULL",
    PULL_FINISHED: "PULL_FINISHED",
    FETCH_FILE_INFO: "FETCH_FILE_INFO",
    FETCH_FILE_INFO_RESPONSE: "FETCH_FILE_INFO_RESPONSE",
    FETCH_FILE_DATA: "FETCH_FILE_DATA",
    FETCH_FOLDER_LIST: "FETCH_FOLDER_LIST",
    FETCH_FOLDER_LIST_RESPONSE: "FETCH_FOLDER_LIST_RESPONSE",
    FETCH_FILE_LIST: "FETCH_FILE_LIST",
    FETCH_FILE_LIST_RESPONSE: "FETCH_FILE_LIST_RESPONSE",
};

const MessageStatus = {
    SUCCESS: "SUCCESS",
    FAILURE: "FAILURE",
    RECEIVED: "RECEIVED",
};

module.exports = {
    MessageType,
    MessageStatus,
};
