"use strict";

/**
 * mkeys 本地 Web 管理台：仅绑定 127.0.0.1，启动时生成一次性访问令牌（?t=），
 * 所有读写走与 MCP 工具相同的加密保险库与审计日志。
 * 可被 MCP 工具 open_admin 在进程内启动，也可独立运行：node server/webadmin.js
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { issueToken, verifyLogin, clearCachedToken } = require("./authflow");
const usage = require("./usage");
const { getSessionInfo } = require("./session");

const MAX_BODY_BYTES = 512 * 1024;
let adminState = null;

/** 插件清单信息（版本/作者/主页），页脚展示用 */
function manifestInfo() {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".zcode-plugin", "plugin.json"), "utf8"));
    return {
      version: m.version || "0.0.0",
      author: (m.author && m.author.name) || "",
      homepage: (m.author && m.author.url) || m.homepage || "",
    };
  } catch {
    return { version: "0.0.0", author: "", homepage: "" };
  }
}

/**
 * 访问令牌：优先环境变量 MKEYS_ADMIN_TOKEN；否则读取/生成 ~/.mkeys/admin.token（0600）。
 * 持久化令牌让"服务重启后收藏的地址依然有效"；文件与保险库同目录，权限一致。
 */
function loadOrCreateAdminToken(config) {
  const fromEnv = String((config && config.env && config.env.MKEYS_ADMIN_TOKEN) || "").trim();
  if (fromEnv) return fromEnv;
  const tokenPath = path.join(config.dataDir, "admin.token");
  try {
    const existing = fs.readFileSync(tokenPath, "utf8").trim();
    if (existing) return existing;
  } catch {
    /* 不存在则生成 */
  }
  const token = crypto.randomBytes(24).toString("hex");
  fs.writeFileSync(tokenPath, token + "\n", { mode: 0o600 });
  try {
    fs.chmodSync(tokenPath, 0o600);
  } catch {
    /* 尽力而为 */
  }
  return token;
}

/** 审计事件统一打会话戳 */
function logEvent(ctx, event) {
  usage.appendEvent(ctx.config, Object.assign({ session: ctx.session ? ctx.session.id : undefined }, event));
}

