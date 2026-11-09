const fs = require("fs");
const path = require("path");

module.exports = {
    name: "bot",
    description: "Bật/Tắt bot (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const senderUid = message.data.uidFrom;
        if (!config.admin_uids.includes(senderUid)) {
            return api.sendMessage({ msg: "❌ Bạn không có quyền sử dụng lệnh này.", quote: message.data }, message.threadId, message.type);
        }

        const action = args[0] ? args[0].toLowerCase() : "";
        const statePath = path.join(__dirname, "..", "bot_state.json");
        let state = { status: "on" };
        try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); } catch (e) {}

        if (action === "on") {
            state.status = "on";
            fs.writeFileSync(statePath, JSON.stringify(state, null, 4));
            return api.sendMessage({ msg: "✅ Đã BẬT bot. Mọi người có thể sử dụng lệnh.", quote: message.data }, message.threadId, message.type);
        } 
        
        if (action === "off") {
            state.status = "off";
            fs.writeFileSync(statePath, JSON.stringify(state, null, 4));
            return api.sendMessage({ msg: "🛑 Đã TẮT bot. Chỉ Admin mới có thể sử dụng lệnh.", quote: message.data }, message.threadId, message.type);
        }

        return api.sendMessage({ msg: `📌 Trạng thái bot hiện tại: **${state.status.toUpperCase()}**\nCú pháp: ${config.prefix}bot on / off`, quote: message.data }, message.threadId, message.type);
    }
};
