const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", "modules", "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CONFIG_PATH = path.join(CACHE_DIR, "adv_config.json");
const STATUS_PATH = path.join(CACHE_DIR, "adv_status.json");
const DISABLE_PATH = path.join(CACHE_DIR, "adv_disable.json");
const CARD_PATH = path.join(CACHE_DIR, "adv_card.json");

function loadJson(p, def) {
    try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
    return def;
}
function saveJson(p, data) {
    try { fs.writeFileSync(p, JSON.stringify(data, null, 4)); } catch (e) {}
}

let schedulerStarted = false;

// Hàm gửi Card chuẩn của zca-js
// Hàm gửi Card sử dụng Avatar của chính Bot làm QRCodeUrl để click được
// Hàm gửi Card nguyên bản của zca-js
async function sendCardHelper(api, threadId, type, cardConfig) {
    try {
        if (!cardConfig.user_id) return false;

        await api.sendCard({
            userId: cardConfig.user_id,
            phoneNumber: cardConfig.phone || ""
        }, threadId, type);
        return true;
    } catch (err) {
        console.log(`[ADV-ERROR] Lỗi gửi danh thiếp: ${err.message}`);
        return false;
    }
}

function startAdvScheduler(api) {
    if (schedulerStarted) return;
    schedulerStarted = true;
    
    setInterval(async () => {
        const status = loadJson(STATUS_PATH, { on: false, interval_min: 60, last_adv_time: 0 });
        if (!status.on) return;

        const intervalMs = status.interval_min * 60 * 1000;
        const now = Date.now();
        
        if (now - status.last_adv_time >= intervalMs) {
            const config = loadJson(CONFIG_PATH, {});
            const advDisable = loadJson(DISABLE_PATH, []);
            const cardConfig = loadJson(CARD_PATH, { enabled: false, user_id: null, phone: null });

            if (!config.content) return console.log("[ADV] Chưa có nội dung quảng cáo.");
            
            status.last_adv_time = now;
            saveJson(STATUS_PATH, status);

            try {
                let groups = {};
                if (typeof api.getAllGroups === "function") {
                    const res = await api.getAllGroups();
                    groups = res.gridVerMap || res; 
                } else if (api.getGroupList) {
                    groups = await api.getGroupList();
                }

                let success = 0;
                for (const groupId of Object.keys(groups)) {
                    if (advDisable.includes(groupId)) continue;
                    
                    try {
                        await api.sendMessage({ msg: config.content }, groupId, 1);
                        
                        if (cardConfig.enabled && cardConfig.user_id) {
                            await sendCardHelper(api, groupId, 1, cardConfig);
                        }
                        
                        success++;
                        await new Promise(r => setTimeout(r, 500)); 
                    } catch (e) {
                        console.log(`[ADV] Lỗi gửi nhóm ${groupId}: ${e.message}`);
                    }
                }
                console.log(`[ADV] Đã rãi xong. Thành công: ${success}`);
            } catch (e) {
                console.log("[ADV] Lỗi lấy danh sách nhóm:", e.message);
            }
        }
    }, 1000); 
}

