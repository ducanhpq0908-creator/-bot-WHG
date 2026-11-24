const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileP = promisify(execFile);
const SETTINGS_FILE = path.join(__dirname, "..", "dl_settings.json");
const MEDIA_DIR = path.join(os.tmpdir(), "zalo_dl");

if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")); } catch { return {}; }
}
function saveSettings(s) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); }
function getThreadSettings(tid) {
  const all = loadSettings();
  if (!all[tid]) { all[tid] = { auto: false, domains: [] }; saveSettings(all); }
  return all[tid];
}
function setThreadSettings(tid, data) {
  const all = loadSettings();
  all[tid] = data;
  saveSettings(all);
}
function normalizeDomain(d) {
  d = String(d || "").toLowerCase().trim();
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
function extractURL(text) {
  const m = String(text || "").match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}
function matchDomain(url, domains) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith("." + d));
  } catch { return false; }
}

async function extractMedia(url) {
  const safeId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const outTpl = path.join(MEDIA_DIR, safeId + ".%(ext)s");

  const { stdout: metaOut } = await execFileP("yt-dlp", ["-J", "--no-warnings", "--no-playlist", url], {
    maxBuffer: 30 * 1024 * 1024,
    timeout: 60000,
  });
  const meta = JSON.parse(metaOut);
  const duration = meta.duration || 0;

  if (duration > 300) {
    const err = new Error("YOUTUBE_DURATION_EXCEEDED");
    err.code = "YOUTUBE_DURATION_EXCEEDED";
    throw err;
  }

  const isPhoto = meta._type === "playlist" && Array.isArray(meta.entries) && meta.entries.length > 0
    && (meta.entries[0].ext === "jpg" || meta.entries[0].ext === "webp" || meta.entries[0].ext === "png");

  if (isPhoto) {
    await execFileP("yt-dlp", ["-o", outTpl, "--no-warnings", url], { timeout: 180000 });
    const files = fs.readdirSync(MEDIA_DIR).filter((f) => f.startsWith(safeId + "."));
    const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).map((f) => path.join(MEDIA_DIR, f));
    const voiceName = files.find((f) => /\.(mp3|m4a|aac|opus)$/i.test(f));
    return {
      type: "photos_voice",
      platform: meta.extractor || "media",
      title: meta.title || "",
      author: meta.uploader || "",
      imageFiles,
      voiceFile: voiceName ? path.join(MEDIA_DIR, voiceName) : null,
      cleanup: () => files.forEach((f) => { try { fs.unlinkSync(path.join(MEDIA_DIR, f)); } catch {} }),
    };
  }

  await execFileP("yt-dlp", ["-f", "mp4/best", "-o", outTpl, "--no-warnings", url], { timeout: 180000 });
  const files = fs.readdirSync(MEDIA_DIR).filter((f) => f.startsWith(safeId + "."));
  const videoName = files.find((f) => /\.(mp4|webm|mkv)$/i.test(f));
  if (!videoName) throw new Error("Không tải được video");
  return {
    type: "video",
    platform: meta.extractor || "media",
    title: meta.title || "",
    author: meta.uploader || "",
    videoFile: path.join(MEDIA_DIR, videoName),
    cleanup: () => files.forEach((f) => { try { fs.unlinkSync(path.join(MEDIA_DIR, f)); } catch {} }),
  };
}

async function deliverMedia(api, threadId, threadType, res) {
  const platform = (res.platform || "").toUpperCase();
  const icon = res.type === "photos_voice" ? "🖼️" : "📹";
  let desc = "";
  if (res.title) {
    desc = `${icon} ${platform}\n${res.title}`;
    if (res.author) desc += `\n👤 ${res.author}`;
  } else if (res.author) {
    desc = `${icon} ${platform}\n👤 ${res.author}`;
  }
  if (desc) { try { await api.sendMessage(desc, threadId, threadType); } catch {} }

  if (res.type === "video") {
    try {
      await api.sendMessage({ msg: "", attachments: [res.videoFile] }, threadId, threadType);
    } catch (e) { console.error("[DL] gửi video lỗi:", e.message); }
  } else {
    if (res.imageFiles && res.imageFiles.length) {
      try {
        await api.sendMessage({ msg: "", attachments: res.imageFiles }, threadId, threadType);
      } catch (e) { console.error("[DL] gửi ảnh lỗi:", e.message); }
    }
    if (res.voiceFile) {
      try {
        await api.sendMessage({ msg: "", attachments: [res.voiceFile] }, threadId, threadType);
      } catch (e) { console.error("[DL] gửi voice lỗi:", e.message); }
    }
  }
}

