/**
 * EventManager - Manages event capture/isolation for the overlay
 *
 * Handles:
 * - Capture mode event interception
 * - Keyboard shortcuts
 * - Element detection under pointer
 */

import { OverlayStore } from './overlay-store.js';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Event manager for overlay interactions
 */
export class EventManager {
  private static instance: EventManager | null = null;

  private store: OverlayStore;
  private isCapturing = false;
  private overlayElement: HTMLElement | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;

  private constructor() {
    this.store = OverlayStore.getInstance();
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundClick = this.handleClick.bind(this);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (EventManager.instance) {
      EventManager.instance.cleanup();
    }
    EventManager.instance = null;
  }

  /**
   * Set the overlay element reference (to exclude from element detection)
   */
  setOverlayElement(element: HTMLElement | null): void {
    this.overlayElement = element;
  }

  /**
   * Enable capture mode - intercept all pointer events
   */
  enableCapture(): void {
    if (this.isCapturing) return;

    this.isCapturing = true;

    // Add event listeners
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });
    document.addEventListener('mousemove', this.boundMouseMove, {
      capture: true,
    });
    document.addEventListener('click', this.boundClick, { capture: true });

    if (this.store.getState().debug) {
      console.log('[domscribe-overlay][event-manager] Capture mode enabled');
    }
  }

  /**
   * Disable capture mode - restore normal event flow
   */
  disableCapture(): void {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    // Remove event listeners
    window.removeEventListener('keydown', this.boundKeyDown, { capture: true });
    document.removeEventListener('mousemove', this.boundMouseMove, {
      capture: true,
    });
    document.removeEventListener('click', this.boundClick, { capture: true });

    if (this.store.getState().debug) {
      console.log('[domscribe-overlay][event-manager] Capture mode disabled');
    }
  }

  /**
   * Get element at point, ignoring overlay elements
   */
  getElementAtPoint(x: number, y: number): HTMLElement | null {
    // Temporarily hide overlay to get underlying element
    if (this.overlayElement) {
      const originalPointerEvents = this.overlayElement.style.pointerEvents;
      this.overlayElement.style.pointerEvents = 'none';

      const element = document.elementFromPoint(x, y) as HTMLElement | null;

      this.overlayElement.style.pointerEvents = originalPointerEvents;

      return element;
    }

    return document.elementFromPoint(x, y) as HTMLElement | null;
  }

  /**
   * Check if element is part of the overlay
   */
  isOverlayElement(element: HTMLElement | null): boolean {
    if (!element || !this.overlayElement) return false;

    // Check if element is the overlay or a descendant
    return (
      element === this.overlayElement ||
      this.overlayElement.contains(element) ||
      element.tagName.toLowerCase().startsWith('ds-')
    );
  }

  /**
   * Initialize global keyboard shortcuts (always active)
   */
  initGlobalShortcuts(): void {
    window.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  /**
   * Cleanup all event listeners
   */
  cleanup(): void {
    this.disableCapture();
    window.removeEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  // ============================================================================
  // Private event handlers
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    // ESC to exit capture mode
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.store.exitCaptureMode();
      this.disableCapture();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isCapturing) return;

    const element = this.getElementAtPoint(e.clientX, e.clientY);

    // Skip if it's an overlay element
    if (this.isOverlayElement(element)) {
      this.store.setState({ hoveredElement: null });
      return;
    }

    // Update hovered element
    if (element !== this.store.getState().hoveredElement) {
      this.store.setState({ hoveredElement: element });
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.isCapturing) return;

    const element = this.getElementAtPoint(e.clientX, e.clientY);

    // Skip if it's an overlay element
    if (this.isOverlayElement(element)) {
      return;
    }

    // Prevent default and stop propagation
    e.preventDefault();
    e.stopPropagation();

    if (element) {
      // Get data-ds attribute
      const entryId = element.getAttribute('data-ds');

      // Set selected element and exit capture mode
      this.store.setSelectedElement(element, entryId);
      this.store.exitCaptureMode();
      this.disableCapture();

      if (this.store.getState().debug) {
        console.log('[domscribe-overlay][event-manager] Element selected:', {
          element,
          entryId,
          tagName: element.tagName,
        });
      }
    }
  }

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    // Ctrl+Shift+D to toggle overlay
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.store.toggleSidebar();
    }

    // ESC to collapse (when not in capture mode)
    if (
      e.key === 'Escape' &&
      !this.isCapturing &&
      this.store.getState().mode === 'expanded'
    ) {
      this.store.setMode('collapsed');
    }
  }
}
