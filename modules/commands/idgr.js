module.exports = {
    name: "idgr",
    description: "Lấy ID của nhóm hiện tại",
    role: "user",
    execute: async (api, message, args, config) => {
        try {
            const threadId = message.threadId;
            const threadType = message.type;

            // Nếu không phải chat nhóm (type 1 là nhóm, 0 là chat riêng)
            if (threadType !== 1) {
                return await api.sendMessage({
                    msg: "❌ Lệnh này chỉ có thể sử dụng trong nhóm!",
                    quote: message.data
                }, threadId, threadType);
            }

            // Gửi ID nhóm
            await api.sendMessage({
                msg: `📌 **ID Nhóm:** \`${threadId}\``,
                quote: message.data
            }, threadId, threadType);

        } catch (e) {
            console.error("[IDGR] Lỗi:", e.message);
            await api.sendMessage({
                msg: `❌ Lỗi khi lấy ID: ${e.message}`,
                quote: message.data
            }, message.threadId, message.type);
        }
    }
};
