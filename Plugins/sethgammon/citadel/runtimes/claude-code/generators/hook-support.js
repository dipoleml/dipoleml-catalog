'use strict';

const { execFileSync } = require('child_process');

const SAFE_EVENTS = Object.freeze([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PreCompact',
  'Stop',
  'SessionStart',
  'SessionEnd',
  'SubagentStop',
]);

// Capability snapshot verified against Claude Code 2.1.219 and the official
// hook reference. Citadel's template intentionally implements only 29 of
// these events; MessageDisplay and DirectoryAdded are reported as gaps rather
// than receiving placeholder hooks.
const CURRENT_CLAUDE_BASELINE_VERSION = '2.1.219';
const CURRENT_CLAUDE_HOOK_EVENTS = Object.freeze([
  'SessionStart',
  'Setup',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'MessageDisplay',
  'PreToolUse',
  'PermissionRequest',
  'PermissionDenied',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Notification',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'Stop',
  'StopFailure',
  'TeammateIdle',
  'InstructionsLoaded',
  'ConfigChange',
  'CwdChanged',
  'DirectoryAdded',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'PreCompact',
  'PostCompact',
  'Elicitation',
  'ElicitationResult',
  'SessionEnd',
]);

function parseClaudeVersion(raw) {
  if (typeof raw !== 'string') return null;
  const match = raw.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function compareVersions(left, right) {
  const a = String(left).split('.').map((part) => Number(part) || 0);
  const b = String(right).split('.').map((part) => Number(part) || 0);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index++) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

function detectClaudeVersion(claudeBin = 'claude') {
  try {
    const output = execFileSync(claudeBin, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 5000,
    });
    return {
      version: parseClaudeVersion(output),
      source: 'cli',
      raw: String(output || '').trim(),
    };
  } catch {
    return {
      version: null,
      source: 'unavailable',
      raw: '',
    };
  }
}

function getSupportedEventsForVersion(version, templateEvents) {
  const baseline = version && compareVersions(version, CURRENT_CLAUDE_BASELINE_VERSION) >= 0
    ? CURRENT_CLAUDE_HOOK_EVENTS
    : SAFE_EVENTS;
  return new Set(baseline.filter((event) => templateEvents.includes(event)));
}

function compatibilityCoverage(templateEvents, runtimeEvents) {
  return {
    runtimeSupportedEvents: [...runtimeEvents],
    missingTemplateEvents: runtimeEvents.filter((event) => !templateEvents.includes(event)),
  };
}

function selectSupportedClaudeHookEvents(options = {}) {
  const templateEvents = Array.from(options.templateEvents || []);
  const requestedProfile = (options.hookProfile || 'auto').toLowerCase();

  if (requestedProfile === 'latest' || requestedProfile === 'full' || requestedProfile === 'all') {
    const runtimeEvents = options.claudeVersion
      && compareVersions(options.claudeVersion, CURRENT_CLAUDE_BASELINE_VERSION) >= 0
      ? CURRENT_CLAUDE_HOOK_EVENTS
      : templateEvents;
    return {
      hookProfile: 'latest',
      claudeVersion: options.claudeVersion || null,
      versionSource: options.claudeVersion ? 'explicit' : 'ignored',
      supportedEvents: templateEvents,
      skippedEvents: [],
      reason: 'forced latest profile',
      ...compatibilityCoverage(templateEvents, runtimeEvents),
    };
  }

  if (requestedProfile === 'legacy' || requestedProfile === 'safe') {
    const supportedEvents = templateEvents.filter((event) => SAFE_EVENTS.includes(event));
    return {
      hookProfile: 'safe',
      claudeVersion: options.claudeVersion || null,
      versionSource: options.claudeVersion ? 'explicit' : 'profile',
      supportedEvents,
      skippedEvents: templateEvents.filter((event) => !supportedEvents.includes(event)),
      reason: 'forced safe profile',
      ...compatibilityCoverage(templateEvents, SAFE_EVENTS),
    };
  }

  const detected = options.claudeVersion
    ? { version: options.claudeVersion, source: 'explicit', raw: options.claudeVersion }
    : detectClaudeVersion(options.claudeBin);
  const supported = getSupportedEventsForVersion(detected.version, templateEvents);
  const supportedEvents = templateEvents.filter((event) => supported.has(event));
  const isCurrentBaseline = detected.version
    && compareVersions(detected.version, CURRENT_CLAUDE_BASELINE_VERSION) >= 0;
  const runtimeEvents = isCurrentBaseline ? CURRENT_CLAUDE_HOOK_EVENTS : SAFE_EVENTS;

  return {
    hookProfile: detected.version ? 'auto' : 'safe',
    claudeVersion: detected.version,
    versionSource: detected.source,
    supportedEvents,
    skippedEvents: templateEvents.filter((event) => !supportedEvents.includes(event)),
    reason: isCurrentBaseline
      ? `auto-detected Claude Code ${detected.version}; using verified ${CURRENT_CLAUDE_BASELINE_VERSION} capability baseline`
      : detected.version
        ? `auto-detected Claude Code ${detected.version}; using conservative safe profile below verified ${CURRENT_CLAUDE_BASELINE_VERSION} baseline`
      : 'Claude version unavailable; falling back to safe profile',
    ...compatibilityCoverage(templateEvents, runtimeEvents),
  };
}

module.exports = {
  CURRENT_CLAUDE_BASELINE_VERSION,
  CURRENT_CLAUDE_HOOK_EVENTS,
  SAFE_EVENTS,
  compareVersions,
  detectClaudeVersion,
  parseClaudeVersion,
  selectSupportedClaudeHookEvents,
};
