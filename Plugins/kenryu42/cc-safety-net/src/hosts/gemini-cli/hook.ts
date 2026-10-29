import { resolve } from 'node:path';
import type { PathResolver } from '@/core/environment';
import { getToolRoute } from '@/gate/intake';
import type { CommandToolKind } from '@/gate/invocation';
import { getToolCwdHookContext, runConfiguredHookAdapter } from '@/hosts/hook/common';
import { GEMINI_CLI_HOOK_EVENT } from '@/hosts/hook/constants';

interface GeminiHookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name: string;
  timestamp?: string;
  tool_name?: string;
  tool_input?: {
    command?: string;
    [key: string]: unknown;
  };
}

interface GeminiHookOutput {
  decision: 'deny';
  reason: string;
  systemMessage: string;
}

export const GEMINI_CLI_COMMAND_TOOLS = new Map<string, CommandToolKind>([
  ['run_shell_command', 'auto'],
]);

function getGeminiCliToolRoute(toolName: string) {
  return getToolRoute(toolName, GEMINI_CLI_COMMAND_TOOLS);
}

function getHostResolvedFilePath(filePath: string, targetDir: string, paths: PathResolver) {
  const clean = filePath.replaceAll('\0', '');
  const exists = (path: string) => paths.realpath(resolve(targetDir, path)) !== null;
  const stripped = clean.slice(1).replace(/^[\\/]+/, '');
  if (!clean.startsWith('@') || stripped === '' || exists(clean)) return clean;
  if (/^@[\\/]/.test(clean)) return stripped;
  return exists(`@${stripped.split(/[\\/]/)[0]}`) ? clean : stripped;
}

function withHostResolvedFilePath(input: GeminiHookInput, paths: PathResolver) {
  const toolInput = input.tool_input;
  const filePath = toolInput?.file_path;
  if (typeof filePath !== 'string') return toolInput;
  const hostPath = getHostResolvedFilePath(
    filePath,
    typeof input.cwd === 'string' ? input.cwd : process.cwd(),
    paths,
  );
  return hostPath === filePath ? toolInput : { ...toolInput, file_path: [filePath, hostPath] };
}

export async function runGeminiCLIHook(): Promise<void> {
  await runConfiguredHookAdapter<GeminiHookInput>({
    agent: 'gemini-cli',

    createDenyOutput: (message): GeminiHookOutput => ({
      decision: 'deny',
      reason: message,
      systemMessage: message,
    }),
    isSupported: (input) => input.hook_event_name === GEMINI_CLI_HOOK_EVENT,
    getToolName: (input) => input.tool_name,
    getToolInput: (input, toolName, _outputDeny, environment) => ({
      ok: true,
      input: withHostResolvedFilePath(input, environment.paths),
      route: getGeminiCliToolRoute(toolName),
    }),
    getContext: getToolCwdHookContext('dir_path', GEMINI_CLI_COMMAND_TOOLS, {
      emptyMeansSessionCwd: true,
      allowOutsideSessionCwd: true,
    }),
    getSessionId: (input) => input.session_id,
  });
}
