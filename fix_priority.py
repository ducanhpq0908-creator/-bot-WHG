import os, re, shutil, json
from datetime import datetime

WORK = os.path.expanduser("~/WHG")
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = os.path.join(WORK, "backup_fix")
os.makedirs(BACKUP, exist_ok=True)

# ===== 1. VÁ LISTENER (Đưa hook lên trước, nhận cả !số và số) =====
listeners = ["bot_listener.mjs", "main.js", "main.mjs"]
hook_code = """
// ===== HOOK XNHAU PRIORITY =====
try {
  const _text = (message.data && message.data.content ? message.data.content : "").trim();
  const _quote = message.data && message.data.quote;
  const _numMatch = _text.match(/^!?(\\d+)$/);
  if (_quote && _quote.globalMsgId && global.searchMemory && global.searchMemory.has(_quote.globalMsgId) && _numMatch) {
    const _xnhauPath = path.join(process.cwd(), "modules", "xnhau.js");
    const _xnhau = (await import(pathToFileURL(_xnhauPath).href)).default;
    return await _xnhau.execute(api, message, [_numMatch[1]]);
  }
} catch (_e) { console.error("Hook err:", _e); }
// ===== END HOOK =====
"""

for lf in listeners:
    lf_path = os.path.join(WORK, lf)
    if not os.path.exists(lf_path): continue
    shutil.copy2(lf_path, os.path.join(BACKUP, f"{lf}_{stamp}.bak"))
    with open(lf_path, "r", encoding="utf-8") as f: src = f.read()

    src = re.sub(r"// ===== HOOK XNHAU.*?// ===== END HOOK.*?=====", "", src, flags=re.DOTALL)
    
    match = re.search(r"(async\s+(?:function\s+)?onMessage\s*\([^)]*\)\s*\{|async\s+\([^)]*\)\s*=>\s*\{|(?:async\s+)?function\s+handleMessage\s*\([^)]*\)\s*\{)", src)
    if match:
        idx = match.end()
        src = src[:idx] + "\n" + hook_code + src[idx:]
        with open(lf_path, "w", encoding="utf-8") as f: f.write(src)
        print(f"[OK] Đã chèn hook ưu tiên vào {lf}")
    else:
        print(f"[WARN] Không tìm thấy onMessage trong {lf}")

