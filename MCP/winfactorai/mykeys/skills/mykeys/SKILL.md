---
name: mykeys
description: MyKeys credential vault — trigger when the user mentions MyKeys/mkeys or asks to open the MyKeys admin page/console (打开 MyKeys 管理页面/管理台). Also use to save/manage passwords or API keys, verify logins, obtain temporary tokens for authorized AI use, and review per-purpose usage statistics. / 管理各系统密码密钥、验证登录、获取供 AI 使用的临时令牌，并按用途统计使用情况；用户提到 MyKeys/mkeys、要求打开管理页面/管理台、保存管理密码密钥、查看使用统计时使用。
---

# MyKeys 凭据保险库

MyKeys（MCP 服务名 `mkeys`，工具以 `mcp__mkeys__` 为前缀，若省略前缀不可用则直接用下列名称）提供本地加密凭据管理与临时令牌签发。

## 核心原则（必须遵守）

1. **密钥不过对话**：添加/更新凭据时，敏感字段一律用 `env:VAR_NAME` 间接引用（服务进程启动前用户已导出该环境变量）。绝不让用户把真实密钥粘贴进对话，绝不把密钥写进代码、配置或日志。
2. **purpose 必填**：每次 `get_token` / `reveal_secret` 都必须带上描述本次用途的 `purpose`（如"拉取订单服务监控指标"）。这是使用统计与审计的基石，缺少 purpose 的调用会被拒绝。
3. **令牌优先**：需要访问外部系统时优先 `get_token` 获取临时令牌；`reveal_secret`（读原始密钥）默认禁用，仅在用户明确要求且已开启 allowReveal 时使用。
4. **用后即弃**：临时令牌只在当前任务的请求头里使用，不落盘、不提交、不回显到无关输出。

## 工作流

**添加凭据**（用户说"帮我保存 xx 系统的密码/密钥"）：
```
add_credential({
  name: "orders-prod",
  system: "订单服务",
  authType: "basic" | "api-key" | "oauth-password" | "oauth-client-credentials" | "custom",
  fields: { username: "env:ORDERS_USER", password: "env:ORDERS_PASS" },
  endpoints: {
    verify: { url: "https://api.example.com/whoami" },
    token:  { url: "https://sso.example.com/oauth/token" }   // 可选
  },
  description: "生产订单服务只读账号"
})
```
添加后调用 `verify_login({name})` 确认有效。若环境变量未设置，工具会报错并列出变量名——把变量名告诉用户让其导出后重试，不要改为索取明文。

**代表用户访问系统**：
1. `get_token({ name, purpose: "<本任务用途>" })` → 得到令牌值与携带方式（如 `Authorization: Bearer <token>`）。
2. 用该令牌发起实际请求（curl/fetch 等）。
3. 凭据疑似失效时 `verify_login` 复查，必要时 `get_token({ refresh: true })` 强制重签。

**查看使用情况**（用户问"密钥被用了多少次/用来干什么/哪个会话用的"）：
`usage_stats({ sinceDays: 7 })` 返回按凭据、按用途、按会话、按天的统计与最近失败记录，向用户转述即可。

**图形管理界面**（用户想用页面管理凭据/看图表）：
调用 `open_admin`，把返回的带令牌地址（形如 `http://127.0.0.1:18765/?t=…`）完整给用户在浏览器打开；不要截短或去掉令牌。

## 安全红线

- verify/token 端点只配公网 http/https 地址：环回、内网、保留网段会被服务端拒绝（防 SSRF）；用户确有内网系统时提示其在插件设置开启 allowPrivateEndpoints。
- 不在 list/stats 输出中寻找密钥明文（那里本来就没有）。
- 令牌/密钥值不写入任何文件、git 提交、错误上报。
- 用户要求删除凭据时先用 `list_credentials` 确认名称再 `delete_credential`。
- `usage_stats` 里出现连续失败记录时主动提醒用户轮换凭据。
