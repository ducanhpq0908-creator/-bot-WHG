const fs = require("fs");
const path = require("path");
const CFG_FILE = path.join(__dirname, "..", "cache", "autoduyet_settings.json");

function loadSettings() {
    try { return JSON.parse(fs.readFileSync(CFG_FILE, "utf8")); } catch { return {}; }
}
function saveSettings(data) {
    try { fs.writeFileSync(CFG_FILE, JSON.stringify(data, null, 4)); } catch {}
}

module.exports = {
    name: "autoduyet",
    description: "Bật/Tắt tự động duyệt thành viên",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const action = (args[0] || "").toLowerCase();
        const settings = loadSettings();

        if (action === "on") {
            settings[threadId] = true;
            saveSettings(settings);
            return api.sendMessage("✅ Đã BẬT tự động duyệt thành viên cho nhóm này.", threadId, message.type);
        }
        
        if (action === "off") {
            settings[threadId] = false;
            saveSettings(settings);
            return api.sendMessage("✅ Đã TẮT tự động duyệt thành viên.", threadId, message.type);
        }

        return api.sendMessage(`Cú pháp: ${config.prefix}autoduyet on/off`, threadId, message.type);
    }
};
