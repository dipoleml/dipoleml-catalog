/**
 * RelayWSClient - Browser WebSocket client for relay server
 *
 * Handles real-time communication including:
 * - Connection management with auto-reconnect
 * - Event subscription
 * - Message broadcasting
 */

import { API_PATHS, WS_EVENTS } from '@domscribe/core';
import type { WSMessage } from '../schema.js';

/**
 * WebSocket event handler type
 */
type WSEventHandler = (data: unknown) => void;

/**
 * Connection state
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/**
 * Browser WebSocket client for relay server
 */
export class RelayWSClient {
  /** WebSocket instance */
  private ws: WebSocket | null = null;
  /** Event handlers */
  private handlers: Map<string, Set<WSEventHandler>> = new Map();

  /** Reconnect attempts */
  private reconnectAttempts = 0;
  /** Maximum reconnect attempts */
  private maxReconnectAttempts = 5;
  /** Reconnect delay */
  private reconnectDelay = 1000;
  /** Reconnect timer */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debug mode */
  private debug: boolean;
  /** WebSocket URL */
  private url: URL;

  /** Connection state */
  private _state: ConnectionState = 'disconnected';

  constructor(
    private host: string,
    private port: number,
    options?: { debug?: boolean },
  ) {
    this.debug = options?.debug ?? false;
    this.url = new URL(API_PATHS.WS, `ws://${this.host}:${this.port}`);
  }

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Connect to the relay WebSocket server
   */
  connect(): void {
    if (this.ws && this._state !== 'disconnected') {
      if (this.debug) {
        console.log(
          '[domscribe-relay][ws-client] Already connected or connecting',
        );
      }
      return;
    }

    this._state = 'connecting';

    if (this.debug) {
      console.log(
        '[domscribe-relay][ws-client] Connecting to:',
        this.url.toString(),
      );
    }

    try {
      this.ws = new WebSocket(this.url.toString());

      this.ws.onopen = () => {
        this._state = 'connected';
        this.reconnectAttempts = 0;

        if (this.debug) {
          console.log('[domscribe-relay][ws-client] Connected');
        }

        this.handleMessage(WS_EVENTS.CONNECTED, {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          if (this.debug) {
            console.log('[domscribe-relay][ws-client] Message:', message);
          }

          this.handleMessage(message.event, message.data);
        } catch (error) {
          if (this.debug) {
            console.error(
              '[domscribe-relay][ws-client] Failed to parse message:',
              error,
            );
          }
        }
      };

      this.ws.onclose = (event) => {
        this._state = 'disconnected';
        this.ws = null;

        if (this.debug) {
          console.log(
            '[domscribe-relay][ws-client] Disconnected:',
            event.code,
            event.reason,
          );
        }

        this.handleMessage(WS_EVENTS.DISCONNECTED, {
          code: event.code,
          reason: event.reason,
        });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        if (this.debug) {
          console.error('[domscribe-relay][ws-client] Error:', error);
        }

        this.handleMessage(WS_EVENTS.ERROR, error);
        this.ws?.close();
      };
    } catch (error) {
      this._state = 'disconnected';

      if (this.debug) {
        console.error('[domscribe-relay][ws-client] Connection failed:', error);
      }

      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    // Cancel any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reset reconnect attempts
    this.reconnectAttempts = this.maxReconnectAttempts;

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this._state = 'disconnected';
  }

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on(event: string, handler: WSEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Send a message to the relay server
   */
  send(event: string, data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSMessage = { event, data };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to standard Domscribe events
   */
  onAnnotationCreated(handler: (data: unknown) => void): () => void {
    return this.on(WS_EVENTS.ANNOTATION_CREATED, handler);
  }

  onAnnotationUpdated(handler: (data: unknown) => void): () => void {
    return this.on(WS_EVENTS.ANNOTATION_UPDATED, handler);
  }

  onManifestUpdated(handler: (data: unknown) => void): () => void {
    return this.on(WS_EVENTS.MANIFEST_UPDATED, handler);
  }

  /**
   * Emit an event to all handlers
   */
  private handleMessage(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        if (this.debug) {
          console.error('[domscribe-relay][ws-client] Handler error:', error);
        }
      }
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.debug) {
        console.log(
          '[domscribe-relay][ws-client] Max reconnect attempts reached',
        );
      }
      return;
    }

    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    if (this.debug) {
      console.log(
        `[domscribe-relay][ws-client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
      );
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
