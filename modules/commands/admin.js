const fs = require("fs");

module.exports = {
    name: "admin", description: "Quản lý quyền admin", role: "admin",
    description: "Quản lý Admin",
    execute: async (api, message, args, config) => {
        const senderUid = message.data.uidFrom;
        const isAdmin = config.admin_uids.includes(senderUid);

        if (!isAdmin) {
            return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này.", message.threadId, message.type);
        }

        const action = args[0] ? args[0].toLowerCase() : "list";

        if (action === "list") {
            const adminList = config.admin_uids.map((uid, idx) => `${idx + 1}. ${uid}`).join("\n");
            return api.sendMessage(`👑 **DANH SÁCH ADMIN BOT:**\n━━━━━━━━━━━━━━━━━━━━\n${adminList}\n━━━━━━━━━━━━━━━━━━━━\n📌 Cú pháp:\n!admin add <UID>\n!admin remove <UID>`, message.threadId, message.type);
        }

        if (action === "add") {
            let targetUid = args[1];
            // Nếu là reply thì lấy UID người được reply
            if (!targetUid && message.data.quote && message.data.quote.ownerId) {
                targetUid = message.data.quote.ownerId;
            }
            
            if (!targetUid) {
                return api.sendMessage("⚠️ Vui lòng nhập UID hoặc reply tin nhắn người muốn thêm.", message.threadId, message.type);
            }

            if (config.admin_uids.includes(targetUid)) {
                return api.sendMessage("⚠️ UID này đã có trong danh sách Admin.", message.threadId, message.type);
            }

            config.admin_uids.push(targetUid);
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            return api.sendMessage(`✅ Đã thêm UID **${targetUid}** vào danh sách Admin.`, message.threadId, message.type);
        }

        if (action === "remove") {
            let targetUid = args[1];
            if (!targetUid && message.data.quote && message.data.quote.ownerId) {
                targetUid = message.data.quote.ownerId;
            }

            if (!targetUid) {
                return api.sendMessage("⚠️ Vui lòng nhập UID hoặc reply tin nhắn người muốn xóa.", message.threadId, message.type);
            }

            if (!config.admin_uids.includes(targetUid)) {
                return api.sendMessage("⚠️ UID này không có trong danh sách Admin.", message.threadId, message.type);
            }

            // Không cho xóa chính mình
            if (targetUid === senderUid) {
                return api.sendMessage("❌ Bạn không thể tự xóa quyền Admin của chính mình.", message.threadId, message.type);
            }

            config.admin_uids = config.admin_uids.filter(uid => uid !== targetUid);
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            return api.sendMessage(`✅ Đã xóa UID **${targetUid}** khỏi danh sách Admin.`, message.threadId, message.type);
        }

        return api.sendMessage("❌ Cú pháp không hợp lệ.\nSử dụng:\n!admin list\n!admin add <UID>\n!admin remove <UID>", message.threadId, message.type);
    }
};
