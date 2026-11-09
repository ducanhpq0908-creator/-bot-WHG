const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tự động tìm thư mục chứa lệnh (hỗ trợ cả ./commands và ./modules/commands)
const commandsDir = fs.existsSync(path.join(__dirname, 'commands')) 
    ? path.join(__dirname, 'commands') 
    : path.join(__dirname, 'modules', 'commands');

console.log(`[*] Đang quét lệnh tại: ${commandsDir}`);

let menuData = [];
if (fs.existsSync(commandsDir)) {
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        if (file === 'menu.js') continue; // Bỏ qua chính nó
        try {
            const cmdModule = require(path.join(commandsDir, file));
            if (cmdModule && cmdModule.name) {
                const name = cmdModule.name.toLowerCase();
                
                // Fix logic phân loại Admin giống hệt menu.js
                const isAdmin = cmdModule.adminOnly === true || 
                                cmdModule.role === "admin" || 
                                cmdModule.config?.adminOnly === true || 
                                ["tag", "treo", "stop", "doiten", "troll", "welcome", "bye", "member", "admin", "adminext", "rs", "bot", "eval", "pin", "say", "spam", "vote", "warn", "utils", "lock", "unlock", "security", "remind", "qrlogin"].includes(name);

                menuData.push({
                    cmd: cmdModule.name,
                    desc: cmdModule.config?.description || cmdModule.description || cmdModule.desc || "Chưa cập nhật mô tả",
                    admin: isAdmin
                });
            }
        } catch (e) {}
    }
}

// Sắp xếp User trước, Admin sau. Cùng nhóm thì xếp theo ABC
menuData.sort((a, b) => {
    if (a.admin !== b.admin) return a.admin ? 1 : -1;
    return a.cmd.localeCompare(b.cmd);
});

// Ghi file JSON
fs.writeFileSync('menu_data.json', JSON.stringify(menuData, null, 4));
console.log(`[+] Đã quét ${menuData.length} lệnh.`);

// Xóa cache ảnh cũ để đảm bảo render lại từ đầu
const cacheDir = path.join(__dirname, 'cache');
if (fs.existsSync(cacheDir)) {
    const oldFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith("menu_") && f.endsWith(".png"));
    for (const f of oldFiles) {
        fs.unlinkSync(path.join(cacheDir, f));
    }
}

console.log(`[*] Đang chạy Python để tạo ảnh menu...`);
try {
    execSync('python3 render_final.py', { stdio: 'inherit' });
    console.log(`[+] Tạo ảnh menu thành công!`);
} catch (error) {
    console.error(`[-] Lỗi khi chạy Python: ${error.message}`);
    console.error(`[-] Hãy kiểm tra lại file render_final.py hoặc cài đặt thư viện (pip install Pillow).`);
}
