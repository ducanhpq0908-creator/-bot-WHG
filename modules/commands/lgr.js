const fs = require("fs");
const path = require("path");

module.exports = {
    name: "lgr",
    description: "Xem danh sách nhóm và trạng thái duyệt (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) {
            return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này.", threadId, message.type);
        }

        // 1. Đọc dữ liệu duyệt box
        const dataPath = path.join(__dirname, "..", "cache", "duyetboxdata.json");
        let duyetData = [];
        try {
            if (fs.existsSync(dataPath)) {
                duyetData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
                if (!Array.isArray(duyetData)) duyetData = [];
            }
        } catch (e) {
            console.log("[LGR] Lỗi đọc duyetboxdata.json:", e.message);
        }

        // 2. Lấy danh sách nhóm
        const excludedGroupId = "4009464343109121790";
        let allGroups = {};
        
        try {
            if (typeof api.getAllGroups === "function") {
                const res = await api.getAllGroups();
                // Sửa lại logic bóc tách dữ liệu
                if (res.gridInfoMap) {
                    allGroups = res.gridInfoMap; // Một số bản zca-js trả về tên trong này
                } else if (res.gridVerMap) {
                    allGroups = res.gridVerMap; // Bản cũ chỉ trả về ID
                } else {
                    allGroups = res;
                }
            }
        } catch (e) {
            return api.sendMessage(`❌ Lỗi lấy danh sách nhóm: ${e.message}`, threadId, message.type);
        }

        const groupList = [];
        for (const groupId of Object.keys(allGroups)) {
            if (groupId === excludedGroupId) continue;
            
            let groupInfo = allGroups[groupId];
            
            // Nếu groupInfo chỉ là một số (version) hoặc không có tên, ta phải gọi thêm API
            let groupName = groupInfo.name || groupInfo.groupName;
            
            if (!groupName) {
                try {
                    const infoRes = await api.getGroupInfo(groupId);
                    const infoMap = infoRes.gridInfoMap || infoRes;
                    if (infoMap && infoMap[groupId]) {
                        groupName = infoMap[groupId].name || "Không có tên";
                    }
                } catch (e) {
                    groupName = "Lỗi lấy tên";
                }
            }
            
            if (!groupName) groupName = "Không rõ tên";

            const status = duyetData.includes(groupId) ? "Đã duyệt" : "Chưa duyệt";
            
            groupList.push(`Tên nhóm: ${groupName}\nID nhóm: ${groupId}\nTrạng thái: ${status}\n`);
        }

        if (groupList.length === 0) {
            return api.sendMessage("• Bạn không có nhóm nào để hiển thị.", threadId, message.type);
        }

        // 3. Tạo tin nhắn tổng hợp
        let fullMessage = "[ DANH SÁCH NHÓM ]\n\n";
        groupList.forEach((info, i) => {
            fullMessage += `${i + 1}.\n${info}\n`;
        });

        // 4. Chia nhỏ tin nhắn
        const MAX_LENGTH = 3000;
        if (fullMessage.length <= MAX_LENGTH) {
            await api.sendMessage(fullMessage, threadId, message.type);
        } else {
            const parts = [];
            for (let i = 0; i < fullMessage.length; i += MAX_LENGTH) {
                parts.push(fullMessage.substring(i, i + MAX_LENGTH));
            }
            
            for (let i = 0; i < parts.length; i++) {
                await api.sendMessage(parts[i], threadId, message.type);
                if (i < parts.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }
    }
};
