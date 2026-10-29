import { managedHookCommands } from '@/hosts/managed-command';

export const HERMES_AGENT_PLUGIN_NAME = 'cc-safety-net';

export const HERMES_AGENT_MANAGED_HEADER =
  '# cc-safety-net managed Hermes Agent plugin. Do not edit. Reinstall with: npx -y cc-safety-net install --hermes-agent';

const ANALYSIS_TIMEOUT_SECONDS = 30;

function header(version: string): string {
  return `${HERMES_AGENT_MANAGED_HEADER}\n# version: ${version}\n`;
}

function buildManifest(version: string): string {
  return `${header(version)}name: ${HERMES_AGENT_PLUGIN_NAME}
version: "${version}"
description: "Block destructive commands and secret-file access before Hermes runs a tool."
author: "cc-safety-net"
provides_hooks:
  - pre_tool_call
`;
}

function buildPluginSource(version: string): string {
  return `${header(version)}"""CC Safety Net guard for Hermes Agent.

Registers pre_tool_call and forwards the tool call to the packaged CC Safety Net
adapter (cc-safety-net hook --hermes-agent) over JSON stdin. The adapter prints nothing
when the call is allowed and an {"action": "block", ...} directive when it is denied.
Every transport and analysis failure is returned as a block that names its cause.
"""

import json
import os
import shutil
import signal
import subprocess

HOOK_EVENT = "pre_tool_call"
SUPPORTED_TOOLS = ("patch", "read_file", "terminal", "write_file")
ANALYZER = [${managedHookCommands['hermes-agent']
    .split(' ')
    .map((word) => `"${word}"`)
    .join(', ')}]
TIMEOUT_SECONDS = ${ANALYSIS_TIMEOUT_SECONDS}


def _block(detail):
    return {"action": "block", "message": "CC Safety Net failed closed: " + detail}


def _terminal_cwd(task_id):
    """Return the directory Hermes will run this terminal command in.

    A \`terminal\` call without \`workdir\` runs in the session's own cwd RECORD, not in the
    Hermes process directory: \`_resolve_command_cwd\` in tools/terminal_tool.py returns
    \`workdir or get_session_cwd(session_key) or default_cwd\`, and that record is rewritten
    after every completed command, so it IS the session's \`cd\` state. The session key is
    derived exactly as terminal_tool derives it: the contextvar when set, the raw task_id
    otherwise. No record yet (first command of a session) means \`default_cwd\`, which the local
    terminal backend reads from \`TERMINAL_CWD\` (\`hermes_cli/config.py\` bridges the configured
    \`terminal.cwd\` into it) and only then falls back to the process directory.
    """
    from tools.approval import get_current_session_key
    from tools.terminal_tool import get_session_cwd

    return (
        get_session_cwd(get_current_session_key(default="") or (task_id or ""))
        or os.environ.get("TERMINAL_CWD")
        or os.getcwd()
    )


def _file_tool_cwd(task_id):
    """Return the directory Hermes resolves this file tool's relative paths against.

    tools/file_tools.py passes \`task_id or "default"\` to \`_resolve_base_dir\`, which walks the
    session's cwd record, the task's cwd override, \`TERMINAL_CWD\`, then the process directory.
    tools.file_tools defines it up to v2026.8.31 and re-exports it from tools.file_tools_paths since.
    """
    from tools.file_tools import _resolve_base_dir

    return str(_resolve_base_dir(task_id or "default"))


def _pre_tool_call(tool_name="", args=None, session_id="", task_id="", **_):
    if tool_name not in SUPPORTED_TOOLS:
        return None

    executable = shutil.which(ANALYZER[0])
    if executable is None:
        return _block(ANALYZER[0] + " was not found on PATH.")

    try:
        cwd = _terminal_cwd(task_id) if tool_name == "terminal" else _file_tool_cwd(task_id)
    except OSError as error:
        return _block("the working directory could not be resolved (%s)." % error)
    except ImportError as error:
        # Without Hermes' own directory lookup we cannot tell which directory the call acts in,
        # and analysing the wrong one clears every path-scoped protection.
        return _block(
            "the Hermes %s directory could not be read (%s). Update cc-safety-net and "
            "reinstall the plugin with: npx -y cc-safety-net install --hermes-agent."
            % ("session" if tool_name == "terminal" else "file tool", error)
        )

    payload = json.dumps(
        {
            "hook_event_name": HOOK_EVENT,
            "tool_name": tool_name,
            "tool_input": args if isinstance(args, dict) else None,
            "session_id": session_id if isinstance(session_id, str) else "",
            "cwd": cwd,
        }
    )

    try:
        if os.name == "nt":
            launch_options = {}
        else:
            launch_options = {"start_new_session": True}
        process = subprocess.Popen(
            [executable] + ANALYZER[1:],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            # Decode explicitly: the analyzer writes UTF-8, and a locale decoder would raise
            # UnicodeDecodeError on output it cannot read. "replace" turns that into unreadable
            # output, which blocks with its cause named.
            encoding="utf-8",
            errors="replace",
            # Resolve the analyzer from a neutral directory: npx prefers a repository-local
            # node_modules/.bin/cc-safety-net, so inheriting Hermes' working directory would
            # let workspace contents stand in for the analyzer. The payload's "cwd" above is
            # still the real Hermes working directory, which the analysis needs.
            cwd=os.path.expanduser("~"),
            # Own process group so the timeout below can kill the whole tree: npx's descendants
            # outlive a kill aimed at npx alone and keep holding the pipes captured here. Windows
            # uses taskkill's process-tree traversal instead because sessions are POSIX-only.
            **launch_options,
        )
    except OSError as error:
        return _block("analysis could not start (%s)." % error)

    try:
        stdout, _ = process.communicate(payload, timeout=TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        try:
            if os.name == "nt":
                system_root = os.environ.get("SystemRoot")
                if not system_root:
                    raise OSError("SystemRoot is unavailable")
                subprocess.run(
                    [
                        os.path.join(system_root, "System32", "taskkill.exe"),
                        "/PID",
                        str(process.pid),
                        "/T",
                        "/F",
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=1,
                    check=False,
                )
            else:
                os.killpg(process.pid, signal.SIGKILL)
        except (OSError, subprocess.SubprocessError):
            pass
        try:
            process.communicate(timeout=1)
        except (OSError, subprocess.SubprocessError):
            pass
        return _block("analysis timed out after %ss." % TIMEOUT_SECONDS)

    if process.returncode != 0:
        return _block("analysis exited with status %s." % process.returncode)

    directive = (stdout or "").strip()
    if not directive:
        return None

    try:
        parsed = json.loads(directive)
    except ValueError:
        return _block("analysis returned unreadable output.")

    if isinstance(parsed, dict) and parsed.get("action") == "block":
        message = parsed.get("message")
        if isinstance(message, str) and message:
            return parsed
    return _block("analysis returned an unexpected directive.")


def register(ctx):
    ctx.register_hook("pre_tool_call", _pre_tool_call)
`;
}

export function buildHermesAgentPluginFiles(
  version: string,
): readonly { name: string; content: string }[] {
  return [
    { name: '__init__.py', content: buildPluginSource(version) },
    { name: 'plugin.yaml', content: buildManifest(version) },
  ];
}
