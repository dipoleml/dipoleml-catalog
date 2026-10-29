import { formatDenial, type IntegrationDenial } from '@/core/denial';
import type { PathResolver } from '@/core/environment';
import { cwdProblem, resolveContainedCwd } from '@/gate/intake';
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

export const OPENCLAW_EXEC_TOOL = 'exec';

const PROVEN_EXEC_HOSTS = new Set(['auto', 'gateway']);

type OpenClawToolContext = {
  toolName: string;
  agentId?: string;
  sessionId?: string;
  sessionKey?: string;
  abortSignal?: AbortSignal;
};

type OpenClawBeforeToolCallEvent = {
  toolName?: unknown;
  params?: unknown;
  toolKind?: unknown;
};

type OpenClawBeforeToolCallResult = { block: true; blockReason: string } | undefined;

type OpenClawPluginApi = {
  config: unknown;
  runtime: {
    agent: {
      resolveAgentWorkspaceDir: (config: unknown, agentId: string) => string | undefined;
    };
  };
  on: (
    hookName: 'before_tool_call',
    handler: (event: unknown, ctx: OpenClawToolContext) => OpenClawBeforeToolCallResult,
    opts: { matcher: readonly [string, ...string[]]; priority: number },
  ) => void;
};

export function registerOpenClawPlugin(api: OpenClawPluginApi): void {
  api.on('before_tool_call', createOpenClawBeforeToolCallHandler(api), {
    matcher: [OPENCLAW_EXEC_TOOL],
    priority: 50,
  });
}

/** @internal */
export function createOpenClawBeforeToolCallHandler(
  api: OpenClawPluginApi,
  options: PluginHandlerOptions = {},
): (event: unknown, ctx: OpenClawToolContext) => OpenClawBeforeToolCallResult {
  const host: PluginToolCallHost<unknown, OpenClawToolContext, OpenClawBeforeToolCallResult> = {
    agent: 'openclaw',
    debugLabel: 'openclaw before_tool_call',
    extract: (event, ctx, paths) => getOpenClawToolCall(event, ctx, api, paths),
    getSessionId: (_event, ctx) => ctx.sessionId ?? ctx.sessionKey,
    allow: undefined,
    block: (denial) => blockOpenClawToolCall(denial),
    includeEvidenceOnError: () => true,
    cancelled: (ctx) => ctx.abortSignal?.aborted === true,
  };
  return createPluginToolCallHandler(host, options);
}

function getOpenClawToolCall(
  event: unknown,
  ctx: OpenClawToolContext,
  api: OpenClawPluginApi,
  paths: PathResolver,
): MalformedToolCall | ToolInvocation | undefined {
  if (!event || typeof event !== 'object') return failedClosedToolCall(null);
  const toolName = (event as OpenClawBeforeToolCallEvent).toolName;
  if (typeof toolName !== 'string' || toolName.trim() === '') {
    return malformedToolCall(null);
  }

  if (toolName !== OPENCLAW_EXEC_TOOL) return undefined;

  if ((event as OpenClawBeforeToolCallEvent).toolKind !== undefined) return undefined;

  const params = (event as OpenClawBeforeToolCallEvent).params;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return malformedToolCall(null, { toolName });
  }

  const execParams = params as Record<string, unknown>;
  const command = execParams.command;
  if (typeof command !== 'string' || command.trim() === '') {
    return malformedToolCall(null, { toolName });
  }
  if (execParams.host !== undefined && !PROVEN_EXEC_HOSTS.has(execParams.host as string)) {
    return failedClosedToolCall(null, { command, toolName });
  }

  const workspaceDir = resolveOpenClawWorkspaceDir(api, ctx.agentId);
  if (!workspaceDir) return failedClosedToolCall(null, { command, toolName });
  const workspace = resolveContainedCwd('.', [workspaceDir], paths);
  if (!workspace) {
    return refusedCwdToolCall(
      { directory: 'session', problem: 'unusable', cwd: workspaceDir },
      { command, toolName },
    );
  }

  const workdir = execParams.workdir;
  if (workdir !== undefined && (typeof workdir !== 'string' || workdir.trim() === '')) {
    return malformedToolCall(workspace, { command, toolName });
  }
  const requestedCwd = typeof workdir === 'string' ? workdir : '.';
  const executionCwd = resolveContainedCwd(requestedCwd, [workspace], paths);
  if (!executionCwd) {
    return refusedCwdToolCall(
      {
        directory: 'requested',
        problem: cwdProblem(requestedCwd, workspace, paths),
        cwd: requestedCwd,
      },
      { command, toolName },
    );
  }

  return createToolInvocation(
    toolName,
    execParams,

    { kind: 'command', shell: 'auto' },
    { configCwd: workspace, executionCwd },
    command,
  );
}

function resolveOpenClawWorkspaceDir(api: OpenClawPluginApi, agentId: unknown): string | undefined {
  if (typeof agentId !== 'string' || agentId.trim() === '') return undefined;
  try {
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(api.config, agentId);
    return typeof workspaceDir === 'string' && workspaceDir.trim() !== ''
      ? workspaceDir
      : undefined;
  } catch {
    return undefined;
  }
}

function blockOpenClawToolCall(denial: IntegrationDenial): OpenClawBeforeToolCallResult {
  return { block: true, blockReason: formatDenial(denial) };
}
