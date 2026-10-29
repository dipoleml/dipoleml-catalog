"use strict";

const { assertPublicHttpUrl } = require("./urlguard");

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * 内存令牌缓存：进程内有效，绝不落盘。refresh=true 或过期后重新签发。
 * key = 凭据 id
 */
const tokenCache = new Map();

function clearCachedToken(entryId) {
  tokenCache.delete(entryId);
}

async function httpRequest(url, { method = "GET", headers = {}, body = null, timeoutMs } = {}) {
  await assertPublicHttpUrl(url, process.env, "请求目标");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: ctrl.signal,
      redirect: "manual",
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function basicAuthHeader(username, password) {
  return "Basic " + Buffer.from(`${username}:${password ?? ""}`, "utf8").toString("base64");
}

function fillTemplate(value, fields, urlEncode) {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, name) => {
    if (!(name in fields)) throw new Error(`令牌请求模板引用了不存在的字段 "${name}"`);
    return urlEncode ? encodeURIComponent(fields[name]) : fields[name];
  });
}

function pickPath(obj, dotPath) {
  if (!dotPath) return undefined;
  return String(dotPath)
    .split(".")
    .reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/** 默认令牌请求体：不同 authType 的 OAuth2 惯例 */
function defaultTokenBody(entry, fields) {
  switch (entry.authType) {
    case "oauth-password":
      return { grant_type: "password", username: "{{username}}", password: "{{password}}" };
    case "oauth-client-credentials":
      return { grant_type: "client_credentials" };
    default:
      return null;
  }
}

function buildTokenRequest(entry, fields) {
  const cfg = entry.endpoints.token;
  if (!cfg.url) {
    throw new Error(`凭据 "${entry.name}" 的 token 端点缺少 url，无法发起令牌请求`);
  }
  const method = cfg.method || "POST";
  const headers = Object.assign({}, cfg.headers || {});
  const asJson = cfg.format === "json";

  let bodyTemplate = cfg.body || defaultTokenBody(entry, fields);
  if (!bodyTemplate) {
    throw new Error(`凭据 "${entry.name}" 未配置 token 请求体（custom 类型需在 endpoints.token.body 提供模板）`);
  }
  if (cfg.scope && bodyTemplate.scope === undefined) bodyTemplate = Object.assign({ scope: cfg.scope }, bodyTemplate);

  // 客户端凭据如何附带：basic（默认，client-credentials 用 clientId/clientSecret，其他用 username/password）
  const authMode =
    cfg.auth ||
    (entry.authType === "oauth-client-credentials" ? "basic" : entry.authType === "oauth-password" ? "none" : "none");
  if (authMode === "basic") {
    const u = fields.clientId ?? fields.client_id ?? fields.username;
    const p = fields.clientSecret ?? fields.client_secret ?? fields.password;
    if (!u) throw new Error(`凭据 "${entry.name}" 缺少 basic 认证所需字段（clientId/clientSecret 或 username/password）`);
    headers["Authorization"] = basicAuthHeader(u, p);
  }

  const rendered = {};
  for (const [k, v] of Object.entries(bodyTemplate)) {
    rendered[k] = typeof v === "string" ? fillTemplate(v, fields, !asJson) : v;
  }
  if (authMode === "body") {
    for (const key of ["client_id", "clientId", "client_secret", "clientSecret"]) {
      if (fields[key] !== undefined && rendered[key] === undefined) rendered[key] = fields[key];
    }
  }

  let body;
  if (asJson) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(rendered);
  } else {
    headers["Content-Type"] = headers["Content-Type"] || "application/x-www-form-urlencoded";
    body = new URLSearchParams(rendered).toString();
  }
  return { url: cfg.url, method, headers, body, timeoutMs: cfg.timeoutMs };
}

function parseTokenResponse(entry, { status, text }) {
  if (status < 200 || status >= 300) {
    const snippet = text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`令牌端点返回 HTTP ${status}${snippet ? ": " + snippet : ""}`);
  }
  const cfg = entry.endpoints.token;
  let token;
  let expiresIn;
  let tokenType;
  try {
    const json = JSON.parse(text);
    token = pickPath(json, cfg.tokenPath || "access_token");
    expiresIn = pickPath(json, cfg.expiresInPath || "expires_in");
    tokenType = pickPath(json, cfg.tokenTypePath || "token_type");
  } catch {
    token = text.trim(); // 纯文本令牌响应
  }
  if (typeof token !== "string" || !token) {
    throw new Error(`未能从令牌端点响应中提取令牌（tokenPath=${cfg.tokenPath || "access_token"}）`);
  }
  const ttl = Number.isFinite(Number(expiresIn)) && Number(expiresIn) > 0
    ? Number(expiresIn)
    : entry.ttlSeconds || 3600;
  return { token, expiresInSeconds: ttl, tokenType: tokenType || null };
}

