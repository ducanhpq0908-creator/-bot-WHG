const lockModule = require("./lock.js");
const locks = require("../../feature-locks.js");

module.exports = {
    name: "unlock",
    description: "Mở khóa chức năng bot",
    role: "admin",
    execute: async (api, message, args, config) => {
        // Dùng chung quy tắc ADM và xử lý khóa; unlock được phép chạy khi khóa all.
        const uid = String(message.data.uidFrom);
        const admins = (config.admin_uids || []).map(String);
        if (!admins.includes(uid)) {
            return api.sendMessage(
                "⛔ Chỉ ADM mới được dùng lệnh mở khóa.",
                message.threadId, message.type
            );
        }

        const target = String(args[0] || "").trim().toLowerCase();
        if (target === "all") {
            const state = locks.readLocks();
            state.all = false;
            state.features = {};
            locks.saveLocks(state);
            return api.sendMessage(
                "🔓 Đã mở khóa toàn bộ chức năng.",
                message.threadId, message.type
            );
        }

        if (!target || target === "list") {
            const state = locks.readLocks();
            const names = Object.keys(state.features).filter(k => state.features[k]);
            return api.sendMessage(
                "🔐 KHÓA HIỆN TẠI\n" +
                "Khóa toàn bộ: " + (state.all ? "Có" : "Không") + "\n" +
                "Khóa riêng: " + (names.length ? names.join(", ") : "Không có"),
                message.threadId, message.type
            );
        }

        if (!/^[a-z0-9_-]+$/.test(target)) {
            return api.sendMessage("⚠️ Tên chức năng không hợp lệ.", message.threadId, message.type);
        }

        const state = locks.readLocks();
        delete state.features[target];
        locks.saveLocks(state);
        return api.sendMessage(
            `🔓 Đã mở khóa chức năng: ${target}`,
            message.threadId, message.type
        );
    }
};
