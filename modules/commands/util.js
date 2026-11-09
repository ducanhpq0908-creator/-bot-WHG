const axios = require('axios');
module.exports = {
    name: "util",
    description: "Tiện ích (weather, rate)",
    role: "user",
    execute: async (api, message, args, config) => {
        const action = args[0];
        
        if (action === "weather") {
            try {
                const city = args.slice(1).join(" ") || "Hanoi";
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
                const temp = res.data.current_condition[0].temp_C;
                const desc = res.data.current_condition[0].weatherDesc[0].value;
                api.sendMessage(`🌤️ **Thời tiết ${city}:**\nNhiệt độ: ${temp}°C\nTrạng thái: ${desc}`, message.threadId, message.type);
            } catch (e) {
                api.sendMessage("❌ Lỗi lấy thời tiết.", message.threadId, message.type);
            }
        } else if (action === "rate") {
            try {
                const res = await axios.get('https://open.er-api.com/v6/latest/USD');
                const vnd = res.data.rates.VND;
                api.sendMessage(`💵 **Tỷ giá USD/VND:**\n1 USD = ${vnd} VNĐ`, message.threadId, message.type);
            } catch (e) {
                api.sendMessage("❌ Lỗi lấy tỷ giá.", message.threadId, message.type);
            }
        } else {
            api.sendMessage(`Cú pháp:\n!util weather <thành phố>\n!util rate`, message.threadId, message.type);
        }
    }
};
