---
description: MyKeys credential usage report — how often and for what purposes AI used each credential. / 查看 MyKeys 凭据使用统计：AI 用了哪些密钥、用了几次、用来干什么、在哪个会话。
argument-hint: "[天数 days | all] [凭据名 credential]"
---

这是用户明确请求的 MyKeys 使用统计查看。调用 MyKeys MCP（服务名 `mkeys`）的 `usage_stats` 工具：
- `${ARGUMENTS}` 中的第一个纯数字参数作为 `sinceDays`（默认 7；"all"/"全部" 表示 0 即全部历史）；
- 其余非数字参数若匹配某个凭据名，作为 `credential` 过滤；
- 未提供参数时使用 `sinceDays: 7`。

将返回的统计整理为一份简明报告呈现给用户，包含：

1. 总调用/成功/失败次数，以及令牌签发、登录验证、原始密钥读取的分类计数；
2. 按凭据的使用次数与最近使用时间；
3. **按用途**（purpose）的调用排行——这是用户最关心的"AI 拿密钥干了什么"；
4. 按会话/实例的调用分布与活跃时间；
5. 按天的使用趋势；
6. 最近失败记录——若存在 401/403 或连续失败，提醒用户凭据可能已失效或被轮换，建议 `verify_login` 复查。

若该工具不可用，提示用户启用 MyKeys（mkeys）插件后重试；不要自行读取 `~/.mkeys` 下的文件，也不要调用其他 MCP 工具。统计只读，不修改任何数据。
