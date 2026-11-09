const fs = require("fs");
const path = require("path");
const axios = require("axios");

const SETTINGS_FILE = path.join(__dirname, "..", "cache", "autojoin_settings.json");
const JOINED_FILE = path.join(__dirname, "..", "cache", "autojoin_joined.json");

function loadJSON(file, def) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return def; }
}
function saveJSON(file, data) {
    try { fs.writeFileSync(file, JSON.stringify(data, null, 4)); } catch {}
}

module.exports = {
    name: "autojoin",
    description: "Tự động tham gia nhóm qua link (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;
        const rawContent = message.data.content;
        const text = typeof rawContent === "string" ? rawContent : (rawContent && (rawContent.href || rawContent.link || rawContent.text) ? (rawContent.href || rawContent.link || rawContent.text) : "");
        const action = (args && args[0]) ? String(args[0]).toLowerCase() : "";

        // ===== LỆNH BẬT/TẮT =====
        if (action === "on" || action === "off") {
            if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
            
            const settings = loadJSON(SETTINGS_FILE, {});
            let allGroups = {};
            try {
                const res = await api.getAllGroups();
                allGroups = res.gridVerMap || res;
            } catch (e) {
                return api.sendMessage(`❌ Lỗi lấy danh sách nhóm: ${e.message}`, threadId, message.type);
            }

            const status = action === "on";
            for (const gid of Object.keys(allGroups)) {
                settings[String(gid)] = status;
            }
            saveJSON(SETTINGS_FILE, settings);
            
            return api.sendMessage(`🚦 Đã ${status ? "BẬT" : "TẮT"} autojoin cho ${Object.keys(allGroups).length} nhóm.`, threadId, message.type);
        }

        // ===== TỰ ĐỘNG QUÉT LINK =====
        if (message.type !== 1 || !text) return;
        
        const settings = loadJSON(SETTINGS_FILE, {});
        const groupSetting = settings[String(threadId)];
        if (groupSetting === false) return; 

        const linkRegex = /https:\/\/zalo\.me\/g\/([a-zA-Z0-9]+)/g;
        let match;
        const links = [];
        while ((match = linkRegex.exec(text)) !== null) {
            links.push({ full: match[0], code: match[1] });
        }

        if (links.length === 0) return;

        const joinedList = loadJSON(JOINED_FILE, []);
        let currentGroupIds = [];
        
        try {
            const res = await api.getAllGroups();
            const groups = res.gridVerMap || res;
            currentGroupIds = Object.keys(groups);
        } catch (e) {
            console.log("[AUTOJOIN] Không lấy được danh sách nhóm hiện tại.");
        }

        for (const link of links) {
            let needJoin = true;

            // 1. Kiểm tra nếu link đã từng tham gia
            if (joinedList.includes(link.code)) {
                let realGroupId = null;
                try {
                    const gInfo = await api.getGroupLinkInfo(link.code, link.full);
                    realGroupId = gInfo?.groupId || gInfo?.data?.groupId;
                } catch (e) {}

                if (realGroupId && currentGroupIds.includes(String(realGroupId))) {
                    console.log(`[AUTOJOIN] Bỏ qua link đã vào và vẫn còn trong nhóm: ${link.code}`);
                    needJoin = false; // Vẫn còn trong nhóm -> Bỏ qua
                } else {
                    console.log(`[AUTOJOIN] Link ${link.code} đã bị out/kick. Sẽ join lại...`);
                    const idx = joinedList.indexOf(link.code);
                    if (idx > -1) joinedList.splice(idx, 1);
                    saveJSON(JOINED_FILE, joinedList);
                    needJoin = true; // Bị kick -> Join lại
                }
            }

            if (!needJoin) continue;

            // 2. Kiểm tra link còn sống không
            console.log(`[AUTOJOIN] Phát hiện link mới: ${link.full}`);
            let isAlive = false;
            try {
                const res = await axios.get(link.full, { timeout: 5000 });
                if (res.status === 200) isAlive = true;
            } catch (e) {
                console.log(`[AUTOJOIN] Link chết hoặc lỗi mạng: ${e.message}`);
            }

            if (!isAlive) continue;

            // 3. Gửi yêu cầu tham gia
            try {
                console.log(`[AUTOJOIN] Đang gửi yêu cầu tham gia nhóm: ${link.code}...`);
                const joinRes = await api.joinGroupLink(link.full); 
                
                console.log(`[AUTOJOIN] Tham gia thành công link: ${link.code}`);
                joinedList.push(link.code);
                saveJSON(JOINED_FILE, joinedList);
            } catch (e) {
                console.log(`[AUTOJOIN] Lỗi tham gia nhóm ${link.code}: ${e.message}`);
            }
        }
    }
};
