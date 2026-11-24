import os, re, shutil
from datetime import datetime

WORK = os.path.expanduser("~/WHG")
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = os.path.join(WORK, "backup_fix")
os.makedirs(BACKUP, exist_ok=True)

# ===== 1. VÁ AUTOREACT =====
react_file = os.path.join(WORK, "autoreact.js")
if os.path.exists(react_file):
    shutil.copy2(react_file, os.path.join(BACKUP, f"autoreact_{stamp}.js.bak"))
    with open(react_file, "r", encoding="utf-8") as f: src = f.read()
    if "typeof text === 'object'" not in src:
        patch = """
function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch(e) { return String(v); }
  }
  return String(v);
}
"""
        src = patch + src
        src = re.sub(r"\b(message\.data\.content|text|msg|content)\.toLowerCase\(\)", r"safeStr(\1).toLowerCase()", src)
        src = re.sub(r"(?<![a-zA-Z0-9_])message\.data\.content\b", "safeStr(message.data.content)", src)
        with open(react_file, "w", encoding="utf-8") as f: f.write(src)
        print("[OK] Đã fix autoreact.js")
else:
    print("[SKIP] Không có autoreact.js")

# ===== 2. VÁ MODULE XNHAU (nhận cả số và !số) =====
mod_file = os.path.join(WORK, "modules", "xnhau.js")
if os.path.exists(mod_file):
    shutil.copy2(mod_file, os.path.join(BACKUP, f"xnhau_{stamp}.js.bak"))
    with open(mod_file, "r", encoding="utf-8") as f: src = f.read()
    
    # Sửa dòng isNumeric để nhận cả "!5"
    src = src.replace(
        'const isNumeric = /^\\d+$/.test(content);',
        'const isNumeric = /^\\d+$/.test(content) || /^!\\d+$/.test(content);\n    const cleanContent = content.replace(/^!/, "");\n    const choice = parseInt(cleanContent, 10);'
    )
    # Loại bỏ dòng khai báo choice cũ nếu bị trùng
    src = re.sub(r'const choice = parseInt\(content, 10\);\n', '', src)
    
    with open(mod_file, "w", encoding="utf-8") as f: f.write(src)
    print("[OK] Đã fix modules/xnhau.js (hỗ trợ !số)")

print("=== HOÀN TẤT ===")
