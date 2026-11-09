const fs = require("fs");
const path = require("path");

global.TREO_THREADS = global.TREO_THREADS || new Map();
global.TREO_SETTINGS = global.TREO_SETTINGS || new Map();
const NGON_DIR = path.join(__dirname, "..", "ngon");

// Các bộ ký tự nghệ thuật
const fonts = {
    nghieng: {
        lower: "𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻",
        upper: "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡"
    },
    mophong: {
        lower: "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
        upper: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩"
    },
    vet: {
        lower: "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃", // Có thể thay font khác
        upper: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩"
    }
};

function applyFont(text, type) {
    if (type === "to") return text.toUpperCase();
    if (!fonts[type]) return text;

    const f = fonts[type];
    const normalLower = "abcdefghijklmnopqrstuvwxyz";
    const normalUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    return text.split("").map(char => {
        const idxLower = normalLower.indexOf(char);
        if (idxLower !== -1) return f.lower[idxLower];
        
        const idxUpper = normalUpper.indexOf(char);
        if (idxUpper !== -1) return f.upper[idxUpper];
        
        return char;
    }).join("");
}

module.exports = {
    name: "treo",
    description: "Quản lý treo nhóm",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) {
            return api.sendMessage({ msg: "❌ Bạn không có quyền sử dụng lệnh này.", quote: message.data }, message.threadId, message.type);
        }

        const action = args[0] ? args[0].toLowerCase() : "";
        const threadId = message.threadId;
        
        if (!fs.existsSync(NGON_DIR)) fs.mkdirSync(NGON_DIR);

        if (action === "create") {
            const fileName = args[1] ? args[1].toLowerCase().replace(".txt", "") : "";
            if (!fileName) return api.sendMessage({ msg: `Cú pháp: ${config.prefix}treo create <tên>`, quote: message.data }, threadId, message.type);
            
            const filePath = path.join(NGON_DIR, `${fileName}.txt`);
            if (fs.existsSync(filePath)) return api.sendMessage({ msg: "⚠️ File này đã tồn tại.", quote: message.data }, threadId, message.type);

            try {
                fs.writeFileSync(filePath, "");
                return api.sendMessage({ msg: `✅ Đã tạo file ngôn: ${fileName}.txt`, quote: message.data }, threadId, message.type);
            } catch (e) {
                return api.sendMessage({ msg: `❌ Lỗi: ${e.message}`, quote: message.data }, threadId, message.type);
            }
        }

        if (action === "list" && args[1] === "file") {
            const files = fs.readdirSync(NGON_DIR).filter(f => f.endsWith(".txt"));
            let msgText = `📁 **DANH SÁCH FILE NGÔN**\n━━━━━━━━━━━━━━━━━━━━\n`;
            files.forEach((f, i) => msgText += `${i + 1}. ${f.replace(".txt", "")}\n`);
            return api.sendMessage(msgText, threadId, message.type);
        }

        if (action === "chon") {
            const files = fs.readdirSync(NGON_DIR).filter(f => f.endsWith(".txt"));
            const index = parseInt(args[1]) - 1;
            
            if (isNaN(index) || index < 0 || index >= files.length) {
                return api.sendMessage({ msg: "⚠️ Số thứ tự không hợp lệ. Hãy xem danh sách bằng lệnh: treo list file", quote: message.data }, threadId, message.type);
            }

            const fileName = files[index].replace(".txt", "");
            let cfg = global.TREO_SETTINGS.get(threadId) || { delay: 1000, style: "thuong" };
            cfg.file = fileName;
            global.TREO_SETTINGS.set(threadId, cfg);
            
            return api.sendMessage({ msg: `✅ Đã chọn file: ${fileName}.txt.\nGõ 'treo on' để bắt đầu.`, quote: message.data }, threadId, message.type);
        }

        if (action === "add") {
            let cfg = global.TREO_SETTINGS.get(threadId) || { file: "main" };
            let fileName = cfg.file || "main";
            
            if (args.length > 2 && fs.existsSync(path.join(NGON_DIR, `${args[1]}.txt`))) {
                fileName = args[1];
                args.splice(1, 1);
            }

            const filePath = path.join(NGON_DIR, `${fileName}.txt`);
            let newNgon = "";
            
            if (message.data.quote) {
                newNgon = message.data.quote.msg || message.data.quote.content || "";
            } else if (args.length > 1) {
                newNgon = args.slice(1).join(" ");
            }

            if (!newNgon) return api.sendMessage({ msg: `Cú pháp: ${config.prefix}treo add [tên_file] <nội dung>`, quote: message.data }, threadId, message.type);

            try {
                fs.appendFileSync(filePath, newNgon + "\n", "utf-8");
                return api.sendMessage({ msg: `✅ Đã thêm vào ${fileName}.txt:\n${newNgon}`, quote: message.data }, threadId, message.type);
            } catch (e) {
                return api.sendMessage({ msg: `❌ Lỗi: ${e.message}`, quote: message.data }, threadId, message.type);
            }
        }

        if (action === "on") {
            let cfg = global.TREO_SETTINGS.get(threadId) || { delay: 1000, style: "thuong", file: "main" };
            const filePath = path.join(NGON_DIR, `${cfg.file}.txt`);
            
            if (!fs.existsSync(filePath)) return api.sendMessage({ msg: `⚠️ File ${cfg.file}.txt không tồn tại.`, quote: message.data }, threadId, message.type);

            if (global.TREO_THREADS.get(threadId) === true) return api.sendMessage({ msg: "⚠️ Đang treo rồi!", quote: message.data }, threadId, message.type);

            global.TREO_THREADS.set(threadId, true);
            await api.sendMessage({ msg: `🚀 Bật treo nhóm với file: ${cfg.file}.txt (Style: ${cfg.style})`, quote: message.data }, threadId, message.type);

            const loop = async () => {
                while (global.TREO_THREADS.get(threadId) === true) {
                    try {
                        let currentCfg = global.TREO_SETTINGS.get(threadId) || { delay: 1000, style: "thuong", file: "main" };
                        const cPath = path.join(NGON_DIR, `${currentCfg.file}.txt`);
                        if (!fs.existsSync(cPath)) {
                            await new Promise(r => setTimeout(r, 5000));
                            continue;
                        }

                        const data = fs.readFileSync(cPath, "utf8");
                        let lines = data.split("\n").filter(l => l.trim() !== "");
                        if (lines.length === 0) {
                            await new Promise(r => setTimeout(r, 5000));
                            continue;
                        }

                        let finalText = lines[Math.floor(Math.random() * lines.length)];
                        finalText = applyFont(finalText, currentCfg.style);

                        await api.sendMessage(finalText, threadId, message.type);
                        await new Promise(r => setTimeout(r, currentCfg.delay || 1000)); 
                    } catch (e) {
                        console.log("Lỗi treo:", e.message);
                        await new Promise(r => setTimeout(r, 2000)); 
                    }
                }
            };
            loop();
            return;
        }

        if (action === "stop" || action === "off") {
            if (global.TREO_THREADS.has(threadId)) {
                global.TREO_THREADS.set(threadId, false);
                return api.sendMessage({ msg: "⏹ Đã tắt treo nhóm.", quote: message.data }, threadId, message.type);
            }
            return api.sendMessage({ msg: "⚠️ Nhóm này hiện không bị treo.", quote: message.data }, threadId, message.type);
        }

        if (action === "delay") {
            const ms = parseInt(args[1]);
            if (isNaN(ms) || ms < 100) return api.sendMessage({ msg: "⚠️ Delay phải >= 100ms.", quote: message.data }, threadId, message.type);
            let cfg = global.TREO_SETTINGS.get(threadId) || { file: "main" };
            cfg.delay = ms;
            global.TREO_SETTINGS.set(threadId, cfg);
            return api.sendMessage({ msg: `✅ Đã đổi delay thành ${ms}ms`, quote: message.data }, threadId, message.type);
        }

        if (action === "style") {
            const style = args[1] ? args[1].toLowerCase() : "";
            if (!["thuong", "nghieng", "mophong", "vet", "to"].includes(style)) return api.sendMessage({ msg: "⚠️ Style: thuong, nghieng, mophong, vet, to", quote: message.data }, threadId, message.type);
            let cfg = global.TREO_SETTINGS.get(threadId) || { file: "main" };
            cfg.style = style;
            global.TREO_SETTINGS.set(threadId, cfg);
            return api.sendMessage({ msg: `✅ Đã đổi style thành: ${style}`, quote: message.data }, threadId, message.type);
        }

        return api.sendMessage({ msg: `**HƯỚNG DẪN TREO:**\n${config.prefix}treo create <tên> - Tạo file\n${config.prefix}treo list file - Xem file\n${config.prefix}treo chon <số> - Chọn file\n${config.prefix}treo add <nội dung> - Thêm\n${config.prefix}treo on/stop - Bật/Tắt\n${config.prefix}treo delay <ms> - Tốc độ\n${config.prefix}treo style <thuong/nghieng/mophong/vet/to>`, quote: message.data }, threadId, message.type);
    }
};
