const fs = require("fs");
const path = require("path");

module.exports = {
    name: "keysilver", 
    description: "Phong quyền (Silver/Gold)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin Bot mới có quyền dùng lệnh này.", threadId, message.type);

        const rawText = (message.data.content || "").toLowerCase();
        const isGoldCmd = rawText.startsWith((config.prefix || "!") + "keygold");

        // Lấy UID mục tiêu: Reply > Tag > Chính người gõ lệnh
        let targetUid = senderUid; 
        
        if (message.data.quote && message.data.quote.ownerId) {
            targetUid = String(message.data.quote.ownerId);
        } else if (message.data.mentions && message.data.mentions.length > 0) {
            const validMentions = message.data.mentions.filter(m => String(m.uid) !== senderUid);
            if (validMentions.length > 0) {
                targetUid = String(validMentions[validMentions.length - 1].uid);
            }
        }

        let resultMsg = "";

        if (!isGoldCmd) { // Xử lý Key Bạc (Phó nhóm)
            try {
                await api.addGroupDeputy(targetUid, threadId);
                if (targetUid === senderUid) {
                    resultMsg = `👑 Bạn đã tự phong mình làm Phó nhóm thành công!`;
                } else {
                    resultMsg = `👑 Đã phong UID ${targetUid} làm Phó nhóm thành công!`;
                }
            } catch (e) {
                resultMsg = `⚠️ Lỗi phong Phó nhóm: ${e.message}\n(Bot cần quyền Trưởng nhóm).`;
            }
        } else { // Xử lý Key Vàng (Trưởng nhóm)
            try {
                await api.changeGroupOwner(targetUid, threadId);
                if (targetUid === senderUid) {
                    resultMsg = `👑 Bạn đã tự chuyển nhượng quyền Trưởng nhóm cho mình thành công!`;
                } else {
                    resultMsg = `👑 Đã chuyển nhượng quyền Trưởng nhóm cho UID ${targetUid} thành công!`;
                }
            } catch (e) {
                resultMsg = `⚠️ Zalo chặn chuyển nhượng tự động. Hãy vào App Zalo để chuyển tay.`;
            }
        }

        return api.sendMessage(resultMsg, threadId, message.type);
    }
};
