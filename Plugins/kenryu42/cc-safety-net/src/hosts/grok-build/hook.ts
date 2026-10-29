import type { IntegrationDenial } from '@/core/denial';
import type { Environment } from '@/core/environment';
import {
  cwdProblem,
  firstTrustedRoot,
  getToolRoute,
  outputCwdDenial,
  outputFailedClosed,
  outputMalformedToolCall,
  resolveContainedCwd,
} from '@/gate/intake';
import type { CommandToolKind, ToolCallContext } from '@/gate/invocation';
import { runConfiguredHookAdapter } from '@/hosts/hook/common';

interface GrokBuildHookInput {
  hookEventName?: string;
  sessionId?: string;
  cwd?: string;
  workspaceRoot?: string;
  toolName?: string;
  toolUseId?: string;
  toolInput?: {
    command?: string;
    [key: string]: unknown;
  };
  toolInputTruncated?: boolean;
}

type GrokBuildHookOutput = { decision: 'allow' } | { decision: 'deny'; reason: string };

export const GROK_BUILD_COMMAND_TOOLS = new Map<string, CommandToolKind>([
  ['run_terminal_command', 'auto'],
  ['run_terminal_cmd', 'auto'],
  ['monitor', 'auto'],
  ['bash', 'auto'],
  ['Shell', 'auto'],
]);

const GROK_BUILD_TOOL_CWD_KEYS = new Map([
  ['bash', 'workdir'],
  ['Shell', 'working_directory'],
]);

function getGrokBuildToolRoute(toolName: string) {
  return getToolRoute(toolName, GROK_BUILD_COMMAND_TOOLS);
}

type GrokBuildDenyOutput = (denial: IntegrationDenial) => void;

export async function runGrokBuildHook(): Promise<void> {
  await runConfiguredHookAdapter<GrokBuildHookInput>({
    agent: 'grok-build',
    createDenyOutput: (message): GrokBuildHookOutput => ({ decision: 'deny', reason: message }),
    createAllowOutput: (): GrokBuildHookOutput => ({ decision: 'allow' }),
    isSupported: () => true,
    getToolName: (input) => input.toolName,
    getToolInput: (input, toolName, outputDeny) => {
      if (input.toolInputTruncated === true) {
        outputFailedClosed(outputDeny, input.toolInput, toolName);
        return { ok: false };
      }
      return {
        ok: true,
        input: input.toolInput,
        route: getGrokBuildToolRoute(toolName),
      };
    },
    getContext: resolveGrokBuildContext,
    getSessionId: (input) => input.sessionId,
  });
}

function resolveGrokBuildContext(
  input: GrokBuildHookInput,
  toolInput: unknown,
  toolName: string,
  outputDeny: GrokBuildDenyOutput,
  environment: Environment,
): ToolCallContext | null {
  const requestedRoot = requestedGrokBuildRoot(input);
  if (!requestedRoot) {
    outputFailedClosed(outputDeny, toolInput, toolName);
    return null;
  }
  const root = firstTrustedRoot([requestedRoot], environment.paths);
  if (!root) {
    outputCwdDenial(outputDeny, toolInput, toolName, {
      directory: 'session',
      problem: 'unusable',
      cwd: requestedRoot,
    });
    return null;
  }

  const baseCwd = grokBuildBaseCwd(input.cwd);
  const base = resolveContainedCwd(baseCwd, [root], environment.paths);
  if (!base) {
    outputCwdDenial(outputDeny, toolInput, toolName, {
      directory: 'session',
      problem: cwdProblem(baseCwd, root, environment.paths),
      cwd: baseCwd,
    });
    return null;
  }

  const cwdKey = GROK_BUILD_TOOL_CWD_KEYS.get(toolName);
  const args = input.toolInput;
  if (!cwdKey || !args || !Object.hasOwn(args, cwdKey)) {
    return { configCwd: base, executionCwd: base };
  }
  const requestedCwd = args[cwdKey];
  if (typeof requestedCwd !== 'string' || requestedCwd.trim() === '') {
    outputMalformedToolCall(outputDeny, toolInput, toolName);
    return null;
  }
  const executionCwd = resolveContainedCwd(requestedCwd, [base, root], environment.paths);
  if (executionCwd) return { configCwd: base, executionCwd };
  outputCwdDenial(outputDeny, toolInput, toolName, {
    directory: 'requested',
    problem: cwdProblem(requestedCwd, base, environment.paths),
    cwd: requestedCwd,
  });
  return null;
}

function requestedGrokBuildRoot(input: GrokBuildHookInput): string | undefined {
  const root = input.workspaceRoot === undefined ? input.cwd : input.workspaceRoot;
  return typeof root === 'string' && root.trim() !== '' ? root : undefined;
}

function grokBuildBaseCwd(cwd: unknown): string {
  return typeof cwd === 'string' && cwd.trim() !== '' ? cwd : '.';
}
