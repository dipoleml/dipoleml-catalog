/**
 * DeepSeek Harness (DSH) adapter.
 *
 * Scans the DSH home configuration directory (~/.dsh) that controls the
 * harness: per-profile cordis.yml/cordis.patch.yml entry points, the global
 * settings.yaml, and user skills.
 *
 * DSH (https://github.com/deepseek-ai/deepseek-harness) stores its config under
 * the home dir: profiles/<name>/cordis.yml (the entry list), cordis.patch.yml
 * (user overlay), settings.yaml, and skills/. The adapter surfaces the parts
 * CCO can inspect and manage consistently with the Claude/Codex adapters.
 */

import { readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import {
  exists,
  formatSize,
  safeReadFile,
  safeStat,
} from "../fs-utils.mjs";

function expandHome(value, home) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (value === "~") return home;
  if (value.startsWith("~/") || value.startsWith("~\\")) return join(home, value.slice(2));
  return resolve(value);
}

// DSH honors DSH_HOME and otherwise defaults to ~/.dsh.
function dshDir(ctx) {
  return expandHome(ctx.env.DSH_HOME, ctx.home) || join(ctx.home, ".dsh");
}

function agentsDir(ctx) {
  return expandHome(ctx.env.DSH_AGENTS_HOME, ctx.home) || join(ctx.home, ".agents");
}

async function findProjectRoot(start) {
  let current = resolve(start);
  while (true) {
    if (await exists(join(current, ".git"))) return current;
    const parent = resolve(current, "..");
    // DSH deliberately treats the session cwd as its project root when no
    // ancestor contains .git; mirror that upstream discovery contract.
    if (parent === current) return resolve(start);
    current = parent;
  }
}

function projectScopeId(path) {
  return `project:${Buffer.from(path, "utf-8").toString("base64url")}`;
}

function timestampFields(stat) {
  return {
    mtime: stat ? stat.mtime.toISOString().slice(0, 16) : "",
    ctime: stat ? stat.birthtime.toISOString().slice(0, 16) : "",
  };
}

function statFields(stat) {
  return {
    size: stat ? formatSize(stat.size) : "0B",
    sizeBytes: stat ? stat.size : 0,
    ...timestampFields(stat),
  };
}

function defineCategory({ id, label, filterLabel, icon, order, group, source, preview, movable = false, deletable = false, sortDefault = "name" }) {
  return {
    id,
    label,
    filterLabel,
    icon,
    order,
    group,
    source,
    preview,
    movable,
    deletable,
    participatesInEffective: false,
    effectiveRule: "",
    sortDefault,
  };
}

const categories = [
  defineCategory({
    id: "config",
    label: "Config",
    filterLabel: "Config",
    icon: "⚙️",
    order: 10,
    group: "config",
    source: "$DSH_HOME/settings.yaml and $DSH_HOME/profiles/<name>/ profile config",
    preview: "config file",
  }),
  defineCategory({
    id: "profile",
    label: "Profiles",
    filterLabel: "Profiles",
    icon: "👤",
    order: 20,
    group: "profile",
    source: "$DSH_HOME/profiles/<name>/",
    preview: "profile directory",
  }),
  defineCategory({
    id: "skill",
    label: "Skills",
    filterLabel: "Skills",
    icon: "⚡",
    order: 30,
    group: "skill",
    source: "$DSH_HOME/skills, ~/.agents/skills, and project skill roots",
    preview: "SKILL.md",
    deletable: true,
  }),
];

const scopeTypes = [
  { id: "global", label: "Global", icon: "🌐", isGlobal: true },
  { id: "project", label: "Project", icon: "📂", isGlobal: false },
];

const capabilities = {
  contextBudget: false,
  mcpControls: false,
  mcpPolicy: false,
  mcpSecurity: false,
  sessions: false,
  sessionDistill: false,
  effective: false,
  backup: true,
};

const DSH_PROMPTS = {
  actions: {
    common: {
      unlockedInfo: {
        ico: "●",
        label: "",
        prompt: null,
        info: "Use these prompts for guided changes - DSH will inspect the file, explain impact, and confirm before editing.",
      },
      explain: {
        ico: "📋",
        label: "Explain This",
        prompt: "I have a DSH {{category}} called \"{{name}}\" at:\n{{path}}\n\nPlease inspect it and explain:\n1. What does this {{category}} do?\n2. How does DeepSeek Harness load or use it?\n3. What would break if I removed or changed it?\n4. Are there related config files that reference it?",
      },
    },
    categories: {
      config: [
        { use: "common.explain" },
        {
          ico: "✏️",
          label: "Edit Config",
          prompt: "I want to modify this DeepSeek Harness config item: \"{{name}}\"\nPath: {{path}}\n\nBefore changing:\n1. Read the current YAML/JSON content\n2. Explain the current setting or plugin entry\n3. Ask what I want to change\n4. Show the exact before/after diff\n5. Warn if this affects an agent preset, model route, or the profile entry list\n6. Only save after I confirm",
        },
      ],
      profile: [
        { use: "common.explain" },
        {
          ico: "🗑️",
          label: "Remove",
          prompt: "I want to remove this DeepSeek Harness profile: \"{{name}}\"\nPath: {{path}}\n\nBefore removing:\n1. Read its package.json and cordis.yml\n2. Explain what plugins/agents this profile provides\n3. Check whether active sessions reference it\n4. Tell me what will stop working\n5. Only remove after I explicitly confirm",
        },
      ],
      skill: [
        { use: "common.explain" },
        {
          ico: "✏️",
          label: "Edit Skill",
          prompt: "I want to edit this DeepSeek Harness skill: \"{{name}}\"\nPath: {{path}}\n\nBefore editing:\n1. Read SKILL.md and related files in this skill directory\n2. Explain what this skill instructs the agent to do\n3. Ask what I want to change\n4. Show the before/after diff\n5. Only save after I confirm",
        },
      ],
      session: [{ use: "common.explain" }],
    },
  },
};

