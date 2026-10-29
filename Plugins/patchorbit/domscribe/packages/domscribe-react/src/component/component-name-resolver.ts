/**
 * ComponentNameResolver - Resolve component names from React Fiber nodes
 *
 * Handles name resolution with wrapper detection (HOC, memo, forwardRef),
 * fallback strategies, and display name formatting.
 *
 * @module @domscribe/react/component/component-name-resolver
 */

import type { ExtendedReactFiber } from '../fiber/types.js';
import type { NameResolutionResult, NameResolutionOptions } from './types.js';
import {
  REACT_FIBER_TAGS,
  COMMON_HOC_PATTERNS,
  DEFAULT_OPTIONS,
} from '../utils/constants.js';
import { NameResolutionError } from '../errors/index.js';

/**
 * ComponentNameResolver class for resolving component names from Fiber nodes
 */
export class ComponentNameResolver {
  /**
   * Resolve the name of a component from its Fiber node
   *
   * @param fiber - Fiber node to resolve name from
   * @param options - Resolution options
   * @returns Name resolution result
   * @throws {NameResolutionError} If fiber is invalid
   */
  resolve(
    fiber: ExtendedReactFiber,
    options?: NameResolutionOptions,
  ): NameResolutionResult {
    if (!fiber) {
      throw new NameResolutionError('Fiber node is required');
    }

    const opts = this.normalizeOptions(options);

    // Handle host components (DOM elements)
    if (fiber.tag === REACT_FIBER_TAGS.HostComponent) {
      return this.resolveHostComponent(fiber);
    }

    // Handle text nodes
    if (fiber.tag === REACT_FIBER_TAGS.HostText) {
      return this.resolveTextNode();
    }

    // Resolve with wrapper analysis if enabled
    if (opts.includeWrappers) {
      return this.resolveWithWrappers(fiber, opts);
    }

    // Simple resolution
    return this.resolveSimple(fiber, opts);
  }

  /**
   * Resolve host component (DOM element) name
   *
   * @param fiber - Host component Fiber node
   * @returns Name resolution result
   */
  private resolveHostComponent(
    fiber: ExtendedReactFiber,
  ): NameResolutionResult {
    const tagName =
      typeof fiber.type === 'string' ? fiber.type : 'UnknownElement';

    return {
      name: tagName,
      displayName: tagName,
      method: 'type-name',
      confidence: 1.0,
      wrappers: [],
    };
  }

  /**
   * Resolve text node name
   *
   * @returns Name resolution result for text nodes
   */
  private resolveTextNode(): NameResolutionResult {
    return {
      name: 'Text',
      displayName: 'Text',
      method: 'type-name',
      confidence: 1.0,
      wrappers: [],
    };
  }

  /**
   * Resolve component name without wrapper analysis
   *
   * @param fiber - Fiber node
   * @param options - Resolution options
   * @returns Name resolution result
   */
  private resolveSimple(
    fiber: ExtendedReactFiber,
    options: Required<NameResolutionOptions>,
  ): NameResolutionResult {
    // Try type.displayName
    const displayName = this.extractDisplayName(fiber);
    if (displayName) {
      return {
        name: displayName,
        displayName,
        method: 'displayName',
        confidence: 1.0,
        wrappers: [],
      };
    }

    // Try type.name
    const typeName = this.extractTypeName(fiber);
    if (typeName) {
      // Determine if function or class
      const isFunction = typeof fiber.type === 'function';
      return {
        name: typeName,
        displayName: typeName,
        method: isFunction ? 'function-name' : 'type-name',
        confidence: 0.8,
        wrappers: [],
      };
    }

    // Try elementType
    const elementTypeName = this.extractElementTypeName(fiber);
    if (elementTypeName) {
      return {
        name: elementTypeName,
        displayName: elementTypeName,
        method: 'type-name',
        confidence: 0.5,
        wrappers: [],
      };
    }

    // Fallback
    return {
      name: options.fallbackName,
      displayName: options.fallbackName,
      method: 'fallback',
      confidence: 0.0,
      wrappers: [],
    };
  }

