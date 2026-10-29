/**
 * StoreController - Lit reactive controller for OverlayStore integration
 *
 * Provides automatic subscription management and component updates
 * when store state changes.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { OverlayStore } from './overlay-store.js';
import type { OverlayState } from './types.js';

/**
 * Lit reactive controller that integrates with OverlayStore
 *
 * @example
 * ```ts
 * class MyComponent extends LitElement {
 *   private storeController = new StoreController(this);
 *
 *   render() {
 *     const { mode, relayConnected } = this.storeController.state;
 *     return html`Mode: ${mode}, Connected: ${relayConnected}`;
 *   }
 * }
 * ```
 */
export class StoreController implements ReactiveController {
  host: ReactiveControllerHost;
  private unsubscribe?: () => void;
  private _state: Readonly<OverlayState>;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    this.host.addController(this);
    this._state = OverlayStore.getInstance().getState();
  }

  /**
   * Called when the host is connected to the document
   */
  hostConnected(): void {
    const store = OverlayStore.getInstance();

    this.unsubscribe = store.subscribe((state) => {
      this._state = state;
      this.host.requestUpdate();
    });
  }

  /**
   * Called when the host is disconnected from the document
   */
  hostDisconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /**
   * Get current state
   */
  get state(): Readonly<OverlayState> {
    return this._state;
  }

  /**
   * Get the store instance for direct manipulation
   */
  get store(): OverlayStore {
    return OverlayStore.getInstance();
  }
}
