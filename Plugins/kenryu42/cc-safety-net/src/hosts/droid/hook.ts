import { getToolRoute } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { runPreToolUseHook } from '@/hosts/hook/pre-tool-use';

export const DROID_COMMAND_TOOLS = new Map<string, CommandToolKind>([['Execute', 'auto']]);

export async function runDroidHook(): Promise<void> {
  await runPreToolUseHook({
    agent: 'droid',
    denyExitCode: 2,
    getToolRoute: (toolName) => getToolRoute(toolName, DROID_COMMAND_TOOLS),
  });
}
