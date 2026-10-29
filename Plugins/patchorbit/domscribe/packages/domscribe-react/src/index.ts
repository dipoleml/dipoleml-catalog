/**
 * @domscribe/react - React framework adapter for Domscribe
 *
 * Provides runtime context capture for React applications, including:
 * - Props and state extraction
 * - Component name resolution
 * - Fiber tree traversal
 *
 * @module @domscribe/react
 */

// ============================================================================
// Adapter
// ============================================================================
export { ReactAdapter, createReactAdapter } from './adapter/react-adapter.js';

// ============================================================================
// Types
// ============================================================================
export type {
  ReactAdapterOptions,
  ReactFrameworkAdapter,
} from './adapter/types.js';
export { CaptureStrategy } from './adapter/types.js';
