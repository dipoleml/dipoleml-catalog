import { getToolRoute } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { getToolCwdHookContext } from '@/hosts/hook/common';
import { runPreToolUseHook } from '@/hosts/hook/pre-tool-use';

export const KIMI_CODE_COMMAND_TOOLS = new Map<string, CommandToolKind>([['Bash', 'posix']]);

function getKimiCodeToolRoute(toolName: string) {
  return getToolRoute(toolName, KIMI_CODE_COMMAND_TOOLS);
}

export async function runKimiCodeHook(): Promise<void> {
  await runPreToolUseHook({
    agent: 'kimi-code',
    getToolRoute: getKimiCodeToolRoute,
    getContext: getToolCwdHookContext('cwd', KIMI_CODE_COMMAND_TOOLS),
  });
}
