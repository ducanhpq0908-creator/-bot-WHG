const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "blocked.json");

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, "utf8")).map(String); }
    catch (e) { return []; }
}

function save(list) {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

// Lấy danh sách UID được tag trong tin nhắn; nếu không tag thì thử lấy số từ args
function getTargets(message, args) {
    const uids = [];
    const mentions = (message.data && message.data.mentions) || [];
    for (const m of mentions) {
        if (m && m.uid) uids.push(String(m.uid));
    }
    for (const a of args || []) {
        if (/^\d{5,}$/.test(a)) uids.push(a);
    }
    return [...new Set(uids)];
}

module.exports = {
    list: () => load(),
    isBlocked: (uid) => load().includes(String(uid)),
    add: (uid) => {
        const l = load();
        if (l.includes(String(uid))) return false;
        l.push(String(uid));
        save(l);
        return true;
    },
    remove: (uid) => {
        const l = load();
        const n = l.filter(x => x !== String(uid));
        if (n.length === l.length) return false;
        save(n);
        return true;
    },
    getTargets
};