function markdownDescription(content) {
  if (!content) return "";
  const lines = content.split("\n");
  let pastHeading = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) { pastHeading = true; continue; }
    if (!pastHeading && trimmed.startsWith("---")) continue;
    if (!trimmed || trimmed.startsWith("```") || trimmed.startsWith("-") || trimmed.startsWith("|")) continue;
    if (trimmed.match(/^\w+:\s/)) continue;
    if (trimmed.startsWith("#")) continue;
    return trimmed.slice(0, 120);
  }
  return "";
}

async function configFileItem({ scopeId, name, path, desc, subType, locked = false, sourceFile }) {
  const stat = await safeStat(path);
  if (!stat) return null;
  const content = await safeReadFile(path);
  return {
    category: "config",
    scopeId,
    name,
    fileName: basename(path),
    description: markdownDescription(content) || desc,
    subType,
    ...statFields(stat),
    path,
    locked,
    sourceFile,
  };
}

async function firstExisting(paths) {
  for (const path of paths) if (await exists(path)) return path;
  return null;
}

async function scanConfig(scope, ctx) {
  const items = [];
  if (scope.type !== "global") return items;
  const root = dshDir(ctx);

  // Global settings.yaml.
  const settingsPath = join(root, "settings.yaml");
  const settingsItem = await configFileItem({
    scopeId: scope.id,
    name: "settings.yaml",
    path: settingsPath,
    desc: "DeepSeek Harness global settings",
    subType: "settings",
    locked: true,
    sourceFile: "$DSH_HOME/settings.yaml",
  });
  if (settingsItem) items.push(settingsItem);

  // Per-profile entry lists (cordis.yml + cordis.patch.yml).
  const profilesDir = join(root, "profiles");
  if (await exists(profilesDir)) {
    const names = await readdir(profilesDir).catch(() => []);
    for (const name of names) {
      const profileDir = join(profilesDir, name);
      const stat = await safeStat(profileDir);
      if (!stat || !stat.isDirectory()) continue;
      for (const fileName of ["cordis.yml", "cordis.patch.yml"]) {
        const p = join(profileDir, fileName);
        const item = await configFileItem({
          scopeId: scope.id,
          name: `${name}/${fileName}`,
          path: p,
          desc: `DeepSeek Harness profile entry list (${name})`,
          subType: "cordis",
          locked: true,
          sourceFile: `$DSH_HOME/profiles/${name}/${fileName}`,
        });
        if (item) items.push(item);
      }
    }
  }

  return items;
}

async function scanProfiles(scope, ctx) {
  const items = [];
  if (scope.type !== "global") return items;
  const root = join(dshDir(ctx), "profiles");
  if (!(await exists(root))) return items;

  const names = await readdir(root).catch(() => []);
  const INTERNAL_DIRS = new Set(["node_modules", ".git", ".dsh-mem.db", ".turbo"]);
  for (const name of names) {
    if (INTERNAL_DIRS.has(name)) continue;
    const profileDir = join(root, name);
    const stat = await safeStat(profileDir);
    if (!stat || !stat.isDirectory()) continue;

    const pkgPath = join(profileDir, "package.json");
    let description = `DeepSeek Harness profile (${name})`;
    let pkgValue;
    if (await exists(pkgPath)) {
      const pkgContent = await safeReadFile(pkgPath);
      try {
        pkgValue = JSON.parse(pkgContent);
        if (pkgValue?.description) description = pkgValue.description;
      } catch { /* not JSON */ }
    }

    const summary = statFields(stat);
    const openPath = await firstExisting([
      join(profileDir, "cordis.patch.yml"),
      pkgPath,
      join(profileDir, "cordis.yml"),
    ]);
    items.push({
      category: "profile",
      scopeId: scope.id,
      name,
      fileName: name,
      description,
      subType: "profile",
      ...summary,
      path: profileDir,
      openPath: openPath || profileDir,
      locked: true,
      value: pkgValue,
      valueType: pkgValue ? "json" : "directory",
      sourceFile: `$DSH_HOME/profiles/${name}`,
    });
  }

  return items;
}

