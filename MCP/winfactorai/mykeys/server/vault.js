"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const { encryptJson, decryptJson } = require("./crypto");
const { checkUrlSync } = require("./urlguard");

const AUTH_TYPES = ["basic", "api-key", "oauth-password", "oauth-client-credentials", "custom"];
const RESERVED_FIELD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return "c_" + crypto.randomBytes(6).toString("hex");
}

/**
 * 字段值支持 "env:VAR_NAME" 间接引用：写入时从服务进程的环境变量解析。
 * 这是推荐方式——密钥值不经过对话内容，也不落入源码/配置文件。
 */
function resolveEnvRefs(fields, env) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (RESERVED_FIELD_KEYS.has(k)) throw new Error(`不允许使用保留字段名: ${k}`);
    if (typeof v === "string" && v.startsWith("env:")) {
      const varName = v.slice(4).trim();
      if (!varName) throw new Error(`字段 ${k} 使用了 env: 引用但缺少变量名`);
      const val = env[varName];
      if (val === undefined || val === "") {
        throw new Error(`环境变量 ${varName} 未设置，无法解析字段 ${k}；凭据不会被保存`);
      }
      out[k] = val;
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    } else if (v !== null && v !== undefined) {
      throw new Error(`字段 ${k} 必须是字符串（或 env:VAR 引用）`);
    }
  }
  return out;
}

function validateHttpUrl(url, what, env) {
  return checkUrlSync(url, what, env).toString();
}

function normalizeEndpoints(endpoints, env) {
  const out = {};
  if (!endpoints) return out;
  if (endpoints.verify) {
    out.verify = {
      url: validateHttpUrl(endpoints.verify.url, "verify.url", env),
      method: String(endpoints.verify.method || "GET").toUpperCase(),
      headers: endpoints.verify.headers || undefined,
    };
  }
  if (endpoints.token) {
    const t = endpoints.token;
    out.token = {
      // url 可省略：api-key 类型可只配 headerName/scheme 描述携带方式
      url: t.url ? validateHttpUrl(t.url, "token.url", env) : undefined,
      method: String(t.method || "POST").toUpperCase(),
      // basic: 用字段做 HTTP Basic 认证；body: 字段放进请求体；none: 不附带凭据
      auth: ["basic", "body", "none"].includes(t.auth) ? t.auth : undefined,
      format: t.format === "json" ? "json" : "form",
      body: t.body && typeof t.body === "object" ? t.body : undefined,
      scope: t.scope ? String(t.scope) : undefined,
      tokenPath: t.tokenPath ? String(t.tokenPath) : undefined,
      expiresInPath: t.expiresInPath ? String(t.expiresInPath) : undefined,
      tokenTypePath: t.tokenTypePath ? String(t.tokenTypePath) : undefined,
      headerName: t.headerName ? String(t.headerName) : undefined,
      scheme: t.scheme === "" || t.scheme ? String(t.scheme) : undefined,
      headers: t.headers || undefined,
      timeoutMs: Number.isFinite(t.timeoutMs) ? t.timeoutMs : undefined,
    };
  }
  return out;
}

class Vault {
  constructor(config, key) {
    this.config = config;
    this.key = key;
    this.data = this.#read();
  }

