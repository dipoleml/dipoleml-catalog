/**
 * fill 命令 - 填充输入框
 * 用法：bb-browser fill <ref> <text>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface FillOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function fillCommand(
  ref: string,
  text: string,
  options: FillOptions = {}
): Promise<void> {
  if (!ref) throw new Error("缺少 ref 参数");
  if (text === undefined || text === null) throw new Error("缺少 text 参数");

  await ensureDaemonRunning();

  const request: Request = {
    method: "fill",
    ref: parseRef(ref),
    text,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log(`已填充内容: "${text}"`);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
