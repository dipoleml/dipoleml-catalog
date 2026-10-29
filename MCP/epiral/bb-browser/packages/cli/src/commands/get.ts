/**
 * get 命令 - 获取页面或元素信息
 * 用法：
 *   bb-browser get text <ref>   获取元素文本
 *   bb-browser get url          获取当前页面 URL
 *   bb-browser get title        获取页面标题
 *   bb-browser get value <ref>  获取元素 value
 *   bb-browser get html <ref>   获取元素 HTML
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface GetOptions {
  json?: boolean;
  tabId?: string | number;
}

/** 支持的 get 属性类型 */
export type GetAttribute = "text" | "url" | "title" | "value" | "html";

function parseRef(ref: string): string {
  return ref.startsWith("@") ? ref.slice(1) : ref;
}

export async function getCommand(
  attribute: GetAttribute,
  ref: string | undefined,
  options: GetOptions = {}
): Promise<void> {
  if (attribute === "text" && !ref) {
    throw new Error("get text 需要 ref 参数，如: get text @5");
  }

  await ensureDaemonRunning();

  const request: Request = {
    method: "get",
    attribute,
    ref: ref ? parseRef(ref) : undefined,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      const value = response.result?.value ?? "";
      console.log(value);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