module.exports = {
    name: "adv",
    execute: async (api, message, args, CFG) => {
        startAdvScheduler(api);
        
        const threadId = message.threadId;
        const type = message.type;
        const senderUid = String(message.data.uidFrom);
        const isAdmin = (CFG.admin_uids || []).map(String).includes(senderUid);

        if (!isAdmin) return api.sendMessage("🚫 Chỉ admin mới dùng được lệnh này!", threadId, type);

        const cmd = args[0] ? args[0].toLowerCase() : "";
        
        let config = loadJson(CONFIG_PATH, {});
        let status = loadJson(STATUS_PATH, { on: false, interval_min: 60, last_adv_time: 0 });
        let advDisable = loadJson(DISABLE_PATH, []);
        let cardConfig = loadJson(CARD_PATH, { enabled: false, user_id: null, phone: null });

        const prefix = CFG.prefix || "!";

        if (!cmd) {
            const help = `Hướng dẫn lệnh ${prefix}adv:\n` +
                `➜ ${prefix}adv on / off\n` +
                `➜ ${prefix}adv set <nội dung>\n` +
                `➜ ${prefix}adv setcard <uid> <phone/text>\n` +
                `➜ ${prefix}adv card (Bật/tắt)\n` +
                `➜ ${prefix}adv interval <phút>\n` +
                `➜ ${prefix}adv disable / enable\n` +
                `➜ ${prefix}adv info`;
            return api.sendMessage(help, threadId, type);
        }

        if (cmd === "set") {
            if (args.length < 2) return api.sendMessage("Vui lòng nhập nội dung.", threadId, type);
            config.content = args.slice(1).join(" ");
            saveJson(CONFIG_PATH, config);
            return api.sendMessage(`📝 Đã đặt nội dung: ${config.content}`, threadId, type);
        }

        if (cmd === "setcard") {
            if (args.length < 3) return api.sendMessage("Cú pháp: !adv setcard <uid> <phone/text>", threadId, type);
            const targetId = args[1];
            const phoneContent = args.slice(2).join(" ");
            cardConfig.user_id = targetId;
            cardConfig.phone = phoneContent;
            saveJson(CARD_PATH, cardConfig);
            return api.sendMessage(`📇 Đã đặt danh thiếp:\nUID: ${targetId}\nText: ${phoneContent}`, threadId, type);
        }

        if (cmd === "card") {
            cardConfig.enabled = !cardConfig.enabled;
            saveJson(CARD_PATH, cardConfig);
            return api.sendMessage(`📇 Đã ${cardConfig.enabled ? "bật" : "tắt"} gửi kèm danh thiếp!`, threadId, type);
        }

        if (cmd === "interval") {
            const min = parseInt(args[1]);
            if (isNaN(min) || min <= 0) return api.sendMessage("Số phút không hợp lệ.", threadId, type);
            status.interval_min = min;
            saveJson(STATUS_PATH, status);
            return api.sendMessage(`⏰ Đã đặt chu kỳ: ${min} phút!`, threadId, type);
        }

        if (cmd === "disable") {
            const gid = args[1] || threadId;
            if (!advDisable.includes(gid)) {
                advDisable.push(gid);
                saveJson(DISABLE_PATH, advDisable);
                return api.sendMessage(`🚫 Đã tắt quảng cáo nhóm ${gid}!`, threadId, type);
            }
            return api.sendMessage(`Nhóm ${gid} đã tắt từ trước.`, threadId, type);
        }

        if (cmd === "enable") {
            const gid = args[1] || threadId;
            if (advDisable.includes(gid)) {
                advDisable = advDisable.filter(id => id !== gid);
                saveJson(DISABLE_PATH, advDisable);
                return api.sendMessage(`✅ Đã bật lại quảng cáo nhóm ${gid}!`, threadId, type);
            }
            return api.sendMessage(`Nhóm ${gid} chưa từng bị tắt.`, threadId, type);
        }

        if (cmd === "on") {
            if (status.on) return api.sendMessage("Quảng cáo đã bật sẵn!", threadId, type);
            status.on = true;
            status.last_adv_time = 0; 
            saveJson(STATUS_PATH, status);
            return api.sendMessage("🚀 Đã bật quảng cáo! Đang tiến hành gửi...", threadId, type);
        }

        if (cmd === "off") {
            if (!status.on) return api.sendMessage("Quảng cáo đã tắt sẵn!", threadId, type);
            status.on = false;
            saveJson(STATUS_PATH, status);
            return api.sendMessage("💤 Đã tắt quảng cáo!", threadId, type);
        }

        if (cmd === "info") {
            let groupCount = 0;
            try {
                let groups = {};
                if (typeof api.getAllGroups === "function") {
                    const res = await api.getAllGroups();
                    groups = res.gridVerMap || res; 
                } else if (api.getGroupList) {
                    groups = await api.getGroupList();
                }
                groupCount = Object.keys(groups).length;
            } catch (e) {}

            const lastTime = status.last_adv_time ? new Date(status.last_adv_time).toLocaleString("vi-VN") : "Chưa có";
            const info = `Cấu hình quảng cáo:\n` +
                `➜ Trạng thái: ${status.on ? "✅ Bật" : "❌ Tắt"}\n` +
                `➜ Chu kỳ: ${status.interval_min} phút\n` +
                `➜ Nội dung: ${config.content || "[Chưa đặt]"}\n` +
                `➜ Danh thiếp: ${cardConfig.enabled ? "✅ Bật" : "❌ Tắt"}\n` +
                `➜ UID Card: ${cardConfig.user_id || "[Chưa đặt]"}\n` +
                `➜ Text Card: ${cardConfig.phone || "[Chưa đặt]"}\n` +
                `➜ Số nhóm: ${groupCount}\n` +
                `➜ Nhóm bị tắt: ${advDisable.length}\n` +
                `➜ Lần cuối: ${lastTime}`;
            
            await api.sendMessage(info, threadId, type);
            
            if (cardConfig.user_id) {
                const ok = await sendCardHelper(api, threadId, type, cardConfig);
                if (ok) console.log("[ADV] Gửi card test thành công.");
            }
            return;
        }

        return api.sendMessage("Lệnh không hợp lệ. Gõ !adv để xem hướng dẫn.", threadId, type);
    }
};
