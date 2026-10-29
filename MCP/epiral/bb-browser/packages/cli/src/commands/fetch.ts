/**
 * fetch 命令 - 在浏览器上下文中执行 fetch()
 * (DEPRECATED - use eval or site run instead)
 */

import type { Request, Response, TabInfo } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface FetchOptions {
  json?: boolean;
  method?: string;
  body?: string;
  headers?: string;
  output?: string;
  tabId?: string | number;
}

function matchTabOrigin(tabUrl: string, targetHostname: string): boolean {
  try {
    const tabHostname = new URL(tabUrl).hostname;
    return tabHostname === targetHostname || tabHostname.endsWith("." + targetHostname);
  } catch {
    return false;
  }
}

async function ensureTabForOrigin(origin: string, hostname: string): Promise<number | undefined> {
  const listReq: Request = { method: "tab_list" };
  const listResp: Response = await sendCommand(listReq);

  if (listResp.result?.tabs) {
    const matchingTab = listResp.result.tabs.find((tab: TabInfo) =>
      matchTabOrigin(tab.url, hostname)
    );
    if (matchingTab) {
      return matchingTab.tabId;
    }
  }

  const newResp: Response = await sendCommand({ method: "tab_new", url: origin } as Request);
  if (newResp.error) {
    throw new Error(`无法打开 ${origin}: ${newResp.error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return newResp.result?.tabId;
}

function buildFetchScript(url: string, options: FetchOptions): string {
  const method = (options.method || "GET").toUpperCase();
  const hasBody = options.body && method !== "GET" && method !== "HEAD";

  let headersExpr = "{}";
  if (options.headers) {
    try {
      JSON.parse(options.headers);
      headersExpr = options.headers;
    } catch {
      throw new Error(`--headers must be valid JSON. Got: ${options.headers}`);
    }
  }

  return `(async () => {
    try {
      const resp = await fetch(${JSON.stringify(url)}, {
        method: ${JSON.stringify(method)},
        credentials: 'include',
        headers: ${headersExpr}${hasBody ? `,\n        body: ${JSON.stringify(options.body)}` : ""}
      });
      const contentType = resp.headers.get('content-type') || '';
      let body;
      if (contentType.includes('application/json') && resp.status !== 204) {
        try { body = await resp.json(); } catch { body = await resp.text(); }
      } else {
        body = await resp.text();
      }
      return JSON.stringify({
        status: resp.status,
        contentType,
        body
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  })()`;
}

export async function fetchCommand(
  url: string,
  options: FetchOptions = {}
): Promise<void> {
  if (!url) {
    throw new Error(
      "缺少 URL 参数\n" +
      "  用法: bb-browser fetch <url> [--json] [--method POST] [--body '{...}']\n" +
      "  示例: bb-browser fetch https://www.reddit.com/api/me.json --json"
    );
  }

  await ensureDaemonRunning();

  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  let targetTabId = options.tabId;

  if (isAbsolute) {
    let origin: string;
    let hostname: string;
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
      hostname = parsed.hostname;
    } catch {
      throw new Error(`无效的 URL: ${url}`);
    }

    if (!targetTabId) {
      targetTabId = await ensureTabForOrigin(origin, hostname);
    }
  }

  const script = buildFetchScript(url, options);
  const evalReq: Request = { method: "eval", script, tabId: targetTabId };
  const evalResp: Response = await sendCommand(evalReq);

  if (evalResp.error) {
    throw new Error(`Fetch 失败: ${evalResp.error.message}`);
  }

  const rawResult = evalResp.result?.result;
  if (rawResult === undefined || rawResult === null) {
    throw new Error("Fetch 未返回结果");
  }

  let result: { status?: number; contentType?: string; body?: unknown; error?: string };
  try {
    result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult as typeof result;
  } catch {
    console.log(rawResult);
    return;
  }

  if (result.error) {
    throw new Error(`Fetch error: ${result.error}`);
  }

  if (options.output) {
    const { writeFileSync } = await import("node:fs");
    const content = typeof result.body === "object"
      ? JSON.stringify(result.body, null, 2)
      : String(result.body);
    writeFileSync(options.output, content, "utf-8");
    console.log(`已写入 ${options.output} (${result.status}, ${content.length} bytes)`);
    return;
  }

  if (typeof result.body === "object") {
    console.log(JSON.stringify(result.body, null, 2));
  } else {
    console.log(result.body);
  }
}
