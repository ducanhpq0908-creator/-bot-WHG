const locks = require("../../feature-locks.js");

async function executeLock(api, message, args, config, mode) {
    const uid = String(message.data.uidFrom);
    const admins = (config.admin_uids || []).map(String);
    const threadId = message.threadId;
    const type = message.type;

    if (!admins.includes(uid)) {
        return api.sendMessage(
            "⛔ Chỉ ADM mới được dùng lệnh khóa chức năng.",
            threadId, type
        );
    }

    const target = String(args[0] || "").trim().toLowerCase();

    if (!target || target === "list") {
        const state = locks.readLocks();
        const names = Object.keys(state.features).filter(k => state.features[k]);
        const lines = [
            "🔐 DANH SÁCH KHÓA CHỨC NĂNG",
            "Khóa toàn bộ: " + (state.all ? "ĐANG BẬT" : "ĐANG TẮT"),
            "Chức năng khóa riêng: " + (names.length ? names.join(", ") : "Không có"),
            "",
            "Dùng: !lock <tên_lệnh>",
            "Mở: !unlock <tên_lệnh>",
            "!lock all | !unlock all",
            "!lock list"
        ];
        return api.sendMessage(lines.join("\n"), threadId, type);
    }

    const state = locks.readLocks();

    if (target === "all") {
        if (mode === "lock") {
            state.all = true;
            locks.saveLocks(state);
            return api.sendMessage(
                "🔒 Đã khóa toàn bộ chức năng với người dùng thường. Hai UID ADM vẫn dùng bot được.",
                threadId, type
            );
        }

        state.all = false;
        state.features = {};
        locks.saveLocks(state);
        return api.sendMessage(
            "🔓 Đã mở khóa toàn bộ chức năng.",
            threadId, type
        );
    }

    if (!/^[a-z0-9_-]+$/.test(target)) {
        return api.sendMessage("⚠️ Tên chức năng không hợp lệ.", threadId, type);
    }

    if (mode === "lock") {
        state.features[target] = true;
        locks.saveLocks(state);
        return api.sendMessage(`🔒 Đã khóa chức năng: ${target}`, threadId, type);
    }

    delete state.features[target];
    locks.saveLocks(state);
    return api.sendMessage(`🔓 Đã mở khóa chức năng: ${target}`, threadId, type);
}

module.exports = {
    name: "lock",
    description: "Khóa chức năng bot",
    role: "admin",
    execute: async (api, message, args, config) =>
        executeLock(api, message, args, config, "lock")
};
