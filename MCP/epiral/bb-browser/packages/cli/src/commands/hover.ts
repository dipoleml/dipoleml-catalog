/**
 * hover 命令 - 悬停在元素上
 * 用法：bb-browser hover <ref>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface HoverOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function hoverCommand(
  ref: string,
  options: HoverOptions = {}
): Promise<void> {
  if (!ref) {
    throw new Error("缺少 ref 参数");
  }

  await ensureDaemonRunning();

  const request: Request = {
    method: "hover",
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
        console.log(`已悬停: ${role} "${name}"`);
      } else {
        console.log(`已悬停: ${role}`);
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
