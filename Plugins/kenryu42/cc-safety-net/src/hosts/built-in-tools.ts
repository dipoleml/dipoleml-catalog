import { getNonCommandToolInputKind, normalizeToolName } from '@/core/tool-input';
import { ANTIGRAVITY_CLI_COMMAND_TOOLS, ANTIGRAVITY_TASK_TOOL } from '@/hosts/antigravity-cli/hook';
import { getIntegrationDisplayName, type IntegrationId } from '@/hosts/catalog';
import { CLAUDE_CODE_COMMAND_TOOLS } from '@/hosts/claude-code/hook';
import { CODEX_COMMAND_TOOLS } from '@/hosts/codex/hook';
import { COPILOT_CLI_COMMAND_TOOLS } from '@/hosts/copilot-cli/hook';
import { CURSOR_COMMAND_TOOLS } from '@/hosts/cursor/hook';
import { DEEPSEEK_HARNESS_COMMAND_TOOLS } from '@/hosts/deepseek-harness/guard';
import { DEVIN_COMMAND_TOOLS, DEVIN_PROCESS_INPUT_TOOL } from '@/hosts/devin/hook';
import { DROID_COMMAND_TOOLS } from '@/hosts/droid/hook';
import { GEMINI_CLI_COMMAND_TOOLS } from '@/hosts/gemini-cli/hook';
import { GROK_BUILD_COMMAND_TOOLS } from '@/hosts/grok-build/hook';
import { HERMES_AGENT_COMMAND_TOOLS } from '@/hosts/hermes-agent/hook';
import { KIMI_CODE_COMMAND_TOOLS } from '@/hosts/kimi-code/hook';
import { OPENCLAW_EXEC_TOOL } from '@/hosts/openclaw/plugin';
import { OPENCODE_COMMAND_TOOL, OPENCODE_V2_COMMAND_TOOL } from '@/hosts/opencode/plugin';
import { PI_COMMAND_TOOL_ADAPTERS } from '@/hosts/pi/tool-call';

const BUILT_IN_SHELL_TOOLS = (
  [
    ['antigravity-cli', [...ANTIGRAVITY_CLI_COMMAND_TOOLS.keys(), ANTIGRAVITY_TASK_TOOL]],
    ['claude-code', [...CLAUDE_CODE_COMMAND_TOOLS.keys()]],
    ['codex', [...CODEX_COMMAND_TOOLS.keys()]],
    ['copilot-cli', [...COPILOT_CLI_COMMAND_TOOLS.keys()]],
    ['cursor', [...CURSOR_COMMAND_TOOLS.keys()]],
    ['deepseek-harness', [...DEEPSEEK_HARNESS_COMMAND_TOOLS.keys()]],
    ['devin', [...DEVIN_COMMAND_TOOLS.keys(), DEVIN_PROCESS_INPUT_TOOL]],
    ['droid', [...DROID_COMMAND_TOOLS.keys()]],
    ['gemini-cli', [...GEMINI_CLI_COMMAND_TOOLS.keys()]],
    ['grok-build', [...GROK_BUILD_COMMAND_TOOLS.keys()]],
    ['hermes-agent', [...HERMES_AGENT_COMMAND_TOOLS.keys()]],
    ['kimi-code', [...KIMI_CODE_COMMAND_TOOLS.keys()]],
    ['openclaw', [OPENCLAW_EXEC_TOOL]],
    ['opencode', [OPENCODE_COMMAND_TOOL, OPENCODE_V2_COMMAND_TOOL]],
    ['pi', [...PI_COMMAND_TOOL_ADAPTERS.keys()]],
  ] satisfies [IntegrationId, string[]][]
).flatMap(([integration, names]) =>
  names.map((name) => ({ name, integration: getIntegrationDisplayName(integration) })),
);

const NOT_DECLARABLE = 'and is already analyzed. Built-in tools cannot be declared.';

export function getBuiltInToolRefusal(name: string): string | undefined {
  const normalized = normalizeToolName(name);
  const integrations = [
    ...new Set(
      BUILT_IN_SHELL_TOOLS.filter((tool) => normalizeToolName(tool.name) === normalized).map(
        (tool) => tool.integration,
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
  if (integrations.length > 0) {
    return `"${name}" is a built-in shell tool of ${joinNaturally(integrations)}, ${NOT_DECLARABLE}`;
  }
  if (getNonCommandToolInputKind(name) !== 'unknown') {
    return `"${name}" is a built-in file tool, ${NOT_DECLARABLE}`;
  }
  return undefined;
}

function joinNaturally(items: string[]): string {
  return items.length === 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
