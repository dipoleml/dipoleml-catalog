/**
 * screenshot 命令 - 截取当前页面
 */

import fs from "fs";
import path from "path";
import os from "os";
import type { Request, Response } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface ScreenshotOptions {
  json?: boolean;
  tabId?: string | number;
}

function getDefaultPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `bb-screenshot-${timestamp}.png`;
  return path.join(os.tmpdir(), filename);
}

function saveBase64Image(dataUrl: string, filePath: string): void {
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, buffer);
}

export async function screenshotCommand(
  outputPath?: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  await ensureDaemonRunning();

  const filePath = outputPath ? path.resolve(outputPath) : getDefaultPath();

  const request: Request = {
    method: "screenshot",
    tabId: options.tabId,
    includeBase64: true,
  } as Request;

  const response: Response = await sendCommand(request);

  if (response.result && (response.result?.dataUrl || response.result?.path)) {
    const dataUrl = response.result.dataUrl as string | undefined;

    if (dataUrl) {
      saveBase64Image(dataUrl, filePath);
    }

    if (options.json) {
      console.log(JSON.stringify({
        path: filePath,
        pinixPath: response.result.path,
      }, null, 2));
    } else {
      console.log(`截图已保存: ${filePath}`);
    }
  } else {
    if (options.json) {
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.error(`错误: ${response.error?.message}`);
    }
    process.exit(1);
  }
}
