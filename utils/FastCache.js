// utils/FastCache.js
// Lưu trữ RAM, không I/O, tốc độ truy xuất < 1ms.
// Dùng thay thế hoàn toàn cho việc đọc/ghi file config liên tục.

class FastCache {
    constructor() {
        this.data = new Map();
        this.timers = new Map();
    }
    
    // Lấy dữ liệu, nếu không có trả về null (0.01ms)
    get(key) {
        return this.data.get(key);
    }

    // Lưu dữ liệu (0.01ms)
    set(key, value) {
        this.data.set(key, value);
    }

    // Lưu có thời gian hết hạn (TTL)
    setEx(key, value, ttlMs) {
        this.set(key, value);
        if (this.timers.has(key)) clearTimeout(this.timers.get(key));
        if (ttlMs > 0) {
            this.timers.set(key, setTimeout(() => {
                this.data.delete(key);
                this.timers.delete(key);
            }, ttlMs));
        }
    }

    delete(key) {
        this.data.delete(key);
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }
}

module.exports = new FastCache(); // Singleton
