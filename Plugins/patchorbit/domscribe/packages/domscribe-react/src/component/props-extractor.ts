/**
 * PropsExtractor - Extract props from React Fiber nodes
 *
 * Handles safe extraction of component props with filtering of internal React props.
 *
 * @module @domscribe/react/component/props-extractor
 */

import type { ExtendedReactFiber } from '../fiber/types.js';
import type {
  PropsExtractionResult,
  ComponentExtractionOptions,
} from './types.js';
import { REACT_INTERNAL_PROPS } from '../utils/constants.js';
import { PropsExtractionError } from '../errors/index.js';

/**
 * PropsExtractor class for extracting props from Fiber nodes
 */
export class PropsExtractor {
  /**
   * Extract props from a Fiber node
   *
   * @param fiber - Fiber node to extract props from
   * @param options - Extraction options
   * @returns Props extraction result
   */
  extract(
    fiber: ExtendedReactFiber,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: ComponentExtractionOptions,
  ): PropsExtractionResult {
    if (!fiber) {
      return {
        success: false,
        error: new Error('Fiber node is required'),
      };
    }

    try {
      const rawProps = this.getRawProps(fiber);

      // If no props, return empty result
      if (!rawProps) {
        return {
          success: true,
          props: {},
          filteredKeys: [],
        };
      }

      // Extract and filter props
      const { props, filteredKeys } = this.filterProps(rawProps);

      return {
        success: true,
        props,
        filteredKeys,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new PropsExtractionError('Props extraction failed'),
      };
    }
  }

  /**
   * Get raw props from Fiber node
   *
   * @param fiber - Fiber node
   * @returns Raw props object or null
   */
  private getRawProps(
    fiber: ExtendedReactFiber,
  ): Record<string, unknown> | null {
    // Try memoizedProps first (current props)
    if (fiber.memoizedProps) {
      return this.ensureRecord(fiber.memoizedProps);
    }

    // Fallback to pendingProps
    if (fiber.pendingProps) {
      return this.ensureRecord(fiber.pendingProps);
    }

    return null;
  }

  /**
   * Filter props to remove internal React props
   *
   * @param rawProps - Raw props object
   * @returns Filtered props and list of filtered keys
   */
  private filterProps(rawProps: Record<string, unknown>): {
    props: Record<string, unknown>;
    filteredKeys: string[];
  } {
    const props: Record<string, unknown> = {};
    const filteredKeys: string[] = [];

    for (const key of Object.keys(rawProps)) {
      // Skip internal React props
      if (this.shouldSkipProp(key)) {
        filteredKeys.push(key);
        continue;
      }

      props[key] = rawProps[key];
    }

    return { props, filteredKeys };
  }

  /**
   * Check if a prop should be skipped
   *
   * @param key - Prop key
   * @returns True if should skip
   */
  private shouldSkipProp(key: string): boolean {
    // Skip internal React props
    if (REACT_INTERNAL_PROPS.has(key)) {
      return true;
    }

    // Skip keys starting with __ (internal)
    if (key.startsWith('__')) {
      return true;
    }

    return false;
  }

  /**
   * Ensure a value is a record (object with string keys)
   *
   * @param value - Value to check
   * @returns Record or empty object
   */
  private ensureRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }
}
