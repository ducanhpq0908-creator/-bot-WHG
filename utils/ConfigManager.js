// utils/ConfigManager.js
// Đọc config 1 lần vào RAM khi khởi động. Ghi bất đồng bộ để không block bot.

const fs = require('fs');
const path = require('path');
const cache = require('./FastCache');

const CONFIG_PATH = path.join(__dirname, '../config.json');

class ConfigManager {
    constructor() {
        this.loadConfig();
    }

    // Đọc đồng bộ 1 lần duy nhất lúc bật bot (chấp nhận được vì chỉ chạy 1 lần)
    loadConfig() {
        try {
            const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
            cache.set('config', JSON.parse(raw));
            console.log('[+] Đã nạp config vào RAM.');
        } catch (err) {
            console.error('[!] Lỗi đọc config.json:', err.message);
            cache.set('config', {});
        }
    }

    // Lấy config trong 0.01ms
    get() {
        return cache.get('config');
    }

    // Cập nhật config (bất đồng bộ, không làm chậm bot)
    update(newConfig) {
        cache.set('config', newConfig);
        fs.promises.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2))
            .catch(err => console.error('[!] Lỗi ghi config:', err.message));
    }
}

module.exports = new ConfigManager();
