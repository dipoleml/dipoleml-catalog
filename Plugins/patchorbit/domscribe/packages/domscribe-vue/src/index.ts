/**
 * @domscribe/vue - Vue framework adapter for Domscribe
 *
 * Provides runtime context capture for Vue 3 applications, including:
 * - Props and state extraction
 * - Component name resolution
 * - Vue DevTools integration
 * - Composition API and Options API support
 *
 * @module @domscribe/vue
 */

// ============================================================================
// Public API - Minimal exports (only what consumers need)
// ============================================================================

// Adapter
export { VueAdapter, createVueAdapter } from './adapter/vue-adapter.js';

// Types
export type {
  VueAdapterOptions,
  VueFrameworkAdapter,
} from './adapter/types.js';
