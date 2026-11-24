const os = require("os");
const fs = require("fs");
const { execFileSync } = require("child_process");

module.exports = {
    name: "thongso",
    description: "Xem chi tiết thông số hệ thống",
    level: 0,

    execute: async (api, message) => {
        const { threadId, type } = message;

        try {
            const read = path => {
                try {
                    return fs.readFileSync(path, "utf8");
                } catch {
                    return "";
                }
            };

            const gb = n => (n / 1073741824).toFixed(2);

            const percent = (used, total) =>
                total > 0
                    ? Math.max(0, Math.min(100, Math.round(used / total * 100)))
                    : 0;

            const bar = value => {
                const n = Math.round(value / 10);
                return "▰".repeat(n) + "▱".repeat(10 - n);
            };

            const uptime = seconds => {
                seconds = Math.floor(Math.max(0, seconds));
                const d = Math.floor(seconds / 86400);
                const h = Math.floor(seconds % 86400 / 3600);
                const m = Math.floor(seconds % 3600 / 60);
                const s = seconds % 60;

                return `${d} ngày ${h} giờ ${m} phút ${s} giây`;
            };

            // CPU: số nhân và tên bộ xử lý
            const cpuInfo = read("/proc/cpuinfo");

            const coreMatches = cpuInfo.match(/^processor\s*:/gm);
            const cores = coreMatches?.length ||
                os.cpus().length ||
                os.availableParallelism?.() || 1;

            const cpuName =
                cpuInfo.match(/^(?:model name|Hardware|Processor)\s*:\s*(.+)$/mi)?.[1]
                || "Không xác định";

            // Tần số CPU
            let frequencies = [];

            try {
                const entries = fs.readdirSync("/sys/devices/system/cpu");
                for (const entry of entries) {
                    if (!/^cpu\d+$/.test(entry)) continue;

                    const freq = read(
                        `/sys/devices/system/cpu/${entry}/cpufreq/scaling_cur_freq`
                    ).trim();

                    if (Number(freq) > 0) {
                        frequencies.push(Number(freq) / 1000);
                    }
                }
            } catch {}

            const avgFreq = frequencies.length
                ? (frequencies.reduce((a, b) => a + b, 0) / frequencies.length).toFixed(0)
                : "Không đọc được";

            // Đo CPU bằng /proc/stat
            const readCpuStat = () => {
                const line = read("/proc/stat").split("\n")[0];
                const values = line.trim().split(/\s+/).slice(1).map(Number);

                if (values.length < 4 || values.some(Number.isNaN)) return null;

                const idle = values[3] + (values[4] || 0);
                const total = values.reduce((a, b) => a + b, 0);

                return { idle, total };
            };

            const cpuStart = readCpuStat();
            await new Promise(resolve => setTimeout(resolve, 700));
            const cpuEnd = readCpuStat();

            let cpuUsage = 0;

            if (cpuStart && cpuEnd &&
                cpuEnd.total > cpuStart.total) {
                cpuUsage = Math.round(
                    100 * (1 - (cpuEnd.idle - cpuStart.idle) /
                    (cpuEnd.total - cpuStart.total))
                );
            }

            cpuUsage = Math.max(0, Math.min(100, cpuUsage));

            // RAM chi tiết
            const memInfo = read("/proc/meminfo");

            const mem = key => {
                const match = memInfo.match(
                    new RegExp("^" + key + ":\\s+(\\d+)", "m")
                );
                return Number(match?.[1] || 0) * 1024;
            };

            const totalRam = mem("MemTotal") || os.totalmem();
            const availableRam = mem("MemAvailable") || os.freemem();
            const usedRam = Math.max(0, totalRam - availableRam);
            const cachedRam = mem("Cached") + mem("SReclaimable");
            const bufferRam = mem("Buffers");

            const ramUsage = percent(usedRam, totalRam);

            // Ổ cứng
            let totalDisk = 0;
            let usedDisk = 0;
            let freeDisk = 0;

            try {
                const output = execFileSync(
                    "df", ["-Pk", process.cwd()],
                    { encoding: "utf8" }
                ).trim().split("\n");

                const values = output[output.length - 1]
                    .trim().split(/\s+/);

                totalDisk = Number(values[1]) * 1024;
                usedDisk = Number(values[2]) * 1024;
                freeDisk = Number(values[3]) * 1024;
            } catch {}

            const diskUsage = percent(usedDisk, totalDisk);

            // SWAP
            const swapTotal = mem("SwapTotal");
            const swapFree = mem("SwapFree");
            const swapUsed = Math.max(0, swapTotal - swapFree);
            const swapUsage = percent(swapUsed, swapTotal);

            // Thời gian
            const now = new Date();
            const date = now.toLocaleDateString("vi-VN");
            const time = now.toLocaleTimeString("vi-VN");

            const text = [
                "╭━━━━━━━━━━━━━━━━━━━━╮",
                "       ✦ WHG SYSTEM ✦",
                "       THÔNG SỐ HỆ THỐNG",
                "╰━━━━━━━━━━━━━━━━━━━━╯",
                "",
                "┏━━「 BỘ XỬ LÝ 」",
                `┃ Tên CPU: ${cpuName}`,
                `┃ Số nhân: ${cores} nhân`,
                `┃ Xung nhịp TB: ${avgFreq}${typeof avgFreq === "number" ? " MHz" : ""}`,
                `┃ Sử dụng: ${cpuUsage}%`,
                `┃ ${bar(cpuUsage)}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "┏━━「 BỘ NHỚ RAM 」",
                `┃ Tổng dung lượng: ${gb(totalRam)} GB`,
                `┃ Đã sử dụng: ${gb(usedRam)} GB`,
                `┃ Còn trống: ${gb(availableRam)} GB`,
                `┃ Bộ nhớ đệm: ${gb(cachedRam)} GB`,
                `┃ Bộ đệm hệ thống: ${gb(bufferRam)} GB`,
                `┃ Mức sử dụng: ${ramUsage}%`,
                `┃ ${bar(ramUsage)}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "┏━━「 Ổ CỨNG 」",
                `┃ Tổng dung lượng: ${gb(totalDisk)} GB`,
                `┃ Đã sử dụng: ${gb(usedDisk)} GB`,
                `┃ Còn trống: ${gb(freeDisk)} GB`,
                `┃ Mức sử dụng: ${diskUsage}%`,
                `┃ ${bar(diskUsage)}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "┏━━「 BỘ NHỚ HOÁN ĐỔI 」",
                `┃ Tổng dung lượng: ${gb(swapTotal)} GB`,
                `┃ Đã sử dụng: ${gb(swapUsed)} GB`,
                `┃ Còn trống: ${gb(swapFree)} GB`,
                `┃ Mức sử dụng: ${swapUsage}%`,
                `┃ ${bar(swapUsage)}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "┏━━「 THỜI GIAN HOẠT ĐỘNG 」",
                `┃ Thiết bị: ${uptime(os.uptime())}`,
                `┃ Tiến trình: ${uptime(process.uptime())}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "┏━━「 THÔNG TIN CẬP NHẬT 」",
                `┃ Ngày: ${date}`,
                `┃ Giờ: ${time}`,
                "┗━━━━━━━━━━━━━━━━━━━━",
                "",
                "╭━━━━━━━━━━━━━━━━━━━━╮",
                "       ✦ POWERED BY WHG ✦",
                "╰━━━━━━━━━━━━━━━━━━━━╯"
            ].join("\n");

            await api.sendMessage({ msg: text }, threadId, type);

        } catch (err) {
            console.error("[WHG-THONGSO]", err);
            await api.sendMessage({
                msg: "❌ Lỗi đọc thông số: " + err.message
            }, threadId, type);
        }
    }
};
