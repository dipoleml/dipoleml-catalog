/**
 * press 命令 - 发送键盘按键
 * 用法：bb-browser press <key>
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface PressOptions {
  json?: boolean;
  tabId?: string | number;
}

function parseKey(keyString: string): { key: string; modifiers: string[] } {
  const parts = keyString.split("+");
  const modifierNames = ["Control", "Alt", "Shift", "Meta"];
  const modifiers: string[] = [];
  let key = "";
  for (const part of parts) {
    if (modifierNames.includes(part)) {
      modifiers.push(part);
    } else {
      key = part;
    }
  }
  return { key, modifiers };
}

export async function pressCommand(
  keyString: string,
  options: PressOptions = {}
): Promise<void> {
  if (!keyString) throw new Error("缺少 key 参数");

  await ensureDaemonRunning();

  const { key, modifiers } = parseKey(keyString);
  if (!key) throw new Error("无效的按键格式");

  const request: Request = {
    method: "press",
    key,
    modifiers,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const displayKey = modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
      console.log(`已按下: ${displayKey}`);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
