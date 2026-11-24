import sys
from PIL import Image
try:
    img = Image.open(sys.argv[1])
    img.convert("RGBA").save(sys.argv[2], "PNG")
    sys.exit(0)
except Exception as e:
    print(f"Lỗi: {e}", file=sys.stderr)
    sys.exit(1)
