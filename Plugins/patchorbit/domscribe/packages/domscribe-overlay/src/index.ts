/**
 * @domscribe/overlay - Framework-agnostic overlay UI for pixel-to-code workflows
 * @module @domscribe/overlay
 */

// ============================================================================
// Core
// ============================================================================
export { initOverlay } from './core/init.js';
export { OverlayStore } from './core/overlay-store.js';

// ============================================================================
// Types
// ============================================================================
export type { OverlayOptions } from './core/types.js';

// ============================================================================
// Web Components (auto-registered on import)
// ============================================================================
import './components/ds-overlay.js';
