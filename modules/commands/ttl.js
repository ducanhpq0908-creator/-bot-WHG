module.exports = {
    name: "ttl",
    description: "Tự động xóa tin nhắn",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) return;
        
        const action = args[0] ? args[0].toLowerCase() : "";
        let ttlData = config.loadTTL();
        
        if (action === "off") {
            delete ttlData[message.threadId];
            config.saveTTL(ttlData);
            return api.sendMessage({ msg: "✅ Đã TẮT tự xóa tin nhắn.", quote: message.data }, message.threadId, message.type);
        }

        const ms = parseInt(action.replace("ms", ""));
        if (!isNaN(ms) && ms >= 1000) {
            ttlData[message.threadId] = ms;
            config.saveTTL(ttlData);
            return api.sendMessage({ msg: `✅ Đã BẬT tự xóa sau ${ms}ms.`, quote: message.data }, message.threadId, message.type);
        }

        return api.sendMessage({ msg: `Cú pháp: ${config.prefix}ttl <ms> | ${config.prefix}ttl off`, quote: message.data }, message.threadId, message.type);
    }
};
