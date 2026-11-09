const fs = require("fs");
module.exports = {
    name: "adminext",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) return;
        const action = args[0] ? args[0].toLowerCase() : "";
        
        if (action === "reset") {
            config.prefix = "!";
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            api.sendMessage("🔄 Đã reset prefix về !", message.threadId, message.type);
        } else if (action === "lock") {
            api.sendMessage("🔒 Đã khóa nhóm (Tính năng demo)", message.threadId, message.type);
        } else if (action === "unlock") {
            api.sendMessage("🔓 Đã mở khóa nhóm (Tính năng demo)", message.threadId, message.type);
        }
    }
};
