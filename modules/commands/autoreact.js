module.exports = {
    name: "autoreact",
    description: "Bật/tắt tự động thả cảm xúc",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) return;

        const action = args[0] ? args[0].toLowerCase() : "";
        const isAll = args[1] && args[1].toLowerCase() === "all";
        const threadId = message.threadId;

        let reactCfg = config.loadReact();

        if (action === "on") {
            if (isAll) {
                reactCfg.enabled_all = true;
                reactCfg.enabled_groups = [];
                config.saveReact(reactCfg);
                return api.sendMessage({ msg: "✅ Đã BẬT tự động thả cảm xúc cho TẤT CẢ các nhóm.", quote: message.data }, threadId, message.type);
            } else {
                if (!reactCfg.enabled_groups.includes(threadId)) {
                    reactCfg.enabled_groups.push(threadId);
                }
                config.saveReact(reactCfg);
                return api.sendMessage({ msg: "✅ Đã BẬT tự động thả cảm xúc cho nhóm này.", quote: message.data }, threadId, message.type);
            }
        } 
        
        if (action === "off") {
            if (isAll) {
                reactCfg.enabled_all = false;
                reactCfg.enabled_groups = [];
                config.saveReact(reactCfg);
                return api.sendMessage({ msg: "✅ Đã TẮT tự động thả cảm xúc cho TẤT CẢ các nhóm.", quote: message.data }, threadId, message.type);
            } else {
                reactCfg.enabled_groups = reactCfg.enabled_groups.filter(id => id !== threadId);
                config.saveReact(reactCfg);
                return api.sendMessage({ msg: "✅ Đã TẮT tự động thả cảm xúc cho nhóm này.", quote: message.data }, threadId, message.type);
            }
        }

        return api.sendMessage({ 
            msg: `📊 **TRẠNG THÁI AUTO REACT**\n- Toàn bộ: ${reactCfg.enabled_all ? "Bật" : "Tắt"}\n- Nhóm này: ${reactCfg.enabled_groups.includes(threadId) ? "Bật" : "Tắt"}\n\nSử dụng:\n-autoreact on/off (all)\n-changereaction <số lượng> <ICON>`, 
            quote: message.data 
        }, threadId, message.type);
    }
};
