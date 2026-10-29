/**
 * AI Dev Kit OpenCode package entrypoint.
 *
 * This keeps the published surface small and predictable while still exposing
 * the plugin metadata and helper exports used by the package build.
 */

export { AIDevKitOpenCodePlugin, default } from "./plugins/index.js"
export * from "./plugins/index.js"
export * from "./tools/index.js"

export const VERSION = "1.0.0"

export const metadata = {
  name: "ai-dev-kit-opencode",
  version: VERSION,
  description: "OpenCode package surface for AI Dev Kit",
  author: "Noah Sheldon"
}

