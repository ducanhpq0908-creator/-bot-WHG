const fs = require("fs");
const path = require("path");

// ĐÂY LÀ FILE MẪU - HÃY COPY THÀNH config.js VÀ ĐIỀN THÔNG TIN
module.exports = {
    imei: "YOUR_IMEI_HERE",
    session_cookies: {
        "_zlang": "vn",
        "zpsid": "YOUR_ZPSID",
        "__zi": "YOUR_ZI",
        "zpw_sek": "YOUR_ZPW_SEK",
        "zpdid": "YOUR_ZPDID",
        "zlogin_session": "YOUR_ZLOGIN_SESSION"
    },
    prefix: "!",
    bot_name: "WHG BOT",
    admin_uids: [
        "YOUR_ADMIN_UID"
    ],
    // ... các cấu hình khác
};
