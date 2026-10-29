"use strict";

/**
 * 会话标识：审计事件记录"是谁用的"。
 * 优先取宿主注入的会话环境变量（未来 ZCode 若提供即可自动生效）；
 * 否则用进程实例 ID 等价代替——每个 ZCode 会话会独立启动一个 mkeys MCP 服务进程，
 * 进程粒度即会话粒度。
 */

const crypto = require("node:crypto");

const SESSION_ENV_KEYS = ["ZCODE_SESSION_ID", "CLAUDE_SESSION_ID", "ZCODE_SESSION", "SESSION_ID"];

let cached = null;

function getSessionInfo(env = process.env) {
  if (cached) return cached;
  const startedAt = new Date().toISOString();
  const fromEnv = SESSION_ENV_KEYS.map((k) => env[k]).find((v) => typeof v === "string" && v.trim());
  if (fromEnv) {
    const full = fromEnv.trim();
    cached = { id: full, label: full.length > 18 ? full.slice(0, 18) + "…" : full, source: "env", startedAt };
  } else {
    const id = "proc-" + crypto.randomBytes(4).toString("hex");
    cached = { id, label: `${id}`, source: "process", startedAt };
  }
  return cached;
}

module.exports = { getSessionInfo };
