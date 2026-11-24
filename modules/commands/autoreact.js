if (!global.reactionConfig) {
    global.reactionConfig = { enabled: true, icon: "ducanh", groups: {} };
}

module.exports = {
    name: "autoreact",
    description: "Bật/tắt tự động thả cảm xúc khi bị tag",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const type = message.type;
        
        const groupCfg = global.reactionConfig.groups[threadId] || {
            enabled: global.reactionConfig.enabled,
            icon: global.reactionConfig.icon
        };

        const rawInput = args.join(" ").trim().toLowerCase();
        
        if (!rawInput || ["help", "info", "menu"].includes(rawInput)) {
            const menu = [
                "🤖 **HƯỚNG DẪN AUTOREACT**",
                `📌 Icon hiện tại: ${groupCfg.icon}`,
                `⚡ Trạng thái nhóm này: ${groupCfg.enabled ? "🟢 BẬT" : "🔴 TẮT"}`,
                "",
                "• `!autoreact on` - Bật tự động thả cảm xúc",
                "• `!autoreact off` - Tắt tự động thả cảm xúc",
                "• `!changereaction <icon>` - Đổi icon/chữ (VD: !changereaction 🔥)"
            ].join("\n");
            return api.sendMessage(menu, threadId, type);
        }

        if (rawInput === "on") {
            global.reactionConfig.groups[threadId] = { ...groupCfg, enabled: true };
            return api.sendMessage("✅ Đã BẬT tự động thả cảm xúc cho nhóm này.", threadId, type);
        }
        
        if (rawInput === "off") {
            global.reactionConfig.groups[threadId] = { ...groupCfg, enabled: false };
            return api.sendMessage("🚫 Đã TẮT tự động thả cảm xúc cho nhóm này.", threadId, type);
        }

        return api.sendMessage("⚠️ Lệnh không hợp lệ. Vui lòng gõ `!autoreact` để xem menu.", threadId, type);
    }
};
