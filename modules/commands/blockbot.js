const blocklist = require("../../blocklist.js");

module.exports = {
    name: "blockbot",

    async execute(api, message, args, CFG) {
        const threadId = message.threadId || message.data.idTo;
        const sender = String(message.data.uidFrom || "");
        const adminList = (CFG.admin_uids || []).map(String);
        const ownId = String(api.getOwnId());

        if (sender !== ownId && !adminList.includes(sender)) {
            return api.sendMessage(
                "⛔ Chỉ admin mới dùng được lệnh này.",
                threadId,
                message.type
            );
        }

        // Danh sách block
        if (args[0]?.toLowerCase() === "list") {
            const l = blocklist.list();

            if (!l.length) {
                return api.sendMessage(
                    "📋 Chưa có ai bị block bot.",
                    threadId,
                    message.type
                );
            }

            const lines = l.map((uid, i) => `${i + 1}. ${uid}`).join("\n");

            return api.sendMessage(
                `📋 Danh sách bị block bot:\n${lines}`,
                threadId,
                message.type
            );
        }

        // Bỏ block
        if (args[0]?.toLowerCase() === "unblock") {
            const uid = String(args[1] || "").replace(/[^\d]/g, "");

            if (!uid) {
                return api.sendMessage(
                    `👉 Cú pháp: ${CFG.prefix}blockbot unblock UID`,
                    threadId,
                    message.type
                );
            }

            const removed = blocklist.remove(uid);

            return api.sendMessage(
                removed
                    ? `✅ Đã bỏ block UID: ${uid}`
                    : `ℹ️ UID ${uid} không có trong danh sách block.`,
                threadId,
                message.type
            );
        }

        const targets = blocklist.getTargets(message, args);

        if (!targets.length) {
            return api.sendMessage(
                `👉 Cú pháp:\n` +
                `${CFG.prefix}blockbot @tag\n` +
                `${CFG.prefix}blockbot UID\n` +
                `${CFG.prefix}blockbot list\n` +
                `${CFG.prefix}blockbot unblock UID`,
                threadId,
                message.type
            );
        }

        const done = [];
        const skipped = [];

        for (const uid of targets) {
            if (adminList.includes(uid) || uid === ownId) {
                skipped.push(uid);
            } else if (blocklist.add(uid)) {
                done.push(uid);
            } else {
                skipped.push(uid);
            }
        }

        let reply = "";

        if (done.length) {
            reply += `🚫 Đã block bot: ${done.join(", ")}\n`;
        }

        if (skipped.length) {
            reply += `ℹ️ Bỏ qua: ${skipped.join(", ")}`;
        }

        return api.sendMessage(
            reply.trim() || "Không có thay đổi.",
            threadId,
            message.type
        );
    }
};
