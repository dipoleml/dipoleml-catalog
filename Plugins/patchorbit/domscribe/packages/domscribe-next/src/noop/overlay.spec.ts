import { describe, it, expect } from 'vitest';
import { initOverlay } from './overlay.js';

describe('initOverlay (noop)', () => {
  it('should be a function', () => {
    expect(typeof initOverlay).toBe('function');
  });

  it('should return undefined', () => {
    const result = initOverlay();

    expect(result).toBeUndefined();
  });

  it('should not throw', () => {
    expect(() => initOverlay()).not.toThrow();
  });
});
