const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");

// Hàm mã hóa AES chuẩn của Zalo
function encodeAES(secretKey, data) {
    try {
        const key = Buffer.from(secretKey, 'hex');
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    } catch (e) {
        return null;
    }
}

// Hàm gửi tin nhắn ẩn (Glitch)
async function sendGlitchRequest(api, threadId, msgType, content, mentions, clientId) {
    const isGroupMessage = msgType === 1;
    const appContext = api.getContext ? api.getContext() : api;
    const secretKey = appContext.secretKey || "";
    const imei = appContext.imei || "";

    const params = {
        message: content,
        clientId: clientId,
        mentionInfo: mentions && mentions.length > 0 ? JSON.stringify(mentions) : undefined,
        imei: isGroupMessage ? undefined : imei,
        ttl: 0,
        toid: isGroupMessage ? undefined : threadId,
        grid: isGroupMessage ? threadId : undefined,
    };

    for (const key in params) {
        if (params[key] === undefined) delete params[key];
    }

    const encryptedParams = encodeAES(secretKey, JSON.stringify(params));
    if (!encryptedParams) return { error: "Failed to encrypt message" };

    let baseUrl = isGroupMessage ? "https://tt-group-wpa.chat.zalo.me" : "https://tt-chat-wpa.chat.zalo.me";
    const endpoint = isGroupMessage ? "/api/group/mention" : "/api/message/sms";
    const finalUrl = `${baseUrl}${endpoint}?zpw_ver=645&zpw_type=30`;

    let cookieString = "";
    if (appContext.cookies && Array.isArray(appContext.cookies)) {
        cookieString = appContext.cookies.map(c => `${c.key}=${c.value}`).join('; ');
    }

    try {
        const response = await axios.post(finalUrl, new URLSearchParams({ params: encryptedParams }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieString
            }
        });
        const result = response.data;
        if (result && result.error_code && result.error_code !== 0) {
            console.error(`[Bithuat Error] Code ${result.error_code}: ${result.error_message}`);
        }
        return result;
    } catch (error) {
        console.error(`[Bithuat Request Error] ${error.message}`);
        return { error: error.message };
    }
}

const runningBithuat = new Map();

module.exports = {
    name: "bithuat",
    description: "Tạo hiệu ứng tin nhắn ảo (Bí Thuật)",
    level: 2, // Chỉ Admin
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const msgType = message.type;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, msgType);
        
        const authorId = String(message?.data?.uidFrom || "");
        const prefix = config.prefix || "!";

        const argsContent = args.join(" ").trim();

        // 1. Nếu không có tham số -> Hiển thị hướng dẫn
        if (!argsContent) {
            const guide = [
                "👁️ HƯỚNG DẪN BÍ THUẬT",
                "──────────────────────",
                "📜 Cú pháp:",
                `${prefix}bithuat <nội dung> | <số lần> | <delay> | <mode>`,
                "💡 Ví dụ:",
                `${prefix}bithuat Chào cả nhà | 10 | 1000 | normal`,
                `${prefix}bithuat Chào mọi người 5 500 tag`,
                "──────────────────────",
                "⚡ Mode:",
                "- normal: Tin nhắn ẩn thường",
                "- tag: Tin ẩn + Tag All",
                "──────────────────────",
                `🛑 Dừng: ${prefix}bithuat stop`
            ].join("\n");
            return await sendMsg({ msg: guide, quote: message.data });
        }

        // 2. Xử lý lệnh stop
        if (argsContent.toLowerCase() === "stop") {
            if (runningBithuat.has(threadId)) {
                runningBithuat.delete(threadId);
                return await sendMsg({ msg: "✅ Đã dừng Bí Thuật trong nhóm này.", quote: message.data });
            }
            return await sendMsg({ msg: "⚠️ Không có Bí Thuật nào đang chạy.", quote: message.data });
        }

        // 3. Phân tích tham số
        let parts = [];
        if (argsContent.includes("|")) {
            parts = argsContent.split("|").map((p) => p.trim());
        } else {
            parts = argsContent.split(/\s+/).map((p) => p.trim());
        }

        if (parts.length < 3) {
            return await sendMsg({ msg: "❌ Sai định dạng! Cần 3 tham số: nội dung | số lần | delay_ms", quote: message.data });
        }

        const text = parts[0];
        const count = parseInt(parts[1]);
        const delay = parseInt(parts[2]);
        const mode = parts[3] ? parts[3].toLowerCase() : "normal";

        if (isNaN(count) || count <= 0) return await sendMsg({ msg: "❌ Số lần phải là số dương.", quote: message.data });
        if (isNaN(delay) || delay < 100) return await sendMsg({ msg: "❌ Delay tối thiểu là 100ms.", quote: message.data });

        const finalCount = Math.min(count, 500);
        const finalDelay = Math.max(delay, 100);

        if (runningBithuat.has(threadId)) {
            return await sendMsg({ msg: "⚠️ Đã có Bí Thuật đang chạy. Dùng 'bithuat stop' để dừng.", quote: message.data });
        }

        // 4. Chuẩn bị mentions
        let mentions = undefined;
        let finalText = text;
        if (mode === "tag" || mode === "1") {
            finalText = `@All ${text}`;
            mentions = [{ pos: 0, uid: "-1", len: 4, type: 1 }];
        }

        const clientId = Math.floor(Date.now() / 1000) * 600;

        // 5. Chạy vòng lặp ngầm
        runningBithuat.set(threadId, true);

        (async () => {
            for (let i = 0; i < finalCount; i++) {
                if (!runningBithuat.has(threadId)) break;
                
                try {
                    await sendGlitchRequest(api, threadId, msgType, finalText, mentions, clientId);
                } catch (e) {
                    console.error("[Bithuat] Lỗi:", e.message);
                }

                if (i < finalCount - 1) {
                    await new Promise((resolve) => setTimeout(resolve, finalDelay));
                }
            }

            if (runningBithuat.has(threadId)) {
                runningBithuat.delete(threadId);
            }
        })();
    }
};
