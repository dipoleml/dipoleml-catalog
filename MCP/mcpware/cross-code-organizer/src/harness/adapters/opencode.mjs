/**
 * OpenCode harness adapter.
 *
 * Inventory-only by design: OpenCode merges several config layers and loads
 * compatibility skill roots, so CCO exposes those sources without guessing at
 * mutation semantics. Markdown sources remain editable in the detail panel.
 */

import { readdir } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { exists, formatSize, parseFrontmatter, safeReadFile, safeStat } from "../fs-utils.mjs";

function category(id, label, icon, order, source, preview = "file content") {
  return {
    id, label, filterLabel: label, icon, order, group: id, source, preview,
    movable: false, deletable: false, participatesInEffective: false,
    effectiveRule: "", sortDefault: "name",
  };
}

const categories = [
  category("config", "Config", "⚙️", 10, "opencode.json/jsonc and .opencode/opencode.json", "JSON/JSONC"),
  category("instruction", "Instructions", "📘", 20, "AGENTS.md and configured instruction files", "Markdown"),
  category("agent", "Agents", "🤖", 30, ".opencode/agents and ~/.config/opencode/agents", "Markdown"),
  category("command", "Commands", "⌨️", 40, ".opencode/commands and ~/.config/opencode/commands", "Markdown"),
  category("skill", "Skills", "⚡", 50, "OpenCode, Claude-compatible, and agent-compatible skill roots", "SKILL.md"),
  category("mcp", "MCP Servers", "🔌", 60, "mcp entries in OpenCode config", "MCP config entry"),
  category("plugin", "Plugins", "🧩", 70, "plugin config entries and plugin directories", "Plugin source"),
  category("tool", "Tools", "🛠️", 80, ".opencode/tools and ~/.config/opencode/tools"),
  category("theme", "Themes", "🎨", 90, ".opencode/themes and ~/.config/opencode/themes"),
];

const scopeTypes = [
  { id: "global", label: "Global", icon: "🌐", isGlobal: true },
  { id: "project", label: "Project", icon: "📂", isGlobal: false },
];

const capabilities = {
  contextBudget: false,
  mcpControls: false,
  mcpPolicy: false,
  mcpSecurity: true,
  sessions: false,
  sessionDistill: false,
  effective: false,
  backup: true,
};

function configDir(ctx) {
  return ctx.env.XDG_CONFIG_HOME
    ? join(ctx.env.XDG_CONFIG_HOME, "opencode")
    : join(ctx.home, ".config", "opencode");
}

function scopeId(path) {
  return `project:${Buffer.from(path, "utf-8").toString("base64url")}`;
}

function statFields(stat) {
  return {
    size: stat ? formatSize(stat.size) : "0B",
    sizeBytes: stat ? stat.size : 0,
    mtime: stat ? stat.mtime.toISOString().slice(0, 16) : "",
    ctime: stat ? stat.birthtime.toISOString().slice(0, 16) : "",
  };
}

function markdownDescription(content) {
  if (!content) return "";
  const fm = parseFrontmatter(content);
  if (fm.description) return fm.description;
  return content.split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith("#") && !line.startsWith("---") && !/^\w+:/.test(line))
    ?.slice(0, 120) || "";
}

function stripJsonComments(content) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];
    if (lineComment) {
      if (char === "\n") { lineComment = false; output += char; }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; i++; }
      else if (char === "\n") output += char;
      continue;
    }
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") { inString = true; quote = char; output += char; continue; }
    if (char === "/" && next === "/") { lineComment = true; i++; continue; }
    if (char === "/" && next === "*") { blockComment = true; i++; continue; }
    output += char;
  }
  let normalized = "";
  inString = false;
  escaped = false;
  quote = "";
  for (let i = 0; i < output.length; i++) {
    const char = output[i];
    if (inString) {
      normalized += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      normalized += char;
      continue;
    }
    if (char === ",") {
      let nextIndex = i + 1;
      while (/\s/.test(output[nextIndex] || "")) nextIndex++;
      if (["}", "]"].includes(output[nextIndex])) continue;
    }
    normalized += char;
  }
  return normalized;
}

async function readConfig(path) {
  const content = await safeReadFile(path);
  const stat = await safeStat(path);
  if (!content) return { path, content: null, stat, value: null, error: null };
  try {
    return { path, content, stat, value: JSON.parse(stripJsonComments(content)), error: null };
  } catch (error) {
    return { path, content, stat, value: null, error };
  }
}

async function firstExisting(paths) {
  for (const path of paths) if (await exists(path)) return path;
  return null;
}

