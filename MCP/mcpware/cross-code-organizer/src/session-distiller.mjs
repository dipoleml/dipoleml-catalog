/**
 * Session Distiller — build a smaller, independent Claude Code transcript.
 *
 * The original JSONL is snapshotted verbatim. The new transcript keeps the
 * conversation text, replaces tool protocol blocks with concise text, and
 * points large results back to the snapshot. Its conversation records are
 * re-chained with fresh UUIDs so Claude Code can actually resume the copy.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const DROP_RECORD_TYPES = new Set([
  "attachment",
  "bridge-session",
  "cost-state",
  "custom-title",
  "file-history-delta",
  "file-history-snapshot",
  "progress",
  "pr-link",
  "queue-operation",
  "system",
]);

const GRAPH_FIELDS = [
  "interruptedMessageId",
  "logicalParentUuid",
  "retractedMessageUuids",
  "refusedUserMessageUuid",
  "sourceToolAssistantUUID",
  "sourceToolUseID",
  "toolUseResult",
];

const LARGE_THRESHOLD = 1500;

function asText(value) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try { return JSON.stringify(value); } catch { return String(value); }
}

function firstNonEmptyLine(text, fallback) {
  return text.split("\n").find(line => line.trim())?.trim().slice(0, 80) || fallback;
}

function addIndexEntry(state, toolName, label, chars) {
  const id = state.indexEntries.length + 1;
  state.indexEntries.push({ id, toolName, label, origLine: state.origLine, chars });
  return id;
}

function toolHint(name, input) {
  const inp = input && typeof input === "object" ? input : {};

  if (name === "Edit") {
    const oldText = asText(inp.old_string).slice(0, 200);
    const newText = asText(inp.new_string).slice(0, 200);
    return `${asText(inp.file_path)}\n  old: ${oldText}\n  new: ${newText}`.trim();
  }
  if (name === "Write") {
    const content = asText(inp.content);
    const lines = content.split("\n");
    const preview = lines.length <= 10
      ? content.slice(0, 400)
      : [...lines.slice(0, 5), `... (${lines.length} lines)`, ...lines.slice(-3)].join("\n");
    return `${asText(inp.file_path)}\n${preview.slice(0, 500)}`.trim();
  }
  if (name === "Read") {
    let hint = asText(inp.file_path || inp.path);
    if (inp.offset !== undefined) hint += `:${inp.offset}`;
    if (inp.limit !== undefined) hint += `+${inp.limit}`;
    return hint;
  }
  if (name === "Bash") return asText(inp.command).slice(0, 250);
  if (name === "Grep") return `"${asText(inp.pattern)}" ${asText(inp.path)}`.trim();
  if (name === "Glob") return asText(inp.pattern);
  if (name === "Agent") return asText(inp.description || inp.prompt).slice(0, 250);

  return asText(
    inp.file_path || inp.path || inp.command || inp.query || inp.prompt ||
    inp.url || inp.skill || inp.selector || inp.text || inp.key || inp.description ||
    (Array.isArray(inp.todos) ? `${inp.todos.length} items` : ""),
  ).slice(0, 150);
}

function toolResultText(block) {
  if (typeof block.content === "string") return block.content;
  if (!Array.isArray(block.content)) return "";
  return block.content
    .filter(part => part?.type === "text" && typeof part.text === "string")
    .map(part => part.text)
    .join("\n");
}

function distillBlocks(content, state) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return [];

  const output = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;

    if (block.type === "text") {
      if (typeof block.text === "string" && block.text.trim()) output.push({ ...block });
      continue;
    }

    if (block.type === "thinking") {
      // Hidden reasoning is not user-visible conversation. Turning it into
      // ordinary assistant text changes its meaning, so omit it.
      continue;
    }

    if (block.type === "tool_use") {
      const name = block.name || "tool";
      if (block.id) state.toolNames.set(block.id, name);
      const hint = toolHint(name, block.input);
      output.push({ type: "text", text: hint ? `[${name}: ${hint}]` : `[${name}]` });
      continue;
    }

    if (block.type === "tool_result") {
      const toolName = state.toolNames.get(block.tool_use_id) || "unknown";
      const raw = toolResultText(block);
      const text = raw.trim();
      if (!text) continue;

      if (block.is_error) {
        output.push({ type: "text", text: `[${toolName} error: ${text.slice(0, 500)}]` });
        continue;
      }

      if (text.length > LARGE_THRESHOLD) {
        const id = addIndexEntry(state, toolName, firstNonEmptyLine(text, toolName), text.length);
        const lines = text.split("\n");
        const preview = toolName === "Bash"
          ? [...lines.slice(0, 3), "...", ...lines.slice(-3)].join("\n")
          : text.slice(0, 400);
        output.push({
          type: "text",
          text: `[${toolName} result (${text.length} chars) → backup line ${state.origLine}, index #${id}:\n${preview}]`,
        });
        continue;
      }

      if (toolName === "Read") {
        output.push({ type: "text", text: `[read: ${text.split("\n").length} lines]` });
      } else if (toolName === "Bash") {
        const lines = text.split("\n");
        const value = lines.length <= 15
          ? text.slice(0, 800)
          : `${lines.slice(0, 5).join("\n")}\n...\n${lines.slice(-5).join("\n")}`;
        output.push({ type: "text", text: `[output${lines.length > 15 ? ` (${lines.length} lines)` : ""}: ${value}]` });
      } else if (toolName === "Grep" || toolName === "Glob") {
        output.push({ type: "text", text: `[${toolName === "Grep" ? "matches" : "files"}:\n${text.split("\n").slice(0, 25).join("\n")}]` });
      } else if (toolName === "Edit" || toolName === "Write") {
        output.push({ type: "text", text: `[${toolName.toLowerCase()} succeeded]` });
      } else {
        output.push({ type: "text", text: `[${toolName} result: ${text.slice(0, 500)}]` });
      }
      continue;
    }

    if (block.type === "image") {
      output.push({ type: "text", text: "[image omitted; original retained in backup]" });
      continue;
    }

    if (block.type === "fallback") {
      output.push({ type: "text", text: "[model fallback occurred]" });
      continue;
    }

    // Preserve text-bearing block types added by future Claude versions.
    if (typeof block.text === "string" && block.text.trim()) {
      output.push({ type: "text", text: block.text });
    } else {
      state.unsupportedBlockTypes.add(block.type || "unknown");
    }
  }

  return output;
}

function cleanConversationRecord(entry, content, sessionId) {
  const clean = { ...entry };
  for (const field of GRAPH_FIELDS) delete clean[field];
  delete clean.isCompactSummary;
  delete clean.compactMetadata;
  clean.sessionId = sessionId;
  clean.session_id = sessionId;
  clean.isSidechain = false;
  clean.type = entry.message.role;

  const message = { ...entry.message, content };
  delete message.usage;
  delete message.diagnostics;
  delete message.context_management;
  delete message.container;
  clean.message = message;
  return clean;
}

function appendMetadata(record, backupPath, indexPath, hasIndex) {
  const note = [
    "[DISTILLED SESSION METADATA]",
    `Full-fidelity transcript backup: ${backupPath}`,
    hasIndex ? `Large tool-result index: ${indexPath}` : "No large tool results were indexed.",
    "Read the backup only when an omitted detail is relevant.",
  ].join("\n");

  const content = record.message.content;
  record.message.content = typeof content === "string"
    ? [{ type: "text", text: content }, { type: "text", text: note }]
    : [...content, { type: "text", text: note }];
}

function markdownCell(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function stripAngleMarkup(value) {
  let clean = "";
  let insideTag = false;
  for (const character of String(value)) {
    if (character === "<") {
      insideTag = true;
      clean += " ";
    } else if (character === ">" && insideTag) {
      insideTag = false;
      clean += " ";
    } else if (!insideTag) {
      clean += character;
    }
  }
  return clean;
}

function buildIndex({ backupPath, outputPath, inputPath, entries }) {
  const lines = [
    "# Distilled Session Index",
    "",
    `Backup: ${backupPath}`,
    `Distilled: ${outputPath}`,
    `Original: ${inputPath}`,
    `Large results: ${entries.length}`,
    "",
    "The line numbers below refer to the immutable backup snapshot.",
    "",
    "| # | Tool | Description | Backup line | Size |",
    "|---|------|-------------|-------------|------|",
  ];
  for (const entry of entries) {
    lines.push(`| ${entry.id} | ${markdownCell(entry.toolName)} | ${markdownCell(entry.label)} | ${entry.origLine} | ${(entry.chars / 1024).toFixed(1)}K |`);
  }
  return lines.join("\n") + "\n";
}

function extractTitle(records) {
  for (const { entry } of records) {
    if (entry.type === "ai-title" && typeof entry.aiTitle === "string" && entry.aiTitle.trim()) {
      return entry.aiTitle.replace(/^\[distilled[^\]]*\]\s*/i, "").trim();
    }
  }
  for (const { entry } of records) {
    if (
      (entry.type !== "user" && !(entry.type === "message" && entry.message?.role === "user")) ||
      !entry.message?.content || entry.isMeta || entry.isCompactSummary
    ) continue;
    const content = entry.message.content;
    let text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.filter(block => block?.type === "text").map(block => block.text).join(" ")
        : "";
    text = stripAngleMarkup(text).replace(/\s+/g, " ").trim();
    if (text && !text.startsWith("[") && text.length > 5) return text.slice(0, 80);
  }
  return "Untitled session";
}

