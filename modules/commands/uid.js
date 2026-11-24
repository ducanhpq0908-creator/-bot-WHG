module.exports = {
    name: "uid",
    description: "Lấy UID",
    role: "user",
    execute: async (api, message, args, config) => {
        let targetUid = message.data.uidFrom; 
        let typeInfo = "của bạn";
        
        if (message.data.mentions && message.data.mentions.length > 0) {
            targetUid = message.data.mentions[0].uid;
            typeInfo = "người được tag";
        } else if (message.data.quote && message.data.quote.globalMsgId) {
            const quote = message.data.quote;
            if (quote.ownerId) {
                targetUid = quote.ownerId;
                typeInfo = "người được reply";
            }
        }

        // Thay \n bằng khoảng trắng (hoặc dùng text trực tiếp) để không bị lỗi font
        const text = `🆔 **THÔNG TIN UID** | UID ${typeInfo}: ${targetUid}`;
        api.sendMessage(text, message.threadId, message.type);
    }
};
