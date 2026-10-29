/**
 * select 命令 - 在下拉框中选择选项
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface SelectOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function selectCommand(
  ref: string,
  value: string,
  options: SelectOptions = {}
): Promise<void> {
  if (!ref) throw new Error("缺少 ref 参数");
  if (value === undefined || value === null) throw new Error("缺少 value 参数");

  await ensureDaemonRunning();

  const request: Request = {
    method: "select",
    ref: parseRef(ref),
    value,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log(`已选择: "${value}"`);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
