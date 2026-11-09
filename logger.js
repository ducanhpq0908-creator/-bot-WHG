const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'logs', 'bot_activity.log');

function writeLog(type, threadId, senderId, content) {
    const d = new Date();
    const time = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const logLine = `[${time}] [${type}] [Thread: ${threadId}] [User: ${senderId}] -> ${content}\n`;
    fs.appendFile(logFile, logLine, (err) => { if (err) console.error(err); });
    console.log(logLine.trim());
}

module.exports = {
    logReceive: (threadId, senderId, content) => writeLog("NHẬN", threadId, senderId, content),
    logSend: (threadId, content) => writeLog("GỬI", threadId, "BOT", content)
};
