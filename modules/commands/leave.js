module.exports = {
    name: "leave",
    description: "Bot tự động rời khỏi nhóm",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || message.data.uid);
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid);
        
        if (!isAdmin) return await api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);

        try {
            await api.sendMessage("👋 Tạm biệt mọi người, bot xin phép out nhóm!", threadId, message.type);
            if (api.leaveGroup) {
                await api.leaveGroup(threadId);
            } else if (api.removeUserFromGroup) {
                const botId = api.getOwnId();
                await api.removeUserFromGroup(botId, threadId);
            }
        } catch (e) {
            console.error("Lỗi out nhóm:", e.message);
            await api.sendMessage("❌ Không thể out nhóm. Hãy chắc chắn bot đang là Quản trị viên nhóm.", threadId, message.type);
        }
    }
};