/**
 * Resolve the branch Claude Code would resume, while crossing compact
 * boundaries back into their pre-compact active branch. Returning null is a
 * fail-open compatibility fallback for legacy or incomplete transcript graphs:
 * distillation keeps records instead of silently discarding uncertain history.
 */
function activeRecordUuids(records) {
  const byUuid = new Map();
  for (const record of records) {
    const uuid = record.entry?.uuid;
    if (!uuid) continue;
    if (byUuid.has(uuid)) return null;
    byUuid.set(uuid, record.entry);
  }
  if (byUuid.size === 0) return null;

  const lastPrompt = [...records].reverse().find(({ entry }) => entry.type === "last-prompt");
  let cursor = lastPrompt?.entry?.leafUuid;
  if (!cursor || !byUuid.has(cursor)) {
    cursor = [...records].reverse().find(({ entry }) => entry.uuid)?.entry.uuid;
  }
  if (!cursor) return null;

  const active = new Set();
  while (cursor) {
    if (active.has(cursor)) return null;
    const entry = byUuid.get(cursor);
    if (!entry) return null;
    active.add(cursor);
    cursor = entry.type === "system" && entry.subtype === "compact_boundary" && entry.logicalParentUuid
      ? entry.logicalParentUuid
      : entry.parentUuid;
  }
  return active;
}