  /**
   * Resolve component name with wrapper analysis
   *
   * @param fiber - Fiber node
   * @param options - Resolution options
   * @returns Name resolution result with wrapper chain
   */
  private resolveWithWrappers(
    fiber: ExtendedReactFiber,
    options: Required<NameResolutionOptions>,
  ): NameResolutionResult {
    const wrappers: string[] = [];
    let currentFiber = fiber;
    let depth = 0;

    // Unwrap layers
    while (depth < options.maxWrapperDepth) {
      // Check for memo
      if (
        currentFiber.tag === REACT_FIBER_TAGS.MemoComponent ||
        currentFiber.tag === REACT_FIBER_TAGS.SimpleMemoComponent
      ) {
        wrappers.push('memo');
        const unwrapped = this.unwrapMemo(currentFiber);
        if (unwrapped === currentFiber) break;
        currentFiber = unwrapped;
      }
      // Check for forwardRef
      else if (currentFiber.tag === REACT_FIBER_TAGS.ForwardRef) {
        wrappers.push('forwardRef');
        const unwrapped = this.unwrapForwardRef(currentFiber);
        if (unwrapped === currentFiber) break;
        currentFiber = unwrapped;
      }
      // Check for HOC patterns
      else {
        const hocName = this.detectHOCPattern(currentFiber);
        if (hocName) {
          wrappers.push(hocName);
          const unwrapped = this.unwrapHOC(currentFiber);
          if (unwrapped === currentFiber) break;
          currentFiber = unwrapped;
        } else {
          break; // No more wrappers
        }
      }

      depth++;
    }

    // Get the innermost component name
    const innerResult = this.resolveSimple(currentFiber, options);

    // Build display name with wrappers
    const displayName =
      wrappers.length > 0
        ? this.formatWrappedName(innerResult.name, wrappers)
        : innerResult.name;

    return {
      name: innerResult.name,
      displayName,
      method: innerResult.method,
      confidence: innerResult.confidence,
      wrappers,
    };
  }

  /**
   * Extract displayName from Fiber type
   *
   * @param fiber - Fiber node
   * @returns Display name or null
   */
  private extractDisplayName(fiber: ExtendedReactFiber): string | null {
    const type = fiber.type;

    // Check function components (e.g., MyComponent.displayName = 'Pretty')
    if (
      typeof type === 'function' &&
      'displayName' in type &&
      typeof type.displayName === 'string' &&
      type.displayName.length > 0
    ) {
      return type.displayName;
    }

    // Check object types (e.g., memo/forwardRef wrappers with displayName)
    if (
      type &&
      typeof type === 'object' &&
      'displayName' in type &&
      typeof type.displayName === 'string' &&
      type.displayName.length > 0
    ) {
      return type.displayName;
    }

    return null;
  }

  /**
   * Extract name from Fiber type
   *
   * @param fiber - Fiber node
   * @returns Type name or null
   */
  private extractTypeName(fiber: ExtendedReactFiber): string | null {
    const type = fiber.type;

    if (typeof type === 'function' && type.name) {
      return type.name;
    }

    if (
      type &&
      typeof type === 'object' &&
      'name' in type &&
      typeof type.name === 'string' &&
      type.name.length > 0
    ) {
      return type.name;
    }

    return null;
  }

  /**
   * Extract name from Fiber elementType
   *
   * @param fiber - Fiber node
   * @returns Element type name or null
   */
  private extractElementTypeName(fiber: ExtendedReactFiber): string | null {
    const elementType = fiber.elementType;

    if (typeof elementType === 'string') {
      return elementType;
    }

    if (typeof elementType === 'function' && elementType.name) {
      return elementType.name;
    }

    if (
      elementType &&
      typeof elementType === 'object' &&
      'displayName' in elementType &&
      typeof elementType.displayName === 'string'
    ) {
      return elementType.displayName;
    }

    if (
      elementType &&
      typeof elementType === 'object' &&
      'name' in elementType &&
      typeof elementType.name === 'string'
    ) {
      return elementType.name;
    }

    return null;
  }

