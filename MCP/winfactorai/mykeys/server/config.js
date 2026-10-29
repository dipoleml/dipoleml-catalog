"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/**
 * 运行时配置。所有路径都收敛到一个数据目录（默认 ~/.mkeys），
 * 目录权限 0700，凭据文件 0600，用量日志 0600。
 *
 * 环境变量：
 *   MKEYS_HOME       数据目录覆盖（默认 ~/.mkeys）
 *   MKEYS_MASTER_KEY 主密钥来源（base64 的 32 字节，或任意口令短语，经 scrypt 派生）。
 *                    未设置时首次运行自动生成本地密钥文件 master.key（0600）。
 *   MKEYS_ALLOW_REVEAL 是否允许 reveal_secret 读取原始密钥（默认 false）
 */
class MKeysConfig {
  constructor(env = process.env) {
    this.env = env;
    const home = String(env.MKEYS_HOME || "").trim();
    this.dataDir = path.resolve(home || path.join(os.homedir(), ".mkeys"));
    fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(this.dataDir, 0o700);
    } catch {
      /* 非 POSIX 文件系统上忽略 */
    }
    this.vaultPath = path.join(this.dataDir, "vault.json");
    this.usagePath = path.join(this.dataDir, "usage.jsonl");
    this.keyPath = path.join(this.dataDir, "master.key");
  }

  get allowReveal() {
    const v = String(this.env.MKEYS_ALLOW_REVEAL || "").trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
}

module.exports = { MKeysConfig };
