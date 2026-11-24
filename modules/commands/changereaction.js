const { Reactions } = require('zca-js');

if (!global.reactionConfig) {
    global.reactionConfig = { enabled: true, icon: "ducanh", groups: {} };
}

module.exports = {
    name: "changereaction",
    description: "Đổi icon/chữ thả cảm xúc khi bị tag",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const type = message.type;
        
        const groupCfg = global.reactionConfig.groups[threadId] || {
            enabled: global.reactionConfig.enabled,
            icon: global.reactionConfig.icon
        };

        // Lấy toàn bộ chuỗi (bao gồm cả emoji và chữ)
        const rawInput = args.join(" ").trim();
        
        if (!rawInput) {
            return api.sendMessage("⚠️ Vui lòng nhập icon hoặc chữ muốn đổi. VD: `!changereaction 🔥`", threadId, type);
        }

        if (rawInput.toLowerCase() === "reset") {
            delete global.reactionConfig.groups[threadId];
            return api.sendMessage("🔄 Đã RESET icon về mặc định (ducanh).", threadId, type);
        }

        // Cập nhật icon mới
        global.reactionConfig.groups[threadId] = { 
            ...groupCfg, 
            icon: rawInput, 
            enabled: true 
        };
        return api.sendMessage(`🎭 ĐÃ ĐỔI ICON REACTION THÀNH: ${rawInput}`, threadId, type);
    },
    
    // Hàm xử lý tự động thả cảm xúc (vẫn giữ ở đây để main.js gọi)
    handleAutoReact: async (api, message, botId) => {
        try {
            const threadId = message.threadId;
            const type = message.type;
            const data = message.data;
            const msgText = String(data?.msg || data?.content || '');
            const mentions = data?.mentions || [];

            const isBotMentioned = mentions.some(m => String(m.uid) === String(botId)) 
                || msgText.includes('@all') 
                || msgText.includes('@All');

            if (!isBotMentioned) return;

            const groupCfg = global.reactionConfig.groups[threadId] || global.reactionConfig;
            
            if (!groupCfg.enabled) return;
            const tagIcon = groupCfg.icon || "ducanh";

            const target = {
                data: {
                    msgId: String(data?.msgId || data?.id),
                    cliMsgId: String(data?.cliMsgId || '')
                },
                threadId,
                type
            };

            const randomRType = 200 + Math.floor(Math.random() * 301);
            const customReaction = {
                rType: randomRType,
                source: 6,
                icon: tagIcon
            };

            await api.addReaction(customReaction, target);
            console.log(`[AUTOREACT] Đã thả "${tagIcon}" vào tin nhắn của ${data.uidFrom}`);

            setTimeout(async () => {
                try {
                    await api.addReaction(Reactions.NONE, target);
                } catch {}
            }, 3000);

        } catch (e) {
            console.error("[AUTOREACT ERROR]", e.message);
        }
    }
};
