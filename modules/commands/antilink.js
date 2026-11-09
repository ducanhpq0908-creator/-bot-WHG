const fs = require("fs");
const path = require("path");

const linkRegex = /(?:(?:https?:\/\/)|(?:www\.))[^\s]+|zaloapp\.com\/[^\s]+|zalo\.me\/[^\s]+|(?:[a-zA-Z0-9][-a-zA-Z0-9]*\.)+(?:com|vn|net|org|edu|gov|io|me|xyz|top|info|site|online|app|co|gg|ly|cc|to|tech|vip|pro|shop|store|live|club|fun|link)(?:\/[^\s]*)?/i;
const zaloCdnRegex = /https?:\/\/[a-zA-Z0-9.-]*z[a]?dn\.vn(?:\/[^"\s<>]*)?/i;

function containsLink(text) {
    if (!text) return false;
    let clean = text.replace(/\\\//g, "/");
    let withoutCdn = clean.replace(zaloCdnRegex, "");
    return linkRegex.test(withoutCdn);
}

const handleAntiLink = async (api, message, config) => {
    const secPath = path.join(__dirname, "..", "security.json");
    let sec = { antilink: [], antispam: [], spam_threshold: 2, spam_window: 1 };
    try { sec = JSON.parse(fs.readFileSync(secPath, "utf8")); } catch (e) {}

    if (!sec.antilink.includes(message.threadId) || message.type !== 1) return false;
    if (config.admin_uids.includes(message.data.uidFrom)) return false;

    const text = message.data.content || "";
    if (!containsLink(text)) return false;

    const uid = String(message.data.uidFrom);

    // 1. Xóa tin nhắn
    try {
        if (api.deleteMessage) {
            await api.deleteMessage(message.data, message.threadId, message.type);
        }
    } catch (e) { 
        console.log("[LỖI XÓA LINK]:", e.message); 
    }

    // 2. Kick ngay lập tức (Vi phạm 1 lần)
    try {
        await api.sendMessage(`🚫 UID ${uid} gửi link vi phạm. Tiến hành Kick!`, message.threadId, message.type);
        if (api.removeUserFromGroup) {
            await api.removeUserFromGroup(uid, message.threadId);
        }
    } catch (e) {
        await api.sendMessage(`❌ Không thể kick UID ${uid} (Bot cần quyền Phó nhóm).`, message.threadId, message.type);
    }

    return true;
};

module.exports = {
    name: "antilink",
    description: "Bật/Tắt chống link",
    role: "admin",
    handleAntiLink,

    execute: async (api, message, args, config) => {
        const secPath = path.join(__dirname, "..", "security.json");
        let sec = { antilink: [], antispam: [], spam_threshold: 2, spam_window: 1 };
        try { sec = JSON.parse(fs.readFileSync(secPath, "utf8")); } catch (e) {}

        const status = args[0] ? args[0].toLowerCase() : "";
        
        if (status === "on") {
            if (!sec.antilink.includes(message.threadId)) sec.antilink.push(message.threadId);
            fs.writeFileSync(secPath, JSON.stringify(sec, null, 2));
            return api.sendMessage(`✅ Đã BẬT chống link (Vi phạm 1 lần = Kick).`, message.threadId, message.type);
        } else if (status === "off") {
            sec.antilink = sec.antilink.filter(id => id !== message.threadId);
            fs.writeFileSync(secPath, JSON.stringify(sec, null, 2));
            return api.sendMessage(`✅ Đã TẮT chống link.`, message.threadId, message.type);
        }

        return api.sendMessage(`Cú pháp: ${config.prefix}antilink on/off`, message.threadId, message.type);
    }
};
