module.exports = {
    name: "tb",
    description: "Bật/Tắt thông báo nhóm (Mute/Unmute)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const action = (args[0] || "").toLowerCase();
        const isAll = args[1] && args[1].toLowerCase() === "all";
        
        // Mặc định !tb hoặc !tb off là TẮT (Mute)
        let isMute = false;
        if (action === "on") isMute = false;
        else if (action === "off" || action === "") isMute = true;

        const doMute = async (targetId, type, muteStatus) => {
            return await api.setMute({
                action: muteStatus ? 1 : 3, // 1 = Mute, 3 = Unmute
                duration: -1 // Vĩnh viễn
            }, String(targetId), Number(type));
        };

        // ===== XỬ LÝ ALL =====
        if (isAll) {
            await api.sendMessage(`⏳ Đang ${isMute ? "TẮT" : "BẬT"} thông báo cho TẤT CẢ nhóm...`, threadId, message.type);
            
            try {
                const res = await api.getAllGroups();
                const allGroups = res.gridVerMap || res;
                const groupIds = Object.keys(allGroups);
                let successCount = 0;

                for (const gid of groupIds) {
                    try {
                        await doMute(gid, 1, isMute); 
                        successCount++;
                        await new Promise(r => setTimeout(r, 200)); // Tránh spam API
                    } catch (e) {
                        console.log(`[TB] Lỗi nhóm ${gid}: ${e.message}`);
                    }
                }
                
                return api.sendMessage(`✅ Đã ${isMute ? "TẮT" : "BẬT"} thông báo thành công cho ${successCount}/${groupIds.length} nhóm.`, threadId, message.type);
            } catch (e) {
                return api.sendMessage(`❌ Lỗi lấy danh sách nhóm: ${e.message}`, threadId, message.type);
            }
        }

        // ===== XỬ LÝ NHÓM HIỆN TẠI =====
        try {
            await doMute(threadId, message.type, isMute);
            const status = isMute ? "TẮT (Mute)" : "BẬT (Unmute)";
            await api.sendMessage(`🔔 Đã ${status} thông báo cho nhóm này.`, threadId, message.type);
        } catch (e) {
            console.error("[TB] Lỗi:", e.message);
            await api.sendMessage(`❌ Lỗi khi thay đổi thông báo: ${e.message}`, threadId, message.type);
        }
    }
};
