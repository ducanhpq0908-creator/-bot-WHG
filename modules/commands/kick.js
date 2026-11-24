module.exports = {
    name: "kick",
    description: "Kick thành viên khỏi nhóm (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng trong nhóm.", threadId, message.type);

        let targetUid = null;
        
        // Lấy UID từ Reply hoặc Tag
        if (message.data.quote && message.data.quote.ownerId) {
            targetUid = String(message.data.quote.ownerId);
        } else if (message.data.mentions && message.data.mentions.length > 0) {
            const validMentions = message.data.mentions.filter(m => String(m.uid) !== senderUid);
            if (validMentions.length > 0) targetUid = String(validMentions[0].uid);
        }

        if (!targetUid) return api.sendMessage("Vui lòng Reply hoặc Tag người cần kick.", threadId, message.type);

        try {
            await api.removeUserFromGroup(targetUid, threadId);
            return api.sendMessage(`✅ Đã kick UID ${targetUid} ra khỏi nhóm.`, threadId, message.type);
        } catch (e) {
            return api.sendMessage(`❌ Lỗi khi kick: ${e.message}`, threadId, message.type);
        }
    }
};
