/**
 * click 命令 - 点击元素
 * 用法：bb-browser click <ref>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface ClickOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function clickCommand(
  ref: string,
  options: ClickOptions = {}
): Promise<void> {
  if (!ref) {
    throw new Error("缺少 ref 参数");
  }

  await ensureDaemonRunning();

  const request: Request = {
    method: "click",
    ref: parseRef(ref),
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const role = (response.result as any)?.role ?? "element";
      const name = (response.result as any)?.name;
      if (name) {
        console.log(`已点击: ${role} "${name}"`);
      } else {
        console.log(`已点击: ${role}`);
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
