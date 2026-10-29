#!/usr/bin/env node
"use strict";

// MyKeys CLI 入口。
// 用法：mykeys admin     前台启动本地 Web 管理台（Ctrl+C 退出）
//       mykeys           前台运行 MCP stdio 服务器（与 ZCode 插件加载方式一致）
//       mykeys --version 显示版本

const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", ".zcode-plugin", "plugin.json"), "utf8")
    );
    console.log("MyKeys " + (manifest.version || "0.0.0"));
  } catch {
    console.log("MyKeys 0.0.0");
  }
  process.exit(0);
}

if (process.argv[2] === "admin" || process.argv[2] === "web") {
  require("../server/webadmin").runStandalone().catch((e) => {
    process.stderr.write(`MyKeys 管理台启动失败: ${e.message}\n`);
    process.exit(1);
  });
} else {
  require("../server/index.js");
}
