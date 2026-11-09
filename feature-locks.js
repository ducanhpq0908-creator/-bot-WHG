const fs = require("fs");
const path = require("path");

const LOCK_FILE = path.join(__dirname, "data", "feature_locks.json");

function readLocks() {
    try {
        const value = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
        return {
            all: value.all === true,
            features: value.features && typeof value.features === "object"
                ? value.features : {}
        };
    } catch (_) {
        return { all: false, features: {} };
    }
}

function saveLocks(value) {
    const dir = path.dirname(LOCK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCK_FILE, JSON.stringify(value, null, 2) + "\n");
}

function isFeatureLocked(name) {
    const state = readLocks();
    return state.all || state.features[String(name).toLowerCase()] === true;
}

module.exports = { readLocks, saveLocks, isFeatureLocked };
