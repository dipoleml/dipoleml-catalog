import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResolveBatchTool } from './resolve-batch.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('ResolveBatchTool', () => {
  describe('toolCallback', () => {
    it('should resolve multiple entries and map results', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        batchResolveManifestEntries: vi.fn().mockResolvedValue({
          results: {
            ds_a: {
              success: true,
              entry: {
                file: 'src/A.tsx',
                start: { line: 1, column: 0 },
                end: { line: 1, column: 20 },
                componentName: 'A',
                tagName: 'div',
              },
            },
            ds_b: {
              success: false,
              error: 'Not found',
            },
          },
          resolveTimeMs: 12,
          count: 2,
        }),
      });
      const tool = new ResolveBatchTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        elementIds: ['ds_a', 'ds_b'],
      });

      // Assert
      expect(mockClient.batchResolveManifestEntries).toHaveBeenCalledWith([
        'ds_a',
        'ds_b',
      ]);
      const structured = result.structuredContent as Record<string, unknown>;
      const results = structured['results'] as Record<string, unknown>;
      expect(results['ds_a']).toEqual({
        found: true,
        file: 'src/A.tsx',
        start: { line: 1, column: 0 },
        end: { line: 1, column: 20 },
        componentName: 'A',
        tagName: 'div',
        error: undefined,
      });
      expect(results['ds_b']).toEqual({
        found: false,
        file: undefined,
        start: undefined,
        end: undefined,
        componentName: undefined,
        tagName: undefined,
        error: 'Not found',
      });
      expect(structured['resolveTimeMs']).toBe(12);
      expect(structured['count']).toBe(2);
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        batchResolveManifestEntries: vi
          .fn()
          .mockRejectedValue(new Error('timeout')),
      });
      const tool = new ResolveBatchTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        elementIds: ['ds_a'],
      });

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new ResolveBatchTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.RESOLVE_BATCH);
    expect(tool.description).toContain('multiple');
  });
});
