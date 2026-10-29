/**
 * Auto-initializing entry point for the overlay.
 *
 * Importing this module automatically calls initOverlay().
 * Used by the webpack plugin which adds this as an entry point.
 */
import { initOverlay } from './core/init.js';

try {
  initOverlay();
} catch (e) {
  console.warn(
    '[domscribe] Failed to auto-init overlay:',
    e instanceof Error ? e.message : String(e),
  );
}
