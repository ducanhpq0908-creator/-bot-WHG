module.exports = {
    name: "doitenbox",
    description: "Đổi tên nhóm hiện tại",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng trong nhóm.", threadId, message.type);

        const newName = args.join(" ").trim();
        if (!newName) return api.sendMessage(`Cú pháp: ${config.prefix}doitenbox <Tên Mới>`, threadId, message.type);

        try {
            await api.changeGroupName(newName, threadId);
            return api.sendMessage(`✅ Đã đổi tên nhóm thành: ${newName}`, threadId, message.type);
        } catch (e) {
            return api.sendMessage(`❌ Lỗi đổi tên: ${e.message}\n(Bot cần quyền Trưởng/Phó nhóm).`, threadId, message.type);
        }
    }
};
