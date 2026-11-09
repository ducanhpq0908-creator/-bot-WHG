const axios = require('axios');
module.exports = {
    name: "media",
    description: "Tìm ảnh (image)",
    role: "user",
    execute: async (api, message, args, config) => {
        const action = args[0];
        const query = args.slice(1).join(" ");
        
        if (action === "image" && query) {
            try {
                // Lấy token
                const tokenRes = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
                const vqdMatch = tokenRes.data.match(/vqd="([^"]+)"/) || tokenRes.data.match(/vqd=([\d-]+)/);
                if (!vqdMatch) throw new Error("Không lấy được token");

                // Gọi API tìm ảnh
                const imgRes = await axios.get(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}&f=,,,&p=1`);
                const imgUrl = imgRes.data.results[0].image;
                
                await api.sendMessage({
                    msg: `🖼️ Kết quả cho: **${query}**`,
                    attachments: [{ url: imgUrl }]
                }, message.threadId, message.type);

            } catch (e) {
                api.sendMessage(`❌ Không tìm thấy ảnh hoặc lỗi API.`, message.threadId, message.type);
            }
        } else {
            api.sendMessage(`Cú pháp: !media image <từ khóa>`, message.threadId, message.type);
        }
    }
};
