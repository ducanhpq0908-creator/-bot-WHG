module.exports = {
    name: "fakebuff",
    description: "Gửi thẻ giả lập thông báo phong Phó nhóm",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng trong nhóm.", threadId, message.type);

        const count = parseInt(args[0]) || 5;
        if (count > 50) return api.sendMessage("⚠️ Tối đa 50 lần.", threadId, message.type);

        await api.sendMessage(`⏳ Đang spam thẻ giả (${count} lần)...`, threadId, message.type);

        (async () => {
            let success = 0, failed = 0;
            for (let i = 0; i < count; i++) {
                try {
                    // Cấu trúc Card giả lập (Sử dụng href để nó thành link, tránh bị Zalo chặn)
                    const cardMsg = {
                        msg: "", // Không dùng text thuần
                        attachments: [{
                            type: "link",
                            href: "https://zalo.me", // Link ảo
                            title: "Bạn đã trở thành phó cộng đồng",
                            description: "Từ nay, bạn có thể thay đổi cài đặt và quản lý nội dung của cộng đồng.",
                            thumb: "https://stc-zaloprofile.zdn.vn/avatar/0/0/0/0.jpg"
                        }]
                    };
                    
                    await api.sendMessage(cardMsg, threadId, message.type);
                    success++;
                    await new Promise(r => setTimeout(r, 1000)); // Nghỉ 1s
                } catch (e) {
                    failed++;
                    console.log(`[FAKEBUFF] Lỗi: ${e.message}`);
                }
            }
            await api.sendMessage(`✅ Đã gửi thành công: ${success} thẻ. Thất bại: ${failed}.`, threadId, message.type);
        })();
    }
};
