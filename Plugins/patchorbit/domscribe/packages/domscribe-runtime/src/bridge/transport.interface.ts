/**
 * IRuntimeTransport - Transport-agnostic bridge contract
 *
 * All parameters are serializable (ID-based) to support implementations
 * that communicate over postMessage, Chrome extension messaging, etc.
 *
 * @module @domscribe/runtime/bridge/transport-interface
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';

export interface IRuntimeTransport {
  /** Check if the underlying RuntimeManager is initialized and ready. */
  isReady(): boolean;

  /** Capture runtime context (props, state) for an element by its data-ds ID. */
  captureContextForEntry(
    entryId: ManifestEntryId,
  ): Promise<RuntimeContext | null>;

  /** Get element info (DOM element, component instance, name) by data-ds ID. */
  getElementInfo(entryId: ManifestEntryId): ElementInfo | null;

  /** Get the component name for an element by its data-ds ID. */
  getComponentName(entryId: ManifestEntryId): string | null;

  /** Get the total number of tracked elements. */
  getTrackedCount(): number;
}
