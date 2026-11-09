module.exports = {
    name: "spamremind",
    description: "Spam thông báo nhắc hẹn (Reminder)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin Bot mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng được trong nhóm.", threadId, message.type);

        const input = args.join(" ").trim();
        if (!input) return api.sendMessage(`Cú pháp: ${config.prefix}spamremind <nội dung> | <số_lần>`, threadId, message.type);

        const parts = input.split("|");
        const title = parts[0].trim();
        const count = parseInt(parts[1]) || 5;

        // Tăng giới hạn lên 900 lần
        if (count > 900) return api.sendMessage("⚠️ Tối đa 900 lần.", threadId, message.type);

        await api.sendMessage(`⏳ Bắt đầu tạo ${count} thông báo nhắc hẹn...`, threadId, message.type);

        (async () => {
            let success = 0, failed = 0;
            const now = Date.now();

            for (let i = 0; i < count; i++) {
                try {
                    const startTime = now + (i * 2000); // Cách nhau 2 giây
                    const params = {
                        title: title,
                        startTime: startTime,
                        repeat: 0
                    };
                    await api.createReminder(params, String(threadId), message.type);
                    success++;
                    await new Promise(r => setTimeout(r, 300)); // Nghỉ 300ms tránh spam
                } catch (e) {
                    failed++;
                }
            }
            
            await api.sendMessage(`✅ Đã tạo thành công ${success} nhắc hẹn (Thất bại: ${failed}).`, threadId, message.type);
        })();
    }
};
