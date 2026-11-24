const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://xnhau.plus/";
const SEARCH_URL = "https://xnhau.plus/?s=";
const CACHE_DIR = path.join(__dirname, "..", "cache");

if (!global.searchMemory) global.searchMemory = new Map();
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" },
            timeout: 15000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchHTML(res.headers.location).then(resolve).catch(reject);
            }
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ html: data, status: res.statusCode }));
        });
        req.on("timeout", () => req.destroy(new Error("Timeout")));
        req.on("error", reject);
    });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, {
            headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL }
        }, (res) => {
            if (res.statusCode !== 200) {
                fs.unlinkSync(destPath);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            res.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", (err) => {
            fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

function parseMovies(html) {
    const results = [];
    const regex = /<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let link = match[1], title = match[2];
        if (link.includes("/the-loai/") || link.includes("/tag/") || link.includes("javascript:")) continue;
        if (!link.startsWith("http")) link = BASE_URL + (link.startsWith("/") ? link.slice(1) : link);
        if (!results.some(r => r.link === link)) results.push({ title, link });
    }
    return results.slice(0, 5);
}

module.exports = {
    name: "xnhau",
    description: "Tìm kiếm và tải video",
    role: "user",
    execute: async (api, message, args) => {
        const threadId = message.threadId;
        const type = message.type;
        
        // Lấy nội dung tin nhắn (ví dụ: "1" hoặc "chu giang")
        const content = args.join(" ").trim();
        const choice = parseInt(content);

        // ── XỬ LÝ KHI REPLY VÀ GÕ SỐ (VD: !1) ──
        const quote = message.data.quote;
        if (quote && quote.globalMsgId && global.searchMemory.has(quote.globalMsgId) && !isNaN(choice)) {
            const movies = global.searchMemory.get(quote.globalMsgId);

            if (choice < 1 || choice > movies.length) {
                return api.sendMessage("⚠️ Vui lòng nhập số từ 1 đến " + movies.length, threadId, type);
            }

            const targetMovie = movies[choice - 1];
            await api.sendMessage(`⏳ Đang trích xuất video: ${targetMovie.title}...`, threadId, type);

            try {
                const { html } = await fetchHTML(targetMovie.link);
                
                // Cào link video (.mp4)
                const videoRegex = /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi;
                const matches = html.match(videoRegex);
                
                if (!matches || matches.length === 0) {
                    return api.sendMessage("❌ Không tìm thấy link tải trực tiếp (.mp4) trên trang này.", threadId, type);
                }

                const videoUrl = matches[0];
                const savePath = path.join(CACHE_DIR, `video_${Date.now()}.mp4`);

                await api.sendMessage(`⏳ Đang tải video về server bot...`, threadId, type);
                await downloadFile(videoUrl, savePath);

                await api.sendMessage({
                    msg: `🎬 Video: ${targetMovie.title}`,
                    attachments: [savePath]
                }, threadId, type);

                fs.unlink(savePath, () => {});
                global.searchMemory.delete(quote.globalMsgId);

            } catch (err) {
                return api.sendMessage(`❌ Lỗi tải video: ${err.message}`, threadId, type);
            }
            return;
        }

        // ── XỬ LÝ TÌM KIẾM BÌNH THƯỜNG ──
        if (!content || content === "help") {
            return api.sendMessage("🌐 **HƯỚNG DẪN**\n👉 `!xnhau <từ khóa>`: Tìm kiếm\n👉 Reply tin nhắn kết quả + nhập `!<số>` (VD: !1) để tải.", threadId, type);
        }

        await api.sendMessage(`🔍 Đang tìm kiếm: **${content}**...`, threadId, type);

        try {
            const searchUrl = SEARCH_URL + encodeURIComponent(content);
            const { html } = await fetchHTML(searchUrl);
            const movies = parseMovies(html);

            if (movies.length === 0) {
                return api.sendMessage(`❌ Không tìm thấy kết quả nào cho: ${content}`, threadId, type);
            }

            let msg = `🎬 **KẾT QUẢ TÌM KIẾM: ${content.toUpperCase()}**\n━━━━━━━━━━━━━━━━━━━━\n`;
            movies.forEach((m, i) => msg += `${i + 1}. ${m.title}\n🔗 Link: ${m.link}\n\n`);
            msg += `👉 **Reply tin nhắn này + gõ !<số> (VD: !1) để tải!**`;

            const sentMsg = await api.sendMessage(msg, threadId, type);
            
            // Lưu vào bộ nhớ đệm
            const msgId = sentMsg?.message?.msgId || sentMsg?.msgId;
            if (msgId) {
                global.searchMemory.set(msgId, movies);
            }

        } catch (err) {
            return api.sendMessage(`❌ Lỗi cào dữ liệu: ${err.message}`, threadId, type);
        }
    }
};
