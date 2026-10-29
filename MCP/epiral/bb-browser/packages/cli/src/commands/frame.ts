/**
 * frame 命令 - 切换到 iframe 或返回主 frame
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface FrameOptions {
  json?: boolean;
  tabId?: string | number;
}

export async function frameCommand(selector: string, options: FrameOptions = {}): Promise<void> {
  if (!selector) throw new Error("缺少 selector 参数");
  await ensureDaemonRunning();

  const request: Request = { method: "frame", selector, tabId: options.tabId };
  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const frameInfo = response.result?.frameInfo;
      if (frameInfo?.url) {
        console.log(`已切换到 frame: ${selector} (${frameInfo.url})`);
      } else {
        console.log(`已切换到 frame: ${selector}`);
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}

export async function frameMainCommand(options: FrameOptions = {}): Promise<void> {
  await ensureDaemonRunning();

  const request: Request = { method: "frame_main", tabId: options.tabId };
  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log("已返回主 frame");
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
