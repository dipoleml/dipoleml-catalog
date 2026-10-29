/**
 * Type guard functions for React structures
 * @module @domscribe/react/utils/type-guards
 */

import type { ExtendedReactFiber } from '../fiber/types.js';
import { REACT_FIBER_TAGS, REACT_ELEMENT_KEYS } from './constants.js';
import type {
  ReactDevToolsHook,
  ReactDevToolsRenderer,
  ReactDevToolsRendererInterface,
} from '../adapter/types.js';

/**
 * Check if a value is a React Fiber node
 */
export function isReactFiber(value: unknown): value is ExtendedReactFiber {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag' in value &&
    typeof (value as { tag: unknown }).tag === 'number' &&
    'memoizedProps' in value
  );
}

/**
 * Check if a Fiber node is a component fiber (user or HOC)
 */
export function isComponentFiber(fiber: ExtendedReactFiber): boolean {
  return (
    fiber.tag === REACT_FIBER_TAGS.FunctionComponent ||
    fiber.tag === REACT_FIBER_TAGS.ClassComponent ||
    fiber.tag === REACT_FIBER_TAGS.ForwardRef ||
    fiber.tag === REACT_FIBER_TAGS.MemoComponent ||
    fiber.tag === REACT_FIBER_TAGS.SimpleMemoComponent
  );
}

/**
 * Check if an element has React Fiber keys
 */
export function hasReactFiberKey(element: HTMLElement): boolean {
  const keys = Object.keys(element);
  return keys.some(
    (key) =>
      key.startsWith(REACT_ELEMENT_KEYS.FIBER_16) ||
      key.startsWith(REACT_ELEMENT_KEYS.FIBER_17_18),
  );
}

/**
 * Check if a value is a React DevTools global hook
 */
export function isReactDevToolsHook(
  value: unknown,
): value is ReactDevToolsHook {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (
    !('renderers' in value) ||
    typeof value.renderers !== 'object' ||
    value.renderers === null
  ) {
    return false;
  }

  if (
    Object.values(value.renderers).some(
      (renderer) => !isReactDevToolsRenderer(renderer),
    )
  ) {
    return false;
  }

  if ('rendererInterfaces' in value) {
    if (
      typeof value.rendererInterfaces !== 'object' ||
      value.rendererInterfaces === null
    ) {
      return false;
    }

    if (
      Object.values(value.rendererInterfaces).some(
        (rendererInterface) =>
          !isReactDevToolsRendererInterface(rendererInterface),
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a value is a React DevTools renderer entry
 */
export function isReactDevToolsRenderer(
  value: unknown,
): value is ReactDevToolsRenderer {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('findFiberByHostInstance' in value)) {
    return false;
  }

  if (typeof value.findFiberByHostInstance !== 'function') {
    return false;
  }

  if ('version' in value && typeof value.version !== 'string') {
    return false;
  }

  return true;
}

/**
 * Check if a value is a React DevTools renderer interface entry
 */
export function isReactDevToolsRendererInterface(
  value: unknown,
): value is ReactDevToolsRendererInterface {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if ('version' in value && typeof value.version !== 'string') {
    return false;
  }

  return true;
}
