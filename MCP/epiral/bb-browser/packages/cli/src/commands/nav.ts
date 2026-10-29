/**
 * 导航命令 - back/forward/reload
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface NavOptions {
  json?: boolean;
  tabId?: string | number;
}

export async function backCommand(options: NavOptions = {}): Promise<void> {
  await ensureDaemonRunning();

  const request: Request = {
    method: "back",
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const url = response.result?.url ?? "";
      if (url) {
        console.log(`后退至: ${url}`);
      } else {
        console.log("已后退");
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}

export async function forwardCommand(options: NavOptions = {}): Promise<void> {
  await ensureDaemonRunning();

  const request: Request = {
    method: "forward",
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const url = response.result?.url ?? "";
      if (url) {
        console.log(`前进至: ${url}`);
      } else {
        console.log("已前进");
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}

export async function reloadCommand(options: NavOptions = {}): Promise<void> {
  await ensureDaemonRunning();

  const request: Request = {
    method: "reload",
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const title = response.result?.title ?? "";
      if (title) {
        console.log(`已刷新: "${title}"`);
      } else {
        console.log("已刷新页面");
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
