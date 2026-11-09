module.exports = {
    name: "stop",
    description: "Tắt treo nhóm",
    role: "admin",

    execute: async (api, message, args, config) => {
        const admins = (config.admin_uids || []).map(String);
        if (!admins.includes(String(message.data.uidFrom))) {
            return api.sendMessage(
                "❌ Bạn không có quyền.",
                message.threadId,
                message.type
            );
        }

        const threads = global.TREO_THREADS;
        if (threads && threads.get(message.threadId) === true) {
            threads.set(message.threadId, false);
            return api.sendMessage(
                "⏹ Đã gửi yêu cầu dừng treo.",
                message.threadId,
                message.type
            );
        }

        return api.sendMessage(
            "ℹ️ Nhóm này hiện không chạy treo.",
            message.threadId,
            message.type
        );
    }
};