async function findProjectRoot(start) {
  let current = resolve(start);
  while (true) {
    if (await exists(join(current, ".git"))) return current;
    const parent = resolve(current, "..");
    if (parent === current) return resolve(start);
    current = parent;
  }
}

function ancestorDirs(root, cwd) {
  const result = [];
  let current = resolve(cwd);
  while (true) {
    result.unshift(current);
    if (current === root) break;
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return result;
}

async function hasProjectConfig(dir) {
  for (const path of [
    join(dir, "opencode.json"),
    join(dir, "opencode.jsonc"),
    join(dir, ".opencode", "opencode.json"),
    join(dir, ".opencode", "opencode.jsonc"),
    join(dir, ".opencode"),
    join(dir, "AGENTS.md"),
  ]) if (await exists(path)) return true;
  return false;
}

async function discoverScopes(ctx) {
  const globalDir = configDir(ctx);
  const scopes = [{
    id: "global", name: "Global", type: "global", tag: "applies everywhere",
    parentId: null, repoDir: null, configDir: globalDir,
  }];
  const root = await findProjectRoot(ctx.cwd);
  let parentId = "global";
  for (const dir of ancestorDirs(root, ctx.cwd)) {
    if (dir === ctx.home || !await hasProjectConfig(dir)) continue;
    const id = scopeId(dir);
    scopes.push({
      id, name: basename(dir) || dir, type: "project", tag: dir === ctx.cwd ? "current" : "ancestor",
      parentId, repoDir: dir, configDir: join(dir, ".opencode"), isCurrent: dir === ctx.cwd,
    });
    parentId = id;
  }
  return scopes;
}

async function scopeConfig(scope, ctx) {
  const base = scope.id === "global" ? configDir(ctx) : scope.repoDir;
  const candidates = scope.id === "global"
    ? [join(base, "opencode.json"), join(base, "opencode.jsonc")]
    : [
      join(base, "opencode.json"), join(base, "opencode.jsonc"),
      join(base, ".opencode", "opencode.json"), join(base, ".opencode", "opencode.jsonc"),
    ];
  const path = await firstExisting(candidates);
  return path ? readConfig(path) : { path: candidates[0], content: null, stat: null, value: null, error: null };
}

async function scanConfig(scope, ctx) {
  const config = await scopeConfig(scope, ctx);
  if (!config.content) return [];
  return [{
    category: "config", scopeId: scope.id, name: basename(config.path), fileName: basename(config.path),
    description: config.error ? `JSONC parse error: ${config.error.message}` : "OpenCode configuration",
    subType: scope.id === "global" ? "global-config" : "project-config", ...statFields(config.stat),
    path: config.path, value: config.value, valueType: extname(config.path).slice(1), locked: true,
  }];
}

async function walkFiles(root, predicate, depth = 0) {
  if (depth > 8 || !await exists(root)) return [];
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(path, predicate, depth + 1));
    else if (entry.isFile() && predicate(path, entry.name)) files.push(path);
  }
  return files;
}

async function markdownItem(categoryId, scope, path, root, subType = categoryId) {
  const content = await safeReadFile(path);
  const stat = await safeStat(path);
  const rel = relative(root, path);
  const fm = parseFrontmatter(content);
  return {
    category: categoryId, scopeId: scope.id, name: fm.name || rel.replace(/\.md$/i, ""), fileName: rel,
    description: fm.description || markdownDescription(content), subType, ...statFields(stat),
    path, locked: true, editable: true,
  };
}

function contentRoots(scope, ctx, singular, plural = `${singular}s`) {
  const base = scope.id === "global" ? configDir(ctx) : join(scope.repoDir, ".opencode");
  return [join(base, singular), join(base, plural)];
}

async function scanMarkdownDirs(categoryId, scope, ctx, singular) {
  const items = [];
  for (const root of contentRoots(scope, ctx, singular)) {
    for (const path of await walkFiles(root, (_path, name) => name.endsWith(".md"))) {
      items.push(await markdownItem(categoryId, scope, path, root));
    }
  }
  return items;
}

