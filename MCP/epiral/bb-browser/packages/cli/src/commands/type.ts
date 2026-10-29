/**
 * type 命令 - 在元素中逐字符输入文本（不清空原有内容）
 * 用法：bb-browser type <ref> <text>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface TypeOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function typeCommand(
  ref: string,
  text: string,
  options: TypeOptions = {}
): Promise<void> {
  if (!ref) throw new Error("缺少 ref 参数");
  if (text === undefined || text === null) throw new Error("缺少 text 参数");

  await ensureDaemonRunning();

  const request: Request = {
    method: "type",
    ref: parseRef(ref),
    text,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log(`已输入内容: "${text}"`);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
