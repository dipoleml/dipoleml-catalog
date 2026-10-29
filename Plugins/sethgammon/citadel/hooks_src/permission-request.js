#!/usr/bin/env node

/**
 * permission-request.js — PermissionRequest hook
 *
 * Fires when the permission dialog appears. Auto-approves only non-executable
 * planning-state writes; shell commands and executable/config projections
 * always defer to the runtime's native permission flow.
 *
 * Design:
 *   - Allowlist-only: only auto-approves patterns explicitly listed as safe
 *   - Fail-safe: unknown patterns get no decision (defer to user)
 *   - Telemetry: all permission requests logged regardless of outcome
 *
 * Known-safe patterns (auto-approve):
 *   - Write/Edit: non-executable text/state files under .planning/**
 *
 * Exit codes:
 *   0 = always (decision communicated via JSON stdout, not exit code)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const health = require('./harness-health-util');

const PROJECT_ROOT = health.PROJECT_ROOT;
const PERMISSION_EVENTS_FILE = path.join(health.TELEMETRY_DIR, 'permission-events.jsonl');

/**
 * Append a compact permission event to the dedicated audit JSONL.
 * Observer-only: failures are swallowed, never affects the hook outcome.
 * One appendFileSync on the hot path (directory already ensured by increment()).
 */
function logPermissionEvent(eventName, tool, target, decision) {
  try {
    if (!fs.existsSync(health.TELEMETRY_DIR)) {
      fs.mkdirSync(health.TELEMETRY_DIR, { recursive: true });
    }
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: eventName,
      tool: tool || 'unknown',
      target: String(target || '').slice(0, 120),
      decision,
    });
    fs.appendFileSync(PERMISSION_EVENTS_FILE, line + '\n', 'utf8');
  } catch { /* telemetry must never break the hook */ }
}

const SAFE_STATE_EXTENSIONS = new Set([
  '.csv', '.json', '.jsonl', '.log', '.md', '.toml', '.txt', '.yaml', '.yml',
]);

/**
 * Resolve symlinks in the longest existing ancestor, then append any missing
 * tail. Permission requests commonly target files that do not exist yet, so
 * plain realpathSync() is insufficient.
 */
function canonicalizePath(filePath) {
  let resolved = path.resolve(PROJECT_ROOT, filePath);
  const missing = [];

  while (!fs.existsSync(resolved)) {
    const parent = path.dirname(resolved);
    if (parent === resolved) break;
    missing.unshift(path.basename(resolved));
    resolved = parent;
  }

  const realpath = fs.realpathSync.native || fs.realpathSync;
  const canonicalBase = realpath(resolved);
  return path.resolve(canonicalBase, ...missing);
}

function isContainedPath(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

const CANONICAL_PROJECT_ROOT = canonicalizePath(PROJECT_ROOT);

const SAFE_FILE_PREFIXES = [
  '.planning',
]
  .map((relativePath) => canonicalizePath(relativePath))
  .filter((prefix) => isContainedPath(prefix, CANONICAL_PROJECT_ROOT));

function isSafeBashCommand(command) {
  return false;
}

function isSafeFilePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return false;
  try {
    const canonical = canonicalizePath(filePath);
    const extension = path.extname(canonical).toLowerCase();
    return SAFE_STATE_EXTENSIONS.has(extension)
      && SAFE_FILE_PREFIXES.some((prefix) => isContainedPath(canonical, prefix));
  } catch {
    return false;
  }
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    let event = {};
    try { event = JSON.parse(input); } catch { /* partial input ok */ }

    const eventName = event.hook_event_name || 'PermissionRequest';
    const isDenied = eventName === 'PermissionDenied';
    const toolName = event.tool_name || event.tool || '';
    const toolInput = event.tool_input || {};
    const agentId = event.agent_id || null;

    let decision = null;
    let reason = 'user-review-required';

    // Check if this matches a known-safe pattern
    if (toolName === 'Bash') {
      const command = toolInput.command || '';
      if (isSafeBashCommand(command)) {
        decision = 'allow';
        reason = 'known-safe-citadel-script';
      }
    } else if (toolName === 'Write' || toolName === 'Edit') {
      const filePath = toolInput.file_path || toolInput.path || '';
      if (isSafeFilePath(filePath)) {
        decision = 'allow';
        reason = 'known-safe-citadel-state-write';
      }
    }

    // PermissionDenied events (template wires this same script) carry a final
    // 'deny' decision; never emit an allow for them.
    const recordedDecision = isDenied ? 'deny' : (decision || 'deferred');
    const target = toolInput.command || toolInput.file_path || toolInput.path || '';

    // Log every permission request for governance visibility
    health.increment('permission-request', 'count');
    health.writeAuditLog('permission-request', {
      tool: toolName,
      target: String(target).slice(0, 200),
      agent_id: agentId,
      decision: recordedDecision,
      reason,
      severity: 'low',
    });

    // Dedicated permission audit trail (consumed by scripts/permission-audit.js)
    logPermissionEvent(eventName, toolName, target, recordedDecision);

    if (decision === 'allow' && !isDenied) {
      // Auto-approve: output the structured decision
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: {
            behavior: 'allow',
          },
        },
      }));
    }
    // If no decision: exit 0 with no output = defer to normal permission flow

    process.exit(0);
  });
}

main();
