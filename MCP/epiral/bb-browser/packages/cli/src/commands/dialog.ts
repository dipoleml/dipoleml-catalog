/**
 * dialog 命令 - 处理浏览器对话框
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface DialogOptions {
  json?: boolean;
  tabId?: string | number;
}

export async function dialogCommand(
  subCommand: string,
  promptText?: string,
  options: DialogOptions = {}
): Promise<void> {
  if (!subCommand || !["accept", "dismiss"].includes(subCommand)) {
    throw new Error("请使用 'dialog accept [text]' 或 'dialog dismiss'");
  }

  await ensureDaemonRunning();

  const request: Request = {
    method: "dialog",
    dialogResponse: subCommand as "accept" | "dismiss",
    promptText: subCommand === "accept" ? promptText : undefined,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const dialogInfo = response.result?.dialogInfo;
      if (dialogInfo) {
        const action = subCommand === "accept" ? "已接受" : "已拒绝";
        console.log(`${action}对话框（${dialogInfo.type}）: "${dialogInfo.message}"`);
      } else {
        console.log("对话框已处理");
      }
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
