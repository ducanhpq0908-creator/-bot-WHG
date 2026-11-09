const axios = require('axios');
module.exports = {
    name: "tool",
    description: "Rút gọn link (shorten)",
    role: "user",
    execute: async (api, message, args, config) => {
        if (args[0] === "shorten" && args[1]) {
            const longUrl = args[1];
            try {
                const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
                api.sendMessage(`🔗 **Link rút gọn:**\n${res.data}`, message.threadId, message.type);
            } catch (e) {
                api.sendMessage(`❌ Lỗi rút gọn link.`, message.threadId, message.type);
            }
        } else {
            api.sendMessage(`Cú pháp: !tool shorten <link>`, message.threadId, message.type);
        }
    }
};
