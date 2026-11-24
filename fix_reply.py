import os, re, shutil
from datetime import datetime

WORK = os.path.expanduser("~/WHG")
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = os.path.join(WORK, "backup_fix")
os.makedirs(BACKUP, exist_ok=True)

# Hook ưu tiên cao nhất: Bắt cả số và !số khi reply
hook_code = """
// ===== HOOK XNHAU FULL =====
try {
  const _rawText = (message.data && message.data.content) ? String(message.data.content).trim() : "";
  const _quote = message.data && message.data.quote;
  const _match = _rawText.match(/^!?(\\d+)$/);
  if (_quote && _quote.globalMsgId && global.searchMemory && global.searchMemory.has(_quote.globalMsgId) && _match) {
    const _path = require("path");
    const _url = require("url");
    const _xnhauPath = _path.join(process.cwd(), "modules", "xnhau.js");
    const _xnhau = (await import(_url.pathToFileURL(_xnhauPath).href)).default;
    return await _xnhau.execute(api, message, [_match[1]]);
  }
} catch (_e) { console.error("Lỗi hook tải video:", _e.message); }
// ===== END HOOK =====
"""

listeners = ["bot_listener.mjs", "main.js", "main.mjs"]
for lf in listeners:
    lf_path = os.path.join(WORK, lf)
    if not os.path.exists(lf_path): continue
    shutil.copy2(lf_path, os.path.join(BACKUP, f"{lf}_{stamp}.bak"))
    
    with open(lf_path, "r", encoding="utf-8") as f: src = f.read()
    
    # Xóa hook cũ để tránh trùng lặp
    src = re.sub(r"// ===== HOOK XNHAU.*?// ===== END HOOK.*?=====", "", src, flags=re.DOTALL)
    
    # Chèn hook ngay dòng đầu tiên của hàm onMessage
    match = re.search(r"(async\s+(?:function\s+)?onMessage\s*\([^)]*\)\s*\{|async\s+\([^)]*\)\s*=>\s*\{|(?:async\s+)?function\s+handleMessage\s*\([^)]*\)\s*\{)", src)
    if match:
        idx = match.end()
        src = src[:idx] + "\n" + hook_code + src[idx:]
        with open(lf_path, "w", encoding="utf-8") as f: f.write(src)
        print(f"[OK] Đã ghim hook vào hàm xử lý tin nhắn của: {lf}")

print("=== HOÀN TẤT. KHỞI ĐỘNG LẠI BOT ===")
