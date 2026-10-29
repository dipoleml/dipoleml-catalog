"use strict";

const usage = require("./usage");
const { issueToken, verifyLogin, clearCachedToken } = require("./authflow");
const { startWebAdmin } = require("./webadmin");

const AUTH_TYPE_INFO = Object.freeze([
  { type: "basic", desc: "用户名和密码（HTTP Basic）；可配置令牌端点换取访问令牌" },
  { type: "api-key", desc: "静态访问密钥（API Key / Bearer Token）" },
  { type: "oauth-password", desc: "OAuth2 资源所有者口令流程" },
  { type: "oauth-client-credentials", desc: "OAuth2 客户端凭据流程" },
  { type: "custom", desc: "自定义令牌端点（body 模板用 {{field}} 引用凭据字段）" },
]);
const AUTH_TYPES = AUTH_TYPE_INFO.map((i) => i.type);
const AUTH_TYPE_DESC_TEXT = AUTH_TYPE_INFO.map((i) => `${i.type} — ${i.desc}`).join("；");

/** 审计事件统一打会话戳（ctx.session 由服务进程注入） */
function logEvent(ctx, event) {
  usage.appendEvent(ctx.config, Object.assign({ session: ctx.session ? ctx.session.id : undefined }, event));
}

function fmtMeta(m) {
  const bits = [
    `${m.name}${m.system ? " [" + m.system + "]" : ""}`,
    `类型=${m.authType}`,
  ];
  if (m.tags.length) bits.push(`标签=${m.tags.join(",")}`);
  bits.push(`字段=[${m.fieldNames.join(",")}]`);
  bits.push(m.hasTokenEndpoint ? "令牌端点=有" : "令牌端点=无");
  bits.push(m.hasVerifyEndpoint ? "验证端点=有" : "验证端点=无");
  return bits.join("  ");
}

