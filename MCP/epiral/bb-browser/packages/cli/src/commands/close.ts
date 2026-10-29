/**
 * close 命令 - 关闭标签页
 * 用法：bb-browser close --tab <tabId>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface CloseOptions {
  json?: boolean;
  tabId?: string | number;
}

export async function closeCommand(options: CloseOptions = {}): Promise<void> {
  await ensureDaemonRunning();

  const request: Request = {
    method: "close",
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const title = response.result?.title ?? "";
      if (title) {
        console.log(`已关闭: "${title}"`);
      } else {
        console.log("已关闭标签页");
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
