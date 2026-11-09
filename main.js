const fs = require("fs");
const path = require("path");
const { spawn } = require('child_process');

// ===== TỰ ĐỘNG KHỞI ĐỘNG LẠI TIẾN TRÌNH =====
if (process.env.IS_CHILD !== 'true') {
    function startProcess() {
        const child = spawn(process.execPath, [__filename], {
            stdio: 'inherit',
            env: { ...process.env, IS_CHILD: 'true' }
        });
        child.on('close', (code) => {
            console.log(`\n[!] Tiến trình đóng (Code: ${code}). Tự động khởi động lại...`);
            setTimeout(startProcess, 1000);
        });
    }
    startProcess();
    return; 
}

// ===== CLEAR SCREEN KHI BẮT ĐẦU CHẠY BOT =====
if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[H');
}

const autoReact = require("./autoreact");
const { Zalo } = require("zca-js");
const log = require("./utils/logger.js");

process.on('uncaughtException', (err) => {
    log.error("[UNCAUGHT] " + (err.stack || err.message));
});

process.on('unhandledRejection', (reason) => {
    log.error("[UNHANDLED] " + (reason && reason.stack ? reason.stack : reason));
});

const showBanner = require("./banner.js");
showBanner();

const antilinkCmd = require("./modules/commands/antilink.js");
const autoJoinCmd = require("./modules/commands/autojoin.js");
const CFG = require("./config.js");
const { isFeatureLocked } = require("./feature-locks.js");

let botStatus = "Đang hoạt động";
global.BOT_MESSAGES = new Map();

let botState = CFG.loadState();
if (botState.prefix) CFG.prefix = botState.prefix;
let ttlConfig = CFG.loadTTL();

let secCfg = { antispam: [], spam_threshold: 2, spam_window: 1 };
const userMsgTimes = {};
const warnedUsers = {};

let securityCache = null;
let spamBlockCache = null;
let lastSecRead = 0;
let lastSpamRead = 0;

function getSecurity() {
    const now = Date.now();
    if (!securityCache || now - lastSecRead > 30000) {
        try { securityCache = JSON.parse(fs.readFileSync("security.json", "utf8")); } catch (e) { securityCache = {}; }
        lastSecRead = now;
    }
    return securityCache;
}

function getSpamBlock() {
    const now = Date.now();
    if (!spamBlockCache || now - lastSpamRead > 30000) {
        try { spamBlockCache = fs.existsSync("spam_block.json") ? JSON.parse(fs.readFileSync("spam_block.json", "utf8")) : {}; } catch (e) { spamBlockCache = {}; }
        lastSpamRead = now;
    }
    return spamBlockCache;
}

function saveSpamBlock(data) {
    spamBlockCache = data;
    lastSpamRead = Date.now();
    try { fs.writeFileSync("spam_block.json", JSON.stringify(data, null, 2)); } catch(e) {}
}

const userCmdTimes = {}; 
const userViolations = {};

// ===== HÀM GỢI Ý LỆNH GẦN ĐÚNG =====
function getLevenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}

function findClosestCommand(input, commandsMap) {
    let bestMatch = null;
    let minDistance = input.length <= 4 ? 2 : 3;
    for (const cmdName of commandsMap.keys()) {
        if (typeof cmdName !== "string") continue;
        const distance = getLevenshteinDistance(input.toLowerCase(), cmdName.toLowerCase());
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = cmdName;
        }
    }
    return bestMatch;
}

// ===== HÀM ĐỌC KÍCH THƯỚC ẢNH =====
const imageMetadataGetter = async (filePath) => {
    try {
        const buf = fs.readFileSync(filePath);
        let width = 1080, height = 1080, size = buf.length;
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
            width = buf.readUInt32BE(16); height = buf.readUInt32BE(20);
        }
        return { width, height, size };
    } catch (e) { return { width: 1080, height: 1080, size: 0 }; }
};

