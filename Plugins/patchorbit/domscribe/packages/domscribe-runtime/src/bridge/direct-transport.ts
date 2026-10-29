/**
 * DirectTransport - In-memory transport that delegates to RuntimeManager
 *
 * Used when the caller (overlay) runs in the same JS context as the runtime.
 *
 * @module @domscribe/runtime/bridge/direct-transport
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';
import type { IRuntimeTransport } from './transport.interface.js';
import { RuntimeManager } from '../core/runtime-manager.js';

export class DirectTransport implements IRuntimeTransport {
  private getRuntime(): RuntimeManager {
    return RuntimeManager.getInstance();
  }

  isReady(): boolean {
    try {
      return this.getRuntime().isReady();
    } catch {
      return false;
    }
  }

  async captureContextForEntry(
    entryId: ManifestEntryId,
  ): Promise<RuntimeContext | null> {
    try {
      return await this.getRuntime().captureContext(entryId);
    } catch {
      return null;
    }
  }

  getElementInfo(entryId: ManifestEntryId): ElementInfo | null {
    try {
      return this.getRuntime().getElementInfo(entryId);
    } catch {
      return null;
    }
  }

  getComponentName(entryId: ManifestEntryId): string | null {
    try {
      return this.getElementInfo(entryId)?.componentName ?? null;
    } catch {
      return null;
    }
  }

  getTrackedCount(): number {
    try {
      return this.getRuntime().getTrackedCount();
    } catch {
      return 0;
    }
  }
}
