/**
 * Type shim for Nuxt's virtual #imports module.
 *
 * This module only resolves inside a running Nuxt build pipeline.
 * The runtime/ directory is shipped as raw TypeScript and compiled
 * by the user's Nuxt app, not by our package build.
 */
declare module '#imports' {
  export function defineNuxtPlugin(plugin: () => void | Promise<void>): unknown;
}
