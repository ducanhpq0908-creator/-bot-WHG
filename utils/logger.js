const fs = require("fs");
const path = require("path");
const util = require("util");

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

fs.mkdirSync(LOG_DIR, { recursive: true });

const C = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;221m",
    white: "\x1b[38;5;255m",
    silver: "\x1b[38;5;245m",
    red: "\x1b[38;5;167m",
    green: "\x1b[38;5;114m",
    blue: "\x1b[38;5;110m",
    purple: "\x1b[38;5;183m"
};

const TAGS = {
    INFO:    { label: "INFO",    color: C.white },
    ERROR:   { label: "ERROR",   color: C.red },
    WARN:    { label: "WARNING", color: C.gold },
    CMD:     { label: "COMMAND", color: C.gold },
    MSG_IN:  { label: "INCOMING",color: C.blue },
    MSG_OUT: { label: "OUTGOING",color: C.purple }
};

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_BACKUPS = 5;

const isTTY = Boolean(process.stdout.isTTY) &&
              process.env.NO_COLOR !== "1";

function paint(color, text) {
    return isTTY ? color + text + C.reset : text;
}

function formatMessage(msg) {
    if (msg instanceof Error) {
        return msg.stack || msg.message;
    }

    if (typeof msg === "string") return msg;

    if (msg === undefined) return "undefined";
    if (msg === null) return "null";

    return util.inspect(msg, {
        depth: 5,
        colors: false,
        compact: true,
        breakLength: Infinity
    });
}

function rotateLog() {
    try {
        if (!fs.existsSync(LOG_FILE)) return;

        if (fs.statSync(LOG_FILE).size < MAX_SIZE) return;

        const oldest = LOG_FILE + "." + MAX_BACKUPS;

        if (fs.existsSync(oldest)) {
            fs.unlinkSync(oldest);
        }

        for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
            const src = LOG_FILE + "." + i;
            const dst = LOG_FILE + "." + (i + 1);

            if (fs.existsSync(src)) {
                fs.renameSync(src, dst);
            }
        }

        fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    } catch (err) {
        console.error("[LOGGER] Rotation failed:", err.message);
    }
}

function writeLog(type, msg) {
    const now = new Date();
    const time = now.toLocaleTimeString("vi-VN", {
        hour12: false
    });

    const date = now.toLocaleString("vi-VN", {
        hour12: false
    });

    const message = formatMessage(msg);
    const tag = TAGS[type] || {
        label: type,
        color: C.white
    };

    const clean = message.replace(/\r?\n/g, " | ");

    // Ghi file không có mã màu
    try {
        rotateLog();

        fs.appendFileSync(
            LOG_FILE,
            `[${date}] [${tag.label}] ${clean}\n`,
            "utf8"
        );
    } catch (err) {
        process.stderr.write(
            "[LOGGER] File error: " + err.message + "\n"
        );
    }

    // Terminal Luxury
    const prefix = paint(C.silver, time);
    const label = paint(tag.color, "◆ " + tag.label.padEnd(9));

    console.log(
        "  " + prefix +
        "  " + label +
        "  " + message
    );
}

module.exports = {
    info: msg => writeLog("INFO", msg),
    error: msg => writeLog("ERROR", msg),
    warn: msg => writeLog("WARN", msg),
    cmd: msg => writeLog("CMD", msg),
    msgIn: msg => writeLog("MSG_IN", msg),
    msgOut: msg => writeLog("MSG_OUT", msg),

    log: (msg) => writeLog("INFO", msg),

    getLogPath: () => LOG_FILE
};
