const fs = require("fs");
const path = require("path");

module.exports = {
    name: "antispam",
    description: "Bật/Tắt chống spam (on/off)",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) return;
        
        const status = args[0] ? args[0].toLowerCase() : "";
        if (status !== "on" && status !== "off") return api.sendMessage(`Cú pháp: ${config.prefix}antispam on/off`, message.threadId, message.type);

        const secPath = path.join(__dirname, "..", "security.json");
        let sec = { antilink: [], antispam: [], spam_threshold: 2, spam_window: 1 };
        try { sec = JSON.parse(fs.readFileSync(secPath, "utf8")); } catch (e) {}

        if (status === "on") {
            if (!sec.antispam.includes(message.threadId)) {
                sec.antispam.push(message.threadId);
            }
        } else {
            sec.antispam = sec.antispam.filter(id => id !== message.threadId);
        }

        fs.writeFileSync(secPath, JSON.stringify(sec, null, 4));
        api.sendMessage(`✅ Đã ${status === "on" ? "BẬT" : "TẮT"} chống spam cho nhóm này.`, message.threadId, message.type);
    }
};
