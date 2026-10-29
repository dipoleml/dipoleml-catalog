#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const { MKeysConfig } = require("./config");
const { loadMasterKey } = require("./crypto");
const { Vault } = require("./vault");
const { makeMessageHandler } = require("./protocol");
const { getSessionInfo } = require("./session");

function serverVersion() {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", ".zcode-plugin", "plugin.json"), "utf8")
    );
    return manifest.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function debugLog(...args) {
  if (process.env.MKEYS_DEBUG) process.stderr.write("[mkeys] " + args.join(" ") + "\n");
}

/** 惰性初始化：直到第一个工具调用才加载数据目录与密钥，避免 initialize 即产生副作用 */
let ctx = null;
function getContext() {
  if (ctx) return ctx;
  const config = new MKeysConfig(process.env);
  const key = loadMasterKey(config);
  const vault = new Vault(config, key);
  ctx = { config, vault, session: getSessionInfo() };
  return ctx;
}

const handleMessage = makeMessageHandler({ getContext, version: serverVersion() });

// 串行化消息处理：保证副作用（用量日志等）与到达顺序一致
let queue = Promise.resolve();

const rl = readline.createInterface({ input: process.stdin, terminal: false, crlfDelay: Infinity });

rl.on("line", (line) => {
  const s = String(line).trim();
  if (!s) return;
  let msg;
  try {
    msg = JSON.parse(s);
  } catch {
    debugLog("ignoring non-JSON line");
    return;
  }
  queue = queue
    .then(() => handleMessage(msg))
    .then((resp) => {
      if (resp) process.stdout.write(JSON.stringify(resp) + "\n");
    })
    .catch((e) => debugLog("handler error:", e.message));
});

rl.on("close", () => {
  debugLog("stdin closed, exiting");
  process.exit(0);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

debugLog("mkeys mcp server started (pid " + process.pid + ")");
