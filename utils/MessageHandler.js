// utils/MessageHandler.js
// Xử lý tin nhắn với Promise.all để giảm thời gian chờ từ 300ms xuống <100ms.

const configMgr = require('./ConfigManager');

async function handleMessage(api, message) {
    const start = Date.now();
    
    // Thay vì await từng bước, chạy song song các tác vụ độc lập
    const [
        prefix, 
        senderInfo, 
        threadInfo
    ] = await Promise.all([
        configMgr.get().prefix || '/',                 // 0ms (RAM)
        api.getUserInfo(message.senderId),             // API call
        api.getGroupInfo(message.threadId).catch(() => null) // API call
    ]);

    // Xử lý logic chính (không await API nếu không cần)
    let replyText = null;
    if (message.content && message.content.startsWith(prefix)) {
        const cmd = message.content.slice(prefix.length).trim();
        if (cmd === 'ping') replyText = 'Pong!';
    }

    // Gửi phản hồi
    if (replyText) {
        await api.sendMessage({ msg: replyText }, message.threadId, message.type);
    }

    const elapsed = Date.now() - start;
    if (elapsed > 100) {
        console.warn(`[SLOW] Xử lý tin nhắn mất ${elapsed}ms (ID: ${message.msgId})`);
    }
}

module.exports = { handleMessage };
