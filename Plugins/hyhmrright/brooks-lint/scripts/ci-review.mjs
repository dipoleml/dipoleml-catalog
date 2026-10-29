/**
 * CI entry point — runs a brooks-lint mode via Anthropic SDK.
 * Shared prompt assembly with run-evals-live.mjs (via assemble-prompt.mjs).
 *
 * Reads git diff from the project, assembles the system prompt for the mode,
 * injects the project `.brooks-lint.yaml` (see ci-config.mjs — this path has no
 * tools, so an uninjected config is an unapplied one),
 * calls Claude API, and outputs JSON { report, score, mode, scope, trend,
 * findings, previousScore, delta, truncated } to stdout. With --format sarif it
 * emits a SARIF 2.1.0 log instead (for GitHub Code Scanning); a truncated
 * report is annotated on stderr either way.
 *
 * Usage:
 *   node scripts/ci-review.mjs \
 *     --mode review \
 *     --model claude-sonnet-4-6 \
 *     --skills-dir ./skills \
 *     --project-dir /path/to/project \
 *     [--config-ref base|head] \
 *     [--format json|sarif] \
 *     [--sarif-out brooks-lint.sarif] \
 *     [--max-tokens 4096]
 *
 * Environment:
 *   ANTHROPIC_API_KEY  required
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { assembleSystemPrompt, VALID_MODES } from "./assemble-prompt.mjs";
import {
  CONFIG_REFS,
  configSizeError,
  configSystemBlock,
  customRisksBlock,
  hasCustomRisks,
  loadProjectConfig,
} from "./ci-config.mjs";
import { readHistory, getTrend } from "./history.mjs";
import { countFindings } from "./report-parse.mjs";
import { reportToSarif } from "./sarif.mjs";
import { parseArgs, parseMaxTokens, maxTokensError, warnIfTruncated } from "./cli-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = parseArgs(process.argv.slice(2));

const mode = args.mode ?? "review";
const model = args.model ?? "claude-sonnet-4-6";
const format = args.format ?? "json";
const configRef = args["config-ref"] ?? "base";
const maxTokens = parseMaxTokens(args["max-tokens"]);
const skillsDir = path.resolve(args["skills-dir"] ?? path.join(__dirname, "..", "skills"));
const projectDir = path.resolve(args["project-dir"] ?? process.cwd());
const toolVersion = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
).version;

if (!VALID_MODES.includes(mode)) {
  console.error(`Unknown mode: ${mode}. Valid modes: ${VALID_MODES.join(", ")}`);
  process.exit(1);
}

if (!["json", "sarif"].includes(format)) {
  console.error(`Unknown format: ${format}. Valid formats: json, sarif`);
  process.exit(1);
}

if (!CONFIG_REFS.includes(configRef)) {
  console.error(`Unknown config-ref: ${configRef}. Valid values: ${CONFIG_REFS.join(", ")}`);
  process.exit(1);
}

if (maxTokens === null) {
  console.error(maxTokensError(args["max-tokens"]));
  process.exit(1);
}

// ── Read git diff ─────────────────────────────────────────────────────────────

function getGitDiff(projectRoot) {
  const run = (cmd, cmdArgs) => {
    try {
      return execFileSync(cmd, cmdArgs, { cwd: projectRoot, encoding: "utf8" });
    } catch {
      return "";
    }
  };

  const staged = run("git", ["diff", "--cached"]);
  if (staged.trim()) return { diff: staged, scope: "staged changes (git diff --cached)" };

  const unstaged = run("git", ["diff"]);
  if (unstaged.trim()) return { diff: unstaged, scope: "unstaged changes (git diff)" };

  const branch = run("git", ["diff", "main...HEAD"]);
  if (branch.trim()) return { diff: branch, scope: "branch changes vs main (git diff main...HEAD)" };

  return { diff: "", scope: "no diff detected — full codebase scan" };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const client = new Anthropic();

const { diff, scope } = getGitDiff(projectDir);

// The project config goes in its own system block rather than through
// assembleSystemPrompt(): that function is shared with run-evals-live.mjs and
// stays a pure function of (mode, skillsDir), and a system block keeps policy
// out of the user message, which carries the untrusted diff.
let projectConfig;
try {
  projectConfig = loadProjectConfig({ projectDir, configRef });
} catch (err) {
  console.error(JSON.stringify({ error: err.message, mode, scope }, null, 2));
  process.exit(1);
}

if (projectConfig.content) {
  const sizeError = configSizeError(projectConfig.content);
  if (sizeError) {
    console.error(JSON.stringify({ error: sizeError, mode, scope }, null, 2));
    process.exit(1);
  }
}

const systemBlocks = [
  { type: "text", text: assembleSystemPrompt(mode, skillsDir) },
  { type: "text", text: configSystemBlock(projectConfig) },
];

// common.md makes custom-risks-guide.md a conditional read; CI has no on-demand
// read, so the condition has to be mirrored here or `Cx` codes arrive undefined.
if (projectConfig.content && hasCustomRisks(projectConfig.content)) {
  const guide = customRisksBlock(skillsDir);
  if (guide) systemBlocks.push({ type: "text", text: guide });
}

const userMessage = diff
  ? `Run brooks-lint ${mode} mode on the following diff.\n\nScope: ${scope}\n\n\`\`\`diff\n${diff}\n\`\`\``
  : `Run brooks-lint ${mode} mode on this project.\n\nScope: ${scope}`;

let message;
try {
  message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: "user", content: userMessage }],
  });
} catch (err) {
  console.error(JSON.stringify({ error: err.message, mode, scope }, null, 2));
  process.exit(1);
}

// A response that stopped at the ceiling is missing the findings it had not
// written yet, and every number below is derived from the findings that did
// arrive: countFindings() counts fewer of them and the Health Score, being
// base 100 minus deductions, comes back higher. Say so on the run before
// emitting a score a fail-below gate is about to believe.
const truncated = warnIfTruncated(message);

// The first block is not always the text one — an endpoint that returns a
// thinking block first would otherwise yield undefined.
const report = message.content.find((block) => block.type === "text")?.text ?? "";

const scoreMatch = report.match(/Health\s+Score[:\s]+(\d+)/i);
const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

const findings = countFindings(report);

const trend = getTrend(readHistory(projectDir), mode);
const previousScore = trend ? trend.lastScore : null;
const delta = trend && score !== null ? score - previousScore : null;

let trendNote;
if (!trend) {
  trendNote = "First CI run — no trend data";
} else if (score === null) {
  trendNote = "Score unavailable — cannot compute trend";
} else {
  trendNote = delta === 0
    ? `Stable at ${score} over last ${trend.runCount} runs`
    : `${previousScore} → ${score} (${delta > 0 ? "+" : ""}${delta}) over last ${trend.runCount} runs`;
}

// SARIF is needed if either the stdout format is sarif or --sarif-out is set.
const needsSarif = format === "sarif" || args["sarif-out"];
const sarif = needsSarif
  ? JSON.stringify(reportToSarif(report, { mode, toolVersion }), null, 2)
  : null;

// --sarif-out writes a SARIF file regardless of the stdout format, so the Action
// can keep emitting JSON (for the PR comment + gates) and still upload SARIF.
if (args["sarif-out"]) {
  writeFileSync(path.resolve(args["sarif-out"]), sarif + "\n");
}

if (format === "sarif") {
  console.log(sarif);
} else {
  console.log(JSON.stringify(
    { report, score, mode, scope, trend: trendNote, findings, previousScore, delta, truncated },
    null,
    2,
  ));
}
