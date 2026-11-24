import fs from "node:fs";
import { Zalo } from "zca-js";
import express from "express";


import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const CREDENTIALS = JSON.parse(readFileSync("./credentials.json", "utf-8"));
const CORE_PORT = 4000;
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 60000;

const log = (lvl, msg, ...a) => {
  const ico = { INFO:"ℹ️ ", OK:"✅", WARN:"⚠️ ", ERROR:"❌" }[lvl] ?? "  ";
  console.log(`[${new Date().toISOString()}] ${ico}[CORE] ${msg}`, ...a);
};

class AsyncQueue {
  #queue = []; #running = false;
  push(fn) { this.#queue.push(fn); if (!this.#running) this.#drain(); }
  async #drain() {
    this.#running = true;
    while (this.#queue.length) {
      const fn = this.#queue.shift();
      try { await fn(); } catch (e) { log("WARN", "Queue task lỗi:", e.message); }
    }
    this.#running = false;
  }
}
const msgQueue = new AsyncQueue();

async function fanOut(message) {
  try {
    await fetch("http://127.0.0.1:4002/onMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    log("WARN", "Bot WHG offline:", err.message);
  }
}

let _api = null, _attempt = 0, _stopping = false;
function backoff(n) { return Math.min(RECONNECT_BASE_MS * Math.pow(2, n) + Math.random() * 1000, RECONNECT_MAX_MS); }

async function startZalo() {
  while (!_stopping) {
    try {
      log("INFO", `Đăng nhập Zalo (lần #${_attempt + 1})...`);
      if (typeof Zalo !== "function") { log("ERROR", `Zalo import không phải function, nhận: ${typeof Zalo}`); throw new Error("Zalo is not a constructor"); }
      const zalo = new Zalo({ selfListen: true, checkUpdate: false });
      const _creds = JSON.parse(fs.readFileSync("./credentials.json", "utf8"));
      // zca-js bắt buộc cookie phải là array {key,value,domain,path}
      let _cookie = _creds.cookie;
      if (_cookie && !Array.isArray(_cookie)) {
        _cookie = Object.entries(_cookie).map(([k, v]) => ({ key: k, value: v, domain: ".zalo.me", path: "/" }));
      }
      if (!_cookie || _cookie.length === 0) throw new Error("credentials.json: cookie rỗng hoặc sai định dạng");
      if (!_creds.imei) throw new Error("credentials.json: thiếu imei");
      const _loginPayload = {
        cookie: _cookie,
        imei: _creds.imei,
        userAgent: _creds.userAgent || "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      };
      // KIỂM TRA phiên bản zca-js trước khi login
      let _apiLocal;
      try {
        _apiLocal = await zalo.login(_loginPayload);
      } catch (e1) {
        // zca-js bản mới có thể đổi API: thử loginQR nếu login thất bại ngay từ đầu
        log("WARN", "login() lỗi, thử loginCookie:", e1.message);
        if (typeof zalo.loginCookie === "function") {
          _apiLocal = await zalo.loginCookie(_loginPayload);
        } else {
          throw e1;
        }
      }
      _api = _apiLocal;
      _attempt = 0;
      log("OK", "Đăng nhập thành công! UID:", _api.getOwnId?.() ?? "(unknown)");
    } catch (err) {
      log("ERROR", "Đăng nhập thất bại:", err.message || "(không có message)", "| stack:", err.stack || "");
      const delay = backoff(_attempt++);
      await sleep(delay);
      if (_stopping) break;
      continue;
    }

    const { listener } = _api;
    listener.removeAllListeners("message");
    listener.removeAllListeners("connected");
    listener.removeAllListeners("error");

    listener.on("connected", () => log("OK", "Listener kết nối!"));
    listener.on("error", (err) => log("WARN", "Listener error:", err?.message ?? err));
    listener.on("message", (message) => {
      msgQueue.push(() => fanOut(message));
    });

    await new Promise((resolve) => {
      listener.on("close", () => { log("WARN", 'Listener "close". Reconnect...'); resolve(); });
    });

    if (!_stopping) {
      const delay = backoff(_attempt++);
      await sleep(delay);
      if (_stopping) break;
    }
  }
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/send", async (req, res) => {
  if (!_api) return res.status(503).json({ ok: false, error: "Core chưa kết nối" });
  const { payload, threadId, type } = req.body;
  try {
    const result = await _api.sendMessage(payload, threadId, type);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(CORE_PORT, () => {
  log("OK", `Core API chạy tại port ${CORE_PORT}`);
  startZalo();
});