async function scanSkills(scope, ctx) {
  const items = [];
  const roots = scope.type === "global"
    ? [
        { root: join(dshDir(ctx), "skills"), sourceFile: "$DSH_HOME/skills", skipSystem: true },
        { root: join(agentsDir(ctx), "skills"), sourceFile: "$DSH_AGENTS_HOME/skills" },
      ]
    : [
        { root: join(scope.repoDir, ".dsh", "skills"), sourceFile: "<project>/.dsh/skills" },
        { root: join(scope.repoDir, ".agents", "skills"), sourceFile: "<project>/.agents/skills" },
      ];

  for (const source of roots) {
    for (const entry of await findSkillEntries(source.root, { skipSystem: source.skipSystem })) {
      const content = await safeReadFile(entry.openPath);
      const summary = entry.isDirectory
        ? await directorySummary(entry.path)
        : statFields(await safeStat(entry.path));
      items.push({
        category: "skill",
        scopeId: scope.id,
        name: entry.name,
        fileName: relative(source.root, entry.path),
        description: markdownDescription(content),
        subType: entry.isDirectory ? "skill" : "flat-skill",
        ...summary,
        path: entry.path,
        openPath: entry.openPath,
        sourceFile: source.sourceFile,
      });
    }
  }

  return items;
}

async function findSkillEntries(root, { skipSystem = false } = {}) {
  const found = [];
  if (!(await exists(root))) return found;

  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return found; }

  for (const entry of entries) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    if (skipSystem && entry.name === ".system") continue;
    const entryPath = join(root, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push({
        path: entryPath,
        openPath: entryPath,
        name: relative(root, entryPath).replace(/\.md$/i, ""),
        isDirectory: false,
      });
      continue;
    }
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillMd = join(entryPath, "SKILL.md");
    if (!(await exists(skillMd))) continue;
    found.push({
      path: entryPath,
      openPath: skillMd,
      name: entry.name,
      isDirectory: true,
    });
  }

  return found;
}

async function directorySummary(dir) {
  let sizeBytes = 0;
  let fileCount = 0;
  let newest = null;
  let oldest = null;

  async function walk(current, depth = 0) {
    if (depth > 3) return;
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await safeStat(path);
      if (!stat) continue;
      fileCount += 1;
      sizeBytes += stat.size;
      newest = !newest || stat.mtime > newest ? stat.mtime : newest;
      oldest = !oldest || stat.birthtime < oldest ? stat.birthtime : oldest;
    }
  }

  await walk(dir);

  return {
    fileCount,
    size: formatSize(sizeBytes),
    sizeBytes,
    mtime: newest ? newest.toISOString().slice(0, 16) : "",
    ctime: oldest ? oldest.toISOString().slice(0, 16) : "",
  };
}

const unsupportedOperations = {
  getValidDestinations() {
    return [];
  },
  async moveItem() {
    return { ok: false, error: "DSH adapter does not support moving items yet" };
  },
  async deleteItem(item) {
    if (item.locked) {
      return { ok: false, error: `${item.name} is locked and cannot be deleted` };
    }
    if (item.category === "skill") {
      const { rm } = await import("node:fs/promises");
      await rm(item.path, { recursive: true, force: true });
      return { ok: true, deleted: item.path, message: `Deleted DSH skill "${item.name}"` };
    }
    return { ok: false, error: `DSH ${item.category} items cannot be deleted` };
  },
};

const noEffectiveModel = {
  rules: [],
  includeGlobalCategories: [],
  shadowByName: false,
  conflictByName: false,
  ancestorCategories: [],
};

const DSH_LOGOMARK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>';

/**
 * @type {import("../interface.mjs").HarnessAdapter}
 */
export const dshAdapter = {
  id: "dsh",
  displayName: "DeepSeek Harness",
  shortName: "DSH",
  icon: "●",
  iconSvg: DSH_LOGOMARK_SVG,
  executable: "dsh",
  categories,
  scopeTypes,
  capabilities,
  prompts: DSH_PROMPTS,
  getPaths(ctx) {
    const rootDir = dshDir(ctx);
    return {
      rootDir,
      backupDir: join(ctx.home, ".dsh-backups"),
      safeRoots: [rootDir, agentsDir(ctx)],
    };
  },
  async discoverScopes(ctx) {
    const projectRoot = await findProjectRoot(ctx.cwd);
    const scopes = [{
      id: "global",
      name: "Global",
      type: "global",
      tag: "applies everywhere",
      parentId: null,
      repoDir: null,
      configDir: dshDir(ctx),
    }];
    if (projectRoot !== ctx.home) {
      scopes.push({
        id: projectScopeId(projectRoot),
        name: basename(projectRoot),
        type: "project",
        tag: "current project",
        parentId: "global",
        repoDir: projectRoot,
        configDir: join(projectRoot, ".dsh"),
      });
    }
    return scopes;
  },
  scanners: {
    config: scanConfig,
    profile: scanProfiles,
    skill: scanSkills,
  },
  afterScan() {
    return { effective: noEffectiveModel };
  },
  effective: noEffectiveModel,
  operations: unsupportedOperations,
};

export const adapter = dshAdapter;
export default dshAdapter;
