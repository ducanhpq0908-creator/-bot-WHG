module.exports = {
    name: "ent",
    execute: async (api, message, args, config) => {
        const action = args[0] ? args[0].toLowerCase() : "";
        
        if (action === "quiz") {
            api.sendMessage("🧠 Câu đố: Con gì càng to càng nhỏ? (Tính năng demo)", message.threadId, message.type);
        } else if (action === "quote") {
            api.sendMessage("💬 Danh ngôn: Học, học nữa, học mãi! (Tính năng demo)", message.threadId, message.type);
        }
    }
};
