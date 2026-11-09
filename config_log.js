const path = require("path");

module.exports = {
    logDir: path.join(__dirname, "logs"),
    appLog: path.join(__dirname, "logs", "app.log"),
    bannerLog: path.join(__dirname, "logs", "banner.log"),
    messageLog: path.join(__dirname, "logs", "messages.log"),
    colors: {
        reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
        blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", gray: "\x1b[90m"
    }
};