  #read() {
    if (!fs.existsSync(this.config.vaultPath)) return { version: 1, entries: [] };
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(this.config.vaultPath, "utf8"));
    } catch (e) {
      throw new Error(`凭据库文件损坏（${this.config.vaultPath}）: ${e.message}`);
    }
    if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) {
      throw new Error("凭据库文件格式不兼容，请确认 mkeys 版本");
    }
    return raw;
  }

  #write() {
    const tmp = this.config.vaultPath + ".tmp." + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2) + "\n", { mode: 0o600 });
    try {
      fs.chmodSync(tmp, 0o600);
    } catch {
      /* 尽力而为 */
    }
    fs.renameSync(tmp, this.config.vaultPath);
  }

  reload() {
    this.data = this.#read();
  }

  /** 元数据列表，绝不含密钥明文 */
  listMeta() {
    return this.data.entries.map((e) => this.#metaOf(e));
  }

  #metaOf(e) {
    return {
      id: e.id,
      name: e.name,
      system: e.system || "",
      authType: e.authType,
      description: e.description || "",
      tags: e.tags || [],
      hasTokenEndpoint: Boolean(e.endpoints && e.endpoints.token),
      hasVerifyEndpoint: Boolean(e.endpoints && e.endpoints.verify),
      ttlSeconds: e.ttlSeconds || null,
      fieldNames: (e.fieldNames || []).slice(),
      verifyUrl: e.endpoints && e.endpoints.verify ? e.endpoints.verify.url : "",
      tokenUrl: e.endpoints && e.endpoints.token ? e.endpoints.token.url : "",
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  find(nameOrId) {
    const needle = String(nameOrId || "").trim().toLowerCase();
    return (
      this.data.entries.find((e) => e.name.toLowerCase() === needle) ||
      this.data.entries.find((e) => e.id.toLowerCase() === needle)
    );
  }

  /** 返回 { entry, fields }，fields 为解密后的明文字段（仅驻留内存） */
  getWithFields(nameOrId) {
    const entry = this.find(nameOrId);
    if (!entry) {
      throw new Error(`未找到凭据 "${nameOrId}"，可先调用 list_credentials 查看现有凭据`);
    }
    return { entry, fields: decryptJson(this.key, entry.enc) };
  }

  add(input) {
    if (this.find(input.name)) {
      throw new Error(`名为 "${input.name}" 的凭据已存在；如需修改请使用 update_credential`);
    }
    const authType = input.authType;
    if (!AUTH_TYPES.includes(authType)) {
      throw new Error(`authType 必须是 ${AUTH_TYPES.join(" / ")} 之一`);
    }
    const fields = resolveEnvRefs(input.fields || {}, this.config.env);
    const ts = nowIso();
    const entry = {
      id: newId(),
      name: String(input.name).trim(),
      system: input.system ? String(input.system).trim() : "",
      authType,
      description: input.description ? String(input.description) : "",
      tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
      ttlSeconds: Number.isFinite(input.ttlSeconds) && input.ttlSeconds > 0 ? input.ttlSeconds : null,
      endpoints: normalizeEndpoints(input.endpoints, this.config.env),
      fieldNames: Object.keys(fields),
      createdAt: ts,
      updatedAt: ts,
      enc: encryptJson(this.key, fields),
    };
    this.data.entries.push(entry);
    this.#write();
    return this.#metaOf(entry);
  }

  update(nameOrId, patch) {
    const entry = this.find(nameOrId);
    if (!entry) throw new Error(`未找到凭据 "${nameOrId}"`);
    if (patch.newName) {
      const clash = this.find(patch.newName);
      if (clash && clash.id !== entry.id) throw new Error(`名为 "${patch.newName}" 的凭据已存在`);
      entry.name = String(patch.newName).trim();
    }
    if (patch.system !== undefined) entry.system = String(patch.system).trim();
    if (patch.description !== undefined) entry.description = String(patch.description);
    if (patch.tags !== undefined) entry.tags = Array.isArray(patch.tags) ? patch.tags.map(String) : [];
    if (patch.ttlSeconds !== undefined) {
      entry.ttlSeconds = Number.isFinite(patch.ttlSeconds) && patch.ttlSeconds > 0 ? patch.ttlSeconds : null;
    }
    if (patch.endpoints !== undefined) entry.endpoints = normalizeEndpoints(patch.endpoints, this.config.env);
    if (patch.authType !== undefined) {
      if (!AUTH_TYPES.includes(patch.authType)) {
        throw new Error(`authType 必须是 ${AUTH_TYPES.join(" / ")} 之一`);
      }
      entry.authType = patch.authType;
    }
    if (patch.fields !== undefined || patch.removeFields !== undefined) {
      const fields = decryptJson(this.key, entry.enc);
      Object.assign(fields, resolveEnvRefs(patch.fields || {}, this.config.env));
      for (const name of patch.removeFields || []) delete fields[name];
      entry.enc = encryptJson(this.key, fields);
      entry.fieldNames = Object.keys(fields);
    }
    entry.updatedAt = nowIso();
    this.#write();
    return this.#metaOf(entry);
  }

  remove(nameOrId) {
    const entry = this.find(nameOrId);
    if (!entry) throw new Error(`未找到凭据 "${nameOrId}"`);
    this.data.entries = this.data.entries.filter((e) => e.id !== entry.id);
    this.#write();
    return entry;
  }
}

module.exports = { Vault, resolveEnvRefs, AUTH_TYPES };
