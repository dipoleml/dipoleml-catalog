/**
 * tab 命令 - 标签页管理
 * 用法：
 *   bb-browser tab                    列出所有标签页
 *   bb-browser tab list               列出所有标签页
 *   bb-browser tab new [url]          新建标签页
 */

import type { Request, Response, TabInfo } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface TabOptions {
  json?: boolean;
  globalTabId?: string;
}

function parseTabSubcommand(args: string[]): {
  action: "tab_list" | "tab_new";
  url?: string;
} {
  if (args.length === 0 || args[0] === "list") {
    return { action: "tab_list" };
  }

  if (args[0] === "new") {
    return { action: "tab_new", url: args[1] };
  }

  throw new Error(`未知的 tab 子命令: ${args[0]}。支持: list, new`);
}

function formatTabList(tabs: TabInfo[], activeIndex: number): string {
  const lines: string[] = [];
  lines.push(`标签页列表（共 ${tabs.length} 个，当前 #${activeIndex}）：`);

  for (const tab of tabs) {
    const prefix = tab.active ? "*" : " ";
    const title = tab.title || "(无标题)";
    const shortId = tab.tab || "";
    lines.push(`${prefix} [${shortId}] ${tab.url} - ${title}`);
  }

  return lines.join("\n");
}

export async function tabCommand(
  args: string[],
  options: TabOptions = {}
): Promise<void> {
  await ensureDaemonRunning();

  const parsed = parseTabSubcommand(args);

  const request: Request = {
    method: parsed.action,
    url: parsed.url,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      switch (parsed.action) {
        case "tab_list": {
          const tabs = response.result?.tabs ?? [];
          const activeIndex = response.result?.activeIndex ?? 0;
          console.log(formatTabList(tabs, activeIndex));
          break;
        }
        case "tab_new": {
          const url = response.result?.url ?? "about:blank";
          console.log(`已创建新标签页: ${url}`);
          break;
        }
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