/**
 * 签发临时令牌。返回 { token, usage, tokenType, headerName, scheme, expiresInSeconds, expiresAt, cached }。
 * usage 描述 AI 应如何携带该令牌（请求头/查询参数等）。
 */
async function issueToken(entry, fields, { refresh = false } = {}) {
  const cached = tokenCache.get(entry.id);
  if (!refresh && cached && cached.expiresAt > Date.now() + 5000) {
    return { ...cached, cached: true };
  }

  let result;
  if (entry.authType === "api-key") {
    const token = fields.apiKey ?? fields.token ?? fields.key;
    if (!token) throw new Error(`凭据 "${entry.name}" 缺少 apiKey/token/key 字段`);
    const cfg = entry.endpoints.token || {};
    result = {
      token,
      expiresInSeconds: entry.ttlSeconds || 3600,
      tokenType: null,
      headerName: cfg.headerName || "Authorization",
      scheme: cfg.scheme === undefined ? "Bearer" : cfg.scheme,
    };
  } else if (entry.authType === "basic" && !entry.endpoints.token) {
    // 未配置令牌端点：Basic 凭据本身即临时使用凭据
    if (!fields.username) throw new Error(`凭据 "${entry.name}" 缺少 username 字段`);
    result = {
      token: basicAuthHeader(fields.username, fields.password),
      expiresInSeconds: entry.ttlSeconds || 3600,
      tokenType: null,
      headerName: "Authorization",
      scheme: "",
    };
  } else {
    if (!entry.endpoints.token) {
      throw new Error(
        `凭据 "${entry.name}"（${entry.authType}）未配置 endpoints.token，无法签发令牌；` +
          `请用 update_credential 补充令牌端点`
      );
    }
    const req = buildTokenRequest(entry, fields);
    const res = await httpRequest(req.url, req);
    const parsed = parseTokenResponse(entry, res);
    result = {
      token: parsed.token,
      expiresInSeconds: parsed.expiresInSeconds,
      tokenType: parsed.tokenType,
      headerName: "Authorization",
      scheme: parsed.tokenType ? parsed.tokenType.replace(/^bearer$/i, "Bearer") : "Bearer",
    };
  }

  const record = {
    ...result,
    obtainedAt: new Date().toISOString(),
    expiresAt: Date.now() + result.expiresInSeconds * 1000,
  };
  tokenCache.set(entry.id, record);
  return { ...record, cached: false };
}

function authHeadersFor(entry, tokenRecord) {
  const value = tokenRecord.scheme ? `${tokenRecord.scheme} ${tokenRecord.token}` : tokenRecord.token;
  return { [tokenRecord.headerName]: value };
}

/**
 * 验证登录是否有效。优先使用 verify 端点；否则以能否成功签发令牌为准。
 * 返回 { ok, via, status, message, latencyMs }
 */
async function verifyLogin(entry, fields) {
  const started = Date.now();
  const done = (ok, via, message, status) => ({
    ok,
    via,
    message,
    status: status == null ? null : status,
    latencyMs: Date.now() - started,
  });

  try {
    if (entry.endpoints.verify) {
      const v = entry.endpoints.verify;
      let headers = Object.assign({}, v.headers || {});
      if (entry.authType === "basic") {
        if (!fields.username) return done(false, "verify-endpoint", "缺少 username 字段");
        headers["Authorization"] = basicAuthHeader(fields.username, fields.password);
      } else if (entry.authType === "api-key") {
        const tokenRecord = await issueToken(entry, fields);
        headers = Object.assign(headers, authHeadersFor(entry, tokenRecord));
      } else {
        const tokenRecord = await issueToken(entry, fields);
        headers = Object.assign(headers, authHeadersFor(entry, tokenRecord));
      }
      const res = await httpRequest(v.url, { method: v.method || "GET", headers, timeoutMs: v.timeoutMs });
      if (res.status >= 200 && res.status < 300) return done(true, "verify-endpoint", "验证通过", res.status);
      if (res.status === 401 || res.status === 403) {
        return done(false, "verify-endpoint", "凭据被拒绝（" + res.status + "）", res.status);
      }
      return done(false, "verify-endpoint", `verify 端点返回 HTTP ${res.status}`, res.status);
    }

    if (entry.endpoints.token || entry.authType === "api-key" || entry.authType === "basic") {
      clearCachedToken(entry.id);
      await issueToken(entry, fields, { refresh: true });
      return done(true, "token-flow", "成功签发令牌，登录有效");
    }
    return done(false, "none", "未配置 verify/token 端点，无法验证");
  } catch (e) {
    return done(false, entry.endpoints.verify ? "verify-endpoint" : "token-flow", e.message);
  }
}

module.exports = { issueToken, verifyLogin, clearCachedToken, tokenCache };
