const fs = require("fs");
const path = require("path");

module.exports = {
    name: "prefix",
    description: "Xem hoặc đổi tiền tố của bot",
    role: "user",
    execute: async (api, message, args, config) => {
        const senderUid = String(message.data.uidFrom || message.data.uid);
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid);
        const statePath = path.join(__dirname, "..", "bot_state.json");
        
        // Đổi Prefix
        if (args.length > 0) {
            if (!isAdmin) return await api.sendMessage("❌ Chỉ Admin mới có quyền đổi Prefix.", message.threadId, message.type);
            
            const newPrefix = args[0];
            if (newPrefix.length > 3) return await api.sendMessage("❌ Prefix quá dài (tối đa 3 ký tự).", message.threadId, message.type);

            try {
                let state = { status: "on" };
                if (fs.existsSync(statePath)) {
                    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
                }
                state.prefix = newPrefix;
                fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
                config.prefix = newPrefix;
                
                await api.sendMessage(`✅ Đã đổi Prefix thành: ${newPrefix}`, message.threadId, message.type);
            } catch (e) {
                await api.sendMessage("❌ Lỗi khi đổi Prefix.", message.threadId, message.type);
            }
            return;
        }

        // Xem Prefix (Giao diện mới)
        let currentPrefix = config.prefix || "!";
        if (fs.existsSync(statePath)) {
            try {
                const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
                if (state.prefix) currentPrefix = state.prefix;
            } catch (e) {}
        }

        const msg = `♛ Prefix hiện tại của bot là: ${currentPrefix} ♛`;
        await api.sendMessage(msg, message.threadId, message.type);
    }
};
