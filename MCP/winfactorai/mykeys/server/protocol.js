"use strict";

const { findTool, toolListForProtocol } = require("./tools");

const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

/**
 * 构造 MCP 消息处理器（与传输无关）。
 * opts.getContext: 惰性返回 { config, vault }；opts.version: 服务版本号。
 * 返回 async handleMessage(msg) → 响应对象（{jsonrpc,id,result|error}）或 null（通知/无需响应）。
 */
function makeMessageHandler({ getContext, version, serverName = "mkeys" }) {
  async function callTool(params) {
    const name = params && params.name;
    const tool = findTool(name);
    if (!tool) {
      const err = new Error(`未知工具 "${name}"，可用工具: ${toolListForProtocol().map((t) => t.name).join(", ")}`);
      err.protocolCode = -32602;
      throw err;
    }
    const args = params.arguments || {};
    if (typeof args !== "object" || Array.isArray(args)) {
      const err = new Error("工具参数必须是对象");
      err.protocolCode = -32602;
      throw err;
    }
    try {
      const text = await tool.handler(getContext(), args);
      return { content: [{ type: "text", text: String(text) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `❌ ${e.message}` }],
        isError: true,
      };
    }
  }

  return async function handleMessage(msg) {
    const { id, method, params } = msg || {};
    if (typeof method !== "string") return null;
    if (method.startsWith("notifications/")) return null;

    const wantsReply = id !== undefined && id !== null;
    const ok = (result) => (wantsReply ? { jsonrpc: "2.0", id, result } : null);
    const fail = (code, message) => (wantsReply ? { jsonrpc: "2.0", id, error: { code, message } } : null);

    switch (method) {
      case "initialize": {
        const requested = params && params.protocolVersion;
        return ok({
          protocolVersion: typeof requested === "string" && requested ? requested : DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: serverName, version },
          instructions:
            "mkeys 凭据保险库：用 list_credentials 查看、add_credential 添加、verify_login 验证登录、" +
            "get_token 获取临时令牌（必须提供 purpose 用途）、usage_stats 查询 AI 使用统计。" +
            "敏感字段一律通过 env:VAR 间接引用，不要把密钥明文写进对话或代码。",
        });
      }
      case "ping":
        return ok({});
      case "tools/list":
        return ok({ tools: toolListForProtocol() });
      case "tools/call":
        try {
          return ok(await callTool(params));
        } catch (e) {
          if (e.protocolCode) return fail(e.protocolCode, e.message);
          return fail(-32603, `内部错误: ${e.message}`);
        }
      case "resources/list":
        return ok({ resources: [] });
      case "prompts/list":
        return ok({ prompts: [] });
      default:
        return fail(-32601, `未知方法: ${method}`);
    }
  };
}

module.exports = { makeMessageHandler, DEFAULT_PROTOCOL_VERSION };
