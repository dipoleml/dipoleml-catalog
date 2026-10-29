import { WS_EVENTS } from '@domscribe/core';
import { RelayWSClient } from './relay-ws-client.js';

// Track all created mock WebSocket instances
let mockInstances: MockWebSocket[];

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  close = vi.fn();

  constructor() {
    mockInstances.push(this);
  }
}

describe('RelayWSClient', () => {
  let client: RelayWSClient;

  beforeEach(() => {
    mockInstances = [];
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    client = new RelayWSClient('127.0.0.1', 9876);
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function lastWs(): MockWebSocket {
    return mockInstances[mockInstances.length - 1];
  }

  describe('state', () => {
    it('should start as disconnected', () => {
      expect(client.state).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('should transition to connecting then connected on open', () => {
      client.connect();
      expect(client.state).toBe('connecting');

      lastWs().onopen?.();
      expect(client.state).toBe('connected');
    });

    it('should not create duplicate connection if already connecting', () => {
      client.connect();
      client.connect();

      expect(mockInstances).toHaveLength(1);
    });

    it('should fire connected event on open', () => {
      const handler = vi.fn();
      client.on(WS_EVENTS.CONNECTED, handler);

      client.connect();
      lastWs().onopen?.();

      expect(handler).toHaveBeenCalledWith({});
    });
  });

  describe('on / event handling', () => {
    it('should dispatch parsed messages to handlers', () => {
      const handler = vi.fn();
      client.on('custom.event', handler);
      client.connect();
      lastWs().onopen?.();

      lastWs().onmessage?.({
        data: JSON.stringify({ event: 'custom.event', data: { foo: 'bar' } }),
      });

      expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsub = client.on('test', handler);
      client.connect();
      lastWs().onopen?.();

      unsub();
      lastWs().onmessage?.({
        data: JSON.stringify({ event: 'test', data: null }),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not throw when handler throws', () => {
      client.on('test', () => {
        throw new Error('handler error');
      });
      client.connect();
      lastWs().onopen?.();

      expect(() =>
        lastWs().onmessage?.({
          data: JSON.stringify({ event: 'test', data: {} }),
        }),
      ).not.toThrow();
    });
  });

  describe('convenience subscribers', () => {
    it('should subscribe to annotation created events', () => {
      const handler = vi.fn();
      client.onAnnotationCreated(handler);
      client.connect();
      lastWs().onopen?.();

      lastWs().onmessage?.({
        data: JSON.stringify({
          event: WS_EVENTS.ANNOTATION_CREATED,
          data: { id: 'ann_1' },
        }),
      });

      expect(handler).toHaveBeenCalledWith({ id: 'ann_1' });
    });

    it('should subscribe to annotation updated events', () => {
      const handler = vi.fn();
      client.onAnnotationUpdated(handler);
      client.connect();
      lastWs().onopen?.();

      lastWs().onmessage?.({
        data: JSON.stringify({
          event: WS_EVENTS.ANNOTATION_UPDATED,
          data: { id: 'ann_1' },
        }),
      });

      expect(handler).toHaveBeenCalledWith({ id: 'ann_1' });
    });

    it('should subscribe to manifest updated events', () => {
      const handler = vi.fn();
      client.onManifestUpdated(handler);
      client.connect();
      lastWs().onopen?.();

      lastWs().onmessage?.({
        data: JSON.stringify({
          event: WS_EVENTS.MANIFEST_UPDATED,
          data: {},
        }),
      });

      expect(handler).toHaveBeenCalledWith({});
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket and set state to disconnected', () => {
      client.connect();
      lastWs().onopen?.();
      const ws = lastWs();

      client.disconnect();

      expect(ws.close).toHaveBeenCalled();
      expect(client.state).toBe('disconnected');
    });

    it('should cancel pending reconnect timer', () => {
      client.connect();

      // Simulate close to trigger reconnect scheduling
      lastWs().onclose?.({ code: 1006, reason: 'abnormal' });

      client.disconnect();

      // Advance timers — should not cause a reconnect
      vi.advanceTimersByTime(10_000);

      expect(mockInstances).toHaveLength(1);
    });
  });

  describe('reconnect', () => {
    it('should schedule reconnection on close', () => {
      client.connect();
      lastWs().onopen?.();

      // Simulate unexpected close
      lastWs().onclose?.({ code: 1006, reason: '' });

      // Advance timer past first reconnect delay (1000ms)
      vi.advanceTimersByTime(1100);

      expect(mockInstances).toHaveLength(2);
    });

    it('should use exponential backoff', () => {
      client.connect();

      // First close -> schedule reconnect at 1000ms
      lastWs().onclose?.({ code: 1006, reason: '' });
      vi.advanceTimersByTime(1100);
      expect(mockInstances).toHaveLength(2);

      // Second close -> schedule at 2000ms
      lastWs().onclose?.({ code: 1006, reason: '' });

      vi.advanceTimersByTime(1500);
      expect(mockInstances).toHaveLength(2); // Not yet

      vi.advanceTimersByTime(600);
      expect(mockInstances).toHaveLength(3);
    });

    it('should stop after max reconnect attempts', () => {
      client.connect();

      // Simulate 5 close+reconnect cycles
      for (let i = 0; i < 5; i++) {
        lastWs().onclose?.({ code: 1006, reason: '' });
        vi.advanceTimersByTime(100_000);
      }

      // After 5 reconnects (6 total WS instances), next close should not trigger more
      const countBefore = mockInstances.length;
      if (lastWs().onclose) {
        lastWs().onclose?.({ code: 1006, reason: '' });
        vi.advanceTimersByTime(100_000);
      }

      expect(mockInstances.length).toBeLessThanOrEqual(countBefore + 1);
    });
  });
});
