const fs = require('fs');
const path = require('path');
const { Reactions } = require('zca-js');

// Hàm lưu config (giả lập, mày có thể thay bằng hàm thật của bot)
function saveConfig(cfg) {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(path.dirname(configPath))) {
            fs.writeFileSync(configPath, JSON.stringify(cfg, null, 4), 'utf8');
        }
    } catch (e) {}
}

// ── PHẦN 1: XỬ LÝ LỆNH .DOITEN ──
async function executeDoiten(api, message, args, config) {
    const threadId = message.threadId;
    const type = message.type;
    const rawInput = args.join(" ").trim();
    
    // Lấy config hiện tại
    if (!global.config) global.config = {};
    const cfg = global.config;

    // Lấy icon hiện tại
    const currentIcon = cfg.tag_reaction_icon || "❤️";
    const isEnabled = cfg.tag_reaction_enabled !== false;

    // Nếu không có tham số hoặc gõ help -> Hiện menu
    if (!rawInput || ["info", "show", "help"].includes(rawInput.toLowerCase())) {
        const menu = [
            "🎭 **CÀI ĐẶT ICON / CHỮ THẢ REACTION KHI TAG BOT**",
            `📌 Icon hiện tại: ${currentIcon}`,
            `⚡ Trạng thái: ${isEnabled ? "🟢 BẬT" : "🔴 TẮT"}`,
            "",
            "• `.doiten icon <icon/chữ>` - Đổi icon",
            "• `.doiten icon reset` - Reset về mặc định",
            "• `.doiten icon on` / `.doiten icon off` - Bật/tắt"
        ].join("\n");
        return api.sendMessage(menu, threadId, type);
    }

    const action = rawInput.toLowerCase();

    // Reset
    if (action === "reset" || action === "macdinh") {
        delete cfg.tag_reaction_icon;
        saveConfig(cfg);
        return api.sendMessage("🎭 ĐÃ RESET ICON TAG REACTION VỀ MẶC ĐỊNH!", threadId, type);
    }

    // Tắt
    if (["off", "tat", "tắt"].includes(action)) {
        cfg.tag_reaction_enabled = false;
        saveConfig(cfg);
        return api.sendMessage("🚫 Đã TẮT tính năng tự thả icon khi ai tag Bot!", threadId, type);
    }

    // Bật
    if (["on", "bat", "bật"].includes(action)) {
        cfg.tag_reaction_enabled = true;
        saveConfig(cfg);
        return api.sendMessage("✅ Đã BẬT tính năng tự thả icon khi ai tag Bot!", threadId, type);
    }

    // Đổi icon
    cfg.tag_reaction_icon = rawInput;
    cfg.tag_reaction_enabled = true;
    saveConfig(cfg);

    return api.sendMessage(`🎭 ĐÃ ĐỔI ICON THẢ REACTION THÀNH CÔNG!\n📌 Icon mới: ${rawInput}`, threadId, type);
}

// ── PHẦN 2: XỬ LÝ TỰ ĐỘNG THẢ CẢM XÚC KHI BỊ TAG ──
async function handleAutoReact(api, message, botId) {
    try {
        const threadId = message.threadId;
        const type = message.type;
        const data = message.data;
        const msgText = String(data?.msg || data?.content || '');
        const mentions = data?.mentions || [];

        // Kiểm tra xem bot có bị tag không
        const isBotMentioned = mentions.some(m => String(m.uid) === String(botId)) 
            || msgText.includes('@all') 
            || msgText.includes('@All');

        if (!isBotMentioned) return;

        // Kiểm tra xem tính năng có bật không
        if (global.config?.tag_reaction_enabled === false) return;

        // Lấy icon
        let tagIcon = global.config?.tag_reaction_icon || "❤️";

        // Tạo đối tượng reaction
        const target = {
            data: {
                msgId: String(data?.msgId || data?.id),
                cliMsgId: String(data?.cliMsgId || '')
            },
            threadId,
            type
        };

        // Thả cảm xúc (dùng random rType để không bị trùng)
        const randomRType = 200 + Math.floor(Math.random() * 301);
        const customReaction = {
            rType: randomRType,
            source: 6,
            icon: tagIcon
        };

        await api.addReaction(customReaction, target);
        console.log(`[AUTOREACT] Đã thả ${tagIcon} vào tin nhắn của ${data.uidFrom}`);

        // Tự động gỡ cảm xúc sau 3 giây
        setTimeout(async () => {
            try {
                await api.addReaction(Reactions.NONE, target);
            } catch {}
        }, 3000);

    } catch (e) {
        console.error("[AUTOREACT ERROR]", e.message);
    }
}

// Export cả 2 hàm để dùng ở index.js
module.exports = {
    name: "doiten",
    description: "Đổi icon và tự động thả cảm xúc khi bị tag",
    role: "admin",
    execute: executeDoiten,
    handleAutoReact: handleAutoReact
};
