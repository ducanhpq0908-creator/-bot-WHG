"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");

const SIZE = 512;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 15000;
const PROCESS_TIMEOUT = 30000;
const GROUP = 1;

// Bật log chẩn đoán:  STK_DEBUG=1 node ...
const DEBUG = process.env.STK_DEBUG === "1";
// Upload lần lượt thay vì song song (để thử khi sticker vẫn trắng):  STK_SEQUENTIAL_UPLOAD=1
const PARALLEL_UPLOAD = process.env.STK_SEQUENTIAL_UPLOAD !== "1";

// Zalo luôn đổi ảnh upload (jpg/png/webp) sang JPEG, nên "WebP" upload kiểu ảnh
// chỉ còn là file .jpg -> sticker trắng. zca-js chọn đường upload theo ĐUÔI FILE:
// jpg/jpeg/png/webp = ảnh (bị đổi), mp4 = video, đuôi khác = file (giữ nguyên byte).
// Vì vậy WebP được upload với đuôi không phải ảnh. Đổi đuôi: STK_WEBP_EXT=bin
const WEBP_FILE_EXT = process.env.STK_WEBP_EXT || "dat";
// Upload file chờ phản hồi qua websocket, nên đặt timeout ngắn để lỗi thì fallback sớm
const FILE_UPLOAD_TIMEOUT = 12000;

// ---- Tuỳ chọn sticker ----
// Icon zAI: tự đặt file PNG vào cạnh stk.js với tên zai.png (hoặc STK_ZAI_ICON=đường_dẫn)
const ZAI_ICON_PATH = process.env.STK_ZAI_ICON || path.join(__dirname, "zai.png");
const ZAI_ICON_SIZE = 96;
const ZAI_ICON_MARGIN = 12;
// Xóa phông: độ lệch màu (RGB) so với màu nền vẫn coi là nền. Tăng nếu còn sót nền.
const BG_TOLERANCE = Number(process.env.STK_XP_TOLERANCE) || 38;
// Sticker xoay: số khung hình (nhiều = mượt nhưng tạo lâu hơn)
const ROTATE_FRAMES = Math.max(
    8,
    Math.min(48, Number(process.env.STK_ROT_FRAMES) || 20)
);
const ROTATE_DELAY_MS = 50;
// Khi xoay, thu nhỏ ảnh để góc không bị cắt (ảnh đã cắt tròn thì không cần)
const ROTATE_CONTENT_SCALE = 0.7;
const CORNER_RADIUS = Math.round(SIZE * 0.18);
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const CIRCLE_MASK = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
    `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`
);
const ROUND_MASK = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
    `<rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#fff"/></svg>`
);

const CUSTOM_API_NAME = "stkSendCustomSticker";

// Giữ kết nối TCP/TLS tới CDN Zalo để các lần tải sau không phải bắt tay lại
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 16 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 16 });

// ===============================
// UTILITIES
// ===============================

function safeParse(value) {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function withTimeout(promise, ms, label) {
    let timer;

    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(label + " quá thời gian")),
                ms
            );
        })
    ]).finally(() => clearTimeout(timer));
}

// Chạy nền, không chặn luồng chính, lỗi bị bỏ qua
function fireAndForget(fn) {
    Promise.resolve()
        .then(fn)
        .catch(() => {});
}

