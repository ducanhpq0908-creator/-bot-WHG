module.exports = {
    name: "spamnh",
    description: "Spam tạo nhắc hẹn",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng trong nhóm.", threadId, message.type);

        const input = args.join(" ").trim();
        if (!input) return api.sendMessage(`Cú pháp: ${config.prefix}spamnh <Nội dung nhắc hẹn> | <Số lần>`, threadId, message.type);

        const parts = input.split("|");
        const remindTitle = parts[0].trim();
        const count = parseInt(parts[1]) || 5;

        if (count > 1000) return api.sendMessage("⚠️ Tối đa 1000 lần.", threadId, message.type);

        await api.sendMessage(`⏳ Bắt đầu tạo ${count} nhắc hẹn...`, threadId, message.type);

        (async () => {
            let success = 0;
            const now = Date.now();
            for (let i = 0; i < count; i++) {
                try {
                    const startTime = now + ((i+1) * 2000); 
                    const params = { title: remindTitle, startTime: startTime, repeat: 0 };
                    await api.createReminder(params, String(threadId), message.type).catch(() => {});
                    success++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {}
            }
            await api.sendMessage(`✅ Đã tạo thành công ${success} nhắc hẹn.`, threadId, message.type);
        })();
    }
};
