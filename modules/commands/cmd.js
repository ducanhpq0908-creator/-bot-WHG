const fs = require('fs');
const path = require('path');

module.exports = {
    name: "cmd",
    description: "Hiển thị danh sách toàn bộ lệnh của bot",
    role: "user",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const type = message.type;
        const prefix = config.prefix || "!";
        
        // Lấy danh sách file lệnh
        const commandsDir = path.join(__dirname);
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        
        const allCmds = [];
        for (const file of files) {
            try {
                // Xóa cache require để lấy dữ liệu mới nhất
                delete require.cache[require.resolve(path.join(commandsDir, file))];
                const cmd = require(path.join(commandsDir, file));
                if (cmd && cmd.name) {
                    allCmds.push({
                        name: cmd.name,
                        desc: cmd.description || "Chưa có mô tả",
                        role: cmd.role || "user",
                        cooldown: cmd.cooldown || 3 // Mặc định 3 giây
                    });
                }
            } catch (e) {
                // Bỏ qua file lỗi
            }
        }

        // Sắp xếp theo tên
        allCmds.sort((a, b) => a.name.localeCompare(b.name));

        // Cấu hình phân trang
        const itemsPerPage = 12;
        const totalPages = Math.ceil(allCmds.length / itemsPerPage);
        
        // Lấy trang hiện tại từ args (VD: !cmd 2)
        let page = parseInt(args[0]) || 1;
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const startIdx = (page - 1) * itemsPerPage;
        const pageCmds = allCmds.slice(startIdx, startIdx + itemsPerPage);

        // Tạo nội dung tin nhắn
        let msg = `📜 **Danh sách lệnh:** (Tổng: ${allCmds.length})\n\n`;
        pageCmds.forEach((cmd, i) => {
            const globalIdx = startIdx + i + 1;
            msg += `${globalIdx}. ⭐ Lệnh: **${cmd.name}**\n`;
            msg += `   📝 Mô Tả: ${cmd.desc}\n`;
            msg += `   🔑 Quyền: ${cmd.role === 'admin' ? 'Admin' : 'User'}\n`;
            msg += `   ⏱️ Countdown: ${cmd.cooldown} Giây\n\n`;
        });

        msg += `📄 Trang ${page}/${totalPages}\n`;
        msg += `💡 Dùng \`${prefix}cmd [số trang]\` để xem các trang khác.`;

        return api.sendMessage(msg, threadId, type);
    }
};