function startWebAdmin(ctx, { port = 18765, host = "127.0.0.1" } = {}) {
  if (adminState) return Promise.resolve(adminState);
  const token = loadOrCreateAdminToken(ctx.config);

  const sendJson = (res, status, obj) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  };

  function authorized(req, urlObj) {
    const provided =
      urlObj.searchParams.get("t") ||
      String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!provided) return false;
    const a = Buffer.from(String(provided), "utf8");
    const b = Buffer.from(token, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY_BYTES) {
          reject(new Error("请求体过大"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => {
        if (!chunks.length) return resolve({});
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(new Error("请求体不是合法 JSON"));
        }
      });
      req.on("error", reject);
    });
  }

  async function handleApi(pathname, req, res, urlObj, body) {
    const { config, vault } = ctx;
    switch (`${req.method} ${pathname}`) {
      case "GET /api/state": {
        const events = usage.readEvents(config, { sinceDays: 30 });
        return sendJson(res, 200, {
          credentials: vault.listMeta(),
          stats: usage.aggregate(events),
          recent: events.slice(-50).reverse(),
          session: ctx.session || null,
          allowReveal: config.allowReveal,
          about: manifestInfo(),
        });
      }
      case "POST /api/credentials": {
        const meta = vault.add(body);
        logEvent(ctx, { type: "add", credential: meta.name, system: meta.system, purpose: body.description || "", ok: true, origin: "web" });
        return sendJson(res, 200, { ok: true, meta });
      }
      case "POST /api/credentials/update": {
        const { name, ...patch } = body;
        const meta = vault.update(name, patch);
        clearCachedToken(meta.id);
        logEvent(ctx, { type: "update", credential: meta.name, system: meta.system, ok: true, origin: "web" });
        return sendJson(res, 200, { ok: true, meta });
      }
      case "POST /api/credentials/delete": {
        const entry = vault.find(body.name);
        if (!entry) throw new Error(`未找到凭据 "${body.name}"`);
        vault.remove(body.name);
        logEvent(ctx, { type: "delete", credential: entry.name, system: entry.system || "", ok: true, origin: "web" });
        return sendJson(res, 200, { ok: true });
      }
      case "POST /api/verify": {
        const { entry, fields } = vault.getWithFields(body.name);
        const result = await verifyLogin(entry, fields);
        logEvent(ctx, {
          type: "verify",
          credential: entry.name,
          system: entry.system || "",
          purpose: "Web 管理台：验证登录",
          ok: result.ok,
          message: result.ok ? "" : result.message,
          latencyMs: result.latencyMs,
          origin: "web",
        });
        return sendJson(res, 200, result);
      }
      case "POST /api/token": {
        const purpose = String(body.purpose || "").trim();
        if (purpose.length < 2) throw new Error("必须填写用途（purpose），用于审计统计");
        const { entry, fields } = vault.getWithFields(body.name);
        const record = await issueToken(entry, fields, { refresh: Boolean(body.refresh) });
        logEvent(ctx, {
          type: "token",
          credential: entry.name,
          system: entry.system || "",
          purpose: `Web 管理台：${purpose}`,
          ok: true,
          cached: Boolean(record.cached),
          expiresIn: record.expiresInSeconds,
          origin: "web",
        });
        return sendJson(res, 200, {
          ok: true,
          token: record.token,
          headerName: record.headerName,
          scheme: record.scheme,
          expiresInSeconds: record.expiresInSeconds,
          expiresAt: new Date(record.expiresAt).toISOString(),
          cached: Boolean(record.cached),
        });
      }
      case "POST /api/reveal": {
        if (!config.allowReveal) {
          throw new Error("读取原始密钥已被禁用（allowReveal 关闭）；令牌请用「签发令牌」");
        }
        const purpose = String(body.purpose || "").trim();
        if (purpose.length < 2) throw new Error("必须填写用途（purpose），用于审计");
        const { entry, fields } = vault.getWithFields(body.name);
        if (!(body.field in fields)) {
          throw new Error(`字段 "${body.field}" 不存在（可用: ${Object.keys(fields).join(", ") || "无"}）`);
        }
        logEvent(ctx, {
          type: "reveal",
          credential: entry.name,
          system: entry.system || "",
          purpose: `Web 管理台：${purpose}`,
          ok: true,
          origin: "web",
        });
        return sendJson(res, 200, { ok: true, value: fields[body.field] });
      }
      case "POST /api/stats/clear": {
        if (body.confirm !== true) throw new Error("清空统计数据需要显式确认（confirm: true）");
        try {
          fs.writeFileSync(config.usagePath, "");
        } catch (e) {
          throw new Error(`清空失败: ${e.message}`);
        }
        // 清空动作本身留一条审计记录，保证日志能追溯到这次清空
        logEvent(ctx, { type: "clear", credential: "", system: "", purpose: "清空统计数据", ok: true, origin: "web" });
        return sendJson(res, 200, { ok: true });
      }
      default:
        return sendJson(res, 404, { error: `未知接口: ${req.method} ${pathname}` });
    }
  }

  const server = http.createServer((req, res) => {
    let urlObj;
    try {
      urlObj = new URL(req.url, `http://${host}`);
    } catch {
      return sendJson(res, 400, { error: "非法请求" });
    }
    // 防 DNS rebinding：Host 必须是本机回环地址加实际端口
    const actualPort = server.address() ? server.address().port : port;
    const hostHeader = String(req.headers.host || "");
    if (hostHeader !== `${host}:${actualPort}` && hostHeader !== `localhost:${actualPort}`) {
      return sendJson(res, 403, { error: "非法 Host" });
    }

    if (urlObj.pathname === "/icon.png") {
      // 公开静态资源（页面 favicon），不含敏感数据
      let icon;
      try {
        icon = fs.readFileSync(path.join(__dirname, "..", "assets", "icon.png"));
      } catch {
        return sendJson(res, 404, { error: "icon missing" });
      }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "max-age=86400" });
      return res.end(icon);
    }

    if (urlObj.pathname === "/") {
      // 页面外壳不含任何敏感数据，无需令牌即可加载；数据接口 /api/* 一律校验令牌。
      // 页面 JS 会把带 ?t= 打开时的令牌缓存在浏览器里，之后直接访问本地址即可。
      let html;
      try {
        html = fs.readFileSync(path.join(__dirname, "admin-page.html"), "utf8");
      } catch (e) {
        return sendJson(res, 500, { error: `页面资源缺失: ${e.message}` });
      }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
      });
      return res.end(html);
    }

    if (urlObj.pathname.startsWith("/api/")) {
      if (!authorized(req, urlObj)) return sendJson(res, 401, { error: "未授权：缺少或错误的访问令牌" });
      readBody(req)
        .then((body) => handleApi(urlObj.pathname, req, res, urlObj, body))
        .catch((e) => sendJson(res, 400, { error: e.message }));
      return;
    }

    sendJson(res, 404, { error: "not found" });
  });

  return new Promise((resolve, reject) => {
    const onListenError = (e) => {
      if (e.code === "EADDRINUSE" && port !== 0) {
        server.removeListener("error", onListenError);
        server.listen(0, host);
      } else {
        reject(e);
      }
    };
    server.on("error", onListenError);
    server.listen(port, host, () => {
      const actual = server.address().port;
      adminState = {
        url: `http://${host}:${actual}/?t=${token}`,
        token,
        port: actual,
        host,
        server,
      };
      resolve(adminState);
    });
  });
}

function stopWebAdmin() {
  if (!adminState) return Promise.resolve();
  const s = adminState.server;
  adminState = null;
  return new Promise((resolve) => s.close(resolve));
}

async function runStandalone() {
  const { MKeysConfig } = require("./config");
  const { loadMasterKey } = require("./crypto");
  const { Vault } = require("./vault");
  const config = new MKeysConfig(process.env);
  const vault = new Vault(config, loadMasterKey(config));
  const base = getSessionInfo();
  const session = {
    id: `${base.id}-web`,
    label: `${base.label}·Web管理台`,
    source: base.source,
    startedAt: base.startedAt,
  };
  const admin = await startWebAdmin({ config, vault, session });
  process.stdout.write(
    [
      `MyKeys 管理台已启动: ${admin.url}`,
      "仅本机可访问；令牌在地址中，请勿外传。Ctrl+C 退出。",
      "",
    ].join("\n")
  );
}

module.exports = { startWebAdmin, stopWebAdmin, runStandalone };

if (require.main === module) {
  runStandalone().catch((e) => {
    process.stderr.write(`管理台启动失败: ${e.message}\n`);
    process.exit(1);
  });
}
