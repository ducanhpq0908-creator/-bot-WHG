import json
import os
from core.utils import is_admin

NAME = "prefix"
DESC = "Xem hoặc đổi prefix: prefix <dấu_mới>"

PREFIX_FILE = "data/prefix.json"

def get_current_prefix():
    if os.path.exists(PREFIX_FILE):
        with open(PREFIX_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("prefix", "!")
    return "!"

def execute(client, mo, args):
    current_prefix = get_current_prefix()

    # Nếu không có args -> Xem prefix
    if not args:
        return mo.reply(f"♛ Prefix hiện tại của bot là: {current_prefix} ♛")

    # Nếu có args -> Đổi prefix
    ADMIN_UID = getattr(client, 'uid', None) or "YOUR_MAIN_ADMIN_UID"
    if not is_admin(str(mo.author_id), str(ADMIN_UID)):
        return mo.reply("❌ Bạn không có quyền đổi prefix. Chỉ Admin mới được phép!")

    new_prefix = args[0]
    if len(new_prefix) > 3:
        return mo.reply("❌ Prefix không được dài quá 3 ký tự!")

    # Cập nhật lại config
    try:
        import config.config
        config.config.PREFIX = new_prefix
    except:
        pass
    client.prefix = new_prefix

    # Lưu vào file
    os.makedirs("data", exist_ok=True)
    with open(PREFIX_FILE, "w", encoding="utf-8") as f:
        json.dump({"prefix": new_prefix}, f, ensure_ascii=False, indent=2)

    mo.reply(f"✅ Đã đổi prefix thành: {new_prefix}")
