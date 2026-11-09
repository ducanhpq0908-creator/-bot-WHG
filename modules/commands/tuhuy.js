module.exports = {
    name: "ttl",
    description: "Tự động xóa tin nhắn của bot",
    role: "admin",
    execute: async (api, message, args, config) => {
        const uid = String(message.data.uidFrom || "");
        // Tin do chính tài khoản bot gửi có uidFrom = "0" nên phải check thêm isSelf
        const isSelf = message.data.isSelf === true || uid === "0";
        if (!isSelf && !config.admin_uids.includes(uid)) return;

        const threadId = message.threadId;
        const action = args[0] ? args[0].toLowerCase() : "";
        const ttlData = config.loadTTL() || {};

        if (action === "off") {
            delete ttlData[threadId];
            config.saveTTL(ttlData);
            return api.sendMessage("✅ Đã TẮT tự xóa tin nhắn.", threadId, message.type);
        }

        // Hỗ trợ: 5000, 5000ms, 5s
        const m = action.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
        if (m) {
            const ms = Math.round(parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1));
            if (ms >= 1000) {
                ttlData[threadId] = ms;
                config.saveTTL(ttlData);
                return api.sendMessage(`✅ Đã BẬT tự xóa sau ${ms}ms (${ms / 1000}s).`, threadId, message.type);
            }
        }

        const cur = ttlData[threadId];
        return api.sendMessage(
            `Cú pháp: ${config.prefix}ttl <ms|s> | ${config.prefix}ttl off\nVí dụ: ${config.prefix}ttl 5s\nHiện tại: ${cur ? cur + "ms" : "đang tắt"}`,
            threadId,
            message.type
        );
    }
};
