/**
 * @domscribe/nuxt - Nuxt module for Domscribe
 *
 * Zero-config Nuxt integration that provides:
 * - Build-time AST injection of stable element IDs (Vite + Webpack)
 * - Automatic RuntimeManager + VueAdapter initialization (client-only)
 * - Relay auto-start and overlay injection
 *
 * @module @domscribe/nuxt
 */

export { domscribeModule as default } from './module.js';
export type { DomscribeNuxtOptions } from './types.js';
