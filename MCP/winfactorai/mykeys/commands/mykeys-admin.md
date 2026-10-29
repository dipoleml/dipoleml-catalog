---
description: Open the MyKeys local web admin console. / 打开 MyKeys 本地 Web 管理台（图形化添加管理凭据）。
---

这是用户明确请求打开 MyKeys 图形管理界面。调用 MyKeys MCP（服务名 `mkeys`）的 `open_admin` 工具（无参数），
它会在本机启动管理台并返回带一次性访问令牌的地址（形如 `http://127.0.0.1:18765/?t=…`，
仅本机可访问）。

把返回的**完整地址**（含令牌）原样给用户，让用户在浏览器打开；若会话里有 browser-use 能力，
也可以直接打开该地址并截图确认页面正常渲染。

不要自己读取或改写 `~/.mkeys` 下的数据文件；页面上的一切操作都会走加密保险库并留审计记录。
若工具不可用，提示用户启用 MyKeys（mkeys）插件后重试。
