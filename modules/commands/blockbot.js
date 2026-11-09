const blocklist = require("../../blocklist.js");

module.exports = {
    name: "blockbot",
    async execute(api, message, args, CFG) {
        const threadId = message.threadId || message.data.idTo;
        const sender = String(message.data.uidFrom || "");
        const adminList = (CFG.admin_uids || []).map(String);
        const isBot = sender === String(api.getOwnId());

        if (!isBot && !adminList.includes(sender)) {
            return api.sendMessage("⛔ Chỉ admin mới dùng được lệnh này.", threadId, message.type);
        }

        if (args[0] && args[0].toLowerCase() === "list") {
            const l = blocklist.list();
            if (l.length === 0) {
                return api.sendMessage("📋 Chưa có ai bị block bot.", threadId, message.type);
            }
            const lines = l.map((uid, i) => `${i + 1}. ${uid}`).join("\n");
            return api.sendMessage(`📋 Danh sách bị block bot:\n${lines}`, threadId, message.type);
        }

        const targets = blocklist.getTargets(message, args);
        if (targets.length === 0) {
            return api.sendMessage(
                `👉 Cú pháp: ${CFG.prefix}blockbot @tag hoặc ${CFG.prefix}blockbot list`,
                threadId, message.type
            );
        }

        const done = [];
        const skipped = [];
        for (const uid of targets) {
            if (adminList.includes(uid) || uid === String(api.getOwnId())) {
                skipped.push(uid);
            } else if (blocklist.add(uid)) {
                done.push(uid);
            } else {
                skipped.push(uid);
            }
        }

        let reply = "";
        if (done.length) reply += `🚫 Đã block bot: ${done.join(", ")}\n`;
        if (skipped.length) reply += `ℹ️ Bỏ qua (đã block hoặc là admin/bot): ${skipped.join(", ")}`;
        return api.sendMessage(reply.trim(), threadId, message.type);
    }
};