async function processAutoDL(api, threadId, threadType, url) {
  try {
    const res = await extractMedia(url);
    try { await deliverMedia(api, threadId, threadType, res); } finally { res.cleanup(); }
  } catch (err) {
    if (err.code === "YOUTUBE_DURATION_EXCEEDED") {
      try { await api.sendMessage("⚠️ Video dài hơn 5 phút, bot chỉ hỗ trợ video ngắn.", threadId, threadType); } catch {}
      return;
    }
    console.error("[AUTO-DL] lỗi:", err.message);
  }
}

module.exports = {
  name: "dl",
  description: "Tự động tải video/ảnh từ link",
  role: "user",
  execute: async (api, message, args, config) => {
    const threadId = message.threadId;
    const threadType = message.type;

    if (threadType !== 1) {
      return api.sendMessage("Lệnh dl chỉ áp dụng trong nhóm chat.", threadId, threadType);
    }

    const prefix = (config && config.prefix) || "!";
    const ts = getThreadSettings(threadId);
    const isAdmin = ((config && config.admin_uids) || []).includes(message.data.uidFrom);

    if (!args || args.length === 0) {
      const status = ts.auto ? "BẬT" : "TẮT";
      const domText = ts.domains.length ? ts.domains.join(", ") : "Chưa có nền tảng nào";
      const msg =
        `📥 Quản lý Tự Động Tải Link (Auto Downloader):\n\n` +
        `• ${prefix}dl on: Bật tự động tải link\n` +
        `• ${prefix}dl off: Tắt tự động tải link\n` +
        `• ${prefix}dl add <nền tảng>: Thêm nền tảng\n` +
        `• ${prefix}dl rm <nền tảng>: Xóa nền tảng\n` +
        `• ${prefix}dl list: Xem danh sách\n` +
        `• ${prefix}dl <link>: Tải trực tiếp\n\n` +
        `⚙️ Trạng thái nhóm:\n• Auto-DL: ${status}\n• Nền tảng: ${domText}`;
      return api.sendMessage(msg, threadId, threadType);
    }

    const sub = String(args[0]).toLowerCase();

    if (["on", "off", "add", "rm", "del", "remove", "delete"].includes(sub) && !isAdmin) {
      return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này.", threadId, threadType);
    }

    if (sub === "on") {
      ts.auto = true;
      if (!ts.domains.length) ts.domains = ["youtube.com", "tiktok.com", "facebook.com"];
      setThreadSettings(threadId, ts);
      return api.sendMessage(`✅ Đã BẬT tự động tải link!\nNền tảng: ${ts.domains.join(", ")}`, threadId, threadType);
    }
    if (sub === "off") {
      ts.auto = false;
      setThreadSettings(threadId, ts);
      return api.sendMessage("🛑 Đã TẮT tự động tải link.", threadId, threadType);
    }
    if (sub === "add") {
      if (args.length < 2) return api.sendMessage(`Cú pháp: ${prefix}dl add <domain>`, threadId, threadType);
      const raw = args[1];
      const norm = normalizeDomain(raw);
      if (norm === "all") {
        ts.domains = ["youtube.com", "tiktok.com", "facebook.com", "instagram.com", "twitter.com", "threads.net"];
        setThreadSettings(threadId, ts);
        return api.sendMessage(`✅ Đã thêm tất cả nền tảng!\nDanh sách: ${ts.domains.join(", ")}`, threadId, threadType);
      }
      if (!ts.domains.includes(norm)) ts.domains.push(norm);
      setThreadSettings(threadId, ts);
      return api.sendMessage(`✅ Đã thêm [${norm}]\nDanh sách: ${ts.domains.join(", ")}`, threadId, threadType);
    }
    if (["rm", "del", "remove", "delete"].includes(sub)) {
      if (args.length < 2) return api.sendMessage(`Cú pháp: ${prefix}dl rm <domain>`, threadId, threadType);
      const norm = normalizeDomain(args[1]);
      ts.domains = ts.domains.filter((d) => d !== norm);
      setThreadSettings(threadId, ts);
      return api.sendMessage(`🗑️ Đã xóa [${norm}]\nCòn lại: ${ts.domains.join(", ") || "Trống"}`, threadId, threadType);
    }
    if (sub === "list" || sub === "status") {
      return api.sendMessage(
        `📊 Trạng thái Auto-DL:\n• Auto: ${ts.auto ? "BẬT" : "TẮT"}\n• Nền tảng: ${ts.domains.join(", ") || "Chưa có"}`,
        threadId, threadType
      );
    }

    const rawURL = extractURL(args.join(" "));
    if (!rawURL) return api.sendMessage(`Tham số không hợp lệ. Gõ ${prefix}dl để xem hướng dẫn.`, threadId, threadType);

    api.sendMessage("⏳ Đang tải, vui lòng chờ...", threadId, threadType).catch(() => {});
    processAutoDL(api, threadId, threadType, rawURL);
    return;
  },
};
