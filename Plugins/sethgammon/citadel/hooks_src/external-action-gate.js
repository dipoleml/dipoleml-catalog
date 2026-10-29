#!/usr/bin/env node

/**
 * external-action-gate.js - PreToolUse hook (Bash)
 *
 * Uses the First-Encounter Consent pattern to handle external actions.
 *
 * Three tiers:
 *   SECRETS - Always blocked. Reading or writing .env files via Bash.
 *   INVARIANT - Always blocked and non-configurable (P-001, P-004).
 *   HARD    - Always blocked per-action. Irreversible by default (merge, close,
 *             delete, release, fork). Configurable via policy.externalActions.hard.
 *   SOFT    - Governed by consent preference. Empty by default; teams can opt
 *             reversible actions into consent via policy.externalActions.soft.
 *   ALLOW   - Reversible delivery actions by default (push, PR create/comment,
 *             issue create/comment/edit). Configurable via policy.externalActions.allow.
 *
 * Policy overrides (harness.json):
 *   policy.externalActions.protectedBranches - branches that can never be deleted
 *   policy.externalActions.hard  - labels that are always per-action confirmed
 *   policy.externalActions.soft  - labels governed by consent preference
 *
 * When a label appears in both hard[] and soft[], hard wins.
 * When a label is in soft[] but was in default HARD, it moves to consent-gated.
 * This lets users unlock merge/close for autonomous workflows.
 *
 * Exit codes:
 *   0 = allowed
 *   2 = blocked - message written to stderr so Claude Code surfaces it to the agent
 */

const fs = require('fs');
const path = require('path');
const health = require('./harness-health-util');
const {
  detectExternalAction,
  readExternalActionPolicy,
} = require('../core/policy/external-actions');

const CITADEL_UI = process.env.CITADEL_UI === 'true';

// For CITADEL_UI (desktop app): structured JSON to stdout.
// For CLI: human-readable message to stderr — Claude Code includes stderr in the
// hook error that the agent reads, so this is what surfaces as the block reason.
function hookOutput(hookName, action, message, data = {}) {
  if (CITADEL_UI) {
    process.stdout.write(JSON.stringify({
      hook: hookName,
      action,
      message,
      timestamp: new Date().toISOString(),
      data,
    }));
  } else {
    process.stderr.write(message);
  }
}

function failClosed(reason, error) {
  const detail = error?.message || String(error || reason);
  try {
    health.logBlock('external-action-gate', reason, detail.slice(0, 200));
  } catch { /* best effort only */ }
  hookOutput(
    'external-action-gate',
    'error',
    `[Citadel] External-action policy check failed closed (${reason}).\n` +
    `The command was not run. Repair the hook input or policy configuration before retrying.\n`,
    { reason }
  );
  process.exit(2);
}

function readGatePolicy() {
  const sourcePath = path.join(health.PROJECT_ROOT, '.claude', 'harness.json');
  if (fs.existsSync(sourcePath)) {
    const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    // Validate the source policy even if activation later falls back to an
    // effective/default receipt. A malformed safety policy must not disappear.
    readExternalActionPolicy(raw);
  }
  return readExternalActionPolicy(health.readConfig());
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      run(input);
    } catch (error) {
      failClosed('runtime-failure', error);
    }
  });
}

