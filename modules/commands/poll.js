module.exports = {
    name: "poll",
    description: "Tạo bình chọn (Poll) trong nhóm (Delay 0.5s)",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        const isAdmin = (config.admin_uids || []).map(String).includes(senderUid) || message.data.isSelf;

        if (!isAdmin) return api.sendMessage("❌ Chỉ Admin mới có quyền dùng lệnh này.", threadId, message.type);
        if (message.type !== 1) return api.sendMessage("❌ Chỉ dùng trong nhóm.", threadId, message.type);

        const input = args.join(" ").trim();
        if (!input) {
            return api.sendMessage(`Cú pháp: ${config.prefix}poll <Câu hỏi> | <Lựa chọn 1> | <Lựa chọn 2> ... | <Số lần>\nVD: ${config.prefix}poll Ai cute? | Ducanh | Hoàng Anh | 5`, threadId, message.type);
        }

        const parts = input.split("|").map(p => p.trim());
        if (parts.length < 4) {
            return api.sendMessage("❌ Sai cú pháp. Cần ít nhất 1 câu hỏi, 2 lựa chọn và 1 số lần.", threadId, message.type);
        }

        const countStr = parts[parts.length - 1];
        const count = parseInt(countStr);

        if (isNaN(count) || count <= 0) return api.sendMessage("❌ Số lần không hợp lệ.", threadId, message.type);
        if (count > 200) return api.sendMessage("⚠️ Tối đa 200 lần.", threadId, message.type);

        const question = parts[0];
        const options = parts.slice(1, parts.length - 1);

        if (options.length < 2) return api.sendMessage("❌ Cần ít nhất 2 lựa chọn.", threadId, message.type);

        await api.sendMessage(`⏳ Bắt đầu tạo ${count} bình chọn (Delay: 0.5s)...`, threadId, message.type);

        (async () => {
            let success = 0, failed = 0;
            for (let i = 0; i < count; i++) {
                try {
                    await api.createPoll({
                        question: question,
                        options: options
                    }, threadId);
                    success++;
                    // Delay 500ms (0.5 giây)
                    await new Promise(r => setTimeout(r, 500)); 
                } catch (e) {
                    failed++;
                    console.log(`[POLL] Lỗi lần ${i+1}: ${e.message}`);
                    await new Promise(r => setTimeout(r, 1000)); // Lỗi thì nghỉ 1s
                }
            }
            
            await api.sendMessage(`✅ Đã tạo thành công ${success} bình chọn (Thất bại: ${failed}).`, threadId, message.type);
        })();
    }
};
