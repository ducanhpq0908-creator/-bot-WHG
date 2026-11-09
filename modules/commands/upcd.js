const fs = require("fs");
const path = require("path");
const { Zalo } = require("zca-js");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const CHILD_DATA_ROOT = path.join(PROJECT_ROOT, "anh", "dulieubot");
const DATA_CHILD_ROOT = path.join(PROJECT_ROOT, "data", "childbots");
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

function cleanId(val) {
    if (!val) return "";
    let s = String(val).trim();
    if (s.includes("_")) s = s.split("_")[0];
    return s.replace(/\D/g, "");
}

function normalizeCookieForLogin(cookie) {
    if (!cookie) return cookie;
    if (Array.isArray(cookie)) return cookie;
    if (typeof cookie === "object" && Array.isArray(cookie.cookies)) return cookie.cookies;
    return cookie;
}

function listAllChildSessions() {
    const sessions = new Map();
    const scanDir = (baseDir) => {
        if (!fs.existsSync(baseDir)) return;
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const sessionPath = path.join(baseDir, entry.name, "session.json");
                    if (fs.existsSync(sessionPath)) {
                        try {
                            const raw = fs.readFileSync(sessionPath, "utf8");
                            const parsed = JSON.parse(raw);
                            if (parsed && parsed.cookie && parsed.imei) {
                                const uid = String(parsed.uid || parsed.userId || "").trim();
                                sessions.set(entry.name, { key: entry.name, uid, sessionPath, data: parsed });
                                if (uid) sessions.set(uid, { key: entry.name, uid, sessionPath, data: parsed });
                            }
                        } catch {}
                    }
                }
            }
        } catch {}
    };
    scanDir(CHILD_DATA_ROOT);
    scanDir(DATA_CHILD_ROOT);
    return sessions;
}

async function getLoggedInApi(botItem) {
    const key = botItem.key;
    if (global.__childBots?.[key]?.api) return global.__childBots[key].api;

    const sessionData = botItem.data;
    const zaloClient = new Zalo({ selfListen: false, checkUpdate: false, logging: false });

    return await zaloClient.login({
        cookie: normalizeCookieForLogin(sessionData.cookie),
        imei: sessionData.imei,
        userAgent: sessionData.userAgent || DEFAULT_USER_AGENT,
        language: "vi"
    });
}

