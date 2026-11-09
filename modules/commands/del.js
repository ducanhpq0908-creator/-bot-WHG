global.BOT_MESSAGES = global.BOT_MESSAGES || new Map();

module.exports = {
    name: "del",
    description: "Xóa tin nhắn của Bot",
    role: "admin",
    execute: async (api, message, args, config) => {
        if (!config.admin_uids.includes(message.data.uidFrom)) {
            return api.sendMessage({ msg: "❌ Bạn không có quyền sử dụng lệnh này.", quote: message.data }, message.threadId, message.type);
        }

        const count = parseInt(args[0]);
        if (isNaN(count) || count <= 0) {
            return api.sendMessage({ msg: `Cú pháp: ${config.prefix}del <số_lượng>`, quote: message.data }, message.threadId, message.type);
        }

        const threadId = message.threadId;
        const msgList = global.BOT_MESSAGES.get(threadId) || [];

        if (msgList.length === 0) {
            return api.sendMessage({ msg: "⚠️ Không có tin nhắn nào của Bot trong cuộc trò chuyện này để xóa.", quote: message.data }, message.threadId, message.type);
        }

        const toDelete = msgList.slice(-count);
        let success = 0;

        for (const msgInfo of toDelete) {
            try {
                if (api.undo) {
                    await api.undo({
                        msgId: msgInfo.msgId,
                        cliMsgId: msgInfo.cliMsgId,
                        uidFrom: api.getOwnId(),
                        idTo: threadId,
                        msgType: message.type
                    });
                    success++;
                } else if (api.editMessage) {
                    await api.editMessage(".", msgInfo.msgId, threadId, message.type);
                    success++;
                }
            } catch (e) {
                console.log("Lỗi xóa tin:", e.message);
            }
            await new Promise(r => setTimeout(r, 200));
        }

        global.BOT_MESSAGES.set(threadId, msgList.slice(0, msgList.length - success));

        const notify = await api.sendMessage({ msg: `✅ Đã xóa ${success} tin nhắn của Bot.`, quote: message.data }, threadId, message.type);
        
        if (notify) {
            setTimeout(async () => {
                try {
                    if (api.undo) {
                        await api.undo({
                            msgId: notify.messageId || notify.msgId,
                            cliMsgId: notify.cliMsgId,
                            uidFrom: api.getOwnId(),
                            idTo: threadId,
                            msgType: message.type
                        });
                    }
                } catch (e) {}
            }, 3000);
        }
    }
};
