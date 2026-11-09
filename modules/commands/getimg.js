const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
    name: "getimg",
    description: "Lấy ảnh gốc chất lượng cao (Reply vào ảnh)",
    level: 1, // Ai cũng dùng được
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const msgType = message.type;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, msgType);

        // Kiểm tra xem tin nhắn có phải là reply (trả lời) một tin nhắn khác không
        const quote = message.data && message.data.quote;
        
        if (!quote) {
            return await sendMsg({ msg: "⚠️ Vui lòng reply (trả lời) vào tin nhắn chứa hình ảnh bạn muốn lấy gốc." });
        }

        // Lấy dữ liệu attach từ tin nhắn được quote
        let attachData = quote.attach || quote.content;
        
        if (typeof attachData === 'string') {
            try { attachData = JSON.parse(attachData); } catch (e) {}
        }
        
        // Phân tích params để lấy link HD
        let paramsObj = {};
        if (attachData && attachData.params) {
            if (typeof attachData.params === 'string') {
                try { paramsObj = JSON.parse(attachData.params); } catch (e) {}
            } else {
                paramsObj = attachData.params;
            }
        }

        // Ưu tiên lấy link HD (chất lượng cao nhất), nếu không có thì lấy href
        let imageUrl = paramsObj.hd || attachData.href || attachData.hd;

        if (!imageUrl) {
            return await sendMsg({ msg: "❌ Tin nhắn bạn reply không chứa hình ảnh hoặc không thể lấy link ảnh gốc." });
        }

        // Xóa các dấu gạch chéo ngược (escape) nếu có
        imageUrl = imageUrl.replace(/\\/g, "");

        await sendMsg({ msg: "⏳ Đang tải ảnh gốc (Original), vui lòng đợi..." });

        try {
            // Tải ảnh bằng axios
            const response = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const imgBuffer = Buffer.from(response.data, 'binary');

            // Gửi ảnh gốc lại vào nhóm
            await sendMsg({
                msg: "✅ Đây là ảnh gốc (Original):",
                attachments: [{ 
                    data: imgBuffer, 
                    filename: `original_${Date.now()}.jpg`, 
                    metadata: { 
                        totalSize: imgBuffer.length,
                        isOriginal: true 
                    } 
                }],
                quote: message.data
            });

        } catch (error) {
            console.error("[GETIMG] Lỗi:", error.message);
            await sendMsg({ msg: `❌ Lỗi khi tải ảnh gốc: ${error.message}` });
        }
    }
};
