/**
 * React adapter type definitions
 * @module @domscribe/react/adapter/types
 */

import type { FrameworkAdapter } from '@domscribe/runtime';

/**
 * React DevTools global hook shape (window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
 */
export interface ReactDevToolsHook {
  renderers: Map<number, ReactDevToolsRenderer>;
  rendererInterfaces?: Map<number, ReactDevToolsRendererInterface>;
}

/**
 * Renderer entry exposed by the DevTools hook
 */
export interface ReactDevToolsRenderer {
  findFiberByHostInstance?: (instance: Element) => unknown;
  version?: string;
}

/**
 * Renderer interface entry exposed by the DevTools hook
 */
export interface ReactDevToolsRendererInterface {
  version?: string;
}

/**
 * Capture strategy for React component data
 *
 * - `devtools`: Use React DevTools hook (most reliable, requires DevTools)
 * - `fiber`: Direct Fiber tree access (fast, but React internal API)
 * - `best-effort`: Try multiple strategies in order of reliability
 */
export enum CaptureStrategy {
  DEVTOOLS = 'devtools',
  FIBER = 'fiber',
  BEST_EFFORT = 'best-effort',
}

/**
 * Configuration options for ReactAdapter
 */
export interface ReactAdapterOptions {
  /**
   * Capture strategy to use
   * @default CaptureStrategy.BEST_EFFORT
   */
  strategy?: CaptureStrategy;

  /**
   * Maximum depth to traverse the Fiber tree
   * @default 50
   */
  maxTreeDepth?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Include wrappers (HOC, memo, forwardRef) in component names
   * @default true
   */
  includeWrappers?: boolean;

  /**
   * Custom hook name resolvers for better debugging
   * Maps hook index to semantic name (e.g., { 0: 'count', 1: 'setCount' })
   */
  hookNameResolvers?: Map<string, Map<number, string>>;
}

/**
 * Internal state for ReactAdapter
 */
export interface ReactAdapterState {
  /**
   * Whether the adapter is initialized
   */
  initialized: boolean;

  /**
   * Detected React version
   */
  version?: string;

  /**
   * Whether React DevTools hook is available
   */
  hasDevTools: boolean;

  /**
   * Whether Fiber internals are accessible
   */
  hasFiberAccess: boolean;

  /**
   * Active capture strategy
   */
  activeStrategy: CaptureStrategy;
}

/**
 * Result of a component resolution operation
 */
export interface ComponentResolutionResult {
  /**
   * Whether the resolution was successful
   */
  success: boolean;

  /**
   * The component instance (Fiber node)
   */
  component?: unknown;

  /**
   * The capture strategy that succeeded
   */
  strategy?: CaptureStrategy;

  /**
   * Error if resolution failed
   */
  error?: Error;
}

/**
 * Extended FrameworkAdapter with React-specific methods
 */
export interface ReactFrameworkAdapter extends FrameworkAdapter {
  /**
   * Get the active capture strategy
   */
  getActiveStrategy(): CaptureStrategy;

  /**
   * Get the React version
   */
  getReactVersion(): string | null;

  /**
   * Check if React DevTools is available
   */
  hasDevToolsAccess(): boolean;
}