function run(input) {
  let event;
  try {
    event = JSON.parse(input);
  } catch (error) {
    failClosed('parse-failure', error);
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    failClosed('invalid-input', new TypeError('hook input must be an object'));
  }

  if (typeof event.tool_name !== 'string' || !event.tool_name) {
    failClosed('invalid-input', new TypeError('tool_name must be a non-empty string'));
  }

  if (event.tool_name !== 'Bash') process.exit(0);

  if (!event.tool_input || typeof event.tool_input !== 'object' || Array.isArray(event.tool_input)) {
    failClosed('invalid-input', new TypeError('Bash tool_input must be an object'));
  }
  const command = event.tool_input.command;
  if (typeof command !== 'string' || !command.trim()) {
    failClosed('invalid-input', new TypeError('Bash command must be a non-empty string'));
  }

  const policy = readGatePolicy();
  const action = detectExternalAction(command, policy);

  if (!action) process.exit(0);

  if (action.kind === 'invariant') {
    health.logBlock('external-action-gate', 'blocked-invariant', `${action.label}: ${command.slice(0, 200)}`);
    hookOutput(
      'external-action-gate',
      'blocked',
      `[Citadel] Blocked: constitutional invariant ${action.rule}\n` +
      `Command: ${command.slice(0, 200)}\n\n` +
      `${action.label} is a deterministic, non-configurable safety rule. ` +
      `Change the command before retrying.\n`,
      { label: action.label, rule: action.rule, tier: action.tier }
    );
    process.exit(2);
  }

  if (action.kind === 'secret') {
    health.logBlock('external-action-gate', 'blocked', `${action.label}: ${command.slice(0, 200)}`);
    hookOutput(
      'external-action-gate',
      'blocked',
      `[Citadel] Blocked: secrets access: "${action.label}"\n` +
      (action.label.includes('secrets write')
        ? `Writing .env files via Bash is always blocked. Template files ending in .example, .sample, or .template are allowed.\n`
        : `Reading .env files and credentials is always blocked.\n`),
      { label: action.label, tier: action.tier }
    );
    process.exit(2);
  }

  if (action.kind === 'protected-branch') {
    health.logBlock('external-action-gate', 'blocked', `delete protected branch ${action.branch}: ${command.slice(0, 200)}`);
    hookOutput(
      'external-action-gate',
      'blocked',
      `[Citadel] Blocked: protected branch: "${action.branch}"\n` +
      `This branch is configured as protected in harness.json and cannot be deleted.\n` +
      `To unprotect it, remove it from policy.externalActions.protectedBranches.\n`,
      { label: action.label, tier: action.tier }
    );
    process.exit(2);
  }

  if (action.tier === 'allow') process.exit(0);

  if (action.tier === 'hard') {
    health.logBlock('external-action-gate', 'blocked', `${action.label}: ${command.slice(0, 200)}`);
    hookOutput(
      'external-action-gate',
      'blocked',
      `[Citadel] Approval required — irreversible action: "${action.label}"\n` +
      `Command: ${command.slice(0, 200)}\n\n` +
      `This action cannot be undone. Please review the exact command above and explicitly\n` +
      `confirm with the user before proceeding. Do not retry until confirmed.\n`,
      { label: action.label, tier: action.tier }
    );
    process.exit(2);
  }

  const consent = health.checkConsent('externalActions');
  if (consent.action === 'allow') process.exit(0);

  if (consent.action === 'first-encounter') {
    health.logBlock('external-action-gate', 'first-encounter', `${action.label}: ${command.slice(0, 200)}`);
    hookOutput(
      'external-action-gate',
      'first-encounter',
      `[Citadel] First external action — preference not set\n` +
      `Action: ${action.label}  |  Command: ${command.slice(0, 120)}\n\n` +
      `Citadel can push branches, create PRs, and post comments on your behalf.\n` +
      `How would you like to handle this going forward?\n\n` +
      `  1. Always ask       — pause and confirm every time (most control)\n` +
      `  2. This session     — allow now, ask again next session (recommended)\n` +
      `  3. Auto-allow       — never ask again (most autonomous)\n\n` +
      `Recommendation: option 2 — "${action.label}" is reversible and this keeps\n` +
      `you informed across sessions without blocking autonomous workflows.\n\n` +
      `Ask the user which they prefer (1/2/3), then apply with:\n` +
      `  1 → node -e "require('./hooks_src/harness-health-util').writeConsent('externalActions','always-ask')"\n` +
      `  2 → node -e "require('./hooks_src/harness-health-util').writeConsent('externalActions','session-allow')" && \\\n` +
      `      node -e "require('./hooks_src/harness-health-util').grantSessionAllow('externalActions')"\n` +
      `  3 → node -e "require('./hooks_src/harness-health-util').writeConsent('externalActions','auto-allow')"\n\n` +
      `Then retry the command automatically.\n`,
      { label: action.label, tier: action.tier, consent: 'first-encounter' }
    );
    process.exit(2);
  }

  health.logBlock('external-action-gate', 'consent-block', `${action.label}: ${command.slice(0, 200)}`);

  const pref = health.readConsent('externalActions');
  if (pref === 'session-allow') {
    hookOutput(
      'external-action-gate',
      'consent-block',
      `[Citadel] New session — external action needs approval\n` +
      `Action: ${action.label}  |  Command: ${command.slice(0, 120)}\n\n` +
      `Your preference is "session-allow". Approve to enable external actions for this session.\n\n` +
      `Ask the user yes/no. If approved, run:\n` +
      `  node -e "require('./hooks_src/harness-health-util').grantSessionAllow('externalActions')"\n` +
      `Then retry the command automatically.\n`,
      { label: action.label, tier: action.tier, consent: 'session-renew' }
    );
  } else {
    hookOutput(
      'external-action-gate',
      'consent-block',
      `[Citadel] External action — approval required\n` +
      `Action: ${action.label}  |  Command: ${command.slice(0, 120)}\n\n` +
      `Your preference is "always-ask". Show the user the command above and ask for approval.\n\n` +
      `If approved, run:\n` +
      `  node -e "require('./hooks_src/harness-health-util').grantOneTimeAllow('externalActions')"\n` +
      `Then retry the command automatically.\n`,
      { label: action.label, tier: action.tier, consent: 'always-ask' }
    );
  }

  process.exit(2);
}

main();
