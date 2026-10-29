/**
 * React Fiber type definitions
 * @module @domscribe/react/fiber/types
 */

/**
 * Component category classification
 */
export enum ComponentCategory {
  /** User-defined function component */
  USER_FUNCTION = 'user-function',

  /** User-defined class component */
  USER_CLASS = 'user-class',

  /** Higher Order Component wrapper */
  HOC = 'hoc',

  /** React.memo wrapper */
  MEMO = 'memo',

  /** React.forwardRef wrapper */
  FORWARD_REF = 'forward-ref',

  /** React.lazy wrapper */
  LAZY = 'lazy',

  /** React internal component (Suspense, Profiler, etc.) */
  SYSTEM = 'system',

  /** Host component (DOM element like div, span) */
  HOST = 'host',

  /** Text node */
  TEXT = 'text',

  /** Fragment */
  FRAGMENT = 'fragment',

  /** Unknown or unclassified */
  UNKNOWN = 'unknown',
}

/**
 * Extended React Fiber node with comprehensive type information
 *
 * Based on React's internal Fiber structure but enhanced for our needs.
 * This extends the basic ReactFiber from @domscribe/runtime/devtools/types.
 */
export interface ExtendedReactFiber {
  /**
   * Fiber tag (identifies the type of fiber)
   */
  tag: number;

  /**
   * The resolved type of this element
   */
  type?: unknown;

  /**
   * Component key for reconciliation
   */
  key?: string | null;

  /**
   * Current props
   */
  memoizedProps?: Record<string, unknown>;

  /**
   * Pending props (for updates)
   */
  pendingProps?: Record<string, unknown>;

  /**
   * Current state (or hook chain for function components)
   */
  memoizedState?: unknown;

  /**
   * Dependencies for memoization
   */
  dependencies?: unknown;

  /**
   * The actual DOM node or component instance
   */
  stateNode?: unknown;

  /**
   * Parent fiber
   */
  return?: ExtendedReactFiber;

  /**
   * First child fiber
   */
  child?: ExtendedReactFiber;

  /**
   * Next sibling fiber
   */
  sibling?: ExtendedReactFiber;

  /**
   * Index within parent's children
   */
  index?: number;

  /**
   * Ref object or callback
   */
  ref?: unknown;

  /**
   * Effect flags (side effects to perform)
   */
  flags?: number;

  /**
   * Subtree flags (effects in subtree)
   */
  subtreeFlags?: number;

  /**
   * Alternate fiber (work in progress vs current)
   */
  alternate?: ExtendedReactFiber;

  /**
   * Element type (for debugging)
   */
  elementType?: unknown;

  /**
   * Owner fiber (component that created this element)
   */
  _debugOwner?: ExtendedReactFiber;

  /**
   * Debug source location
   */
  _debugSource?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };

  /**
   * Component name (for debugging)
   */
  _debugHookTypes?: string[];

  /**
   * React DevTools extension data
   */
  _debugID?: number;
}

/**
 * Options for Fiber tree walking
 */
export interface FiberWalkOptions {
  /**
   * Maximum depth to traverse
   * @default 50
   */
  maxDepth?: number;

  /**
   * Include host components (DOM elements)
   * @default false
   */
  includeHost?: boolean;

  /**
   * Include text nodes
   * @default false
   */
  includeText?: boolean;

  /**
   * Include React system components (Suspense, Profiler, etc.)
   * @default false
   */
  includeSystem?: boolean;

  /**
   * Walk direction: 'up' (ancestors), 'down' (descendants), or 'siblings'
   * @default 'up'
   */
  direction?: 'up' | 'down' | 'siblings';

  /**
   * Predicate function to filter fibers
   */
  filter?: (fiber: ExtendedReactFiber) => boolean;
}
