import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ManifestStatsTool } from './manifest-stats.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('ManifestStatsTool', () => {
  describe('toolCallback', () => {
    it('should return manifest statistics', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getManifestStats: vi.fn().mockResolvedValue({
          entryCount: 150,
          fileCount: 25,
          componentCount: 12,
          lastUpdated: '2026-03-16T10:00:00Z',
          cacheHitRate: 0.85,
        }),
      });
      const tool = new ManifestStatsTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.structuredContent).toEqual({
        entryCount: 150,
        fileCount: 25,
        componentCount: 12,
        lastUpdated: '2026-03-16T10:00:00Z',
        cacheHitRate: 0.85,
      });
    });

    it('should handle null lastUpdated', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getManifestStats: vi.fn().mockResolvedValue({
          entryCount: 0,
          fileCount: 0,
          componentCount: 0,
          lastUpdated: null,
          cacheHitRate: 0,
        }),
      });
      const tool = new ManifestStatsTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['lastUpdated']).toBeNull();
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getManifestStats: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new ManifestStatsTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new ManifestStatsTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.MANIFEST_STATS);
  });
});
