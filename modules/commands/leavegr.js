module.exports = {
    name: "leavegr",
    description: "Rời nhóm (Hiện tại / All / Theo ID / Xem DS)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;
        
        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin Bot mới có quyền dùng lệnh này.", threadId, message.type);

        const prefix = config.prefix || "!";
        const sub = (args[0] || "").toLowerCase();

        // 1. Xem danh sách nhóm
        if (sub === "list") {
            let page = parseInt(args[1]) || 1;
            try {
                const res = await api.getAllGroups();
                const allGroups = res.gridVerMap || res;
                const groupIds = Object.keys(allGroups);

                if (groupIds.length === 0) return api.sendMessage("📋 Bot không tham gia nhóm nào.", threadId, message.type);

                const pageSize = 8;
                const totalPages = Math.ceil(groupIds.length / pageSize);
                if (page > totalPages) page = totalPages;

                const start = (page - 1) * pageSize;
                const pageIds = groupIds.slice(start, start + pageSize);

                let text = `📋 Danh sách nhóm (Trang ${page}/${totalPages} - Tổng ${groupIds.length}):\n\n`;
                
                for (let i = 0; i < pageIds.length; i++) {
                    const gid = pageIds[i];
                    // Lấy tên nhóm từ cache (nếu có) hoặc gọi API
                    let gName = "Nhóm " + gid;
                    try {
                        const info = await api.getGroupInfo(gid);
                        if (info && info.gridInfoMap && info.gridInfoMap[gid]) {
                            gName = info.gridInfoMap[gid].name || gName;
                        }
                    } catch (e) {}
                    
                    text += `${start + i + 1}. ${gName}\n   ID: ${gid}\n`;
                }

                text += `\nGõ ${prefix}leavegr <ID> để rời nhóm.\nGõ ${prefix}leavegr all để rời tất cả.`;
                return api.sendMessage(text, threadId, message.type);
            } catch (e) {
                return api.sendMessage(`❌ Lỗi lấy danh sách nhóm: ${e.message}`, threadId, message.type);
            }
        }

        // 2. Rời tất cả nhóm
        if (sub === "all") {
            try {
                const res = await api.getAllGroups();
                const allGroups = res.gridVerMap || res;
                const groupIds = Object.keys(allGroups);
                
                if (groupIds.length === 0) return api.sendMessage("📋 Bot không có trong nhóm nào.", threadId, message.type);

                await api.sendMessage(`⏳ Bắt đầu rời ${groupIds.length} nhóm trong nền...`, threadId, message.type);

                // Chạy ngầm để không block
                (async () => {
                    let success = 0, failed = 0;
                    for (const gid of groupIds) {
                        if (String(gid) === String(threadId)) continue; // Bỏ qua nhóm hiện tại (rời sau)
                        try {
                            await api.leaveGroup(gid);
                            success++;
                        } catch (e) {
                            failed++;
                        }
                        await new Promise(r => setTimeout(r, 150)); // Delay tránh spam
                    }
                    
                    // Rời nhóm hiện tại cuối cùng
                    try {
                        await new Promise(r => setTimeout(r, 500));
                        await api.leaveGroup(threadId);
                        success++;
                    } catch (e) { failed++; }

                    // Báo cáo cho admin
                    try {
                        await api.sendMessage(`✅ Đã rời thành công ${success}/${groupIds.length} nhóm (Thất bại: ${failed}).`, senderUid, 0);
                    } catch (e) {}
                })();

                return;
            } catch (e) {
                return api.sendMessage(`❌ Lỗi: ${e.message}`, threadId, message.type);
            }
        }

        // 3. Rời nhóm hiện tại (nếu không có args)
        if (!args[0] || args.length === 0) {
            if (message.type !== 1) {
                return api.sendMessage(`📌 Hướng dẫn:\n${prefix}leavegr (rời nhóm hiện tại)\n${prefix}leavegr all (rời tất cả)\n${prefix}leavegr <ID> (rời ID cụ thể)\n${prefix}leavegr list (xem DS)`, threadId, message.type);
            }
            
            await api.sendMessage("👋 Bot đang rời khỏi nhóm này. Tạm biệt!", threadId, message.type);
            setTimeout(async () => {
                try { await api.leaveGroup(threadId); } catch (e) {}
            }, 600);
            return;
        }

        // 4. Rời nhóm theo ID
        let targetIds = args.filter(id => /^\d+$/.test(id));
        if (targetIds.length === 0) {
            return api.sendMessage("❌ ID nhóm không hợp lệ. Vui lòng nhập ID là các chữ số.", threadId, message.type);
        }

        let success = 0, failed = 0, failedIds = [];
        for (const gid of targetIds) {
            if (message.type === 1 && String(gid) === String(threadId)) {
                // Rời nhóm hiện tại sau cùng
                setTimeout(async () => { try { await api.leaveGroup(gid); } catch (e) {} }, 800);
                success++;
            } else {
                try {
                    await api.leaveGroup(gid);
                    success++;
                } catch (e) {
                    failed++;
                    failedIds.push(gid);
                }
                await new Promise(r => setTimeout(r, 150));
            }
        }

        if (failed === 0) {
            return api.sendMessage(`✅ Đã rời thành công ${success} nhóm.`, threadId, message.type);
        } else {
            return api.sendMessage(`⚠️ Rời thành công ${success}/${targetIds.length} nhóm.\n❌ Thất bại: ${failedIds.join(", ")}`, threadId, message.type);
        }
    }
};
