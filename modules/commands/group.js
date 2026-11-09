module.exports = {
    name: "group",
    description: "Quản lý nhóm (kick, link, leave, create)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || message.data.uid);
        const action = args[0] ? args[0].toLowerCase() : "";
        
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid);
        if (!isAdmin) return await api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);

        // ===== LỆNH TẠO NHÓM =====
        if (action === "create") {
            const groupName = args.slice(1).join(" ");
            if (!groupName) return await api.sendMessage("❌ Vui lòng nhập tên nhóm. VD: !group create Nhóm Vip", threadId, message.type);
            
            try {
                if (api.createGroup) {
                    // Tạo nhóm với 1 thành viên mặc định (chính admin)
                    const res = await api.createGroup({ name: groupName, members: [senderUid] });
                    if (res && res.groupId) {
                        await api.sendMessage(`✅ Đã tạo nhóm "${groupName}" thành công!\nID nhóm: ${res.groupId}`, threadId, message.type);
                    } else {
                        throw new Error("Không lấy được ID nhóm mới.");
                    }
                } else {
                    throw new Error("Thư viện zca-js hiện tại không hỗ trợ hàm createGroup.");
                }
            } catch (e) {
                console.error("Lỗi tạo nhóm:", e.message);
                await api.sendMessage("❌ Lỗi tạo nhóm: " + e.message, threadId, message.type);
            }
            return;
        }

        // ===== LỆNH RỜI NHÓM =====
        if (action === "leave") {
            try {
                await api.sendMessage("👋 Tạm biệt mọi người, bot xin phép out nhóm!", threadId, message.type);
                if (api.leaveGroup) {
                    await api.leaveGroup(threadId);
                } else if (api.removeUserFromGroup) {
                    const botId = api.getOwnId();
                    await api.removeUserFromGroup(botId, threadId);
                }
            } catch (e) {
                await api.sendMessage("❌ Không thể out nhóm. Hãy chắc chắn bot là Quản trị viên.", threadId, message.type);
            }
            return;
        }

        // ===== LỆNH LẤY LINK NHÓM =====
        if (action === "link") {
            try {
                if (api.getGroupLink) {
                    const res = await api.getGroupLink(threadId);
                    const link = res.link || res.groupLink || res;
                    return await api.sendMessage(`🔗 Link nhóm: ${link}`, threadId, message.type);
                } else {
                    throw new Error("Không hỗ trợ");
                }
            } catch (e) {
                return await api.sendMessage("❌ Không lấy được link nhóm. (Yêu cầu bot phải là Quản trị viên nhóm).", threadId, message.type);
            }
        }

        // ===== LỆNH KICK THÀNH VIÊN =====
        if (action === "kick") {
            const mentions = message.data.mentions || [];
            if (mentions.length === 0) return await api.sendMessage("❌ Vui lòng tag (@) người cần kick.", threadId, message.type);
            
            const targetUid = String(mentions[0].uid);
            try {
                if (api.removeUserFromGroup) {
                    await api.removeUserFromGroup(targetUid, threadId);
                    await api.sendMessage(`✅ Đã kick thành viên thành công.`, threadId, message.type);
                } else {
                    throw new Error("Không hỗ trợ");
                }
            } catch (e) {
                await api.sendMessage("❌ Lỗi kick: " + e.message, threadId, message.type);
            }
            return;
        }

        // Lệnh không hợp lệ
        await api.sendMessage("📌 Cú pháp:\n!group kick @tag\n!group link\n!group leave (hoặc !leave)\n!group create <tên>", threadId, message.type);
    }
};
