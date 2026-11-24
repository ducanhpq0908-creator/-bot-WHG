const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://xnhau.plus/";
const SEARCH_URL = "https://xnhau.plus/?s=";
const CACHE_DIR = path.join(__dirname, "..", "cache");

if (!global.searchMemory) global.searchMemory = new Map();
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function fetchHTML(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 3) return reject(new Error("Quá nhiều redirect"));
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL }, timeout: 10000 }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location)
        return fetchHTML(res.headers.location, depth + 1).then(resolve).catch(reject);
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => data += c);
      res.on("end", () => resolve({ html: data, status: res.statusCode }));
    });
    req.on("timeout", () => req.destroy(new Error("Timeout HTML")));
    req.on("error", reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL }, timeout: 25000 }, (res) => {
      if (res.statusCode !== 200) { file.close(); try{fs.unlinkSync(destPath)}catch(_){}; return reject(new Error("HTTP "+res.statusCode)); }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("timeout", () => { req.destroy(); file.close(); try{fs.unlinkSync(destPath)}catch(_){}; reject(new Error("Timeout tải video")); });
    req.on("error", (err) => { file.close(); try{fs.unlinkSync(destPath)}catch(_){}; reject(err); });
  });
}

function parseMovies(html) {
  const results = [], seen = new Set();
  const regex = /<a[^>]+href="(https?:\/\/xnhau\.plus\/video\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let link = m[1];
    let title = m[2] || m[3].replace(/<[^>]+>/g, "").replace(/&amp;/g,"&").trim();
    if (!title || seen.has(link)) continue;
    seen.add(link); results.push({ title, link });
  }
  return results.slice(0, 10);
}

module.exports = {
  name: "xnhau", description: "Tìm kiếm và tải video", role: "user",
  execute: async (api, message, args) => {
    const threadId = message.threadId, type = message.type;
    const content = (args || []).join(" ").trim();
    const isNumeric = /^\d+$/.test(content);
    const choice = parseInt(content, 10);
    const quote = message.data && message.data.quote;

    if (quote && quote.globalMsgId && global.searchMemory.has(quote.globalMsgId) && isNumeric) {
      const movies = global.searchMemory.get(quote.globalMsgId);
      if (choice < 1 || choice > movies.length)
        return api.sendMessage(`⚠️ Nhập số từ 1 đến ${movies.length}`, threadId, type);
      
      const target = movies[choice - 1];
      await api.sendMessage(`⏳ Đang trích xuất video... Vui lòng đợi!`, threadId, type);
      
      try {
        const { html } = await fetchHTML(target.link);
        let videoUrl = null;
        const m1 = html.match(/<(?:video|source)[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
        const m2 = html.match(/(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/i);
        if (m1) videoUrl = m1[1]; else if (m2) videoUrl = m2[1];

        if (!videoUrl) return api.sendMessage(`❌ Không tìm thấy link tải .mp4\n🔗 ${target.link}`, threadId, type);

        const savePath = path.join(CACHE_DIR, `video_${Date.now()}.mp4`);
        await downloadFile(videoUrl, savePath);
        
        await api.sendMessage({ msg: `🎬 ${target.title}\n🔗 ${target.link}`, attachments: [savePath] }, threadId, type);
        
        // Dọn dẹp
        fs.unlink(savePath, () => {});
        global.searchMemory.delete(quote.globalMsgId);
      } catch (err) { 
        return api.sendMessage(`❌ Lỗi tải: ${err.message}`, threadId, type); 
      }
      return;
    }

    if (!content || content === "help")
      return api.sendMessage("🌐 **HƯỚNG DẪN**\n👉 `!xnhau <từ khóa>`: Tìm kiếm\n👉 Reply tin nhắn + gõ số (VD: 1) để tải.", threadId, type);

    await api.sendMessage(`🔍 Đang tìm kiếm: **${content}**...`, threadId, type);
    try {
      const { html, status } = await fetchHTML(SEARCH_URL + encodeURIComponent(content));
      if (status !== 200) return api.sendMessage(`❌ Lỗi HTTP ${status}`, threadId, type);
      const movies = parseMovies(html);
      if (movies.length === 0) return api.sendMessage(`❌ Không có kết quả: ${content}`, threadId, type);
      
      let msg = `🎬 **KẾT QUẢ: ${content.toUpperCase()}**\n━━━━━━━━━━━━━━━━━━━━\n`;
      movies.forEach((m, i) => { msg += `${i+1}. ${m.title}\n🔗 ${m.link}\n\n`; });
      msg += `👉 **Reply tin nhắn này + gõ số (VD: 1) để tải!**`;
      
      const sent = await api.sendMessage(msg, threadId, type);
      const msgId = sent?.message?.msgId || sent?.msgId;
      if (msgId) global.searchMemory.set(msgId, movies);
    } catch (err) { 
      return api.sendMessage(`❌ Lỗi cào dữ liệu: ${err.message}`, threadId, type); 
    }
  }
};