async function pathExists(path) {
  try { await access(path); return true; } catch { return false; }
}

export async function distillSession(inputPath, opts = {}) {
  const { outputDir, sessionId, dryRun = false } = opts;
  const raw = await readFile(inputPath, "utf-8");
  const rawLines = raw.split("\n");
  const records = [];

  for (let index = 0; index < rawLines.length; index++) {
    if (!rawLines[index].trim()) continue;
    try {
      records.push({ entry: JSON.parse(rawLines[index]), line: index + 1 });
    } catch (error) {
      throw new Error(`Malformed session JSONL at line ${index + 1}: ${error.message}`);
    }
  }
  if (records.length === 0) throw new Error("Session is empty");

  const newId = sessionId || randomUUID();
  const dir = outputDir || dirname(inputPath);
  const outputPath = join(dir, `${newId}.jsonl`);
  if (resolve(outputPath) === resolve(inputPath)) throw new Error("Distilled session cannot overwrite its source");

  const distillDir = join(dir, newId);
  const backupPath = join(distillDir, `backup-${basename(inputPath)}`);
  const indexPath = join(distillDir, "index.md");
  const state = {
    indexEntries: [],
    origLine: 0,
    toolNames: new Map(),
    unsupportedBlockTypes: new Set(),
  };
  const byType = {};
  const conversation = [];
  let keptSourceRecords = 0;
  let skippedInactiveRecords = 0;
  const activeUuids = activeRecordUuids(records);

  for (const { entry, line } of records) {
    const type = entry.type || "unknown";
    byType[type] = (byType[type] || 0) + 1;
    state.origLine = line;

    if (activeUuids && entry.uuid && !activeUuids.has(entry.uuid)) {
      skippedInactiveRecords++;
      continue;
    }

    if (DROP_RECORD_TYPES.has(type) || type === "ai-title") continue;
    const role = entry.message?.role;
    if (!["user", "assistant"].includes(role)) continue;
    if (![role, "message"].includes(type)) continue;
    // Compact summaries duplicate conversation still present in the JSONL.
    if (entry.isCompactSummary) continue;
    if (!entry.message || !("content" in entry.message)) continue;

    const content = distillBlocks(entry.message.content, state);
    if (typeof content === "string" ? !content.trim() : content.length === 0) continue;

    const clean = cleanConversationRecord(entry, content, newId);
    const previous = conversation.at(-1);
    if (
      clean.type === "assistant" && previous?.type === "assistant" &&
      clean.message?.id && clean.message.id === previous.message?.id &&
      Array.isArray(clean.message.content) && Array.isArray(previous.message.content)
    ) {
      previous.message.content.push(...clean.message.content);
    } else {
      conversation.push(clean);
    }
    keptSourceRecords++;
  }

  if (conversation.length === 0) throw new Error("Session has no resumable conversation messages");

  // Claude Code reconstructs resume history by walking parentUuid from the
  // leaf. Build a fresh linear graph so dropped metadata cannot break it.
  let parentUuid = null;
  for (const record of conversation) {
    record.parentUuid = parentUuid;
    record.uuid = randomUUID();
    parentUuid = record.uuid;
  }

  const hasIndex = state.indexEntries.length > 0;
  appendMetadata(conversation.at(-1), backupPath, indexPath, hasIndex);

  const lastPromptSource = [...records].reverse().find(({ entry }) => entry.type === "last-prompt")?.entry;
  const lastPrompt = lastPromptSource ? {
    ...lastPromptSource,
    type: "last-prompt",
    sessionId: newId,
    leafUuid: parentUuid,
  } : null;
  if (lastPrompt && "session_id" in lastPrompt) lastPrompt.session_id = newId;

  const body = [...conversation, ...(lastPrompt ? [lastPrompt] : [])];
  const inputBytes = Buffer.byteLength(raw, "utf-8");
  const bodyString = body.map(record => JSON.stringify(record)).join("\n") + "\n";
  const initialReduction = Math.round((1 - Buffer.byteLength(bodyString, "utf-8") / inputBytes) * 100);
  const title = {
    type: "ai-title",
    sessionId: newId,
    aiTitle: `[distilled -${Math.max(0, initialReduction)}%] ${extractTitle(records)}`,
  };
  const outputRecords = [title, ...body];
  const outputString = outputRecords.map(record => JSON.stringify(record)).join("\n") + "\n";
  const outputBytes = Buffer.byteLength(outputString, "utf-8");
  const reduction = Math.round((1 - outputBytes / inputBytes) * 100);

  if (!dryRun) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    if (await pathExists(outputPath) || await pathExists(distillDir)) {
      throw new Error(`Distilled session already exists: ${newId}`);
    }
    await mkdir(distillDir, { mode: 0o700 });
    // Snapshot the exact bytes that the index references, even if the source is active.
    await writeFile(backupPath, raw, { encoding: "utf-8", mode: 0o600, flag: "wx" });
    if (hasIndex) {
      await writeFile(indexPath, buildIndex({
        backupPath,
        outputPath,
        inputPath,
        entries: state.indexEntries,
      }), { encoding: "utf-8", mode: 0o600, flag: "wx" });
    }
    // Publish the visible session only after all recovery files exist.
    await writeFile(outputPath, outputString, { encoding: "utf-8", mode: 0o600, flag: "wx" });
  }

  return {
    inputPath,
    outputPath: dryRun ? "(dry run)" : outputPath,
    backupPath: dryRun ? "(dry run)" : backupPath,
    sessionId: newId,
    stats: {
      inputLines: records.length,
      keptLines: outputRecords.length,
      droppedLines: records.length - keptSourceRecords,
      inputBytes,
      outputBytes,
      backupBytes: inputBytes,
      reduction: `${reduction}%`,
      indexEntries: state.indexEntries.length,
      indexPath: hasIndex ? indexPath : null,
      unsupportedBlockTypes: [...state.unsupportedBlockTypes].sort(),
      skippedInactiveRecords,
      byType,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath = args.find(arg => !arg.startsWith("--"));

  if (!inputPath) {
    console.error("Usage: node session-distiller.mjs <session.jsonl> [--dry-run]");
    process.exit(1);
  }

  const formatBytes = bytes => bytes < 1024
    ? `${bytes}B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)}K`
      : `${(bytes / 1048576).toFixed(1)}M`;

  try {
    const result = await distillSession(inputPath, { dryRun });
    const stats = result.stats;
    console.log("\nSession Distiller\n─────────────────");
    console.log(`Backup:    ${result.backupPath} (${formatBytes(stats.backupBytes)})`);
    console.log(`Distilled: ${result.outputPath} (${formatBytes(stats.outputBytes)}, ${stats.reduction} reduction)`);
    if (stats.indexEntries > 0) console.log(`Index:     ${stats.indexPath} (${stats.indexEntries} refs)`);
    console.log(`Lines:     ${stats.inputLines} → ${stats.keptLines}`);
    if (stats.unsupportedBlockTypes.length > 0) {
      console.log(`Unsupported blocks: ${stats.unsupportedBlockTypes.join(", ")}`);
    }
    console.log("\nTypes:", Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => `${type}:${count}`).join("  "));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