async function scanInstructions(scope, ctx) {
  const items = [];
  const agentsPath = scope.id === "global" ? join(configDir(ctx), "AGENTS.md") : join(scope.repoDir, "AGENTS.md");
  if (await exists(agentsPath)) items.push(await markdownItem("instruction", scope, agentsPath, resolve(agentsPath, ".."), "agents-md"));

  const config = await scopeConfig(scope, ctx);
  for (const configured of config.value?.instructions || []) {
    if (typeof configured !== "string" || /^https?:\/\//.test(configured) || /[*?{}]/.test(configured)) continue;
    const path = resolve(config.path, "..", configured.replace(/^~\//, `${ctx.home}/`));
    if (await exists(path)) items.push(await markdownItem("instruction", scope, path, resolve(config.path, ".."), "configured-instruction"));
  }
  return items;
}

async function scanSkills(scope, ctx) {
  const roots = scope.id === "global"
    ? [
      ...contentRoots(scope, ctx, "skill"),
      join(ctx.home, ".claude", "skills"),
      join(ctx.home, ".agents", "skills"),
    ]
    : [
      ...contentRoots(scope, ctx, "skill"),
      join(scope.repoDir, ".claude", "skills"),
      join(scope.repoDir, ".agents", "skills"),
    ];
  const items = [];
  const seen = new Set();
  for (const root of roots) {
    for (const path of await walkFiles(root, (_path, name) => name === "SKILL.md")) {
      if (seen.has(path)) continue;
      seen.add(path);
      const item = await markdownItem("skill", scope, path, root, "skill");
      item.name = parseFrontmatter(await safeReadFile(path)).name || basename(resolve(path, ".."));
      item.openPath = path;
      item.path = resolve(path, "..");
      items.push(item);
    }
  }
  return items;
}

async function scanMcp(scope, ctx) {
  const config = await scopeConfig(scope, ctx);
  const items = [];
  for (const [name, value] of Object.entries(config.value?.mcp || {})) {
    items.push({
      category: "mcp", scopeId: scope.id, name, fileName: basename(config.path),
      description: value?.command || value?.url || value?.type || "OpenCode MCP server",
      subType: value?.type || (value?.url ? "remote" : "local"), ...statFields(config.stat),
      path: config.path, mcpConfig: value, value, valueType: "json", locked: true,
    });
  }
  return items;
}

async function scanPlugins(scope, ctx) {
  const config = await scopeConfig(scope, ctx);
  const items = [];
  for (const value of config.value?.plugin || []) {
    if (typeof value !== "string") continue;
    items.push({
      category: "plugin", scopeId: scope.id, name: value, fileName: basename(config.path),
      description: "npm plugin", subType: "npm-plugin", ...statFields(config.stat),
      path: config.path, value, valueType: "string", locked: true,
    });
  }
  for (const root of contentRoots(scope, ctx, "plugin")) {
    for (const path of await walkFiles(root, (_path, name) => /\.(js|mjs|cjs|ts)$/i.test(name))) {
      const stat = await safeStat(path);
      items.push({
        category: "plugin", scopeId: scope.id, name: relative(root, path), fileName: relative(root, path),
        description: "Local OpenCode plugin", subType: "local-plugin", ...statFields(stat),
        path, locked: true,
      });
    }
  }
  return items;
}

async function scanSourceFiles(categoryId, scope, ctx) {
  const items = [];
  for (const root of contentRoots(scope, ctx, categoryId)) {
    for (const path of await walkFiles(root, () => true)) {
      const stat = await safeStat(path);
      items.push({
        category: categoryId, scopeId: scope.id, name: relative(root, path), fileName: relative(root, path),
        description: `OpenCode ${categoryId}`, subType: categoryId, ...statFields(stat), path, locked: true,
      });
    }
  }
  return items;
}

const unsupportedOperations = {
  getValidDestinations() { return []; },
  async moveItem() { return { ok: false, error: "OpenCode inventory is read-only" }; },
  async deleteItem() { return { ok: false, error: "OpenCode inventory is read-only" }; },
};

const noEffectiveModel = {
  rules: [], includeGlobalCategories: [], shadowByName: false,
  conflictByName: false, ancestorCategories: [],
};

export const opencodeAdapter = {
  id: "opencode",
  displayName: "OpenCode",
  shortName: "OpenCode",
  icon: "◉",
  executable: "opencode",
  categories,
  scopeTypes,
  capabilities,
  getPaths(ctx) {
    const rootDir = configDir(ctx);
    return { rootDir, backupDir: join(ctx.home, ".opencode-backups"), safeRoots: [rootDir] };
  },
  discoverScopes,
  scanners: {
    config: scanConfig,
    instruction: scanInstructions,
    agent: (scope, ctx) => scanMarkdownDirs("agent", scope, ctx, "agent"),
    command: (scope, ctx) => scanMarkdownDirs("command", scope, ctx, "command"),
    skill: scanSkills,
    mcp: scanMcp,
    plugin: scanPlugins,
    tool: (scope, ctx) => scanSourceFiles("tool", scope, ctx),
    theme: (scope, ctx) => scanSourceFiles("theme", scope, ctx),
  },
  afterScan() { return { effective: noEffectiveModel }; },
  effective: noEffectiveModel,
  operations: unsupportedOperations,
};

export default opencodeAdapter;
