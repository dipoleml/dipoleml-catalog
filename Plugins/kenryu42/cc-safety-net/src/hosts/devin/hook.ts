import { getToolRoute, outputFailedClosed } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { getToolCwdHookContext, runConfiguredHookAdapter } from '@/hosts/hook/common';
import { PRE_TOOL_USE_HOOK_EVENT } from '@/hosts/hook/constants';

type DevinHookInput = {
  hook_event_name?: unknown;
  tool_name?: unknown;
  tool_input?: Record<string, unknown>;
  session_id?: unknown;
};

export const DEVIN_COMMAND_TOOLS = new Map<string, CommandToolKind>([['exec', 'auto']]);
export const DEVIN_PROCESS_INPUT_TOOL = 'write_to_process';

const LINE_ENDING_KEY = /<(CR|LF)>/g;
const LINE_EDITING_KEY = /<(ESC|BS|UP|DOWN|LEFT|RIGHT|C-[a-z])>/g;
const KEY_TOKEN = /<[A-Za-z][A-Za-z0-9-]*>/;

function textTypedIntoProcess(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
): string | null | undefined {
  if (
    toolName !== DEVIN_PROCESS_INPUT_TOOL ||
    typeof toolInput !== 'object' ||
    toolInput === null
  ) {
    return undefined;
  }
  const keys = toolInput.bytes_input;
  const lines = typeof keys === 'string' ? keys.replace(LINE_ENDING_KEY, '\n') : '';
  const typedKeys = lines.replace(LINE_EDITING_KEY, '');
  if (KEY_TOKEN.test(typedKeys)) return null;
  const text = toolInput.text_input;
  const hasText = typeof text === 'string' && text !== '';
  const hasTypedKeys = typedKeys.trim() !== '';
  if (hasText && hasTypedKeys) return null;
  if ((hasText || hasTypedKeys) && typedKeys !== lines) return null;
  if (hasText) return text;
  return hasTypedKeys ? typedKeys : undefined;
}

export async function runDevinHook(): Promise<void> {
  await runConfiguredHookAdapter<DevinHookInput>({
    agent: 'devin',
    createDenyOutput: (message) => ({ decision: 'block', reason: message }),
    isSupported: (input) => input.hook_event_name === PRE_TOOL_USE_HOOK_EVENT,
    getToolName: (input) => input.tool_name,
    getToolInput: (input, toolName, outputDeny) => {
      const typed = textTypedIntoProcess(toolName, input.tool_input);
      if (typed === null) {
        outputFailedClosed(outputDeny, input.tool_input, toolName);
        return { ok: false };
      }
      if (typed === undefined) {
        return {
          ok: true,
          input: input.tool_input,
          route: getToolRoute(toolName, DEVIN_COMMAND_TOOLS),
        };
      }
      return { ok: true, input: { command: typed }, route: { kind: 'command', shell: 'auto' } };
    },
    getContext: getToolCwdHookContext('workdir', DEVIN_COMMAND_TOOLS, {
      emptyMeansSessionCwd: false,
      allowOutsideSessionCwd: true,
    }),
    getSessionId: (input) =>
      typeof input.session_id === 'string' && input.session_id !== ''
        ? input.session_id
        : undefined,
  });
}
