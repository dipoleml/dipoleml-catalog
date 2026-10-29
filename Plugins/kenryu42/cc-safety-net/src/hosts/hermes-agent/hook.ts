import { getToolRoute } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { getToolCwdHookContext, runConfiguredHookAdapter } from '@/hosts/hook/common';
import { HERMES_AGENT_HOOK_EVENT } from '@/hosts/hook/constants';

interface HermesAgentHookInput {
  hook_event_name: string;
  tool_name?: unknown;
  tool_input?: Record<string, unknown>;
  session_id?: string;
  cwd?: string;
}

export const HERMES_AGENT_COMMAND_TOOLS = new Map<string, CommandToolKind>([['terminal', 'posix']]);

export async function runHermesAgentHook(): Promise<void> {
  await runConfiguredHookAdapter<HermesAgentHookInput>({
    agent: 'hermes-agent',

    createDenyOutput: (message) => ({ action: 'block', message }),
    isSupported: (input) => input.hook_event_name === HERMES_AGENT_HOOK_EVENT,
    getToolName: (input) => input.tool_name,
    getToolInput: (input, toolName) => ({
      ok: true,
      input: input.tool_input,
      route: getToolRoute(toolName, HERMES_AGENT_COMMAND_TOOLS),
    }),
    getContext: getToolCwdHookContext('workdir', HERMES_AGENT_COMMAND_TOOLS, {
      emptyMeansSessionCwd: false,
      allowOutsideSessionCwd: true,
    }),
    getSessionId: (input) => input.session_id,
  });
}
