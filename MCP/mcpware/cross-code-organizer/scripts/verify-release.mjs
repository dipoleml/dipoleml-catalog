#!/usr/bin/env node

import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(repoRoot, relativePath), "utf8"));
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const [pkg, lock, plugin, server] = await Promise.all([
  readJson("package.json"),
  readJson("package-lock.json"),
  readJson(".claude-plugin/plugin.json"),
  readJson("server.json"),
]);

const version = pkg.version;
const expectedTag = `v${version}`;
const releaseTag = process.env.CCO_RELEASE_TAG || "";
const npmServerPackage = server.packages?.find(entry => entry.registryType === "npm");

if (!SEMVER_RE.test(version || "")) {
  errors.push(`package.json version is not valid semver: ${JSON.stringify(version)}`);
}
expectEqual("package name", pkg.name, "@mcpware/cross-code-organizer");
expectEqual("package-lock top-level version", lock.version, version);
expectEqual("package-lock root version", lock.packages?.[""]?.version, version);
expectEqual("Claude plugin version", plugin.version, version);
expectEqual("MCP server version", server.version, version);
expectEqual("MCP npm identifier", npmServerPackage?.identifier, pkg.name);
expectEqual("MCP npm package version", npmServerPackage?.version, version);
if (Array.from(server.description || "").length > 100) {
  errors.push("MCP server description exceeds the registry's 100-character limit");
}
expectEqual("npm executable", pkg.bin?.["cross-code-organizer"], "bin/cli.mjs");
expectEqual("npm provenance", pkg.publishConfig?.provenance, true);
if (releaseTag) expectEqual("release tag", releaseTag, expectedTag);

const binPath = join(repoRoot, pkg.bin?.["cross-code-organizer"] || "");
try {
  await access(binPath, constants.R_OK);
  const binStat = await stat(binPath);
  if (!binStat.isFile()) errors.push("npm executable is not a regular file");
  if (process.platform !== "win32" && (binStat.mode & 0o111) === 0) {
    errors.push("npm executable is not marked executable");
  }
} catch (error) {
  errors.push(`npm executable is unavailable: ${error.message}`);
}

const notesPath = join(repoRoot, "docs", "releases", `${expectedTag}.md`);
try {
  const notes = await readFile(notesPath, "utf8");
  if (!notes.includes(`# Cross-Code Organizer ${expectedTag}`)) {
    errors.push(`release notes do not contain the ${expectedTag} heading`);
  }
} catch (error) {
  errors.push(`release notes are unavailable at docs/releases/${expectedTag}.md: ${error.message}`);
}

if (errors.length) {
  console.error(`Release verification failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Release metadata verified for ${pkg.name}@${version} (${expectedTag})`);
}
