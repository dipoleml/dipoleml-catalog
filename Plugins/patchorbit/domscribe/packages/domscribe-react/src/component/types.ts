/**
 * React component type definitions
 * @module @domscribe/react/component/types
 */

import type { ComponentCategory } from '../fiber/types.js';

/**
 * Comprehensive component information
 */
export interface ComponentInfo {
  /**
   * Component name (resolved)
   */
  name: string;

  /**
   * Display name (may include HOC wrappers)
   */
  displayName?: string;

  /**
   * Component category
   */
  category: ComponentCategory;

  /**
   * Whether this is a function component
   */
  isFunctionComponent: boolean;

  /**
   * Whether this is a class component
   */
  isClassComponent: boolean;

  /**
   * Whether this component uses hooks
   */
  usesHooks: boolean;

  /**
   * Component props
   */
  props?: Record<string, unknown>;

  /**
   * Component state (for class components or parsed hooks)
   */
  state?: Record<string, unknown>;

  /**
   * Parsed hooks (for function components)
   */
  hooks?: unknown[];

  /**
   * HOC wrapper chain (outermost to innermost)
   */
  wrappers?: string[];

  /**
   * Owner component name
   */
  owner?: string;

  /**
   * Source location if available
   */
  source?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };

  /**
   * Component tree depth
   */
  depth?: number;
}

/**
 * Component name resolution result
 */
export interface NameResolutionResult {
  /**
   * Resolved name
   */
  name: string;

  /**
   * Display name (with wrappers)
   */
  displayName?: string;

  /**
   * Confidence level (0-1)
   */
  confidence: number;

  /**
   * Resolution method used
   */
  method:
    | 'displayName'
    | 'function-name'
    | 'class-name'
    | 'type-name'
    | 'debug-owner'
    | 'fallback';

  /**
   * HOC wrappers detected
   */
  wrappers: string[];
}

/**
 * Component name resolution options
 */
export interface NameResolutionOptions {
  /**
   * Include HOC wrappers in display name
   * @default false
   */
  includeWrappers?: boolean;

  /**
   * Fallback name if resolution fails
   * @default 'Anonymous'
   */
  fallbackName?: string;

  /**
   * Maximum wrapper depth to include
   * @default 3
   */
  maxWrapperDepth?: number;
}

/**
 * Component metadata for debugging
 */
export interface ComponentMetadata {
  /**
   * React element type
   */
  elementType?: unknown;

  /**
   * Component type (function, class, etc.)
   */
  type?: unknown;

  /**
   * Debug ID (React DevTools)
   */
  debugId?: number;

  /**
   * Debug hook types (if available)
   */
  debugHookTypes?: string[];

  /**
   * Fiber tag
   */
  fiberTag?: number;

  /**
   * Key used for reconciliation
   */
  key?: string | null;

  /**
   * Ref attached to this component
   */
  hasRef: boolean;
}

/**
 * Component tree building options
 */
export interface ComponentTreeOptions {
  /**
   * Maximum depth to traverse
   * @default 10
   */
  maxDepth?: number;

  /**
   * Include host components (DOM elements)
   * @default false
   */
  includeHost?: boolean;

  /**
   * Include HOC wrappers
   * @default false
   */
  includeHOC?: boolean;

  /**
   * Include React system components
   * @default false
   */
  includeSystem?: boolean;

  /**
   * Include props in the tree
   * @default false
   */
  includeProps?: boolean;

  /**
   * Include state in the tree
   * @default false
   */
  includeState?: boolean;
}

/**
 * Component extraction options
 */
export interface ComponentExtractionOptions {
  /**
   * Extract props
   * @default true
   */
  extractProps?: boolean;

  /**
   * Extract state
   * @default true
   */
  extractState?: boolean;

  /**
   * Extract hooks (for function components)
   * @default true
   */
  extractHooks?: boolean;

  /**
   * Include component metadata
   * @default false
   */
  includeMetadata?: boolean;

  /**
   * Include source location
   * @default false
   */
  includeSource?: boolean;
}

/**
 * Component props extraction result
 */
export interface PropsExtractionResult {
  /**
   * Whether extraction was successful
   */
  success: boolean;

  /**
   * Extracted props
   */
  props?: Record<string, unknown>;

  /**
   * Props that were filtered out (internal, private, etc.)
   */
  filteredKeys?: string[];

  /**
   * Error if extraction failed
   */
  error?: Error;
}

/**
 * Component state extraction result
 */
export interface StateExtractionResult {
  /**
   * Whether extraction was successful
   */
  success: boolean;

  /**
   * Extracted state
   */
  state?: Record<string, unknown>;

  /**
   * Whether this is a class component state or hooks state
   */
  stateType: 'class' | 'hooks' | 'none';

  /**
   * Parsed hooks (if function component)
   */
  hooks?: unknown[];

  /**
   * Error if extraction failed
   */
  error?: Error;
}
