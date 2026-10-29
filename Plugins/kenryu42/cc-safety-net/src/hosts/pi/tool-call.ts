import { formatDenial, type IntegrationDenial } from '@/core/denial';
import type { PathResolver } from '@/core/environment';
import { getNonCommandToolInputKind } from '@/core/tool-input';
import { resolveContainedCwd } from '@/gate/intake';
import type { CommandToolKind, ToolInvocation } from '@/gate/invocation';
import { createToolInvocation } from '@/gate/invocation';
import {
  createPluginToolCallHandler,
  failedClosedToolCall,
  type MalformedToolCall,
  malformedToolCall,
  type PluginHandlerOptions,
  refusedCwdToolCall,
  type PluginToolCallHost,
} from '@/hosts/hook/plugin-adapter';

type PiApi = {
  on: (
    event: 'tool_call',
    handler: (event: unknown, ctx: PiToolCallContext) => PiToolCallResult,
  ) => void;
};

type PiToolCallContext = {
  cwd: string;
  sessionManager: {
    getSessionId: () => string | undefined;
  };
};

type PiToolCallResult = { block: true; reason: string } | undefined;

type PiToolCallEvent = {
  type?: string;
  toolName?: string;
  input?: Record<string, unknown>;
};

export const PI_COMMAND_TOOL_ADAPTERS = new Map<string, CommandToolKind>([
  ['bash', 'posix'],
  ['powershell', 'powershell'],
]);

const PI_HOST: PluginToolCallHost<unknown, PiToolCallContext, PiToolCallResult> = {
  agent: 'pi',
  debugLabel: 'pi tool_call',
  extract: (event, ctx, paths) => getPiToolCall(event, ctx, paths),
  getSessionId: (_event, ctx) => ctx.sessionManager.getSessionId(),
  allow: undefined,
  block: (denial) => blockPiToolCall(denial),
  includeEvidenceOnError: (toolCall) => toolCall.route.kind === 'command',
};

export function registerToolCallEvent(pi: PiApi): void {
  pi.on('tool_call', handlePiToolCall);
}

const handlePiToolCall = createPiToolCallHandler();

/** @internal */
export function createPiToolCallHandler(
  options: PluginHandlerOptions = {},
): (event: unknown, ctx: PiToolCallContext) => PiToolCallResult {
  return createPluginToolCallHandler(PI_HOST, options);
}

function getPiToolCall(
  event: unknown,
  ctx: PiToolCallContext,
  paths: PathResolver,
): MalformedToolCall | ToolInvocation | undefined {
  if (!event || typeof event !== 'object') return undefined;
  const toolCall = event as PiToolCallEvent;
  if (toolCall.type !== undefined && toolCall.type !== 'tool_call') return undefined;
  if (typeof toolCall.toolName !== 'string' || toolCall.toolName.trim() === '') {
    return malformedPiToolCall(ctx);
  }

  if (typeof ctx.cwd !== 'string' || ctx.cwd.trim() === '') {
    return failedClosedToolCall(null, { toolName: toolCall.toolName });
  }
  const validContextCwd = resolveContainedCwd('.', [ctx.cwd], paths);
  if (!validContextCwd) {
    return refusedCwdToolCall(
      { directory: 'session', problem: 'unusable', cwd: ctx.cwd },
      { toolName: toolCall.toolName },
    );
  }

  const shell = PI_COMMAND_TOOL_ADAPTERS.get(toolCall.toolName);
  if (!toolCall.input || typeof toolCall.input !== 'object') {
    return shell ? malformedPiToolCall(ctx, toolCall.toolName) : undefined;
  }

  if (!shell) {
    return createToolInvocation(
      toolCall.toolName,
      toolCall.input,
      { kind: getNonCommandToolInputKind(toolCall.toolName) },
      { configCwd: validContextCwd, executionCwd: validContextCwd },
      null,
    );
  }

  const command = toolCall.input.command;
  if (typeof command !== 'string' || command.trim() === '') {
    return malformedPiToolCall(ctx, toolCall.toolName);
  }

  return createToolInvocation(
    toolCall.toolName,
    toolCall.input,
    { kind: 'command', shell },
    { configCwd: validContextCwd, executionCwd: validContextCwd },
    command,
  );
}

function malformedPiToolCall(ctx: PiToolCallContext, toolName?: string): MalformedToolCall {
  return malformedToolCall(typeof ctx.cwd === 'string' && ctx.cwd.trim() ? ctx.cwd : null, {
    toolName,
  });
}

function blockPiToolCall(denial: IntegrationDenial): PiToolCallResult {
  return { block: true, reason: formatDenial(denial) };
}
