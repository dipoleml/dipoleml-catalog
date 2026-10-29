import { describe, it, expect, vi } from 'vitest';

// vi.mock factories are hoisted before variable declarations,
// so we must define the mock fn inside the factory and export it.
const mockModuleState = { shouldThrow: false, result: {} as unknown };

vi.mock('node:module', () => ({
  createRequire: () => {
    const req = Object.assign(
      (specifier: string) => {
        if (mockModuleState.shouldThrow) {
          throw new Error(`Cannot find module '${specifier}'`);
        }
        return mockModuleState.result;
      },
      {
        resolve: (specifier: string) => `/resolved/${specifier}`,
      },
    );
    return req;
  },
}));

// Must import after mock setup
import { loadWebpackPlugin } from './webpack-plugin-loader.js';

describe('loadWebpackPlugin', () => {
  it('should return the DomscribeWebpackPlugin class when available', () => {
    class MockPlugin {}
    mockModuleState.shouldThrow = false;
    mockModuleState.result = { DomscribeWebpackPlugin: MockPlugin };

    const result = loadWebpackPlugin();

    expect(result).toBe(MockPlugin);
  });

  it('should return null when the module cannot be loaded', () => {
    mockModuleState.shouldThrow = true;

    const result = loadWebpackPlugin();

    expect(result).toBeNull();
  });
});