function toHttps(url) {
    return url.replace(/^http:\/\//i, "https://");
}

function getAttachmentUrl(attach) {
    const data = safeParse(attach);
    if (!data) return "";

    const params = safeParse(data.params) || {};

    const url =
        params.hd ||
        params.rawUrl ||
        data.href ||
        data.hd ||
        data.thumb ||
        "";

    return typeof url === "string" ? url : "";
}

function getImageUrl(message) {
    const data = message.data || {};

    const candidates = [
        data.quote && data.quote.attach,
        data.quote && data.quote.content,
        data.content,
        data.attach
    ];

    for (const item of candidates) {
        const url = getAttachmentUrl(item);
        if (url) return url;
    }

    return "";
}

// ===============================
// OPTIONS (!stk xp r zai ...)
// ===============================

function getPrefix(config) {
    return config && typeof config.prefix === "string" && config.prefix
        ? config.prefix
        : "!";
}

// args có thể là mảng, chuỗi, hoặc rỗng: lấy thêm từ nội dung tin nhắn nếu cần
function getArgTokens(args, message) {
    let tokens = [];

    if (Array.isArray(args)) {
        tokens = args;
    } else if (typeof args === "string") {
        tokens = args.split(/\s+/);
    }

    if (!tokens.length) {
        const content = message && message.data && message.data.content;

        if (typeof content === "string") {
            const m = content.trim().match(/^\S*stk\s+(.+)$/i);
            if (m) tokens = m[1].split(/\s+/);
        }
    }

    return tokens
        .map((t) => String(t).toLowerCase().trim())
        .filter(Boolean);
}

function parseOptions(tokens) {
    const opts = {
        zai: false,
        xp: false,
        rotate: false,
        left: false,
        bo: false,
        crop: false,
        unknown: []
    };

    for (const token of tokens) {
        switch (token) {
            case "zai":
                opts.zai = true;
                break;
            case "xp":
                opts.xp = true;
                break;
            case "r":
            case "xoay":
                opts.rotate = true;
                break;
            case "trai":
                opts.rotate = true;
                opts.left = true;
                break;
            case "bo":
                opts.bo = true;
                break;
            case "crop":
                opts.crop = true;
                break;
            default:
                opts.unknown.push(token);
        }
    }

    return opts;
}

function guideText(prefix) {
    const p = prefix;

    return (
        "🎨 Lệnh tạo Sticker Zalo siêu tốc (STK):\n\n" +
        "• Reply vào một ảnh rồi gõ:\n" +
        `  • ${p}stk: Tạo sticker thường (không có icon zAI ở góc dưới)\n` +
        `  • ${p}stk zai: Tạo sticker có biểu tượng zAI ở góc dưới\n` +
        `  • ${p}stk xp: Xóa phông nền (remove background)\n` +
        `  • ${p}stk r (hoặc ${p}stk xoay): Tạo sticker xoay tròn 360°\n` +
        `  • ${p}stk bo: Bo tròn 4 góc sticker\n` +
        `  • ${p}stk crop: Cắt ảnh thành hình tròn\n` +
        `  • ${p}stk r trai: Xoay ngược chiều kim đồng hồ\n\n` +
        "💡 Kết hợp linh hoạt:\n" +
        `  • ${p}stk xp r: Vừa xóa phông vừa xoay tròn\n` +
        `  • ${p}stk xp zai: Xóa phông kèm icon zAI góc dưới\n` +
        `  • ${p}stk r zai: Sticker xoay kèm icon zAI góc dưới`
    );
}

// ===============================
// DOWNLOAD IMAGE
// ===============================

async function downloadImage(url) {
    if (!/^https?:\/\//i.test(url)) {
        throw new Error("Link ảnh không hợp lệ");
    }

    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: DOWNLOAD_TIMEOUT,
        maxContentLength: MAX_INPUT_BYTES,
        maxBodyLength: MAX_INPUT_BYTES,
        httpAgent,
        httpsAgent,
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    // Trong Node, axios đã trả về Buffer: không copy thêm
    const buffer = Buffer.isBuffer(response.data)
        ? response.data
        : Buffer.from(response.data);

    if (!buffer.length) {
        throw new Error("Ảnh tải về bị rỗng");
    }

    if (buffer.length > MAX_INPUT_BYTES) {
        throw new Error("Ảnh vượt quá giới hạn 15MB");
    }

    return buffer;
}

// ===============================
// IMAGE PROCESSING
// ===============================

// Các hàm dưới đây làm việc trên buffer RAW RGBA 512x512 (4 byte/pixel)

async function applyMask(data, rawOpts, mask) {
    return sharp(data, rawOpts)
        .composite([{ input: mask, blend: "dest-in" }])
        .raw()
        .toBuffer();
}

let zaiIconCache = null;

// Chỉ cache khi nạp được, để thả file zai.png vào sau là dùng được ngay
async function loadZaiIcon() {
    if (zaiIconCache) return zaiIconCache;

    try {
        const file = fs.readFileSync(ZAI_ICON_PATH);

        zaiIconCache = await sharp(file)
            .resize(ZAI_ICON_SIZE, ZAI_ICON_SIZE, {
                fit: "contain",
                background: TRANSPARENT
            })
            .ensureAlpha()
            .png()
            .toBuffer();
    } catch (error) {
        console.error("[STK] Không nạp được icon zAI:", error.message);
        zaiIconCache = null;
    }

    return zaiIconCache;
}

async function overlayIcon(data, rawOpts, icon) {
    const pos = SIZE - ZAI_ICON_SIZE - ZAI_ICON_MARGIN;

    return sharp(data, rawOpts)
        .composite([{ input: icon, left: pos, top: pos }])
        .raw()
        .toBuffer();
}

// Xóa phông kiểu "tô loang" từ viền ảnh: chỉ hiệu quả với nền MỘT MÀU.
// Trả về { data, note } — note có nội dung khi bỏ qua hoặc kết quả đáng ngờ.
async function removeBackground(data, width, height) {
    const total = width * height;

    // Màu nền = trung bình các pixel đục ở viền
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let count = 0;

    const sample = (x, y) => {
        const i = (y * width + x) * 4;

        if (data[i + 3] > 200) {
            sr += data[i];
            sg += data[i + 1];
            sb += data[i + 2];
            count++;
        }
    };

    const forEachBorder = (fn) => {
        for (let x = 0; x < width; x++) {
            fn(x, 0);
            fn(x, height - 1);
        }

        for (let y = 1; y < height - 1; y++) {
            fn(0, y);
            fn(width - 1, y);
        }
    };

    forEachBorder(sample);

    if (!count) {
        return {
            data,
            note: "Ảnh đã có nền trong suốt nên bỏ qua xóa phông."
        };
    }

    const br = sr / count;
    const bg = sg / count;
    const bb = sb / count;
    const tol2 = BG_TOLERANCE * BG_TOLERANCE;

    // Viền phải gần như một màu thì mới coi là "nền đơn sắc"
    let near = 0;

    forEachBorder((x, y) => {
        const i = (y * width + x) * 4;
        if (data[i + 3] <= 200) return;

        const dr = data[i] - br;
        const dg = data[i + 1] - bg;
        const db = data[i + 2] - bb;

        if (dr * dr + dg * dg + db * db <= tol2) near++;
    });

    if (near / count < 0.5) {
        return {
            data,
            note:
                "Không tìm thấy nền một màu để xóa " +
                "(xp chỉ hiệu quả với ảnh có nền đơn sắc)."
        };
    }

    const isBackground = (p) => {
        const i = p * 4;

        if (data[i + 3] < 16) return true;

        const dr = data[i] - br;
        const dg = data[i + 1] - bg;
        const db = data[i + 2] - bb;

        return dr * dr + dg * dg + db * db <= tol2;
    };

    // Tô loang từ mọi pixel viền
    const isBg = new Uint8Array(total);
    const stack = new Int32Array(total);
    let top = 0;

    const push = (p) => {
        if (!isBg[p] && isBackground(p)) {
            isBg[p] = 1;
            stack[top++] = p;
        }
    };

    forEachBorder((x, y) => push(y * width + x));

    while (top > 0) {
        const p = stack[--top];
        const x = p % width;
        const y = (p / width) | 0;

        if (x > 0) push(p - 1);
        if (x < width - 1) push(p + 1);
        if (y > 0) push(p - width);
        if (y < height - 1) push(p + width);
    }

    let removed = 0;
    for (let p = 0; p < total; p++) removed += isBg[p];

    const ratio = removed / total;

    if (ratio < 0.01) {
        return {
            data,
            note:
                "Không tìm thấy nền một màu để xóa " +
                "(xp chỉ hiệu quả với ảnh có nền đơn sắc)."
        };
    }

    if (ratio > 0.97) {
        return {
            data,
            note: "Nền chiếm gần hết ảnh nên bỏ qua xóa phông."
        };
    }

    // Mặt nạ vật thể: 255 = giữ, 0 = nền. Bào mòn 1px để bớt viền màu nền.
    const mask = Buffer.alloc(total);

    for (let p = 0; p < total; p++) {
        if (isBg[p]) continue;

        const x = p % width;
        const y = (p / width) | 0;

        const touchesBg =
            (x > 0 && isBg[p - 1]) ||
            (x < width - 1 && isBg[p + 1]) ||
            (y > 0 && isBg[p - width]) ||
            (y < height - 1 && isBg[p + width]);

        mask[p] = touchesBg ? 0 : 255;
    }

    // Làm mềm mép
    // sharp có thể trả về nhiều kênh dù đầu vào 1 kênh: đọc theo số kênh thật
    const blurred = await sharp(mask, {
        raw: { width, height, channels: 1 }
    })
        .blur(0.8)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const stride = blurred.info.channels;

    for (let p = 0; p < total; p++) {
        const i = p * 4 + 3;
        const soft = blurred.data[p * stride];
        if (soft < data[i]) data[i] = soft;
    }

    return { data, note: "" };
}

function centerCrop(buf, w, h, size) {
    const out = Buffer.alloc(size * size * 4); // 0 = trong suốt
    const sx = Math.floor((w - size) / 2);
    const sy = Math.floor((h - size) / 2);

    for (let y = 0; y < size; y++) {
        const srcY = y + sy;
        if (srcY < 0 || srcY >= h) continue;

        const x0 = Math.max(0, -sx);
        const x1 = Math.min(size, w - sx);
        if (x1 <= x0) continue;

        buf.copy(
            out,
            (y * size + x0) * 4,
            (srcY * w + sx + x0) * 4,
            (srcY * w + sx + x1) * 4
        );
    }

    return out;
}

// Tạo các khung hình xoay. Icon zAI (nếu có) đứng yên, không xoay theo.
async function buildRotationFrames(data, rawOpts, opts, icon) {
    let base = data;

    if (!opts.crop) {
        const inner = Math.round(SIZE * ROTATE_CONTENT_SCALE);
        const pad = Math.floor((SIZE - inner) / 2);

        base = await sharp(data, rawOpts)
            .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
            .extend({
                top: pad,
                bottom: SIZE - inner - pad,
                left: pad,
                right: SIZE - inner - pad,
                background: TRANSPARENT
            })
            .raw()
            .toBuffer();
    }

    const step = 360 / ROTATE_FRAMES;

    const renderFrame = async (index) => {
        // sharp xoay thuận chiều kim đồng hồ; "trai" thì góc giảm dần
        const angle = opts.left
            ? (360 - index * step) % 360
            : index * step;

        let frame = base;

        if (angle !== 0) {
            const rotated = await sharp(base, rawOpts)
                .rotate(angle, { background: TRANSPARENT })
                .raw()
                .toBuffer({ resolveWithObject: true });

            frame = centerCrop(
                rotated.data,
                rotated.info.width,
                rotated.info.height,
                SIZE
            );
        }

        return icon ? overlayIcon(frame, rawOpts, icon) : frame;
    };

    return Promise.all(
        Array.from({ length: ROTATE_FRAMES }, (_, i) => renderFrame(i))
    );
}

async function encodeAnimatedWebp(frames) {
    const count = frames.length;

    const webp = await sharp(Buffer.concat(frames), {
        raw: {
            width: SIZE,
            height: SIZE * count,
            channels: 4,
            pageHeight: SIZE
        }
    })
        .webp({
            quality: 80,
            alphaQuality: 90,
            effort: 2,
            loop: 0,
            delay: Array(count).fill(ROTATE_DELAY_MS)
        })
        .toBuffer();

    // sharp cũ bỏ qua pageHeight và cho ra ảnh dài thay vì ảnh động
    const meta = await sharp(webp, { animated: true }).metadata();

    if (!(meta.pages > 1)) {
        throw new Error(
            "Phiên bản sharp quá cũ, không tạo được WebP động. " +
            "Chạy: npm i sharp@latest"
        );
    }

    return webp;
}

// Giải mã + resize ảnh gốc MỘT lần duy nhất (phần tốn nhất với ảnh HD),
// rồi xử lý các tuỳ chọn trên buffer raw 512x512 và encode WebP/PNG.
async function buildSticker(input, opts) {
    const ms = {};
    const notes = [];
    let stamp = Date.now();

    const lap = (key) => {
        const now = Date.now();
        ms[key] = now - stamp;
        stamp = now;
    };

    // bo / crop cần ảnh lấp đầy khung để thấy rõ hiệu ứng
    const cover = opts.bo || opts.crop;

    const resized = await sharp(input, {
        limitInputPixels: 40000000,
        failOn: "error"
    })
        .rotate()
        .resize(SIZE, SIZE, {
            fit: cover ? "cover" : "contain",
            background: TRANSPARENT
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    let data = resized.data;
    lap("resize");

    const rawOpts = {
        raw: {
            width: resized.info.width,
            height: resized.info.height,
            channels: resized.info.channels
        }
    };

    if (opts.xp) {
        const result = await removeBackground(
            data,
            resized.info.width,
            resized.info.height
        );

        data = result.data;
        if (result.note) notes.push(result.note);
        lap("xp");
    }

    if (opts.crop) data = await applyMask(data, rawOpts, CIRCLE_MASK);
    if (opts.bo) data = await applyMask(data, rawOpts, ROUND_MASK);
    if (opts.crop || opts.bo) lap("mask");

    let icon = null;

    if (opts.zai) {
        icon = await loadZaiIcon();

        if (!icon) {
            notes.push(
                "Không tìm thấy icon zAI nên bỏ qua. " +
                "Hãy đặt file zai.png (PNG nền trong suốt) cạnh stk.js."
            );
        }
    }

    const timed = async (key, job) => {
        const start = Date.now();
        const out = await job;
        ms[key] = Date.now() - start;
        return out;
    };

    let webp;
    let png;

    if (opts.rotate) {
        const frames = await buildRotationFrames(data, rawOpts, opts, icon);
        lap("frames");

        [webp, png] = await Promise.all([
            timed("webp", encodeAnimatedWebp(frames)),
            // palette: PNG bảng màu, nhẹ hơn nhiều nên upload nhanh hơn
            timed("png", encodePng(frames[0], rawOpts))
        ]);
    } else {
        const frame = icon ? await overlayIcon(data, rawOpts, icon) : data;

        [webp, png] = await Promise.all([
            timed(
                "webp",
                sharp(frame, rawOpts)
                    .webp({ quality: 85, alphaQuality: 90, effort: 2 })
                    .toBuffer()
            ),
            timed("png", encodePng(frame, rawOpts))
        ]);
    }

    return { webp, png, ms, notes };
}

function encodePng(frame, rawOpts) {
    return sharp(frame, rawOpts)
        .png({
            compressionLevel: 6,
            palette: true,
            quality: 90,
            effort: 3
        })
        .toBuffer();
}

function makeAttachment(buffer, ext) {
    return {
        data: buffer,
        filename: `sticker_${Date.now()}.${ext}`,
        metadata: {
            totalSize: buffer.length,
            width: SIZE,
            height: SIZE
        }
    };
}

// ===============================
// UPLOAD
// ===============================

function getUploadedUrl(result) {
    const items = Array.isArray(result) ? result : [result];

    for (const item of items) {
        if (!item || item.fileType !== "image") continue;

        const url =
            item.hdUrl ||
            item.normalUrl ||
            item.thumbUrl ||
            item.url;

        if (typeof url === "string" &&
            /^https?:\/\//i.test(url)) {
            return toHttps(url);
        }
    }

    return "";
}

async function uploadImage(api, buffer, threadId, type, ext) {
    const attachment = makeAttachment(buffer, ext);

    const result = await withTimeout(
        api.uploadAttachment(
            attachment,
            threadId,
            type
        ),
        PROCESS_TIMEOUT,
        "Upload ảnh " + ext
    );

    console.log(
        `[STK][upload ${ext}]`,
        JSON.stringify(result).slice(0, 400)
    );

    const url = getUploadedUrl(result);

    if (!url) {
        throw new Error(
            "Zalo không trả về URL ảnh: " +
            JSON.stringify(result).slice(0, 250)
        );
    }

    return url;
}

// Kết quả upload file (không phải ảnh) không cố định tên trường URL,
// nên thử các tên thường gặp rồi mới quét mọi giá trị chuỗi.
const FILE_URL_KEYS = ["fileUrl", "url", "fileURL", "href", "downloadUrl"];

function getUploadedFileUrl(result) {
    const items = Array.isArray(result) ? result : [result];

    for (const item of items) {
        if (!item || typeof item !== "object") continue;

        for (const key of FILE_URL_KEYS) {
            const value = item[key];
            if (typeof value === "string" &&
                /^https?:\/\//i.test(value)) {
                return toHttps(value);
            }
        }

        for (const value of Object.values(item)) {
            if (typeof value === "string" &&
                /^https?:\/\//i.test(value)) {
                return toHttps(value);
            }
        }
    }

    return "";
}

// Upload WebP bằng đường "file" để Zalo giữ nguyên byte WebP (không đổi sang JPEG)
async function uploadWebpAsFile(api, buffer, threadId, type) {
    const attachment = makeAttachment(buffer, WEBP_FILE_EXT);

    const result = await withTimeout(
        api.uploadAttachment(
            attachment,
            threadId,
            type
        ),
        FILE_UPLOAD_TIMEOUT,
        "Upload WebP"
    );

    console.log(
        "[STK][upload webp-file]",
        JSON.stringify(result).slice(0, 500)
    );

    const url = getUploadedFileUrl(result);

    if (!url) {
        throw new Error(
            "Zalo không trả về URL file WebP: " +
            JSON.stringify(result).slice(0, 250)
        );
    }

    return url;
}

// Chỉ dùng khi STK_DEBUG=1: kiểm tra URL vừa upload có tải được không
// và byte đầu file là gì (WebP thật, hay đã bị đổi sang JPEG/PNG).
async function probeUrl(label, url) {
    try {
        const r = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 8000,
            httpAgent,
            httpsAgent,
            headers: { Range: "bytes=0-11" },
            validateStatus: () => true
        });

        const head = Buffer.from(r.data || []).subarray(0, 12);
        const isWebp =
            head.length >= 12 &&
            head.subarray(0, 4).toString("latin1") === "RIFF" &&
            head.subarray(8, 12).toString("latin1") === "WEBP";

        console.log(
            `[STK][probe ${label}] HTTP ${r.status}`,
            "| magic:", isWebp ? "WEBP thật" : head.subarray(0, 4).toString("hex"),
            "| type:", r.headers["content-type"],
            "| size:",
            r.headers["content-range"] ||
            r.headers["content-length"] || "?",
            "|", url
        );
    } catch (e) {
        console.log(`[STK][probe ${label}] lỗi: ${e.message} | ${url}`);
    }
}

// ===============================
// CUSTOM STICKER API
// ===============================

// Dùng bản tự dựng qua api.custom để biết chắc từng tham số gửi đi
// (zca-js 2.2.0 không có sendCustomSticker sẵn).
function getStickerSender(api) {
    if (typeof api.custom !== "function") {
        return null;
    }

    if (!api[CUSTOM_API_NAME]) {
        api.custom(
            CUSTOM_API_NAME,
            async ({ utils, props }) => {
                const {
                    staticImgUrl,
                    animationImgUrl,
                    width,
                    height,
                    threadId,
                    type,
                    reply
                } = props;

                if (!staticImgUrl || !animationImgUrl) {
                    throw new Error("Thiếu URL sticker");
                }

                if (!threadId) {
                    throw new Error("Thiếu threadId");
                }

                const isGroup = type === GROUP;

                const fileService =
                    api.zpwServiceMap &&
                    api.zpwServiceMap.file &&
                    api.zpwServiceMap.file[0];

                if (!fileService) {
                    throw new Error(
                        "Không tìm thấy Zalo file service"
                    );
                }

                const endpoint = utils.makeURL(
                    `${fileService}/api/${
                        isGroup ? "group" : "message"
                    }/photo_url`,
                    { nretry: "0" }
                );

                const params = {
                    clientId: Date.now(),
                    title: "",
                    oriUrl: staticImgUrl,
                    thumbUrl: staticImgUrl,
                    hdUrl: staticImgUrl,
                    width,
                    height,
                    properties: JSON.stringify({
                        subType: 0,
                        color: -1,
                        size: -1,
                        type: 3,
                        ext: JSON.stringify({
                            sSrcStr: "@STICKER",
                            sSrcType: 0
                        })
                    }),
                    contentId: Date.now(),
                    thumb_height: height,
                    thumb_width: width,
                    webp: JSON.stringify({
                        width,
                        height,
                        url: animationImgUrl
                    }),
                    zsource: -1,
                    ttl: 0,
                    refMessage: reply,
                    toId: isGroup ? undefined : threadId,
                    visibility: isGroup ? 0 : undefined,
                    grid: isGroup ? threadId : undefined
                };

                // Bỏ các trường undefined
                for (const key of Object.keys(params)) {
                    if (params[key] === undefined) {
                        delete params[key];
                    }
                }

                if (DEBUG) {
                    console.log(
                        "[STK][params]",
                        JSON.stringify(params).slice(0, 700)
                    );
                }

                const encrypted = utils.encodeAES(
                    JSON.stringify(params)
                );

                if (!encrypted) {
                    throw new Error("Mã hóa sticker thất bại");
                }

                const response = await utils.request(endpoint, {
                    method: "POST",
                    body: new URLSearchParams({
                        params: encrypted
                    })
                });

                return utils.resolve(response);
            }
        );
    }

    return (opts) => api[CUSTOM_API_NAME](opts);
}

// ===============================
// COMMAND
// ===============================

module.exports = {
    name: "stk",
    description: "Tạo sticker thật từ ảnh được reply (xp, r, bo, crop, zai)",
    level: 1,

    execute: async (api, message, args, config) => {
        const { threadId, type } = message;

        const send = (msgObj) =>
            api.sendMessage(msgObj, threadId, type);

        const mediaUrl = getImageUrl(message);

        if (!mediaUrl) {
            return send({ msg: guideText(getPrefix(config)) });
        }

        const opts = parseOptions(getArgTokens(args, message));

        // Không await: tin nhắn chờ không được làm chậm việc tạo sticker
        fireAndForget(() =>
            send({
                msg: opts.unknown.length
                    ? `⏳ DUCANH STICKER đang xử lý...\n⚠️ Bỏ qua tuỳ chọn không hiểu: ${opts.unknown.join(", ")}`
                    : "⏳ DUCANH STICKER đang xử lý..."
            })
        );

        const started = Date.now();
        const laps = [];
        let lapStart = started;
        const lap = (name) => {
            const now = Date.now();
            laps.push(`${name} ${now - lapStart}ms`);
            lapStart = now;
        };

        try {
            const sendSticker = getStickerSender(api);

            if (DEBUG) {
                console.log(
                    "[STK] opts:", JSON.stringify(opts),
                    "| api.custom:", typeof api.custom
                );
            }

            const raw = await downloadImage(mediaUrl);
            lap("tải");

            // Giải mã một lần, xử lý tuỳ chọn, encode hai định dạng
            const { webp, png, ms, notes } = await buildSticker(raw, opts);
            lap(
                "xử lý (" +
                Object.entries(ms)
                    .map(([key, value]) => `${key} ${value}ms`)
                    .join(", ") +
                ")"
            );

            if (notes.length) {
                fireAndForget(() =>
                    send({ msg: "⚠️ " + notes.join("\n⚠️ ") })
                );
            }

            if (sendSticker) {
                try {
                    let staticUrl;
                    let animationUrl;

                    // PNG tĩnh đi đường ảnh (Zalo đổi sang JPEG, chỉ làm ảnh xem trước);
                    // WebP đi đường file để giữ nguyên định dạng WebP thật.
                    if (PARALLEL_UPLOAD) {
                        [staticUrl, animationUrl] = await Promise.all([
                            uploadImage(api, png, threadId, type, "png"),
                            uploadWebpAsFile(api, webp, threadId, type)
                        ]);
                    } else {
                        staticUrl = await uploadImage(
                            api, png, threadId, type, "png"
                        );
                        animationUrl = await uploadWebpAsFile(
                            api, webp, threadId, type
                        );
                    }
                    lap("upload");

                    console.log(
                        "[STK] static:", staticUrl,
                        "| anim:", animationUrl
                    );

                    if (DEBUG) {
                        await Promise.all([
                            probeUrl("static", staticUrl),
                            probeUrl("anim", animationUrl)
                        ]);
                        lap("probe");
                    }

                    const result = await withTimeout(
                        sendSticker({
                            staticImgUrl: staticUrl,
                            animationImgUrl: animationUrl,
                            width: SIZE,
                            height: SIZE,
                            threadId,
                            type
                        }),
                        PROCESS_TIMEOUT,
                        "Gửi sticker"
                    );
                    lap("gửi");

                    console.log(
                        "[STK] Sticker response:",
                        JSON.stringify(result).slice(0, 500)
                    );

                    if (
                        result &&
                        (result.error ||
                         result.error_code ||
                         result.status === false)
                    ) {
                        throw new Error(
                            "Zalo từ chối gửi sticker: " +
                            JSON.stringify(result).slice(0, 200)
                        );
                    }

                    console.log(
                        `[STK] Thành công | ${laps.join(" | ")} | tổng ${Date.now() - started}ms`
                    );

                    return;
                } catch (stickerError) {
                    console.error(
                        "[STK] Sticker thật lỗi:",
                        stickerError
                    );
                }
            } else {
                console.error(
                    "[STK] api.custom không có, không gửi được sticker thật"
                );
            }

            // Fallback gửi ảnh nếu sticker thật không thành công
            await send({
                msg: "",
                quote: message.data,
                attachments: [
                    makeAttachment(png, "png")
                ]
            });

            console.log(
                `[STK] Fallback hoàn tất | ${laps.join(" | ")} | tổng ${Date.now() - started}ms`
            );

        } catch (error) {
            console.error("[STK] ERROR:", error);

            return send({
                msg:
                    "❌ STK thất bại!\n" +
                    "Lý do: " + error.message
            });
        }
    }
};
