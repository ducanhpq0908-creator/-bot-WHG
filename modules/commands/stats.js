module.exports = {
    name: "stats",
    description: "Xem tài nguyên và thời gian hoạt động của Bot",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) {
            return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này.", message.threadId, message.type);
        }

        // 1. Tính thời gian hoạt động
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        let timeStr = "";
        if (days > 0) timeStr += `${days} ngày `;
        if (hours > 0) timeStr += `${hours} giờ `;
        if (minutes > 0) timeStr += `${minutes} phút `;
        timeStr += `${seconds} giây`;

        // 2. Lấy thông tin RAM
        const memUsage = process.memoryUsage();
        const ramRss = (memUsage.rss / 1024 / 1024).toFixed(2); // RAM tổng thể (MB)
        const ramHeap = (memUsage.heapUsed / 1024 / 1024).toFixed(2); // RAM JS sử dụng (MB)

        // 3. Lấy thông tin CPU / Hệ điều hành
        const cpuArch = process.arch;
        const platform = process.platform;
        const nodeVersion = process.version;

        const statsText = `📊 **THÔNG SỐ BOT ZALO**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ **Thời gian hoạt động:**\n${timeStr}\n\n` +
        `💾 **Bộ nhớ (RAM):**\n` +
        `▸ Tổng tiêu thụ: ${ramRss} MB\n` +
        `▸ V8 Heap (JS): ${ramHeap} MB\n\n` +
        `💻 **Môi trường:**\n` +
        `▸ Hệ điều hành: ${platform} (${cpuArch})\n` +
        `▸ Node.js: ${nodeVersion}`;
        
        await api.sendMessage(statsText, message.threadId, message.type);
    }
};
