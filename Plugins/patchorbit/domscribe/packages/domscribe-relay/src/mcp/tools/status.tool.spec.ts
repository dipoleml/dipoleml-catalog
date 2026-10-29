import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StatusTool } from './status.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('StatusTool', () => {
  describe('toolCallback', () => {
    it('should return relay, manifest, and annotation status', async () => {
      // Arrange
      const statusResponse = {
        relay: {
          version: '0.1.0',
          uptime: 3600,
          port: 9876,
        },
        manifest: {
          entryCount: 100,
          fileCount: 20,
          componentCount: 10,
          lastUpdated: '2026-03-16T10:00:00Z',
          cacheHitRate: 0.9,
        },
        annotations: {
          queued: 3,
          processing: 1,
          processed: 10,
          failed: 2,
          archived: 5,
        },
      };
      const mockClient = createMockRelayClient({
        getStatus: vi.fn().mockResolvedValue(statusResponse),
      });
      const tool = new StatusTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.structuredContent).toEqual(statusResponse);
    });

    it('should default missing annotation counts to zero', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getStatus: vi.fn().mockResolvedValue({
          relay: { version: '0.1.0', uptime: 0, port: 9876 },
          manifest: {
            entryCount: 0,
            fileCount: 0,
            componentCount: 0,
            lastUpdated: null,
            cacheHitRate: 0,
          },
          annotations: {},
        }),
      });
      const tool = new StatusTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['annotations']).toEqual({
        queued: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        archived: 0,
      });
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getStatus: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new StatusTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new StatusTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.STATUS);
  });
});