module.exports = {
    name: "upcd",
    description: "Nâng cấp nhóm thường lên Nhóm Cộng Đồng (Community) Zalo",
    level: 2,
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const msgType = message.type;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, msgType);
        
        const senderUid = String(message.data?.uidFrom || "");
        
        // Lấy tên trực tiếp từ tin nhắn trước, nếu không có mới gọi API
        let userName = message.data?.dName || message.data?.name;
        
        if (!userName) {
            try {
                const userInfo = await api.fetchUserInfo(senderUid);
                userName = userInfo.changed_profiles[senderUid]?.zaloName || senderUid;
            } catch (e) {
                userName = senderUid; // Nếu lỗi thì lấy UID làm tên
            }
        }

        if (msgType !== 1) {
            return await sendMsg({ msg: "❌ Lệnh nâng cấp Cộng Đồng chỉ dùng được trong nhóm chat." });
        }

        const cleanThreadId = cleanId(threadId);
        let groupDetails = null;

        if (typeof api.getGroupInfo === "function") {
            try {
                const gi = await api.getGroupInfo(cleanThreadId);
                groupDetails = gi?.gridInfoMap?.[cleanThreadId] || gi?.groupInfo?.[cleanThreadId] || gi;
            } catch {}
        }

        if (groupDetails?.community || groupDetails?.isCommunity || groupDetails?.communityId) {
            return await sendMsg({ msg: "ℹ️ Nhóm này hiện đã là Nhóm Cộng Đồng (Community) rồi bạn nhé!" });
        }

        await sendMsg({ 
            msg: "⏳ [ HỆ THỐNG ] Đang xử lý...\n🔄 Vui lòng đợi trong giây lát." 
        });

        let success = false;
        let lastError = "";

        if (typeof api.upgradeGroupToCommunity === "function") {
            try {
                await api.upgradeGroupToCommunity(cleanThreadId);
                success = true;
            } catch (e1) {
                lastError = e1?.message || String(e1);
            }
        }

        if (!success) {
            try {
                const allSessions = listAllChildSessions();
                for (const [key, botItem] of allSessions) {
                    try {
                        const tempApi = await getLoggedInApi(botItem);
                        if (tempApi && typeof tempApi.upgradeGroupToCommunity === "function") {
                            await tempApi.upgradeGroupToCommunity(cleanThreadId);
                            success = true;
                            break;
                        }
                    } catch (e2) {
                        lastError = e2?.message || String(e2);
                    }
                }
            } catch {}
        }

        const timeStr = new Date().toLocaleString("vi-VN");
        const groupName = groupDetails?.name || cleanThreadId;

        if (success) {
            const successMsg = [
                "👑 𝐖𝐇𝐆 𝐒𝐘𝐒𝐓𝐄𝐌 👑",
                "──────────────────────",
                "   ✨ THAO TÁC THÀNH CÔNG ✨",
                "──────────────────────",
                "📌 THÔNG TIN CHI TIẾT:",
                `👤 Người thực hiện: ${userName}`,
                `🏷️ Tên nhóm: ${groupName}`,
                `🆔 ID nhóm: ${cleanThreadId}`,
                "⚙️ Chức năng: Nâng cấp Cộng Đồng",
                `📅 Thời gian: ${timeStr}`,
                "──────────────────────",
                "💎 TRẠNG THÁI HỆ THỐNG:",
                "✅ Trạng thái: Thành công",
                "🔐 Quyền hạn: Premium",
                "──────────────────────",
                "🚀 POWERED BY WHG",
                "💙 Cảm ơn bạn đã tin tưởng và sử dụng tính năng của WHG! Chúc bạn có trải nghiệm tuyệt vời!"
            ];
            return await sendMsg({ msg: successMsg.join("\n") });
        } else {
            let errorDetail = lastError;
            if (errorDetail.includes("185") || errorDetail.includes("limit")) {
                errorDetail = "Tài khoản Trưởng nhóm đã đạt giới hạn tạo Cộng Đồng.";
            } else if (errorDetail.includes("166") || errorDetail.includes("quyền")) {
                errorDetail = "Bot chưa phải Trưởng nhóm (Key Vàng).";
            } else if (errorDetail.includes("18") || errorDetail.includes("identity")) {
                errorDetail = "Tài khoản cần xác minh danh tính.";
            }

            const errorMsg = [
                "👑 𝐖𝐇𝐆 𝐒𝐘𝐒𝐓𝐄𝐌 👑",
                "──────────────────────",
                "   ❌ THAO TÁC THẤT BẠI ❌",
                "──────────────────────",
                "📌 THÔNG TIN CHI TIẾT:",
                `👤 Người thực hiện: ${userName}`,
                `🏷️ Tên nhóm: ${groupName}`,
                `🆔 ID nhóm: ${cleanThreadId}`,
                "⚙️ Chức năng: Nâng cấp Cộng Đồng",
                `📅 Thời gian: ${timeStr}`,
                "──────────────────────",
                "💎 TRẠNG THÁI HỆ THỐNG:",
                "❌ Trạng thái: Thất bại",
                `🔻 Lý do: ${errorDetail || "Lỗi không xác định."}`,
                "──────────────────────",
                "🚀 POWERED BY WHG",
                "💙 Cảm ơn bạn đã tin tưởng và sử dụng tính năng của WHG! Chúc bạn có trải nghiệm tuyệt vời!"
            ];
            return await sendMsg({ msg: errorMsg.join("\n") });
        }
    }
};
