import type { ShellCommand, ToolCall, URI } from '@ampcode/plugin';
import { formatDenial, type IntegrationDenial } from '@/core/denial';
import type { PathResolver } from '@/core/environment';
import { getNonCommandToolInputKind } from '@/core/tool-input';
import { resolveCanonicalCwd, resolveContainedCwd } from '@/gate/intake';
import { createToolInvocation, type ToolInvocation } from '@/gate/invocation';
import {
  createPluginToolCallHandler,
  failedClosedToolCall,
  type MalformedToolCall,
  malformedToolCall,
  type PluginHandlerOptions,
  refusedCwdToolCall,
  type PluginToolCallHost,
} from '@/hosts/hook/plugin-adapter';

type AmpApi = {
  system: { workspaceRoot: URI | null };
  helpers: {
    filePathFromURI: (uri: URI) => string;
    shellCommandFromToolCall: (event: ToolCall) => ShellCommand | null;
  };
};

type AmpToolCallEvent = {
  tool?: unknown;
  input?: unknown;
  thread?: { id?: unknown };
};

type AmpToolCallResult = { action: 'allow' } | { action: 'reject-and-continue'; message: string };

const AMP_HOST: PluginToolCallHost<unknown, AmpApi, AmpToolCallResult> = {
  agent: 'amp',
  debugLabel: 'amp tool.call',
  extract: (event, amp, paths) => getAmpToolInvocation(event, amp, paths),
  getSessionId: (event) => ampThreadId(event),
  allow: { action: 'allow' },
  block: (denial) => rejectAmpToolCall(denial),
  includeEvidenceOnError: (toolCall) => toolCall.route.kind === 'command',
};

export const handleAmpToolCall = createAmpToolCallHandler();

/** @internal */
export function createAmpToolCallHandler(
  options: PluginHandlerOptions = {},
): (event: unknown, amp: AmpApi) => AmpToolCallResult {
  return createPluginToolCallHandler(AMP_HOST, options);
}

function getAmpToolInvocation(
  event: unknown,
  amp: AmpApi,
  paths: PathResolver,
): MalformedToolCall | ToolInvocation {
  if (!event || typeof event !== 'object') return failedClosedToolCall(null);
  const toolCall = event as AmpToolCallEvent;
  if (typeof toolCall.tool !== 'string' || toolCall.tool.trim() === '') {
    return malformedToolCall(null);
  }
  if (!toolCall.input || typeof toolCall.input !== 'object') {
    return malformedToolCall(null, { toolName: toolCall.tool });
  }

  const rootPath = resolveAmpWorkspaceRootPath(amp);
  if (!rootPath) return failedClosedToolCall(null, { toolName: toolCall.tool });
  const workspaceRoot = resolveContainedCwd('.', [rootPath], paths);
  if (!workspaceRoot) {
    return refusedCwdToolCall(
      { directory: 'session', problem: 'unusable', cwd: rootPath },
      { toolName: toolCall.tool },
    );
  }

  const shell = extractAmpShellCommand(amp, event);
  if (!shell.ok) return failedClosedToolCall(workspaceRoot, { toolName: toolCall.tool });

  if (!shell.command) {
    return createToolInvocation(
      toolCall.tool,
      toolCall.input,
      { kind: getNonCommandToolInputKind(toolCall.tool) },
      { configCwd: workspaceRoot, executionCwd: workspaceRoot },
      null,
    );
  }

  if (typeof shell.command.command !== 'string' || shell.command.command.trim() === '') {
    return malformedToolCall(workspaceRoot, { toolName: toolCall.tool });
  }

  const requestedCwd = typeof shell.command.dir === 'string' ? shell.command.dir : '.';
  const executionCwd = resolveCanonicalCwd(requestedCwd, workspaceRoot, paths);
  if (!executionCwd) {
    return refusedCwdToolCall(
      { directory: 'requested', problem: 'unusable', cwd: requestedCwd },
      { command: shell.command.command, toolName: toolCall.tool },
    );
  }

  return createToolInvocation(
    toolCall.tool,
    toolCall.input,
    { kind: 'command', shell: 'posix' },
    { configCwd: workspaceRoot, executionCwd },
    shell.command.command,
  );
}

function resolveAmpWorkspaceRootPath(amp: AmpApi): string | undefined {
  const workspaceRoot = amp.system.workspaceRoot;
  if (!workspaceRoot) return undefined;
  try {
    const rootPath = amp.helpers.filePathFromURI(workspaceRoot);
    return typeof rootPath === 'string' && rootPath.trim() !== '' ? rootPath : undefined;
  } catch {
    return undefined;
  }
}

function extractAmpShellCommand(
  amp: AmpApi,
  event: unknown,
): { ok: true; command: ShellCommand | null } | { ok: false } {
  try {
    return { ok: true, command: amp.helpers.shellCommandFromToolCall(event as ToolCall) };
  } catch {
    return { ok: false };
  }
}

function ampThreadId(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') return undefined;
  const id = (event as AmpToolCallEvent).thread?.id;
  return typeof id === 'string' && id.trim() !== '' ? id : undefined;
}

function rejectAmpToolCall(denial: IntegrationDenial): AmpToolCallResult {
  return { action: 'reject-and-continue', message: formatDenial(denial) };
}
