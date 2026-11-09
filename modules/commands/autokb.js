module.exports = {
    name: "autokb",
    description: "Bật/Tắt tự động chấp nhận kết bạn",
    role: "admin",
    execute: async (api, message, args, config) => {
        const action = (args[0] || "").toLowerCase();
        const threadId = message.threadId;
        
        // Ghi cấu hình vào file
        const fs = require("fs");
        const path = require("path");
        const CFG_FILE = path.join(__dirname, "..", "cache", "autokb.json");
        
        let cfg = { enabled: false };
        try { cfg = JSON.parse(fs.readFileSync(CFG_FILE, "utf8")); } catch {}

        if (action === "on") {
            cfg.enabled = true;
            fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 4));
            return api.sendMessage("✅ Đã BẬT tự động kết bạn.", threadId, message.type);
        }
        if (action === "off") {
            cfg.enabled = false;
            fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 4));
            return api.sendMessage("✅ Đã TẮT tự động kết bạn.", threadId, message.type);
        }
        
        return api.sendMessage(`Trạng thái: ${cfg.enabled ? "BẬT" : "TẮT"}\nCú pháp: ${config.prefix}autokb on/off`, threadId, message.type);
    }
};