  /**
   * Detect HOC pattern from component name
   *
   * @param fiber - Fiber node
   * @returns HOC name or null
   */
  private detectHOCPattern(fiber: ExtendedReactFiber): string | null {
    const name = this.extractTypeName(fiber) || this.extractDisplayName(fiber);
    if (!name) {
      return null;
    }

    const matchedPattern = COMMON_HOC_PATTERNS.find((pattern) =>
      name.startsWith(pattern),
    );
    return matchedPattern || null;
  }

  /**
   * Unwrap a memo component to get the inner component
   *
   * @param fiber - Memo Fiber node
   * @returns Unwrapped Fiber
   */
  private unwrapMemo(fiber: ExtendedReactFiber): ExtendedReactFiber {
    // Try to get the inner type from elementType
    if (
      fiber.elementType &&
      typeof fiber.elementType === 'object' &&
      fiber.elementType !== null &&
      'type' in fiber.elementType
    ) {
      const innerType = fiber.elementType.type;
      // Create a synthetic fiber with the inner type and reset tag
      // so the unwrap loop doesn't re-match this as a memo wrapper
      return {
        ...fiber,
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: innerType,
        elementType: innerType,
      };
    }

    return fiber;
  }

  /**
   * Unwrap a forwardRef component to get the inner component
   *
   * @param fiber - ForwardRef Fiber node
   * @returns Unwrapped Fiber
   */
  private unwrapForwardRef(fiber: ExtendedReactFiber): ExtendedReactFiber {
    // Try to get the render function from elementType
    if (
      fiber.elementType &&
      typeof fiber.elementType === 'object' &&
      fiber.elementType !== null &&
      'render' in fiber.elementType
    ) {
      const renderFn = fiber.elementType.render;
      // Create a synthetic fiber with the render function as type and reset tag
      // so the unwrap loop doesn't re-match this as a forwardRef wrapper
      return {
        ...fiber,
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: renderFn,
        elementType: renderFn,
      };
    }

    return fiber;
  }

  /**
   * Unwrap an HOC to get the inner component
   *
   * @param fiber - HOC Fiber node
   * @returns Unwrapped Fiber (or original if can't unwrap)
   */
  private unwrapHOC(fiber: ExtendedReactFiber): ExtendedReactFiber {
    // For HOCs, we can't reliably unwrap without runtime inspection
    // This is a best-effort attempt using child
    if (fiber.child) {
      return fiber.child;
    }

    return fiber;
  }

  /**
   * Format a component name with its wrapper chain
   *
   * @param name - Component name
   * @param wrappers - Wrapper names
   * @returns Formatted name
   */
  private formatWrappedName(name: string, wrappers: string[]): string {
    if (wrappers.length === 0) {
      return name;
    }

    // Format: wrapper1(wrapper2(Component))
    return `${wrappers.join('(')}(${name}${')'.repeat(wrappers.length)}`;
  }

  /**
   * Normalize resolution options with defaults
   *
   * @param options - User-provided options
   * @returns Normalized options
   */
  private normalizeOptions(
    options?: NameResolutionOptions,
  ): Required<NameResolutionOptions> {
    return {
      includeWrappers: options?.includeWrappers ?? false,
      maxWrapperDepth:
        options?.maxWrapperDepth ?? DEFAULT_OPTIONS.MAX_WRAPPER_DEPTH,
      fallbackName:
        options?.fallbackName ?? DEFAULT_OPTIONS.FALLBACK_COMPONENT_NAME,
    };
  }
}