const tools = [
  {
    name: "list_credentials",
    description:
      "列出凭据库中所有凭据的元数据（名称、系统、类型、字段名、端点配置）。不返回任何密钥明文。" +
      "在 add/get_token 之前先调用它确认凭据名称。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler(ctx) {
      const list = ctx.vault.listMeta();
      if (!list.length) return "凭据库为空。使用 add_credential 添加第一个凭据（敏感字段建议用 env:VAR 间接引用）。";
      const lines = [`共 ${list.length} 个凭据：`];
      list.forEach((m, i) => {
        lines.push(`${i + 1}. ${fmtMeta(m)}`);
        if (m.description) lines.push(`   说明: ${m.description}`);
        lines.push(`   更新于 ${m.updatedAt}`);
      });
      return lines.join("\n");
    },
  },
  {
    name: "add_credential",
    description:
      "添加一个系统凭据（名称唯一）。敏感字段值支持 'env:VAR_NAME' 形式——写入时从服务进程环境变量读取实际值，" +
      "推荐这种方式以避免密钥经过对话内容。所有字段以 AES-256-GCM 加密后落盘。",
    inputSchema: {
      type: "object",
      required: ["name", "authType", "fields"],
      properties: {
        name: { type: "string", description: "唯一名称，如 github-prod" },
        system: { type: "string", description: "所属系统/平台标识，如 github、内部 API 网关" },
        authType: {
          type: "string",
          enum: AUTH_TYPES,
          description: AUTH_TYPE_DESC_TEXT,
        },
        fields: {
          type: "object",
          description:
            "凭据字段。常用键名: username 与 password（basic、oauth-password 流程）、clientId 与 clientSecret" +
            "（client-credentials 流程）、apiKey、token、key（静态密钥）。值为 'env:VAR' 时从环境变量解析。" +
            "允许任意自定义字段。",
          additionalProperties: { type: "string" },
        },
        endpoints: {
          type: "object",
          description:
            "可选端点配置。仅允许公网 http/https 地址（环回/私有/保留网段默认拒绝，防 SSRF；" +
            "可信内网目标需用户在插件设置中开启 allowPrivateEndpoints）",
          properties: {
            verify: {
              type: "object",
              description: "登录验证端点：请求成功(2xx)=凭据有效，401/403=凭据无效",
              properties: {
                url: { type: "string" },
                method: { type: "string", default: "GET" },
                headers: { type: "object", additionalProperties: { type: "string" } },
              },
              required: ["url"],
            },
            token: {
              type: "object",
              description:
                "令牌端点：签发临时令牌。body 为请求体模板，'{{字段名}}' 会被替换为解密字段值。" +
                "auth: basic/body/none 指定客户端凭据携带方式；format: form/json；" +
                "tokenPath/expiresInPath/tokenTypePath 指定响应提取路径（默认 OAuth2 字段名）；" +
                "api-key 类型可用 headerName/scheme 自定义携带方式（scheme 为空串表示原样放入头部值）。",
              properties: {
                url: { type: "string" },
                method: { type: "string", default: "POST" },
                auth: { type: "string", enum: ["basic", "body", "none"] },
                format: { type: "string", enum: ["form", "json"], default: "form" },
                body: { type: "object", additionalProperties: true },
                scope: { type: "string" },
                tokenPath: { type: "string" },
                expiresInPath: { type: "string" },
                tokenTypePath: { type: "string" },
                headerName: { type: "string" },
                scheme: { type: "string" },
                headers: { type: "object", additionalProperties: { type: "string" } },
                timeoutMs: { type: "number" },
              },
              required: ["url"],
            },
          },
        },
        ttlSeconds: { type: "number", description: "令牌有效期（秒）；端点未返回 expires_in 时使用，默认 3600" },
        tags: { type: "array", items: { type: "string" } },
        description: { type: "string", description: "用途说明（给人和 AI 看）" },
      },
    },
    async handler(ctx, args) {
      const meta = ctx.vault.add(args);
      logEvent(ctx, {
        type: "add",
        credential: meta.name,
        system: meta.system,
        purpose: args.description || "",
        ok: true,
      });
      return [
        `✅ 已添加凭据并加密存储：`,
        fmtMeta(meta),
        meta.ttlSeconds ? `令牌默认有效期: ${meta.ttlSeconds}s` : "令牌默认有效期: 3600s（端点返回 expires_in 时以端点为准）",
        "建议接下来调用 verify_login 确认凭据有效。",
      ].join("\n");
    },
  },
  {
    name: "update_credential",
    description:
      "更新已有凭据。fields 只合并传入的键；removeFields 删除字段；endpoints 整体替换。同样支持 'env:VAR' 间接引用。",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "现有凭据名称或 id" },
        newName: { type: "string" },
        system: { type: "string" },
        authType: { type: "string", enum: AUTH_TYPES },
        fields: { type: "object", additionalProperties: { type: "string" } },
        removeFields: { type: "array", items: { type: "string" } },
        endpoints: {
          type: "object",
          description: "整体替换端点配置（结构同 add_credential）；传 {} 清空",
        },
        ttlSeconds: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        description: { type: "string" },
      },
    },
    async handler(ctx, args) {
      const { name, ...patch } = args;
      const meta = ctx.vault.update(name, patch);
      clearCachedToken(meta.id);
      logEvent(ctx, {
        type: "update",
        credential: meta.name,
        system: meta.system,
        ok: true,
      });
      return `✅ 已更新凭据（内存令牌缓存已失效）：\n${fmtMeta(meta)}`;
    },
  },
  {
    name: "delete_credential",
    description: "删除一个凭据（不可恢复）。删除前会返回该凭据的使用统计摘要。",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string", description: "凭据名称或 id" } },
    },
    async handler(ctx, args) {
      const entry = ctx.vault.find(args.name);
      if (!entry) throw new Error(`未找到凭据 "${args.name}"`);
      const past = usage.readEvents(ctx.config, { credential: entry.name });
      ctx.vault.remove(args.name);
      clearCachedToken(entry.id);
      logEvent(ctx, {
        type: "delete",
        credential: entry.name,
        system: entry.system || "",
        ok: true,
      });
      return `🗑️ 已删除凭据 "${entry.name}"${entry.system ? "（" + entry.system + "）" : ""}。历史使用 ${past.length} 次，记录保留在用量日志中。`;
    },
  },
  {
    name: "verify_login",
    description:
      "验证凭据登录是否有效（2xx=有效，401/403=被拒绝）。优先使用配置的 verify 端点，否则以能否成功签发令牌为准。验证结果计入使用统计。",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string", description: "凭据名称或 id" } },
    },
    async handler(ctx, args) {
      const { entry, fields } = ctx.vault.getWithFields(args.name);
      const result = await verifyLogin(entry, fields);
      logEvent(ctx, {
        type: "verify",
        credential: entry.name,
        system: entry.system || "",
        purpose: "",
        ok: result.ok,
        message: result.ok ? "" : result.message,
        latencyMs: result.latencyMs,
      });
      const head = result.ok ? "✅ 登录验证通过" : "❌ 登录验证失败";
      return `${head}：${entry.name}${entry.system ? "（" + entry.system + "）" : ""}\n方式: ${result.via}  耗时: ${result.latencyMs}ms${result.status ? `  HTTP ${result.status}` : ""}${result.message ? "\n信息: " + result.message : ""}`;
    },
  },
  {
    name: "get_token",
    description:
      "为指定凭据签发（或复用缓存的）临时令牌供后续调用使用。必须在 purpose 中说明本次用途，便于审计统计。" +
      "返回令牌值、携带方式（请求头）、有效期。令牌仅缓存在内存中，过期自动重新签发。",
    inputSchema: {
      type: "object",
      required: ["name", "purpose"],
      properties: {
        name: { type: "string", description: "凭据名称或 id" },
        purpose: { type: "string", minLength: 2, description: "本次使用用途，如 '查询生产订单服务状态'" },
        refresh: { type: "boolean", default: false, description: "true 时强制重新登录签发，忽略缓存" },
      },
    },
    async handler(ctx, args) {
      const purpose = String(args.purpose || "").trim();
      if (purpose.length < 2) throw new Error("必须提供 purpose（至少 2 个字符），用于记录 AI 使用用途");
      const { entry, fields } = ctx.vault.getWithFields(args.name);
      let record;
      try {
        record = await issueToken(entry, fields, { refresh: Boolean(args.refresh) });
      } catch (e) {
        logEvent(ctx, {
          type: "token",
          credential: entry.name,
          system: entry.system || "",
          purpose,
          ok: false,
          message: e.message,
        });
        throw e;
      }
      logEvent(ctx, {
        type: "token",
        credential: entry.name,
        system: entry.system || "",
        purpose,
        ok: true,
        cached: Boolean(record.cached),
        expiresIn: record.expiresInSeconds,
      });
      const headerValue = record.scheme ? `${record.scheme} ${record.token}` : record.token;
      const lines = [
        `🔑 临时令牌已${record.cached ? "从缓存复用" : "签发"}（凭据: ${entry.name}${entry.system ? " / " + entry.system : ""}）`,
        `携带方式: 请求头 ${record.headerName}: ${record.scheme ? record.scheme + " <token>" : "<token>"}`,
        `令牌值: ${record.token}`,
        `使用示例: ${record.headerName}: ${headerValue.slice(0, 12)}${headerValue.length > 12 ? "..." : ""}（完整值即上一行"令牌值"）`,
        `有效期: ${record.expiresInSeconds}s（至 ${new Date(record.expiresAt).toISOString()}）`,
        `用途已记录: ${purpose}`,
      ];
      return lines.join("\n");
    },
  },
  {
    name: "reveal_secret",
    description:
      "读取凭据的原始密钥明文（危险操作，每次调用都计入审计日志）。默认禁用——需要用户在插件设置中开启 allowReveal。优先使用 get_token 获取临时令牌而非读取原始密钥。",
    inputSchema: {
      type: "object",
      required: ["name", "field", "purpose"],
      properties: {
        name: { type: "string" },
        field: { type: "string", description: "字段名，如 password / apiKey" },
        purpose: { type: "string", minLength: 2 },
      },
    },
    async handler(ctx, args) {
      if (!ctx.config.allowReveal) {
        throw new Error(
          "reveal_secret 已被禁用。如确需读取原始密钥，请在 ZCode 插件设置中开启 mkeys 的 allowReveal" +
            "（或设置环境变量 MKEYS_ALLOW_REVEAL=true）后重启会话。推荐改用 get_token 获取临时令牌。"
        );
      }
      const purpose = String(args.purpose || "").trim();
      if (purpose.length < 2) throw new Error("必须提供 purpose 用于审计");
      const { entry, fields } = ctx.vault.getWithFields(args.name);
      if (!(args.field in fields)) {
        throw new Error(`凭据 "${entry.name}" 没有字段 "${args.field}"（现有字段: ${Object.keys(fields).join(", ") || "无"}）`);
      }
      logEvent(ctx, {
        type: "reveal",
        credential: entry.name,
        system: entry.system || "",
        purpose,
        ok: true,
      });
      return [
        `⚠️ 原始密钥读取（已审计，用途: ${purpose}）`,
        `${entry.name}.${args.field} = ${fields[args.field]}`,
        "请勿将该值写入代码、日志或任何持久化文件；用后即弃。",
      ].join("\n");
    },
  },
  {
    name: "open_admin",
    description:
      "启动（或复用）mkeys 本地 Web 管理台并返回带一次性访问令牌的访问地址（仅绑定 127.0.0.1）。" +
      "页面上可以图形化管理凭据（增删改查、表单添加）、在线验证登录、签发临时令牌、查看使用统计图表。" +
      "用户说'打开/看 mkeys 管理页面'或需要图形界面管理凭据时调用。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler(ctx) {
      const admin = await startWebAdmin(ctx);
      return [
        "🖥️ MyKeys Web 管理台已就绪（仅本机访问，令牌在地址中，请勿外传）：",
        admin.url,
        "页面功能：凭据增删改查与表单添加（字段支持 env: 环境变量引用）、在线验证登录、签发临时令牌、使用统计图表。",
        "请把上面的完整地址给用户在浏览器打开；也可以直接用 browser-use 打开验证。",
      ].join("\n");
    },
  },
  {
    name: "usage_stats",
    description:
      "查询 AI 使用统计：按凭据、按用途、按天的调用量与成功率，以及最近失败记录。" +
      "用户询问'密钥用了多少次/用在哪/用来干什么'时调用本工具。",
    inputSchema: {
      type: "object",
      properties: {
        sinceDays: { type: "number", description: "统计最近 N 天（默认 7；0 或不传=全部历史）", minimum: 0 },
        credential: { type: "string", description: "只统计指定凭据" },
        type: { type: "string", enum: usage.EVENT_TYPES, description: "只统计指定事件类型" },
        topPurposes: { type: "number", description: "用途排行条数（默认 10）", minimum: 1, maximum: 50 },
      },
    },
    async handler(ctx, args) {
      const events = usage.readEvents(ctx.config, {
        sinceDays: args.sinceDays,
        credential: args.credential,
        type: args.type,
      });
      const stats = usage.aggregate(events);
      return usage.formatStats(stats, {
        sinceDays: args.sinceDays && args.sinceDays > 0 ? args.sinceDays : null,
        topPurposes: args.topPurposes || 10,
      });
    },
  },
];

function findTool(name) {
  return tools.find((t) => t.name === name);
}

function toolListForProtocol() {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

module.exports = { tools, findTool, toolListForProtocol };
