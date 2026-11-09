const fs = require("fs");
const path = require("path");

// Lưu cache đường dẫn ảnh để không phải quét lại thư mục mỗi lần có người gõ lệnh
let cachedImages = null;
let lastCacheTime = 0;

module.exports = {
    name: "menu",
    description: "Xem danh sách lệnh (VD: !menu, !menu 2)",
    level: 1,
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, message.type);
        
        const rootDir = path.join(__dirname, "..", "..");
        const cacheDir = path.join(rootDir, "cache");

        try {
            const now = Date.now();
            // Chỉ quét thư mục 1 lần duy nhất. Nếu quá 30s mới quét lại (để cập nhật nếu có thêm ảnh)
            if (!cachedImages || now - lastCacheTime > 30000) {
                if (!fs.existsSync(cacheDir)) {
                    return await sendMsg({ msg: "❌ Thư mục cache không tồn tại." });
                }
                cachedImages = fs.readdirSync(cacheDir)
                    .filter(f => f.startsWith("menu_") && f.endsWith(".png"))
                    .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || 0) - parseInt(b.match(/\d+/)?.[0] || 0));
                lastCacheTime = now;
            }

            if (cachedImages.length === 0) {
                return await sendMsg({ msg: "❌ Không tìm thấy ảnh menu nào." });
            }

            let pageToSend = 1;
            if (args[0] && !isNaN(args[0])) pageToSend = parseInt(args[0]);

            if (pageToSend < 1 || pageToSend > cachedImages.length) {
                return await sendMsg({ msg: `⚠️ Menu chỉ có từ trang 1 đến ${cachedImages.length}.` });
            }

            const imgFile = cachedImages[pageToSend - 1];
            const imgPath = path.join(cacheDir, imgFile);
            const imgBuffer = fs.readFileSync(imgPath);
            
            // Gửi bằng Buffer để tốc độ nhanh nhất
            await sendMsg({
                msg: "",
                attachments: [{ 
                    data: imgBuffer, 
                    filename: imgFile, 
                    metadata: { totalSize: imgBuffer.length } 
                }]
            });

        } catch (e) {
            console.error("[MENU] Lỗi khi gửi ảnh:", e.message);
            await sendMsg({ msg: `❌ Lỗi khi lấy ảnh menu: ${e.message}` });
        }
    }
};
