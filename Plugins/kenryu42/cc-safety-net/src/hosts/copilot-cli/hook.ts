import { getToolRoute, parseHookJson } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { getStandardHookContext, runConfiguredHookAdapter } from '@/hosts/hook/common';

interface CopilotCliHookInput {
  sessionId: string;
  timestamp: number;
  cwd: string;
  toolName: string;
  toolArgs: unknown;
}

interface CopilotCliHookOutput {
  permissionDecision: 'deny';
  permissionDecisionReason?: string;
}

export const COPILOT_CLI_COMMAND_TOOLS = new Map<string, CommandToolKind>([
  ['bash', 'auto'],
  ['Bash', 'auto'],
  ['powershell', 'powershell'],
  ['PowerShell', 'powershell'],
]);

function getCopilotCliToolRoute(toolName: string) {
  return getToolRoute(toolName, COPILOT_CLI_COMMAND_TOOLS);
}

export async function runCopilotCliHook(): Promise<void> {
  await runConfiguredHookAdapter<CopilotCliHookInput>({
    agent: 'copilot-cli',
    createDenyOutput: (message): CopilotCliHookOutput => ({
      permissionDecision: 'deny',
      permissionDecisionReason: message,
    }),
    isSupported: () => true,
    getToolName: (input) => input.toolName,
    getToolInput: (input, toolName, outputDeny) => {
      const route = getCopilotCliToolRoute(toolName);
      if (typeof input.toolArgs === 'object' && input.toolArgs !== null) {
        return { ok: true, input: input.toolArgs, route };
      }
      if (typeof input.toolArgs !== 'string') {
        outputDeny({ reason: 'Failed to parse toolArgs JSON.' });
        return { ok: false };
      }
      const isRawPatch =
        route.kind === 'patch' && input.toolArgs.trimStart().startsWith('*** Begin Patch');
      if (isRawPatch) return { ok: true, input: input.toolArgs, route };
      const toolInput = parseHookJson<unknown>(
        input.toolArgs,
        outputDeny,
        'Failed to parse toolArgs JSON.',
      );
      if (toolInput === undefined) return { ok: false };
      return { ok: true, input: toolInput, route };
    },
    getContext: getStandardHookContext,
    getSessionId: (input) =>
      typeof input.sessionId === 'string' && input.sessionId.trim() ? input.sessionId : undefined,
  });
}
