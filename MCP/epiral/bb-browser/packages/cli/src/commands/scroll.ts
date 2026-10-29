/**
 * scroll 命令 - 滚动页面
 * 用法：bb-browser scroll <direction> [pixels]
 */

import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface ScrollOptions {
  json?: boolean;
  tabId?: string | number;
}

export type ScrollDirection = "up" | "down" | "left" | "right";

const VALID_DIRECTIONS: ScrollDirection[] = ["up", "down", "left", "right"];
const DEFAULT_PIXELS = 300;

export async function scrollCommand(
  direction: string,
  pixels?: string,
  options: ScrollOptions = {}
): Promise<void> {
  if (!direction) throw new Error("缺少 direction 参数");

  if (!VALID_DIRECTIONS.includes(direction as ScrollDirection)) {
    throw new Error(`无效的滚动方向: ${direction}，支持: ${VALID_DIRECTIONS.join(", ")}`);
  }

  let pixelValue = DEFAULT_PIXELS;
  if (pixels !== undefined) {
    pixelValue = parseInt(pixels, 10);
    if (isNaN(pixelValue) || pixelValue <= 0) {
      throw new Error(`无效的像素值: ${pixels}`);
    }
  }

  await ensureDaemonRunning();

  const request: Request = {
    method: "scroll",
    direction: direction as ScrollDirection,
    pixels: pixelValue,
    tabId: options.tabId,
  };

  const response: Response = await sendCommand(request);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    if (response.result) {
      console.log(`已滚动: ${direction} ${pixelValue}px`);
    } else {
      console.error(`错误: ${response.error?.message}`);
      process.exit(1);
    }
  }
}
