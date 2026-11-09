const fs = require("fs");
const path = require("path");
const { Reactions } = require("zca-js");

const FILE = path.join(__dirname, "data", "autoreact.json");
const DEFAULT = {
    enabledAll: false,
    enabledGroups: [],
    disabledGroups: [],
    count: 1,
    icons: ["LIKE", "HEART", "HAHA"]
};

function load() {
    try {
        return { ...DEFAULT, ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
    } catch {
        return { ...DEFAULT };
    }
}

let config = load();

function save() {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(config, null, 2));
}

function isEnabled(threadId) {
    threadId = String(threadId);
    if (config.disabledGroups.includes(threadId)) return false;
    return config.enabledAll || config.enabledGroups.includes(threadId);
}

function setGroup(threadId, enabled) {
    threadId = String(threadId);
    config.enabledGroups = config.enabledGroups.filter(x => x !== threadId);
    config.disabledGroups = config.disabledGroups.filter(x => x !== threadId);
    if (enabled) config.enabledGroups.push(threadId);
    else config.disabledGroups.push(threadId);
    save();
}

function isAdmin(uid, CFG) {
    return Array.isArray(CFG.admin_uids) &&
        CFG.admin_uids.map(String).includes(String(uid));
}

async function handle(api, message, CFG) {
    const data = message && message.data;
    if (!data) return false;

    const text = typeof data.content === "string" ? data.content.trim() : "";
    const prefix = CFG.prefix || "!";
    if (!text.startsWith(prefix)) return false;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const cmd = (args.shift() || "").toLowerCase();

    if (cmd === "autoreact") {
        const action = (args[0] || "").toLowerCase();
        const all = (args[1] || "").toLowerCase() === "all";

        if (!["on", "off"].includes(action)) {
            await api.sendMessage(
                "Dùng lệnh:\n!autoreact on\n!autoreact on all\n!autoreact off\n!autoreact off all",
                message.threadId, message.type
            );
            return true;
        }

        if (all && !isAdmin(data.uidFrom, CFG)) {
            await api.sendMessage("❌ Chỉ admin mới được bật/tắt toàn bộ.", message.threadId, message.type);
            return true;
        }

        if (all) {
            config.enabledAll = action === "on";
            config.enabledGroups = [];
            config.disabledGroups = [];
            save();
        } else {
            setGroup(message.threadId, action === "on");
        }

        await api.sendMessage(
            `📊 Auto Reaction: ${action === "on" ? "ĐÃ BẬT" : "ĐÃ TẮT"}\nPhạm vi: ${all ? "Tất cả nhóm" : "Cuộc trò chuyện hiện tại"}`,
            message.threadId, message.type
        );
        return true;
    }

    if (cmd === "changereaction") {
        if (!isAdmin(data.uidFrom, CFG)) {
            await api.sendMessage("❌ Bạn không có quyền đổi cấu hình.", message.threadId, message.type);
            return true;
        }

        const count = Number(args[0]);
        const icons = (args[1] || "").split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
        const valid = Object.keys(Reactions).filter(x => x !== "NONE");

        if (!Number.isInteger(count) || count < 1 || count > 5 ||
            !icons.length || icons.some(x => !valid.includes(x))) {
            await api.sendMessage(
                "Cú pháp: !changereaction 3 LIKE,HEART,HAHA\nIcon hợp lệ: " + valid.join(", "),
                message.threadId, message.type
            );
            return true;
        }

        config.count = count;
        config.icons = icons;
        save();

        await api.sendMessage(
            `✅ Đã lưu cấu hình\nSố lượng: ${count}\nIcon: ${icons.join(", ")}`,
            message.threadId, message.type
        );
        return true;
    }

    return false;
}

const recentMessages = new Map();
let lastReactionAt = 0;
const MIN_REACTION_GAP_MS = 1500;
const MESSAGE_CACHE_TTL_MS = 120000;

async function reactToMessage(api, message) {
    const data = message && message.data;
    if (!data || !message.threadId || !isEnabled(message.threadId)) return;

    // Không phản ứng với tin nhắn của chính tài khoản bot.
    if (String(data.uidFrom) === String(api.getOwnId())) return;

    if (!data.msgId || !data.cliMsgId) return;

    const key = `${message.threadId}:${data.msgId}`;
    const now = Date.now();

    // Chống xử lý lại cùng một tin nhắn.
    for (const [k, time] of recentMessages) {
        if (now - time > MESSAGE_CACHE_TTL_MS) recentMessages.delete(k);
    }
    if (recentMessages.has(key)) return;
    recentMessages.set(key, now);

    const names = [...new Set(config.icons)].filter(
        name => Object.prototype.hasOwnProperty.call(Reactions, name) && name !== "NONE"
    );
    if (!names.length) return;

    // Chỉ một reaction cho mỗi tin nhắn để giảm tải.
    const name = names[Math.floor(Math.random() * names.length)];
    const icon = Reactions[name];

    const dest = {
        data: {
            msgId: String(data.msgId),
            cliMsgId: String(data.cliMsgId)
        },
        threadId: String(message.threadId),
        type: message.type
    };

    const wait = Math.max(0, MIN_REACTION_GAP_MS - (Date.now() - lastReactionAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));

    lastReactionAt = Date.now();
    try {
        await api.addReaction(icon, dest);
    } catch (err) {
        console.error("[AUTOREACT]", err.message);
    }
}

module.exports = { handle, reactToMessage };
