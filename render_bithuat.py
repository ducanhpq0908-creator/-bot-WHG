from PIL import Image, ImageDraw, ImageFont
import sys
import os

prefix = sys.argv[1] if len(sys.argv) > 1 else "!"

font_path = "/system/fonts/Roboto-Regular.ttf"
if not os.path.exists(font_path): font_path = "/system/fonts/Arial.ttf"

try:
    font = ImageFont.truetype(font_path, 22)
    title_font = ImageFont.truetype(font_path, 50)
    sub_font = ImageFont.truetype(font_path, 24)
except:
    font = ImageFont.load_default()
    title_font = font
    sub_font = font

W, H = 900, 1050
img = Image.new('RGB', (W, H), color=(15, 12, 41))
draw = ImageDraw.Draw(img)

# Header
draw.text((W/2, 130), "👁️ BÍ THUẬT", fill=(167, 139, 250), font=title_font, anchor="mm")
draw.text((W/2, 200), "Hidden Message Technique", fill=(148, 163, 184), font=sub_font, anchor="mm")

# Card
draw.rounded_rectangle([50, 310, W-50, 690], radius=24, fill=(30, 41, 59), outline=(139, 92, 246), width=2)

# Syntax
draw.text((100, 365), "📜 CÚ PHÁP", fill=(244, 114, 182), font=sub_font)
draw.text((100, 410), f"{prefix}bithuat <nội_dung> | <số_lần> | <delay> | <mode>", fill=(226, 232, 240), font=font)

# Mode
draw.text((100, 495), "⚡ MODE", fill=(56, 217, 169), font=sub_font)
draw.rounded_rectangle([100, 535, W-100, 615], radius=12, fill=(15, 23, 42))
draw.text((120, 550), "normal / 0   →   Tin nhắn ẩn thường", fill=(103, 232, 249), font=font)
draw.text((120, 580), "tag / 1       →   Tin ẩn + Tag All", fill=(252, 211, 77), font=font)

# Example
draw.text((100, 650), "💡 VÍ DỤ", fill=(96, 165, 250), font=sub_font)
draw.rounded_rectangle([100, 690, W-100, 750], radius=12, fill=(15, 23, 42))
draw.text((120, 705), f"{prefix}bithuat Chào mọi người|5|1000|tag", fill=(52, 211, 153), font=font)

# Stop
draw.text((W/2, 850), "🛑 DỪNG BÍ THUẬT", fill=(252, 165, 165), font=sub_font, anchor="mm")
draw.rounded_rectangle([W/2-150, 880, W/2+150, 930], radius=10, fill=(127, 29, 29))
draw.text((W/2, 905), f"{prefix}bithuat stop", fill=(254, 202, 202), font=font, anchor="mm")

os.makedirs("assets/temp", exist_ok=True)
img.save("assets/temp/bithuat_menu.png")
print("OK")
