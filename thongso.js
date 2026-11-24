const os = require("os");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

module.exports = {
    name: "thongso",
    description: "Tạo ảnh thông số hệ thống",
    level: 0,

    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const type = message.type;

        try {
            const getCpuInfo = () => {
                const cpus = os.cpus();
                let idle = 0, total = 0;
                for (const cpu of cpus) {
                    for (const key in cpu.times) { total += cpu.times[key]; }
                    idle += cpu.times.idle;
                }
                return { idle, total };
            };

            const cpuStart = getCpuInfo();
            await new Promise(r => setTimeout(r, 500));
            const cpuEnd = getCpuInfo();
            const cpuUsage = Math.round(100 * (1 - (cpuEnd.idle - cpuStart.idle) / (cpuEnd.total - cpuStart.total)));

            const totalRam = os.totalmem();
            const usedRam = totalRam - os.freemem();
            const ramUsage = Math.round(usedRam / totalRam * 100);

            let totalDisk = 0, usedDisk = 0;
            try {
                const df = execFileSync("df", ["-Pk", process.cwd()]).toString().trim().split("\n").pop().trim().split(/\s+/);
                totalDisk = Number(df[1]) * 1024;
                usedDisk = Number(df[2]) * 1024;
            } catch (e) {}
            const diskUsage = totalDisk ? Math.round(usedDisk / totalDisk * 100) : 0;

            let swapTotal = 0, swapUsed = 0;
            try {
                const mem = fs.readFileSync("/proc/meminfo", "utf8");
                const get = key => Number(mem.match(new RegExp("^" + key + ":\\s+(\\d+)", "m"))?.[1] || 0) * 1024;
                swapTotal = get("SwapTotal"); swapUsed = swapTotal - get("SwapFree");
            } catch (e) {}
            const swapUsage = swapTotal ? Math.round(swapUsed / swapTotal * 100) : 0;

            const gb = n => (n / 1073741824).toFixed(2);
            const now = new Date();
            const date = now.toLocaleDateString("vi-VN");
            const time = now.toLocaleTimeString("vi-VN");
            const colors = { purple: "#a855f7", blue: "#38bdf8", pink: "#ec4899", green: "#4ade80" };

            const gauge = (x, y, value, label, color) => {
                const circumference = 2 * Math.PI * 48;
                const offset = circumference * (1 - value / 100);
                return `
                <circle cx="${x}" cy="${y}" r="48" fill="none" stroke="#25213d" stroke-width="10"/>
                <circle cx="${x}" cy="${y}" r="48" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${x} ${y})"/>
                <text x="${x}" y="${y+7}" fill="white" font-size="27" font-weight="bold" text-anchor="middle">${value}%</text>
                <text x="${x}" y="${y+78}" fill="#b8b4d5" font-size="19" text-anchor="middle">${label}</text>`;
            };

            const bar = (x, y, label, value, color, detail) => `
                <text x="${x}" y="${y}" fill="#e8e4ff" font-size="19">${label}</text>
                <text x="${x+700}" y="${y}" fill="${color}" font-size="19" text-anchor="end">${value}%</text>
                <rect x="${x}" y="${y+15}" width="700" height="12" rx="6" fill="#29243f"/>
                <rect x="${x}" y="${y+15}" width="${700*value/100}" height="12" rx="6" fill="${color}"/>
                <text x="${x}" y="${y+52}" fill="#9994b7" font-size="15">${detail}</text>`;

            const svg = `
            <svg width="1200" height="850" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#090719"/><stop offset="1" stop-color="#15102b"/></linearGradient><linearGradient id="head"><stop stop-color="#a855f7"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>
            <rect width="1200" height="850" fill="url(#bg)"/>
            <text x="55" y="65" fill="url(#head)" font-size="35" font-weight="bold">SYSTEM MONITOR</text>
            <text x="55" y="100" fill="#aaa4c7" font-size="17">REAL-TIME RESOURCE MONITORING</text>
            <text x="1140" y="58" fill="#4ade80" font-size="18" text-anchor="end">● ONLINE</text>
            <text x="1140" y="92" fill="#aaa4c7" font-size="17" text-anchor="end">${date} | ${time}</text>
            <rect x="35" y="125" width="1130" height="250" rx="22" fill="#17132a" stroke="#44336d"/>
            <text x="65" y="170" fill="#d9c8ff" font-size="22" font-weight="bold">RESOURCE USAGE</text>
            ${gauge(190, 255, cpuUsage, "CPU", colors.purple)}${gauge(465, 255, ramUsage, "RAM", colors.blue)}${gauge(740, 255, diskUsage, "STORAGE", colors.pink)}${gauge(1015, 255, swapUsage, "SWAP", colors.green)}
            <rect x="35" y="400" width="1130" height="300" rx="22" fill="#17132a" stroke="#44336d"/>
            <text x="65" y="450" fill="#d9c8ff" font-size="23" font-weight="bold">SYSTEM DETAILS</text>
            ${bar(65, 500, "CPU LOAD", cpuUsage, colors.purple, os.cpus().length + " CPU CORES")}
            ${bar(65, 570, "RAM MEMORY", ramUsage, colors.blue, gb(usedRam) + " GB / " + gb(totalRam) + " GB")}
            ${bar(65, 640, "DISK STORAGE", diskUsage, colors.pink, gb(usedDisk) + " GB / " + gb(totalDisk) + " GB")}
            <rect x="35" y="725" width="1130" height="85" rx="18" fill="#17132a" stroke="#44336d"/>
            <text x="65" y="765" fill="#aaa4c7" font-size="17">SWAP MEMORY</text>
            <text x="65" y="790" fill="#4ade80" font-size="18">${gb(swapUsed)} GB / ${gb(swapTotal)} GB</text>
            <text x="1135" y="780" fill="#a855f7" font-size="17" text-anchor="end">SYSTEM RESOURCE REPORT</text>
            </svg>`;

            const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
            
            // 1. Lưu ra file tạm lấy path thật
            const tempFilePath = path.join(os.tmpdir(), \`thongso_\${Date.now()}.png\`);
            fs.writeFileSync(tempFilePath, imageBuffer);

            let uploaded;
            try {
                // 2. Thử gọi API bằng đường dẫn (String) trực tiếp - Đây là cách chuẩn nhất của Zalo SDK
                uploaded = await api.uploadAttachment(tempFilePath, threadId, type);
            } catch (uploadErr) {
                // 3. Nếu thư viện bắt buộc phải truyền object, ta sẽ nhồi path thật vào object
                uploaded = await api.uploadAttachment({
                    path: tempFilePath, 
                    filePath: tempFilePath,
                    data: imageBuffer,
                    filename: "system-monitor.png",
                    metadata: { totalSize: imageBuffer.length, width: 1200, height: 850 }
                }, threadId, type);
            }

            // Xóa file tạm
            try { fs.unlinkSync(tempFilePath); } catch(e) {}

            await api.sendMessage({
                msg: "📊 Thông số tài nguyên hệ thống",
                attachments: uploaded
            }, threadId, type);

        } catch (err) {
            console.error("[THONGSO] Lỗi thực thi:", err);
            try { await api.sendMessage({ msg: "❌ Lỗi: " + err.message }, threadId, type); } catch (e) {}
        }
    }
};
