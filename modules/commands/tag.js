const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "..", "..", "data", "tag_config.json");
const running = global.DUCANH_TAG_JOBS || (global.DUCANH_TAG_JOBS = new Map());

// Hàm lấy delay hiện tại (Mặc định 100ms = 0.1s)
function getDelay() {
    try {
        const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        return data.delay || 100;
    } catch (e) { return 100; }
}

// Hàm lưu delay
function setDelay(ms) {
    if (!fs.existsSync(path.dirname(CONFIG_FILE))) fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ delay: ms }, null, 4));
}

module.exports = {
    name: "tag",
    description: "Tag người được chọn hoặc chỉnh delay",
    role: "admin",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const type = message.type;
        const sendMsg = (msgObj) => api.sendMessage(msgObj, threadId, type);
        
        const action = (args[0] || "").toLowerCase();
        const key = String(threadId);

        // 1. LỆNH CHỈNH DELAY
        if (action === "delay") {
            const sec = parseFloat(args[1]);
            if (isNaN(sec) || sec < 0.1 || sec > 30) {
                return await sendMsg({ msg: "❌ Delay phải từ 0.1 đến 30 giây.\nVí dụ: !tag delay 1.5" });
            }
            setDelay(sec * 1000);
            return await sendMsg({ msg: `✅ Đã chỉnh delay tag thành: ${sec}s` });
        }

        // 2. LỆNH DỪNG TAG
        if (action === "stop" || action === "off") {
            const job = running.get(key);
            if (job) {
                job.stop = true;
                return await sendMsg({ msg: "⏹ Đã nhận lệnh dừng." });
            }
            return await sendMsg({ msg: "ℹ️ Không có tác vụ tag nào đang chạy." });
        }

        // 3. LỆNH BẮT ĐẦU TAG
        if (action !== "on") {
            return await sendMsg({ msg: "📌 Cách dùng:\n!tag on @người\n!tag stop\n!tag delay <0.1-30>" });
        }

        const mentions = message.data.mentions || [];
        if (!mentions.length) {
            return await sendMsg({ msg: "⚠️ Hãy chọn người bằng mention thật của Zalo: !tag on @người" });
        }

        if (running.has(key)) {
            return await sendMsg({ msg: "⚠️ Tác vụ đang chạy. Dùng !tag stop trước." });
        }

        // Đọc file ngôn từ để tag
        const file = path.join(__dirname, "..", "..", "ngonwar.txt");
        if (!fs.existsSync(file)) {
            return await sendMsg({ msg: "❌ Không tìm thấy file ngonwar.txt." });
        }

        let lines = [];
        try {
            lines = fs.readFileSync(file, "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        } catch (err) {
            return await sendMsg({ msg: "❌ Không đọc được file ngonwar.txt." });
        }

        if (!lines.length) {
            return await sendMsg({ msg: "⚠️ File ngonwar.txt đang trống." });
        }

        const target = mentions[0];
        if (!target.uid || !Number.isInteger(target.pos) || !Number.isInteger(target.len) || target.len <= 0) {
            return await sendMsg({ msg: "❌ Dữ liệu mention không hợp lệ." });
        }

        const job = { stop: false };
        running.set(key, job);
        let sent = 0;
        const currentDelay = getDelay(); // Lấy delay từ file cấu hình

        try {
            for (const line of lines) {
                if (job.stop) break;

                const sourceText = String(message.data.content || "");
                const mentionText = sourceText.slice(target.pos, target.pos + target.len).trim();

                if (!mentionText || !target.uid) throw new Error("Thiếu nhãn hoặc UID mention.");

                const msg = `${mentionText}\n${line}`;

                await api.sendMessage({
                    msg,
                    mentions: [{ uid: String(target.uid), pos: 0, len: mentionText.length, type: 0 }]
                }, threadId, type);

                sent++;

                if (sent < lines.length && !job.stop) {
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                }
            }
        } catch (err) {
            console.error("Lỗi tag:", err);
            await sendMsg({ msg: "❌ Gửi mention thất bại. Kiểm tra log Termux." });
        } finally {
            running.delete(key);
        }

        if (job.stop) {
            await sendMsg({ msg: `⏹ Đã dừng, gửi được ${sent}/${lines.length} dòng.` });
        }
    }
};
