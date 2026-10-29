/**
 * Overlay initialization
 *
 * Entry point for initializing the Domscribe overlay UI.
 * Called automatically when injected via build plugins, or manually by user.
 */

import { OverlayStore } from './overlay-store.js';
import { EventManager } from './event-manager.js';
import { RelayService } from '../services/relay-service.js';
import type { OverlayOptions } from './types.js';

// Import components to register them
import '../components/ds-overlay.js';

let initialized = false;

/**
 * Initialize the Domscribe overlay
 *
 * @example
 * ```ts
 * // Auto-initialization via build plugin (reads window.__DOMSCRIBE_OVERLAY_OPTIONS__)
 * import('@domscribe/overlay').then(m => m.initOverlay());
 *
 * // Manual initialization with options
 * import { initOverlay } from '@domscribe/overlay';
 * initOverlay({ initialMode: 'expanded', debug: true });
 * ```
 */
export async function initOverlay(options?: OverlayOptions): Promise<void> {
  if (typeof window !== 'undefined' && !window.__DOMSCRIBE_RELAY_PORT__) {
    console.warn(
      '[domscribe-overlay] No active Domscribe dev session detected. ' +
        'Overlay is dev-only and will not initialize in production.',
    );
    return;
  }

  if (initialized) {
    console.warn('[domscribe-overlay] Already initialized');
    return;
  }

  // Merge with window options (from build plugin injection)
  const resolvedOptions: OverlayOptions = {
    ...window.__DOMSCRIBE_OVERLAY_OPTIONS__,
    ...options,
  };

  const debug = resolvedOptions.debug ?? false;

  if (debug) {
    console.log('[domscribe-overlay] Initializing...', resolvedOptions);
  }

  // Initialize store with options
  OverlayStore.getInstance(resolvedOptions);

  // Initialize event manager
  const eventManager = EventManager.getInstance();
  eventManager.initGlobalShortcuts();

  // Initialize relay service
  const relayService = RelayService.getInstance();
  const connected = await relayService.initialize();

  if (debug) {
    console.log('[domscribe-overlay] Relay connection:', connected);
  }

  // Create and append overlay element
  const overlay = document.createElement('ds-overlay');
  document.body.appendChild(overlay);

  // Set overlay element reference for event manager
  eventManager.setOverlayElement(overlay);

  initialized = true;

  if (debug) {
    console.log('[domscribe-overlay] Initialized successfully');
    console.log('[domscribe-overlay] Keyboard shortcuts:');
    console.log('  Ctrl+Shift+D - Toggle overlay');
    console.log('  ESC - Cancel capture / Collapse sidebar');
  }
}

/**
 * Check if overlay is initialized
 */
export function isOverlayInitialized(): boolean {
  return initialized;
}

/**
 * Reset overlay (for testing)
 */
export function resetOverlay(): void {
  OverlayStore.resetInstance();
  EventManager.resetInstance();
  RelayService.resetInstance();

  // Remove overlay element
  const overlay = document.querySelector('ds-overlay');
  overlay?.remove();

  initialized = false;
}
