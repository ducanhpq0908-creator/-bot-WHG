const fs = require("fs");

module.exports = {
    name: "setname",
    description: "Đổi tên hiển thị của Bot (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) {
            return api.sendMessage({ msg: "❌ Bạn không có quyền sử dụng lệnh này.", quote: message.data }, message.threadId, message.type);
        }

        const newName = args.join(" ").trim();

        if (!newName) {
            const errorText = 
`⚠️ **Bạn đã gõ sai lệnh!**
👉 Vui lòng gõ ${config.prefix}setname <tên_mới> để đổi tên.
👉 Hoặc gõ ${config.prefix}menu để xem hướng dẫn.`;
            
            return api.sendMessage({ msg: errorText, quote: message.data }, message.threadId, message.type);
        }

        try {
            config.bot_name = newName;
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            
            return api.sendMessage({ msg: `✅ Đã đổi tên Bot thành: **${newName}**`, quote: message.data }, message.threadId, message.type);
        } catch (e) {
            return api.sendMessage({ msg: `❌ Lỗi khi đổi tên: ${e.message}`, quote: message.data }, message.threadId, message.type);
        }
    }
};
