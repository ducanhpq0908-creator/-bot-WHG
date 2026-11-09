const blocklist = require("../../blocklist.js");

module.exports = {
    name: "unblockbot",
    async execute(api, message, args, CFG) {
        const threadId = message.threadId || message.data.idTo;
        const sender = String(message.data.uidFrom || "");
        const adminList = (CFG.admin_uids || []).map(String);
        const isBot = sender === String(api.getOwnId());

        if (!isBot && !adminList.includes(sender)) {
            return api.sendMessage("⛔ Chỉ admin mới dùng được lệnh này.", threadId, message.type);
        }

        const targets = blocklist.getTargets(message, args);
        if (targets.length === 0) {
            return api.sendMessage(`👉 Cú pháp: ${CFG.prefix}unblockbot @tag`, threadId, message.type);
        }

        const done = targets.filter(uid => blocklist.remove(uid));
        const notFound = targets.filter(uid => !done.includes(uid));

        let reply = "";
        if (done.length) reply += `✅ Đã gỡ block: ${done.join(", ")}\n`;
        if (notFound.length) reply += `ℹ️ Không có trong danh sách block: ${notFound.join(", ")}`;
        return api.sendMessage(reply.trim(), threadId, message.type);
    }
};