async function startBot() {
    try {
        log.info("Đang kết nối tới Zalo...");
        const cookieArray = Object.keys(CFG.session_cookies).map(key => ({
            key: key, value: CFG.session_cookies[key], domain: ".zalo.me", path: "/"
        }));

        const zalo = new Zalo({ selfListen: true, imageMetadataGetter });
        const api = await zalo.login({ cookie: cookieArray, imei: CFG.imei, userAgent: "Mozilla/5.0" });

     /* TRUE_INSTANT_APPROVE */
     api.listener.on("group_event", async (event) => {
         try {
             if (event && event.act === "join_request") {
                 const groupId = String(event.threadId || event.data.groupId);
                 console.log(`[INSTANT] ⚡ Có người xin vào nhóm ${groupId}. Đang lấy UID...`);
                 
                 // Gọi ngay lập tức không chờ đợi
                 const pending = await api.getPendingGroupMembers(groupId);
                 let pendingUids = [];
                 if (pending && pending.users) pendingUids = pending.users.map(u => u.uid);
                 else if (pending && pending.members) pendingUids = pending.members.map(u => u.uid);

                 if (pendingUids.length > 0) {
                     const payload = { members: pendingUids, isApprove: 1 };
                     await api.reviewPendingMemberRequest(payload, groupId)
                         .then(() => console.log(`[INSTANT] ✅ Đã duyệt ${pendingUids.length} người vào nhóm ${groupId} (Tức thì)`))
                         .catch(e => console.log(`[INSTANT] ❌ Lỗi duyệt: ${e.message}`));
                 }
             }
         } catch (e) {}
     });
     /* END_TRUE_INSTANT_APPROVE */

     /* FALLBACK_SWEEP */
     // Quét dự phòng mỗi 2 giây (nếu sự kiện bị kẹt)
     setInterval(async () => {
         try {
             const res = await api.getAllGroups();
             const groupIds = Object.keys(res.gridVerMap || res);
             for (const gid of groupIds) {
                 const pending = await api.getPendingGroupMembers(gid);
                 let uids = [];
                 if (pending && pending.users) uids = pending.users.map(u => u.uid);
                 else if (pending && pending.members) uids = pending.members.map(u => u.uid);
                 
                 if (uids.length > 0) {
                     await api.reviewPendingMemberRequest({ members: uids, isApprove: 1 }, gid).catch(() => {});
                 }
                 await new Promise(r => setTimeout(r, 100)); // Nghỉ 100ms
             }
         } catch (e) {}
     }, 2000);
     /* END_FALLBACK_SWEEP */



     



     



     



     



     



    /* AUTO_SWEEP_FAST_SMART */
    async function autoSweepPending(api) {
        try {
            const fs = require("fs");
            const path = require("path");
            const CFG_FILE = path.join(__dirname, "cache", "autoduyet_settings.json");
            
            let settings = {};
            try { settings = JSON.parse(fs.readFileSync(CFG_FILE, "utf8")); } catch {}

            const enabledGroups = Object.keys(settings).filter(gid => settings[gid] === true);
            if (enabledGroups.length === 0) return;

            for (const gid of enabledGroups) {
                try {
                    const pending = await api.getPendingGroupMembers(gid);
                    let pendingUids = [];
                    if (pending && pending.users) pendingUids = pending.users.map(u => u.uid);
                    else if (pending && pending.members) pendingUids = pending.members.map(u => u.uid);

                    if (pendingUids.length > 0) {
                        console.log(`[AUTO-SWEEP] Phát hiện ${pendingUids.length} người chờ duyệt tại nhóm ${gid}. Đang duyệt...`);
                        const payload = { members: pendingUids, isApprove: 1 };
                        await api.reviewPendingMemberRequest(payload, gid)
                            .then(res => console.log(`[AUTO-SWEEP] ✅ Kết quả duyệt nhóm ${gid}:`, JSON.stringify(res)))
                            .catch(e => console.log(`[AUTO-SWEEP] ❌ Lỗi duyệt: ${e.message}`));
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }

    // Quét mỗi 0.1 giây (100ms)
    setInterval(() => {
        autoSweepPending(api);
    }, 100);
    /* END_AUTO_SWEEP_FAST_SMART */
    


    
    


     



     


        const botUid = api.getOwnId();
        
        botStatus = "Bot đang hoạt động";
        log.info(`Đăng nhập thành công! UID: ${botUid}`);
        log.info(`Prefix: ${CFG.prefix} | Admin: ${CFG.admin_uids.join(", ")}`);
        log.info("Bot đã sẵn sàng hoạt động!");
        
        try {
            const restartInfoPath = path.join(__dirname, "restart_info.json");
            if (fs.existsSync(restartInfoPath)) {
                const rInfo = JSON.parse(fs.readFileSync(restartInfoPath, "utf8"));
                if (rInfo.threadId) {
                    api.sendMessage("✅ Bot đã khởi động lại thành công!", rInfo.threadId, rInfo.type).catch(()=>{});
                }
                fs.unlinkSync(restartInfoPath);
            }
        } catch (e) { console.log("Lỗi gửi TB RS:", e.message); }
        
        // ===== HOOK GỬI TIN NHẮN =====
        const originalSendMessage = api.sendMessage.bind(api);
        api.sendMessage = async function(msg, threadId, type) {
            try {
                let finalMsg = msg;
                let sentMsg;
                try {
                    sentMsg = await originalSendMessage(finalMsg, threadId, type);
                } catch (err) {
                    if (err.message && err.message.includes("Không thể nhận tin nhắn từ bản thân")) {
                        return null; // Bỏ qua lỗi này để không văng log đỏ
                    }
                    throw err;
                }

                let preview = typeof finalMsg === 'string' ? finalMsg : finalMsg.msg;
                if (preview && preview.length > 40) preview = preview.substring(0, 40) + "...";
                if(preview) log.msgOut(`Đến ${threadId} | ${preview.replace(/\n/g, " ")}`);

                if (sentMsg && (sentMsg.messageId || sentMsg.msgId)) {
                    let list = global.BOT_MESSAGES.get(threadId) || [];
                    list.push({ msgId: sentMsg.messageId || sentMsg.msgId, cliMsgId: sentMsg.cliMsgId });
                    if (list.length > 50) list.shift();
                    global.BOT_MESSAGES.set(threadId, list);
                }

                try {
                    if (ttlConfig[threadId] && sentMsg) {
                        setTimeout(async () => {
                            try {
                                if (api.undo) {
                                    await api.undo({
                                        msgId: sentMsg.messageId || sentMsg.msgId,
                                        cliMsgId: sentMsg.cliMsgId,
                                        uidFrom: botUid,
                                        idTo: threadId,
                                        msgType: type
                                    }).catch(() => {});
                                }
                            } catch (err) {}
                        }, ttlConfig[threadId]);
                    }
                } catch (e) {}

                return sentMsg;
            } catch (e) {
                log.error("Lỗi gửi tin nhắn: " + e.message);
                return null;
            }
        };

        // ===== LOAD LỆNH =====
        // Đảm bảo thư mục cache tồn tại
        if (!fs.existsSync("cache")) fs.mkdirSync("cache");

        const commandFiles = fs.readdirSync(path.join(__dirname, "modules", "commands")).filter(file => file.endsWith(".js"));
        const commands = new Map();
        for (const file of commandFiles) {
            try {
                const cmd = require(`./modules/commands/${file}`);
                if (!cmd || typeof cmd.name !== "string" || typeof cmd.execute !== "function") {
                    log.error(`Lệnh ${file} thiếu name/execute, bỏ qua.`);
                    continue;
                }
                commands.set(cmd.name.toLowerCase(), cmd);
            } catch(e) {
                log.error(`Lỗi load lệnh ${file}: ${e.message}`);
            }
        }
        log.info(`Đã nạp thành công ${commands.size} lệnh.`);

        // ===== LẮNG NGHE TIN NHẮN =====
        
     

        api.listener.on("message", async (message) => {
     

     /* AUTO_DUYET_HOOK */
     try {
         // Lắng nghe sự kiện yêu cầu vào nhóm
         if (message.data && message.data.act === "join_request") {
             const groupId = String(message.threadId);
             const senderUid = String(message.data.uidFrom || "");
             const fs = require("fs");
             const path = require("path");
             const CFG_FILE = path.join(__dirname, "cache", "autoduyet_settings.json");
             
             let settings = {};
             try { settings = JSON.parse(fs.readFileSync(CFG_FILE, "utf8")); } catch {}

             if (settings[groupId]) {
                 console.log(`[AUTODUYET] Tự động duyệt UID ${senderUid} vào nhóm ${groupId}`);
                 await api.reviewPendingMemberRequest(groupId, [senderUid], 1).catch(e => {
                     console.log("[AUTODUYET] Lỗi duyệt:", e.message);
                 });
             }
         }
     } catch (e) {}
     /* END_AUTO_DUYET_HOOK */

     

     /* AUTO_REJECT_REMINDER */
     try {
         // Phát hiện sự kiện mời tham gia nhắc hẹn (remind)
         if (message.data && message.data.act === "remind") {
             const remindId = message.data.remindId || message.data.id;
             if (remindId) {
                 console.log(`[AUTO-REJECT] Từ chối nhắc hẹn ID: ${remindId}`);
                 await api.rejectReminder(remindId, message.threadId).catch(() => {});
             }
         }
     } catch (e) {}
     /* END_AUTO_REJECT_REMINDER */
            
     

     

        

            try {
                if (!message || !message.data) return;

                const data = message.data;
                const senderUid = String(data.uidFrom || data.uid || data.senderId || "");
                const threadId = message.threadId || data.threadId || data.idTo;
                const content = data.content;

                if (!content) return;

                let text = "";
                if (typeof content === "string") text = content.trim();
                else if (content && typeof content === "object") {
                    text = String(content.title || content.text || content.msg || content.href || "").trim();
                }
                text = String(text || ""); // Đảm bảo luôn là chuỗi

                const isSelf = data.isSelf === true || senderUid === String(botUid);
                const isAdmin = isSelf || (CFG.admin_uids && CFG.admin_uids.includes(senderUid));

                if (text) log.msgIn(`Từ ${isSelf ? "[BOT]" : ""} ${senderUid} | ${text.substring(0, 40)}`);

                secCfg = getSecurity();

                if (!isSelf && !isFeatureLocked("antilink") && antilinkCmd.handleAntiLink) {
                    const handled = await antilinkCmd.handleAntiLink(api, message, CFG);
                    if (handled) return;
                }

                if (!isFeatureLocked("antispam") && secCfg.antispam.includes(threadId) && message.type === 1 && !isAdmin) {
                    const now = Date.now();
                    if (!userMsgTimes[senderUid]) userMsgTimes[senderUid] = [];
                    userMsgTimes[senderUid] = userMsgTimes[senderUid].filter(t => now - t < secCfg.spam_window * 1000);
                    userMsgTimes[senderUid].push(now);

                    if (userMsgTimes[senderUid].length >= secCfg.spam_threshold) {
                        try {
                            if (api.deleteMessage) await api.deleteMessage({ data: message.data, threadId: String(threadId), type: message.type });
                        } catch (e) {}

                        if (!warnedUsers[senderUid]) {
                            await api.sendMessage(`⚠️ CẢNH CÁO: UID ${senderUid} spam.`, threadId, message.type);
                            warnedUsers[senderUid] = true;
                        } else {
                            try {
                                if (api.removeUserFromGroup) await api.removeUserFromGroup(senderUid, threadId);
                            } catch (err) {}
                            delete warnedUsers[senderUid];
                        }
                        userMsgTimes[senderUid] = [];
                        return;
                    }
                }

                
            /* AUTOJOIN_HOOK_INJECTED */
            if (!isSelf && text && !text.startsWith(CFG.prefix)) {
                try {
                    await autoJoinCmd.execute(api, message, [], CFG);
                } catch (e) {
                    console.log("[AUTOJOIN HOOK] Lỗi:", e.message);
                }
            }
            /* END_AUTOJOIN_HOOK */
        
// ===== XỬ LÝ LỆNH =====
                if (!text) return;

                let rawText = String(text || '').trim(); 
                if (!rawText) return;
                
                if (rawText.toLowerCase() === "prefix" || rawText.toLowerCase().startsWith("prefix ")) {
                } else if (rawText.startsWith(CFG.prefix)) {
                    rawText = rawText.slice(CFG.prefix.length).trim();
                } else {
                    return;
                }

                const parts = rawText.split(/ +/).filter(p => p.length > 0);
                const cmdName = parts.length > 0 ? String(parts.shift()).toLowerCase() : "";
                const args = parts;
                
                if (!cmdName) {
                    return await api.sendMessage({ msg: `⚠️ Bạn đã gõ sai lệnh!\n👉 Vui lòng gõ ${CFG.prefix}menu để xem hướng dẫn.`, quote: message.data }, threadId, message.type);
                }

                botState = CFG.loadState();
                if (botState.status === "off" && !isAdmin) return;

                const command = commands.get(cmdName);

                if (!command) {
                    const closest = findClosestCommand(cmdName, commands);
                    let errorMsg = `⚠️ Bạn đã gõ sai lệnh!\n👉 Vui lòng gõ ${CFG.prefix}menu để xem hướng dẫn.`;
                    if (closest) {
                        errorMsg = `⚠️ Bạn đã gõ sai lệnh!\n💡 Có phải bạn muốn nói: ${CFG.prefix}${closest}?\n👉 Gõ ${CFG.prefix}menu để xem toàn bộ lệnh.`;
                    }
                    return await api.sendMessage({ msg: errorMsg, quote: message.data }, threadId, message.type);
                }

                if (!isAdmin && isFeatureLocked(cmdName)) {
                    return await api.sendMessage("🔒 Chức năng đang bị khóa tạm thời, bạn vui lòng đợi xíu nhé.", threadId, message.type);
                }
                
                if (!isAdmin) {
                    const now = Date.now();
                    const spamWindow = 3000;
                    if (!userCmdTimes[senderUid]) userCmdTimes[senderUid] = [];
                    userCmdTimes[senderUid] = userCmdTimes[senderUid].filter(t => now - t < spamWindow);
                    userCmdTimes[senderUid].push(now);

                    if (userCmdTimes[senderUid].length >= 4) {
                        userViolations[senderUid] = (userViolations[senderUid] || 0) + 1;
                        const penaltyTime = 10 * Math.pow(2, userViolations[senderUid] - 1);
                        const unblockTime = now + (penaltyTime * 1000);
                        const spamData = getSpamBlock();
                        spamData[senderUid] = unblockTime;
                        saveSpamBlock(spamData);
                        await api.sendMessage(`⛔ Phát hiện spam lệnh!\nBạn bị cấm sử dụng bot trong ${penaltyTime} giây.`, threadId, message.type);
                        userCmdTimes[senderUid] = [];
                        return;
                    }
                }

                log.cmd(`${senderUid} sử dụng lệnh: ${cmdName}`);

                try {
                    await command.execute(api, message, args, CFG);
                } catch (error) {
                    log.error(`Lỗi khi chạy lệnh ${cmdName}: ${error.message}`);
                }

            } catch (e) {
                log.error("[LISTENER] Lỗi xử lý tin nhắn: " + e.message);
            }
        });

        api.listener.on("error", (err) => {
            log.error("[LISTENER] " + (err && err.message ? err.message : String(err)));
        });

        log.info("[LISTENER] Đã đăng ký sự kiện message; đang khởi động listener.");
        api.listener.start();
        
        await new Promise(() => {});
        return true;
    } catch (e) {
        log.error("Lỗi đăng nhập: " + e.message);
        return false;
    }
}

// ===== KHỞI ĐỘNG HỆ THỐNG =====
(async () => {
    
    await startBot();
})();

process.on('SIGINT', () => {
    console.log("\n\x1b[95m[!] Đang dừng hoạt động (Ctrl+C)...\x1b[0m");
    try { fs.writeFileSync(path.join(__dirname, "bot_status.json"), JSON.stringify({ status: "Đang dừng hoạt động" })); } catch(e){}
    process.exit(0);
});
