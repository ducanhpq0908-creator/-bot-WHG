const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
    name: "avt",
    description: "Lấy ảnh đại diện HD",
    role: "user",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        
        let targetUid = senderUid; 
        
        if (message.data.mentions && message.data.mentions.length > 0) {
            const validMentions = message.data.mentions.filter(m => String(m.uid) !== senderUid);
            if (validMentions.length > 0) targetUid = String(validMentions[0].uid);
        }
        else if (message.data.quote && message.data.quote.ownerId) {
            targetUid = String(message.data.quote.ownerId);
        }

        try {
            let avatarUrl = null;

            // 1. Lấy Avatar Full HD bằng API chuyên dụng (nếu có)
            try {
                const fullRes = await api.getFullAvatar(targetUid);
                // zca-js thường trả về { data: { fullAvatar: "url" } }
                if (fullRes && fullRes.data && fullRes.data.fullAvatar) {
                    avatarUrl = fullRes.data.fullAvatar;
                } else if (fullRes && fullRes.fullAvatar) {
                    avatarUrl = fullRes.fullAvatar;
                } else if (fullRes && fullRes.data && fullRes.data.url) {
                    avatarUrl = fullRes.data.url;
                }
            } catch (e) {
                console.log("[AVT] API getFullAvatar lỗi:", e.message);
            }

            // 2. Nếu không có, dùng getUserInfo (và thử đổi đuôi ảnh)
            if (!avatarUrl) {
                const res = await api.getUserInfo(targetUid);
                let rawAvatar = null;
                if (res && res.changed_profiles && res.changed_profiles[targetUid]) {
                    rawAvatar = res.changed_profiles[targetUid].avatar;
                } else if (res && res.avatar) {
                    rawAvatar = res.avatar;
                }

                if (rawAvatar) {
                    // Mẹo: Đổi đuôi avatar thumbnail thành ảnh gốc (nếu có)
                    // Zalo thường lưu ảnh nhỏ ở .../avatar/..., ảnh lớn ở .../full/...
                    if (rawAvatar.includes("/avatar/")) {
                        avatarUrl = rawAvatar.replace("/avatar/", "/full/");
                    } else {
                        avatarUrl = rawAvatar;
                    }
                }
            }

            if (!avatarUrl) {
                return api.sendMessage("❌ Không tìm thấy ảnh đại diện.", threadId, message.type);
            }

            // 3. Tải ảnh
            const tempPath = path.join(process.cwd(), "cache", `avt_${targetUid}_${Date.now()}.jpg`);
            const response = await axios({
                method: 'get',
                url: avatarUrl,
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 4. Gửi file
            await api.sendMessage({
                msg: `🖼️ Ảnh đại diện của UID ${targetUid}:`,
                attachments: [tempPath] 
            }, threadId, message.type);

            // 5. Xóa file
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        } catch (e) {
            console.error("[AVT] Lỗi:", e.message);
            return api.sendMessage(`❌ Lỗi: ${e.message}`, threadId, message.type);
        }
    }
};
