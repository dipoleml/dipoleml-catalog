import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationStatusEnum } from '@domscribe/core';
import { AnnotationsSearchTool } from './annotation-search.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationsSearchTool', () => {
  describe('toolCallback', () => {
    it('should search annotations and compute hasMore', async () => {
      // Arrange
      const annotations = [{ id: 'ann_1', status: 'queued' }];
      const mockClient = createMockRelayClient({
        searchAnnotations: vi.fn().mockResolvedValue({
          annotations,
          total: 5,
        }),
      });
      const tool = new AnnotationsSearchTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        query: 'button',
        entryId: 'ds_1',
        file: 'Button.tsx',
        status: AnnotationStatusEnum.QUEUED,
        limit: 10,
      });

      // Assert
      expect(mockClient.searchAnnotations).toHaveBeenCalledWith({
        query: 'button',
        entryId: 'ds_1',
        file: 'Button.tsx',
        status: 'queued',
        limit: 10,
      });
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['annotations']).toEqual(annotations);
      expect(structured['total']).toBe(5);
      expect(structured['hasMore']).toBe(true);
    });

    it('should set hasMore to false when all results returned', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        searchAnnotations: vi.fn().mockResolvedValue({
          annotations: [{ id: 'ann_1' }],
          total: 1,
        }),
      });
      const tool = new AnnotationsSearchTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['hasMore']).toBe(false);
    });

    it('should normalize array status to comma-separated string', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        searchAnnotations: vi.fn().mockResolvedValue({
          annotations: [],
          total: 0,
        }),
      });
      const tool = new AnnotationsSearchTool(mockClient);

      // Act
      await tool.toolCallback({
        status: [AnnotationStatusEnum.QUEUED, AnnotationStatusEnum.PROCESSING],
      });

      // Assert
      expect(mockClient.searchAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued,processing' }),
      );
    });

    it('should pass undefined status when not provided', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        searchAnnotations: vi.fn().mockResolvedValue({
          annotations: [],
          total: 0,
        }),
      });
      const tool = new AnnotationsSearchTool(mockClient);

      // Act
      await tool.toolCallback({});

      // Assert
      expect(mockClient.searchAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined }),
      );
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        searchAnnotations: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new AnnotationsSearchTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationsSearchTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_SEARCH);
  });
});
