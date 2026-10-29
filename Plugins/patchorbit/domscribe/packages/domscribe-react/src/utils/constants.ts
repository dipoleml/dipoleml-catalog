/**
 * React constants and magic numbers
 * @module @domscribe/react/utils/constants
 */

/**
 * React Fiber tags
 *
 * These are internal constants used by React to identify different types of Fiber nodes.
 * Based on React's ReactWorkTags.js (values may vary slightly across React versions)
 *
 * @see https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactWorkTags.js
 */
export const REACT_FIBER_TAGS = {
  FunctionComponent: 0,
  ClassComponent: 1,
  IndeterminateComponent: 2, // Before we know whether it's function or class
  HostRoot: 3,
  HostPortal: 4,
  HostComponent: 5, // DOM element (div, span, etc.)
  HostText: 6, // Text node
  Fragment: 7,
  Mode: 8,
  ContextConsumer: 9,
  ContextProvider: 10,
  ForwardRef: 11,
  Profiler: 12,
  SuspenseComponent: 13,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
  LazyComponent: 16,
  IncompleteClassComponent: 17,
  DehydratedFragment: 18,
  SuspenseListComponent: 19,
  ScopeComponent: 21,
  OffscreenComponent: 22,
  LegacyHiddenComponent: 23,
  CacheComponent: 24,
  TracingMarkerComponent: 25,
} as const;

/**
 * React internal props to exclude from capture
 *
 * These props are internal to React and should not be included in captured props
 */
export const REACT_INTERNAL_PROPS = new Set([
  'children',
  'key',
  'ref',
  '__self',
  '__source',
  '__owner',
  '_owner',
  '_store',
  '$$typeof',
]);

/**
 * Common HOC (Higher Order Component) patterns
 *
 * Used to detect and unwrap HOC wrappers to find the underlying component
 */
export const COMMON_HOC_PATTERNS = [
  'withRouter',
  'withStyles',
  'withTheme',
  'connect', // Redux
  'observer', // MobX
  'inject', // MobX
  'withAuth',
  'withData',
  'withApollo', // Apollo
  'graphql', // Apollo
  'withTracker', // Meteor
  'pure', // Recompose
  'withProps', // Recompose
  'withState', // Recompose
  'withHandlers', // Recompose
  'lifecycle', // Recompose
  'branch', // Recompose
  'renderComponent', // Recompose
  'renderNothing', // Recompose
];

/**
 * Default options for various operations
 */
export const DEFAULT_OPTIONS = {
  /**
   * Default maximum tree depth
   */
  MAX_TREE_DEPTH: 50,

  /**
   * Default maximum hooks to parse
   */
  MAX_HOOKS: 100,

  /**
   * Default maximum wrapper depth
   */
  MAX_WRAPPER_DEPTH: 3,

  /**
   * Default capture strategy
   */
  CAPTURE_STRATEGY: 'best-effort' as const,

  /**
   * Default fallback component name
   */
  FALLBACK_COMPONENT_NAME: 'Anonymous',

  /**
   * Default hook name prefix
   */
  HOOK_NAME_PREFIX: 'hook_',
} as const;

/**
 * React element keys (different across React versions)
 */
export const REACT_ELEMENT_KEYS = {
  FIBER_16: '__reactInternalInstance',
  FIBER_17_18: '__reactFiber',
  PROPS_16: '__reactEventHandlers',
  PROPS_17_18: '__reactProps',
} as const;

/**
 * DevTools global hook key
 */
export const DEVTOOLS_HOOK_KEY = '__REACT_DEVTOOLS_GLOBAL_HOOK__';
