import os
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def get_font(size, bold=False):
    # Ưu tiên dùng font DejaVu của Termux để không bị lỗi hiển thị dấu cách
    paths = [
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/system/fonts/Roboto-Bold.ttf" if bold else "/system/fonts/Roboto-Regular.ttf"
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def create_glow_card(img, draw, xy, radius, fill, outline):
    # Tạo viền phát sáng (glow) mỏng và sắc nét
    glow = Image.new('RGBA', img.size, (0,0,0,0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle(xy, radius=radius, outline=outline, width=4)
    glow = glow.filter(ImageFilter.GaussianBlur(5))
    img.alpha_composite(glow)
    # Vẽ thân thẻ màu đen mờ
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)

def main():
    if not os.path.exists("menu_data.json"):
        print("[-] Không tìm thấy menu_data.json")
        return

    with open("menu_data.json", "r", encoding="utf-8") as f:
        cmds = json.load(f)

    admin_keywords = ["admin", "adminext", "bot", "eval", "join", "leave", "lock", "unlock", "member", "pin", "qrlogin", "remind", "rs", "say", "security", "setname", "spam", "stop", "tag", "treo", "utils", "vote", "warn"]
    for cmd in cmds:
        if cmd["cmd"].lower().replace("!", "") in admin_keywords:
            cmd["admin"] = True

    items_per_page = 8
    total_pages = math.ceil(len(cmds) / items_per_page)

    os.makedirs("cache", exist_ok=True)
    for f in os.listdir("cache"):
        if f.startswith("menu_") and f.endswith(".png"):
            os.remove(os.path.join("cache", f))

    bg_path = "assets/bg.jpg"

    for page in range(1, total_pages + 1):
        # 1. Xử lý ảnh nền
        if os.path.exists(bg_path):
            bg = Image.open(bg_path).convert("RGBA").resize((1080, 1080))
            # Làm tối nền 50% cho giống ảnh mẫu
            overlay = Image.new("RGBA", bg.size, (0, 0, 0, 140)) 
            img = Image.alpha_composite(bg, overlay)
        else:
            img = Image.new('RGBA', (1080, 1080), color=(15, 20, 30, 255))
            
        draw = ImageDraw.Draw(img)

        # 2. Vẽ Header (Font to, có dấu cách rộng)
        font_title = get_font(46, True)
        title_text = "D  A  N  H    S  Á  C  H    L  Ệ  N  H"
        # Đổ bóng cho chữ Header để nổi bật
        draw.text((542, 92), title_text, font=font_title, fill=(0, 0, 0), anchor="mm")
        draw.text((540, 90), title_text, font=font_title, fill=(255, 255, 255), anchor="mm")
        
        # Page Badge
        draw.rounded_rectangle([(880, 55), (1000, 105)], radius=25, fill=(255, 255, 255))
        font_page = get_font(24, True)
        draw.text((940, 80), f"{page:02d}/{total_pages:02d}", font=font_page, fill=(0, 0, 0), anchor="mm")

        start_idx = (page - 1) * items_per_page
        page_cmds = cmds[start_idx:start_idx + items_per_page]

        font_cmd = get_font(24, True) # Chữ to hơn
        font_desc = get_font(18) # Chữ mô tả to hơn
        
        start_x, start_y = 55, 180
        card_w, card_h = 230, 300
        gap_x, gap_y = 15, 25

        for i, cmd in enumerate(page_cmds):
            col = i % 4
            row = i // 4
            x = start_x + col * (card_w + gap_x)
            y = start_y + row * (card_h + gap_y)

            # Màu thẻ đen tuyền (trong suốt), viền xanh cyan
            card_fill = (10, 12, 18, 235) # Đen sẫm hơn
            card_outline = (0, 255, 200, 255)
            
            create_glow_card(img, draw, [(x, y), (x + card_w, y + card_h)], radius=12, fill=card_fill, outline=card_outline)
            
            # Tên lệnh (Kèm icon ô vuông giả lập nếu muốn)
            cmd_text = cmd['cmd'].upper()
            if len(cmd_text) > 13: cmd_text = cmd_text[:11] + ".."
            draw.text((x + 15, y + 20), cmd_text, font=font_cmd, fill=(255, 255, 255))
            
            # Đường kẻ ngang
            draw.line([(x + 15, y + 65), (x + card_w - 15, y + 65)], fill=(60, 70, 90), width=1)
            
            # Mô tả (Tự động xuống dòng)
            desc = cmd['desc']
            if desc == "Chưa cập nhật mô tả" or not desc: desc = "Không có mô tả"
            
            words = desc.split()
            lines = []
            current_line = ""
            for word in words:
                if len(current_line + word) < 22: 
                    current_line += word + " "
                else:
                    lines.append(current_line.strip())
                    current_line = word + " "
            if current_line: lines.append(current_line.strip())
                
            for line_idx, line in enumerate(lines[:4]): 
                draw.text((x + 15, y + 85 + line_idx * 24), line, font=font_desc, fill=(220, 225, 230))
            
            # Tag User/Admin (Góc dưới phải, màu đen mờ)
            tag = "ADMIN" if cmd['admin'] else "USER"
            tag_c = (255, 180, 0) if cmd['admin'] else (0, 255, 200)
            
            tag_w = 65 if cmd['admin'] else 55
            tag_bg = (0, 0, 0, 200) # Nền đen
            draw.rounded_rectangle([(x + card_w - tag_w - 15, y + card_h - 40), (x + card_w - 15, y + card_h - 15)], radius=5, fill=tag_bg)
            draw.text((x + card_w - (tag_w/2) - 15, y + card_h - 27), tag, font=get_font(13, True), fill=tag_c, anchor="mm")

        # Lưu ảnh
        final_img = Image.new("RGB", img.size, (255, 255, 255))
        final_img.paste(img, mask=img.split()[3])
        
        out_path = f"cache/menu_{page}.png"
        final_img.save(out_path)
        print(f"[+] Đã tạo {out_path}")

if __name__ == "__main__":
    main()
