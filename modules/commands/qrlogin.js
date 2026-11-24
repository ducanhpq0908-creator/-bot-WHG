const fs = require("fs");
const path = require("path");
const { Zalo } = require("zca-js");

const activeSessions = new Map();

const imageMetadataGetter = async (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return { width: 1000, height: 1000, size: stats.size };
    } catch (e) {
        return null;
    }
};

module.exports = {
    name: "qrlogin",
    description: "Lấy mã QR để lấy Cookie (Admin)",
    level: 2,
    execute: async (api, message, args, CFG) => {
        const threadId = message.threadId;
        const type = message.type;
        const senderUid = String(message.data.uidFrom);

        if (activeSessions.has(senderUid)) {
            const oldSession = activeSessions.get(senderUid);
            const timeSinceStarted = Date.now() - oldSession.startTime;

            if (timeSinceStarted > 5000) {
                oldSession.kill();
                activeSessions.delete(senderUid);
                console.log(`[QRLOGIN] Đã hủy phiên cũ của ${senderUid} sau ${Math.floor(timeSinceStarted/1000)}s.`);
            } else {
                return api.sendMessage({
                    msg: `⏳ Mã QR trước đang tạo. Vui lòng đợi thêm ${Math.ceil((5000 - timeSinceStarted)/1000)} giây để tạo mã mới!`,
                    quote: message.data
                }, threadId, type);
            }
        }

        const qrPath = path.join(__dirname, "..", `qr_${senderUid}.png`);
        if (fs.existsSync(qrPath)) {
            try { fs.unlinkSync(qrPath); } catch(e) {}
        }

        const zaloLogin = new Zalo({ imageMetadataGetter });

        let isSent = false;
        const checkQR = setInterval(async () => {
            if (!isSent && fs.existsSync(qrPath) && fs.statSync(qrPath).size > 1000) {
                isSent = true;
                clearInterval(checkQR);
                try {
                    // Gửi ẢNH + CHỮ trong cùng 1 tin nhắn
                    await api.sendMessage({
                        msg: "📸 QUÉT MÃ QR ĐỂ ĐĂNG NHẬP\n1️⃣ Zalo → Cá nhân → Quét QR\n2️⃣ Quét mã bên dưới\n3️⃣ Bấm XÁC NHẬN",
                        quote: message.data,
                        attachments: [path.resolve(qrPath)]
                    }, threadId, type);
                } catch(e) {
                    console.log("[QRLOGIN] Lỗi gửi ảnh:", e.message);
                }
            }
        }, 300);

        const originalLog = console.log;
        let hasNotifiedScan = false;

        console.log = function(...args) {
            const msgStr = args.join(" ");
            if (!hasNotifiedScan && (msgStr.includes("confirm") || msgStr.includes("Scanned") || msgStr.includes("Waiting"))) {
                hasNotifiedScan = true;
                api.sendMessage({
                    msg: "🔔 Hệ thống ghi nhận bạn đã quét mã QR. Vui lòng bấm XÁC NHẬN ĐĂNG NHẬP trên điện thoại!",
                    quote: message.data
                }, threadId, type).catch(() => {});
            }
            originalLog.apply(console, args);
        };

        const sessionState = {
            startTime: Date.now(),
            killed: false,
            kill: () => {
                sessionState.killed = true;
                clearInterval(checkQR);
                console.log = originalLog;
            }
        };
        activeSessions.set(senderUid, sessionState);

        zaloLogin.loginQR({ qrPath: qrPath }).then(async (apiUser) => {
            console.log = originalLog;
            clearInterval(checkQR);
            activeSessions.delete(senderUid);
            
            if (sessionState.killed) return;

            let imei = '', uid = '', cookies = {};
            try {
                const ctxUser = apiUser.getContext ? apiUser.getContext() : {};
                imei = ctxUser.imei || ''; uid = ctxUser.uid ? String(ctxUser.uid) : '';
                if (ctxUser.cookie) Object.assign(cookies, ctxUser.cookie);
            } catch (e) {}

            if (cookies.store && cookies.store.idx) {
                const flat = {};
                for (const dom in cookies.store.idx) for (const p in cookies.store.idx[dom]) for (const k in cookies.store.idx[dom][p]) {
                    const c = cookies.store.idx[dom][p][k];
                    if (c.value && c.value !== 'EXPIRED') { if (!flat[k] || dom === 'chat.zalo.me') flat[k] = c.value; }
                }
                cookies = flat;
            }
            const NEEDED = ['_zlang', 'zpsid', '__zi', 'zpw_sek', 'zpdid', 'zlogin_session', 'app.event.zalo.me'];
            const clean = {};
            for (const k of NEEDED) if (cookies[k]) clean[k] = cookies[k];

            const userConfig = `import json, os\ndef read_setting_value(key):\n    try:\n        with open('seting.json', 'r', encoding='utf-8') as f: return json.load(f).get(key)\n    except: return None\ndef read_prefix(): return read_setting_value('prefix') or "."\ndef read_admin(): return read_setting_value('admin') or "${uid}"\n\nIMEI = "${imei}"\nSESSION_COOKIES = ${JSON.stringify(clean, null, 4)}\nAPI_KEY = "api_key"\nSECRET_KEY = "secret_key"\nPREFIX = read_prefix()\nADMIN = read_admin()\n`;
            const savePath = path.join(__dirname, "..", `config_${uid}.py`);
            fs.writeFileSync(savePath, userConfig);

            await api.sendMessage({
                msg: `✅ Đăng nhập thành công!\n🆔 UID: ${uid}\n📁 Đây là file config.py của bạn:`,
                quote: message.data,
                attachments: [path.resolve(savePath)]
            }, threadId, type);

            try { fs.unlinkSync(qrPath); } catch(e) {}
        }).catch(async err => {
            console.log = originalLog;
            clearInterval(checkQR);
            activeSessions.delete(senderUid);
            if (sessionState.killed) return;
            
            console.log("[QRLOGIN] Lỗi đăng nhập:", err.message);
            await api.sendMessage({
                msg: "❌ Mã QR đã hết hạn hoặc có lỗi.",
                quote: message.data
            }, threadId, type);
        });
    }
};
