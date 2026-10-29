/**
 * Minimal OpenCode plugin entrypoint for AI Dev Kit.
 *
 * The repo primarily uses the JSON config surface. This module exists so the
 * OpenCode package can be published cleanly and extended later.
 */

export async function AIDevKitOpenCodePlugin() {
  return {
    "file.edited": async () => undefined,
    "tool.execute.before": async () => undefined,
    "tool.execute.after": async () => undefined
  }
}

export default AIDevKitOpenCodePlugin

