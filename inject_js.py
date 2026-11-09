import os, re

if not os.path.exists("main.js"):
    print("❌ Không tìm thấy file main.js")
    exit()

with open("main.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Thêm import ở đầu file
if "require('./autoduyet.js')" not in code:
    code = "const autoduyet = require('./autoduyet.js');\n" + code
    print("✅ Đã thêm import autoduyet.js")

# 2. Chèn gọi lệnh vào hàm xử lý tin nhắn (Tìm hàm onMessage hoặc sự kiện message)
# Tìm từ khóa nhận tin nhắn để chèn logic
if "handleAutoduyetCommand" not in code:
    # Tìm dòng gán sự kiện onMessage
    match = re.search(r'(client\.onMessage\s*=\s*function\s*\([^)]*\)\s*\{)', code)
    if not match:
        match = re.search(r'(function\s+onMessage\s*\([^)]*\)\s*\{)', code)
    
    if match:
        insert_code = match.group(1) + '''
    // TÍCH HỢP AUTODUYET
    try {
        if (message && typeof message === 'string' && message.trim().toLowerCase().startsWith('!autoduyet')) {
            const tType = (typeof thread_type !== 'undefined') ? thread_type : ((typeof type !== 'undefined') ? type : 0);
            const tId = (typeof thread_id !== 'undefined') ? thread_id : ((typeof tid !== 'undefined') ? tid : '');
            const aId = (typeof author_id !== 'undefined') ? author_id : ((typeof uid !== 'undefined') ? uid : '');
            
            autoduyet.handleAutoduyetCommand(message, message_object || null, tId, tType, aId);
            return;
        }
    } catch (err) {
        console.error("Lỗi chạy autoduyet:", err.message);
    }
'''
        code = code.replace(match.group(1), insert_code)
        print("✅ Đã chèn lệnh !autoduyet vào hàm xử lý tin nhắn.")
    else:
        print("⚠️ Không tìm thấy hàm onMessage, hãy chèn thủ công.")

# 3. Thêm gán Client sau khi login
if "autoduyet.setClient" not in code:
    # Tìm dòng client.listen hoặc login thành công
    match_login = re.search(r'(client\.listen\s*\()', code)
    if match_login:
        code = code.replace(match_login.group(1), "autoduyet.setClient(client);\n        " + match_login.group(1))
        print("✅ Đã gắn client cho autoduyet.")

# 4. Thêm setInterval quét định kỳ vào cuối file
if "setInterval(" not in code or "autoduyet.runOnce" not in code:
    code += '''
// QUÉT AUTO DUYỆT ĐỊNH KỲ (Mỗi 10s)
setInterval(async () => {
    try {
        if (typeof client !== 'undefined') {
            await autoduyet.runOnce(client);
        }
    } catch (e) {
        // Bỏ qua lỗi mạng
    }
}, 10000);
'''
    print("✅ Đã thêm bộ quét tự động 10s.")

with open("main.js", "w", encoding="utf-8") as f:
    f.write(code)

print("🎉 HOÀN TẤT! Đã cấy module autoduyet vào main.js")
