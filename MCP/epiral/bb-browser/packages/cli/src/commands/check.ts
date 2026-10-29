/**
 * check/uncheck 命令 - 勾选/取消勾选复选框
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface CheckOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function checkCommand(ref: string, options: CheckOptions = {}): Promise<void> {
  if (!ref) throw new Error("缺少 ref 参数");
  await ensureDaemonRunning();

  const request: Request = { method: "check", ref: parseRef(ref), tabId: options.tabId };
  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log("已勾选");
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}

export async function uncheckCommand(ref: string, options: CheckOptions = {}): Promise<void> {
  if (!ref) throw new Error("缺少 ref 参数");
  await ensureDaemonRunning();

  const request: Request = { method: "uncheck", ref: parseRef(ref), tabId: options.tabId };
  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log("已取消勾选");
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
