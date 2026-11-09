const { Zalo } = require("zca-js");
const fs = require("fs");
const path = require("path");

// Cấu hình đường dẫn
const QR_JS_DIR = path.join(__dirname, "..", "qrlogin_js");
const SESSION_FILE = path.join(QR_JS_DIR, "session.json");
const STATUS_FILE = path.join(QR_JS_DIR, "status.json");
const TTL = 300000;

// Hàm làm phẳng Cookie (Port từ Python)
function flattenCookies(c) {
    if (!c || typeof c !== 'object') return {};
    if (!c.store) return c;
    
    const idx = c.store.idx || {};
    const flat = {};
    
    for (const domain in idx) {
        for (const p in idx[domain]) {
            for (const key in idx[domain][p]) {
                const v = idx[domain][p][key];
                if (v.value && v.value !== "EXPIRED") {
                    if (!flat[key] || domain === "chat.zalo.me") {
                        flat[key] = v.value;
                    }
                }
            }
        }
    }
    return flat;
}

// Đảm bảo có đủ cookie cơ bản
function ensureFull(c) {
    const r = { ...c };
    if (!r["_zlang"]) r["_zlang"] = "vn";
    return r;
}

// Hàm đọc file JSON an toàn
function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return {}; }
}

module.exports = {
    name: "qrlogin",
    description: "Đăng nhập Zalo bằng mã QR (Admin)",
    execute: async (api, message, args, config) => {
        // Kiểm tra quyền Admin
        if (!config.admin_uids.includes(message.data.uidFrom)) {
            return api.sendMessage("🚦 Chỉ Admin mới được dùng lệnh này!", message.threadId, message.type);
        }

        // Khởi tạo thư mục nếu chưa có
        if (!fs.existsSync(QR_JS_DIR)) fs.mkdirSync(QR_JS_DIR, { recursive: true });

        await api.sendMessage("⏳ Đang tạo mã QR đăng nhập...", message.threadId, message.type);

        const zalo = new Zalo();
        
        try {
            // Xóa session/status cũ
            if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
            if (fs.existsSync(STATUS_FILE)) fs.unlinkSync(STATUS_FILE);

            const apiQR = await zalo.loginQR({}, async (qrData) => {
                let imgBuffer = null;
                try {
                    if (qrData && qrData.data && qrData.data.image) {
                        imgBuffer = Buffer.from(qrData.data.image, 'base64');
                    } else if (typeof qrData === 'string' && qrData.length > 100) {
                        imgBuffer = Buffer.from(qrData, 'base64');
                    }
                } catch (e) {}

                if (imgBuffer) {
                    try {
                        await api.sendMessage({
                            msg: "📱 QUÉT MÃ QR ĐỂ ĐĂNG NHẬP\n1️⃣ Zalo → Cá nhân → Quét QR\n2️⃣ Quét QR này\n3️⃣ Bấm XÁC NHẬN\n⏳ Hết hạn sau 100s!",
                            attachments: [{
                                data: imgBuffer,
                                filename: "qr_code.png",
                                metadata: { totalSize: imgBuffer.length, width: 300, height: 300 }
                            }]
                        }, message.threadId, message.type);
                    } catch (err) {}
                }
            });

            let confirmed = false;
            const checkInterval = setInterval(async () => {
                try {
                    // Báo khi xác nhận
                    if (!confirmed) {
                        const ctx = apiQR.getContext();
                        if (ctx && ctx.session && ctx.session.cookies && ctx.session.cookies.zpsid) {
                            confirmed = true;
                            await api.sendMessage("✅ Đã xác nhận! Đang lấy cookie...", message.threadId, message.type);
                        }
                    }

                    const botUid = apiQR.getOwnId();
                    if (botUid && botUid !== "0" && botUid !== "undefined") {
                        clearInterval(checkInterval); 

                        const imei = apiQR.getContext().imei;
                        const rawCookies = apiQR.getContext().cookie || (apiQR.getContext().session ? apiQR.getContext().session.cookies : {});
                        
                        // Bóc tách Cookie qua hàm làm phẳng
                        let cookies = flattenCookies(rawCookies);
                        cookies = ensureFull(cookies);

                        if (!imei || Object.keys(cookies).length === 0) {
                            return api.sendMessage("❌ IMEI hoặc Cookies rỗng.", message.threadId, message.type);
                        }

                        // Lưu session ra file (để dùng cho bot con nếu cần)
                        fs.writeFileSync(SESSION_FILE, JSON.stringify({ uid: botUid, imei, cookies }, null, 4));

                        // Tạo nội dung tin nhắn
                        const cookiesJson = JSON.stringify(cookies, null, 2);
                        const result = `✅ ĐĂNG NHẬP THÀNH CÔNG\n━━━━━━━━━━━━━━━━━━━━━\n🆔 UID: ${botUid}\n\n🔑 IMEI:\n${imei}\n\n🍪 COOKIES:\n${cookiesJson}\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ Giữ bí mật!`;

                        // Cắt nhỏ tin nhắn nếu quá dài (Zalo giới hạn 2000 ký tự)
                        if (result.length > 1900) {
                            for (let i = 0; i < result.length; i += 1900) {
                                await api.sendMessage({ msg: result.slice(i, i + 1900), quote: message.data }, message.threadId, message.type);
                            }
                        } else {
                            await api.sendMessage({ msg: result, quote: message.data }, message.threadId, message.type);
                        }
                    }
                } catch (e) {}
            }, 1000);

        } catch (e) {
            console.error("Lỗi QR Login:", e);
            api.sendMessage(`❌ Lỗi tạo QR Login: ${e.message}`, message.threadId, message.type);
        }
    }
};
