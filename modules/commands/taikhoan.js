
const fs = require("fs");
const path = require("path");
const DATA_PATH = path.join(__dirname, "..", "modules", "cache", "accounts.json");

function loadAccounts() {
    try { if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); } catch (e) {}
    return {};
}
function saveAccounts(data) {
    try { fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4)); } catch (e) {}
}

module.exports = {
    name: "taikhoan",
    execute: async (api, message, args, CFG) => {
        const threadId = message.threadId;
        const type = message.type;
        const uid = String(message.data.uidFrom);
        let accounts = loadAccounts();

        if (!accounts[uid]) return api.sendMessage("Bạn chưa đăng ký tài khoản! Gõ !dangky <tên> <pass>.", threadId, type);
        
        const acc = accounts[uid];
        const status = acc.isLoggedIn ? "✅ Đang đăng nhập" : "❌ Đã đăng xuất";
        return api.sendMessage(`👤 THÔNG TIN TÀI KHOẢN\n` +
            `➜ Tên: ${acc.username}\n` +
            `➜ Trạng thái: ${status}\n` +
            `➜ Số dư: ${acc.coin} coin`, threadId, type);
    }
};
