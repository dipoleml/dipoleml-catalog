"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const AAD = Buffer.from("mkeys:vault:v1");

function looksLikeRawKey(s) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(s)) return false;
  return Buffer.from(s, "base64").length === 32;
}

/**
 * 主密钥解析顺序：
 * 1. MKEYS_MASTER_KEY 环境变量（推荐：base64 的 32 字节，或口令短语经 scrypt 派生）
 * 2. 数据目录下的 master.key（首次运行自动生成，权限 0600）
 */
function loadMasterKey(config) {
  const fromEnv = String(config.env.MKEYS_MASTER_KEY || "").trim();
  if (fromEnv) {
    if (looksLikeRawKey(fromEnv)) return Buffer.from(fromEnv, "base64");
    return crypto.scryptSync(fromEnv, "mkeys-master-key-v1", 32);
  }
  if (fs.existsSync(config.keyPath)) {
    const raw = fs.readFileSync(config.keyPath, "utf8").trim();
    return Buffer.from(raw, "base64");
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(config.keyPath, key.toString("base64") + "\n", { mode: 0o600 });
  try {
    fs.chmodSync(config.keyPath, 0o600);
  } catch {
    /* 尽力而为 */
  }
  return key;
}

function encryptJson(key, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ct.toString("base64"),
  };
}

function decryptJson(key, enc) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(enc.iv, "base64"));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(enc.data, "base64")), decipher.final()]);
  return JSON.parse(pt.toString("utf8"));
}

module.exports = { loadMasterKey, encryptJson, decryptJson };
