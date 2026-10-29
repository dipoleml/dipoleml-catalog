/**
 * EventTransport - Stub for cross-context communication
 *
 * Future implementation will use postMessage / Chrome extension messaging
 * to communicate with RuntimeManager in a different JS context.
 *
 * All methods currently return safe fallback values (null / false / 0).
 *
 * @module @domscribe/runtime/bridge/event-transport
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';
import type { IRuntimeTransport } from './transport.interface.js';

export class EventTransport implements IRuntimeTransport {
  // Future: constructor will accept a target window or port for postMessage

  isReady(): boolean {
    return false;
  }

  async captureContextForEntry(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entryId: ManifestEntryId,
  ): Promise<RuntimeContext | null> {
    // Future: send { type: 'ds:captureContextForEntry', entryId } via postMessage
    // and await a response message with the result.
    return null;
  }

  getElementInfo(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entryId: ManifestEntryId,
  ): ElementInfo | null {
    // Future: synchronous cross-context access is not possible.
    // This will need to become async or use a cached snapshot.
    return null;
  }

  getComponentName(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entryId: ManifestEntryId,
  ): string | null {
    return null;
  }

  getTrackedCount(): number {
    return 0;
  }
}
