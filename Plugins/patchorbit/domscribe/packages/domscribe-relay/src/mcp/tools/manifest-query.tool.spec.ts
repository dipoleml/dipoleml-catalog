import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ManifestQueryTool } from './manifest-query.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('ManifestQueryTool', () => {
  describe('toolCallback', () => {
    it('should pass query params to client and return results', async () => {
      // Arrange
      const entries = [
        {
          id: 'ds_1',
          file: 'src/Button.tsx',
          start: { line: 5, column: 0 },
          end: { line: 5, column: 20 },
          componentName: 'Button',
          tagName: 'button',
          hash: 'abc',
        },
      ];
      const mockClient = createMockRelayClient({
        queryManifestEntries: vi.fn().mockResolvedValue({
          entries,
          total: 1,
          hasMore: false,
        }),
      });
      const tool = new ManifestQueryTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        file: 'Button',
        componentName: 'Button',
        tagName: 'button',
        limit: 10,
      });

      // Assert
      expect(mockClient.queryManifestEntries).toHaveBeenCalledWith({
        file: 'Button',
        componentName: 'Button',
        tagName: 'button',
        limit: 10,
      });
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['entries']).toEqual(entries);
      expect(structured['total']).toBe(1);
      expect(structured['hasMore']).toBe(false);
    });

    it('should pass optional params as undefined when not provided', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryManifestEntries: vi.fn().mockResolvedValue({
          entries: [],
          total: 0,
          hasMore: false,
        }),
      });
      const tool = new ManifestQueryTool(mockClient);

      // Act
      await tool.toolCallback({});

      // Assert
      expect(mockClient.queryManifestEntries).toHaveBeenCalledWith({
        file: undefined,
        componentName: undefined,
        tagName: undefined,
        limit: undefined,
      });
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        queryManifestEntries: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new ManifestQueryTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new ManifestQueryTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.MANIFEST_QUERY);
  });
});
