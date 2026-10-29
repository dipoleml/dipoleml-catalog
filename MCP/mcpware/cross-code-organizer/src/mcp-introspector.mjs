/**
 * mcp-introspector.mjs — Connect to MCP servers and retrieve tool definitions.
 *
 * Implements a minimal JSON-RPC 2.0 client over stdio to call:
 *   1. initialize (handshake)
 *   2. tools/list (get tool names, descriptions, schemas)
 *
 * Based on AgentSeal's approach: no MCP SDK dependency, ~200 lines.
 * Pure data module. No HTTP, no UI, no side effects.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const TIMEOUT_MS = 15_000;
const MAX_TOOLS = 500;
const MAX_DESC_BYTES = 50 * 1024;

// ── JSON-RPC helpers ─────────────────────────────────────────────────

let rpcId = 0;

function jsonRpcRequest(method, params = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params });
}

// ── Stdio MCP client ─────────────────────────────────────────────────

/**
 * Connect to a stdio MCP server, perform handshake, and list tools.
 * Returns { ok, tools, error, serverInfo }.
 *
 * @param {object} config - MCP server config with command, args, env
 * @param {string} serverName - Display name for error messages
 */
async function introspectStdioServer(config, serverName) {
  const { command, args = [], env = {} } = config;
  if (!command) return { ok: false, tools: [], error: "No command specified" };

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, tools: [], error: `Timeout after ${TIMEOUT_MS / 1000}s` });
    }, TIMEOUT_MS);

    let buffer = "";
    let initialized = false;
    let resolved = false;

    function done(result) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { child.kill("SIGTERM"); } catch {}
      resolve(result);
    }

    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
      timeout: TIMEOUT_MS,
    });

    child.on("error", (err) => {
      done({ ok: false, tools: [], error: `Spawn failed: ${err.message}` });
    });

    child.on("exit", (code) => {
      if (!resolved) {
        done({ ok: false, tools: [], error: `Process exited with code ${code}` });
      }
    });

    child.stderr.on("data", () => {
      // Ignore stderr — many servers log here
    });

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();

      // Process newline-delimited JSON-RPC messages
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;

        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue; // Skip non-JSON lines (e.g. log output)
        }

        if (!initialized && msg.result) {
          // Initialize response received — now request tools
          initialized = true;
          const toolsReq = jsonRpcRequest("tools/list", {});
          child.stdin.write(toolsReq + "\n");
        } else if (initialized && msg.result) {
          // tools/list response
          const tools = (msg.result.tools || []).slice(0, MAX_TOOLS).map((t) => ({
            name: t.name || "",
            description: (t.description || "").slice(0, MAX_DESC_BYTES),
            inputSchema: t.inputSchema || {},
          }));
          done({ ok: true, tools, serverInfo: msg.result });
        } else if (msg.error) {
          done({ ok: false, tools: [], error: `RPC error: ${msg.error.message || JSON.stringify(msg.error)}` });
        }
      }
    });

    // Send initialize request
    const initReq = jsonRpcRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "cco-security-scanner", version: "1.0.0" },
    });
    child.stdin.write(initReq + "\n");
  });
}

// ── HTTP/SSE MCP client ──────────────────────────────────────────────

/**
 * Connect to an HTTP/SSE MCP server and list tools.
 * Tries streamable HTTP first, then SSE fallback.
 */
async function introspectHttpServer(config, serverName) {
  const url = config.url;
  if (!url) return { ok: false, tools: [], error: "No URL specified" };

  const headers = {
    "Content-Type": "application/json",
    ...(config.headers || {}),
  };

  // Try streamable HTTP POST
  const endpoints = [url, `${url}/mcp`];
  for (const endpoint of endpoints) {
    try {
      // Initialize
      const initResp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: jsonRpcRequest("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "cco-security-scanner", version: "1.0.0" },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!initResp.ok) continue;
      const initData = await initResp.json();
      if (!initData.result) continue;

      // Get session header if provided
      const sessionId = initResp.headers.get("mcp-session-id");
      const toolHeaders = { ...headers };
      if (sessionId) toolHeaders["mcp-session-id"] = sessionId;

      // List tools
      const toolsResp = await fetch(endpoint, {
        method: "POST",
        headers: toolHeaders,
        body: jsonRpcRequest("tools/list", {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!toolsResp.ok) continue;
      const toolsData = await toolsResp.json();
      const tools = (toolsData.result?.tools || []).slice(0, MAX_TOOLS).map((t) => ({
        name: t.name || "",
        description: (t.description || "").slice(0, MAX_DESC_BYTES),
        inputSchema: t.inputSchema || {},
      }));

      return { ok: true, tools, serverInfo: toolsData.result };
    } catch {
      continue;
    }
  }

  return { ok: false, tools: [], error: "Could not connect via HTTP" };
}

// ── Hash tools for baseline comparison ───────────────────────────────

/**
 * Compute SHA256 hash of a tool definition for rug-pull detection.
 */
function hashTool(tool) {
  const data = JSON.stringify({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  });
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Hash all tools from a server into a fingerprint object.
 */
function hashServerTools(tools) {
  const hashes = {};
  for (const tool of tools) {
    hashes[tool.name] = hashTool(tool);
  }
  return hashes;
}

// ── Main introspection function ──────────────────────────────────────

/**
 * Introspect all MCP servers from scan data.
 *
 * @param {Array} mcpItems - MCP items from scanner.mjs (with mcpConfig)
 * @param {function} onProgress - Optional callback: ({ serverName, status, toolCount })
 * @returns {Array} - Enriched items with tool definitions
 */
export async function introspectServers(mcpItems, onProgress) {
  const results = [];

  // Deduplicate by server name (same server can appear in multiple config files)
  const seen = new Set();
  const uniqueItems = [];
  for (const item of mcpItems) {
    const key = `${item.name}::${item.mcpConfig?.command || item.mcpConfig?.url || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  // Introspect in parallel (max 5 concurrent)
  const CONCURRENCY = 5;
  for (let i = 0; i < uniqueItems.length; i += CONCURRENCY) {
    const batch = uniqueItems.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (item) => {
      const config = item.mcpConfig || {};
      const name = item.name;

      if (onProgress) onProgress({ serverName: name, status: "connecting" });

      let result;
      if (config.command) {
        result = await introspectStdioServer(config, name);
      } else if (config.url) {
        result = await introspectHttpServer(config, name);
      } else {
        result = { ok: false, tools: [], error: "No command or URL in config" };
      }

      if (onProgress) {
        onProgress({
          serverName: name,
          status: result.ok ? "done" : "error",
          toolCount: result.tools.length,
          error: result.error,
        });
      }

      return {
        serverName: name,
        scopeId: item.scopeId,
        config,
        configPath: item.path,
        ...result,
        toolHashes: result.ok ? hashServerTools(result.tools) : {},
      };
    });

    results.push(...(await Promise.all(promises)));
  }

  return results;
}

export { hashTool, hashServerTools };