# ===== 2. GHI ĐÈ MODULE XNHAU BẢN FULL (TÌM KIẾM TỐT HƠN) =====
NEW_MODULE = r'''const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://xnhau.plus/";
const SEARCH_URL = "https://xnhau.plus/?s=";
const CACHE_DIR = path.join(__dirname, "..", "cache");

if (!global.searchMemory) global.searchMemory = new Map();
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function fetchHTML(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 3) return reject(new Error("Too many redirects"));
    const req = https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL },
      timeout: 15000
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location)
        return fetchHTML(res.headers.location, depth + 1).then(resolve).catch(reject);
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => data += c);
      res.on("end", () => resolve({ html: data, status: res.statusCode }));
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL } }, (res) => {
      if (res.statusCode !== 200) { file.close(); try{fs.unlinkSync(destPath)}catch(_){}; return reject(new Error("HTTP "+res.statusCode)); }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => { file.close(); try{fs.unlinkSync(destPath)}catch(_){}; reject(err); });
  });
}

function parseMovies(html) {
  const results = [], seen = new Set();
  // Regex cào chuẩn xác thẻ a có chứa link video
  const regex = /<a[^>]+href="(https?:\/\/xnhau\.plus\/video\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let link = m[1];
    let title = m[2] || m[3].replace(/<[^>]+>/g, "").trim(); // Nếu không có title attr thì bóc text bên trong
    if (!title || seen.has(link)) continue;
    seen.add(link);
    results.push({ title, link });
  }
  return results.slice(0, 10); // Nâng lên 10 kết quả
}

module.exports = {
  name: "xnhau", description: "Tìm kiếm và tải video", role: "user",
  execute: async (api, message, args) => {
    const threadId = message.threadId, type = message.type;
    const content = (args || []).join(" ").trim();
    const isNumeric = /^\d+$/.test(content.replace(/^!/, ""));
    const choice = parseInt(content.replace(/^!/, ""), 10);
    const quote = message.data && message.data.quote;

    if (quote && quote.globalMsgId && global.searchMemory.has(quote.globalMsgId) && isNumeric) {
      const movies = global.searchMemory.get(quote.globalMsgId);
      if (choice < 1 || choice > movies.length)
        return api.sendMessage(`⚠️ Nhập số từ 1 đến ${movies.length}`, threadId, type);
      const target = movies[choice - 1];
      await api.sendMessage(`⏳ Đang trích xuất: ${target.title}...`, threadId, type);
      try {
        const { html } = await fetchHTML(target.link);
        let videoUrl = null;
        const m1 = html.match(/<(?:video|source)[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
        const m2 = html.match(/(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/i);
        if (m1) videoUrl = m1[1]; else if (m2) videoUrl = m2[1];

        if (!videoUrl) return api.sendMessage(`❌ Không tìm thấy link tải .mp4\n🔗 ${target.link}`, threadId, type);

        const savePath = path.join(CACHE_DIR, `video_${Date.now()}.mp4`);
        await api.sendMessage("⏳ Đang tải video...", threadId, type);
        await downloadFile(videoUrl, savePath);
        
        await api.sendMessage({ msg: `🎬 ${target.title}\n🔗 ${target.link}`, attachments: [savePath] }, threadId, type);
        fs.unlink(savePath, () => {});
        global.searchMemory.delete(quote.globalMsgId);
      } catch (err) { return api.sendMessage(`❌ Lỗi: ${err.message}`, threadId, type); }
      return;
    }

    if (!content || content === "help")
      return api.sendMessage("🌐 **HƯỚNG DẪN**\n👉 `!xnhau <từ khóa>`: Tìm kiếm\n👉 Reply tin nhắn kết quả + gõ số (VD: `1` hoặc `!1`) để tải.", threadId, type);

    await api.sendMessage(`🔍 Đang tìm: **${content}**...`, threadId, type);
    try {
      const { html, status } = await fetchHTML(SEARCH_URL + encodeURIComponent(content));
      if (status !== 200) return api.sendMessage(`❌ HTTP ${status}`, threadId, type);
      const movies = parseMovies(html);
      if (movies.length === 0) return api.sendMessage(`❌ Không có kết quả: ${content}`, threadId, type);
      
      let msg = `🎬 **KẾT QUẢ: ${content.toUpperCase()}**\n━━━━━━━━━━━━━━━━━━━━\n`;
      movies.forEach((m, i) => { msg += `${i+1}. ${m.title}\n🔗 ${m.link}\n\n`; });
      msg += `👉 **Reply tin nhắn này + gõ số (VD: 1) để tải!**`;
      
      const sent = await api.sendMessage(msg, threadId, type);
      const msgId = sent?.message?.msgId || sent?.msgId;
      if (msgId) global.searchMemory.set(msgId, movies);
    } catch (err) { return api.sendMessage(`❌ Lỗi cào: ${err.message}`, threadId, type); }
  }
};
'''
mod_file = os.path.join(WORK, "modules", "xnhau.js")
if os.path.exists(mod_file):
    shutil.copy2(mod_file, os.path.join(BACKUP, f"xnhau_{stamp}.js.bak"))
    with open(mod_file, "w", encoding="utf-8") as f: f.write(NEW_MODULE)
    print("[OK] Đã ghi đè modules/xnhau.js (bản fix tìm kiếm & regex)")

# ===== 3. THÊM VÀO MENU_DATA =====
menu_file = os.path.join(WORK, "menu_data.json")
if os.path.exists(menu_file):
    try:
        with open(menu_file, "r", encoding="utf-8") as f: data = json.load(f)
        if isinstance(data, list):
            if not any(x.get("name") == "xnhau" for x in data if isinstance(x, dict)):
                data.append({"name": "xnhau", "description": "Tìm kiếm và tải video", "role": "user"})
                with open(menu_file, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
                print("[OK] Đã thêm xnhau vào menu_data.json")
        elif isinstance(data, dict) and "commands" in data:
             if not any(x.get("name") == "xnhau" for x in data["commands"] if isinstance(x, dict)):
                data["commands"].append({"name": "xnhau", "description": "Tìm kiếm và tải video", "role": "user"})
                with open(menu_file, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
                print("[OK] Đã thêm xnhau vào menu_data.json (commands)")
    except Exception as e: print("[WARN] Lỗi menu_data.json:", e)

print("=== HOÀN TẤT ===")
