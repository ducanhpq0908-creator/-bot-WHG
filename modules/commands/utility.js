module.exports = {
    name: "util",
    execute: async (api, message, args, config) => {
        const action = args[0] ? args[0].toLowerCase() : "";
        
        if (action === "weather") {
            api.sendMessage(`🌤️ Thời tiết hôm nay: Nắng đẹp, 30°C (Tính năng demo)`, message.threadId, message.type);
        } else if (action === "rate") {
            api.sendMessage(`💵 Tỷ giá USD/VND: 25,000 VNĐ (Tính năng demo)`, message.threadId, message.type);
        } else if (action === "shorten") {
            api.sendMessage(`🔗 Link rút gọn: https://short.link/demo (Tính năng demo)`, message.threadId, message.type);
        }
    }
};
