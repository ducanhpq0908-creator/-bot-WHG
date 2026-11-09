const fs = require('fs');
const path = require('path');
const qrcodeTerminal = require('qrcode-terminal');
const { Zalo } = require('zca-js');
const Jimp = require('jimp');
const QrCode = require('qrcode-reader');

const AUTH_PATH = path.join(__dirname, 'zalo_auth.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const QR_PATH = path.join(__dirname, 'qr.png');

function getConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; }
}
function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

// Hàm đọc file qr.png và in ra terminal
function printQRFromFile() {
    if (!fs.existsSync(QR_PATH)) return;
    Jimp.read(QR_PATH, (err, image) => {
        if (err) return console.error("Lỗi đọc ảnh QR:", err);
        const qr = new QrCode();
        qr.callback = (err, value) => {
            if (err) return console.error("Lỗi giải mã QR:", err);
            process.stdout.write('\x1Bc'); // Xóa màn hình cũ
            console.log("===========================================");
            console.log("   QUÉT MÃ QR BẰNG ỨNG DỤNG ZALO TRÊN ĐT   ");
            console.log("===========================================\n");
            qrcodeTerminal.generate(value.result, { small: true });
            console.log("\n[*] Mã QR có hiệu lực ~60 giây.");
        };
        qr.decode(image.bitmap);
    });
}

async function startLogin() {
    const zalo = new Zalo();
    
    // 1. Thử load session cũ
    if (fs.existsSync(AUTH_PATH)) {
        try {
            console.log("[*] Đang thử đăng nhập bằng zalo_auth.json...");
            const sessionData = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf-8'));
            const api = await zalo.login(sessionData);
            console.log("[+] Đăng nhập thành công!");
            return api;
        } catch (e) {
            console.log("[!] Session cũ hết hạn. Cần quét QR mới.");
        }
    }

    // 2. Đăng nhập QR
    console.log("[*] Đang khởi tạo đăng nhập QR...");
    
    // Xóa file qr.png cũ nếu có
    if (fs.existsSync(QR_PATH)) fs.unlinkSync(QR_PATH);

    return new Promise(async (resolve, reject) => {
        try {
            const api = await zalo.loginQR();

            // Lắng nghe sự kiện zca-js
            if (api.listener) {
                // zca-js tự tạo file qr.png, ta theo dõi file để in ra
                let qrInterval = setInterval(() => {
                    if (fs.existsSync(QR_PATH)) {
                        printQRFromFile();
                        clearInterval(qrInterval); // Chỉ in 1 lần
                    }
                }, 1000);

                api.listener.once('ready', async () => {
                    clearInterval(qrInterval);
                    console.log("\n[+] Đăng nhập QR thành công!");

                    // Lưu session
                    try {
                        const session = api.getSession ? api.getSession() : (api.session || api.getContext());
                        if (session) {
                            fs.writeFileSync(AUTH_PATH, JSON.stringify(session, null, 2), 'utf-8');
                            console.log("[+] Đã lưu zalo_auth.json");
                        }
                    } catch (e) {}

                    // Auto admin
                    try {
                        const info = await api.getOwnInfo();
                        const botId = info?.data?.userId || info?.userId || info?.uid;
                        if (botId) {
                            let cfg = getConfig();
                            if (!cfg.admins) cfg.admins = [];
                            if (!cfg.admins.includes(botId)) {
                                cfg.admins.push(botId);
                                cfg.owner = botId;
                                saveConfig(cfg);
                                console.log(`[+] Đã set Admin: ${botId}`);
                            }
                        }
                    } catch (e) {}

                    resolve(api);
                });

                api.listener.start();
            } else {
                resolve(api);
            }
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { startLogin };
