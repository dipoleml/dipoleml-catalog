import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationStatusEnum } from '@domscribe/core';
import { AnnotationsListTool } from './annotation-list.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationsListTool', () => {
  describe('toolCallback', () => {
    it('should list annotations and build summaries', async () => {
      // Arrange
      const annotations = [
        {
          metadata: {
            id: 'ann_1',
            status: 'queued',
            timestamp: '2026-03-16T10:00:00Z',
            schemaVersion: 1,
          },
          context: {
            userMessage: 'Fix the button color to blue',
            manifestSnapshot: [{ id: 'ds_btn', componentName: 'Button' }],
          },
        },
        {
          metadata: {
            id: 'ann_2',
            status: 'processed',
            timestamp: '2026-03-16T09:00:00Z',
            schemaVersion: 1,
          },
          context: {
            manifestSnapshot: [],
          },
        },
      ];
      const mockClient = createMockRelayClient({
        listAnnotations: vi.fn().mockResolvedValue({
          annotations,
          total: 5,
          hasMore: true,
        }),
      });
      const tool = new AnnotationsListTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        status: [AnnotationStatusEnum.QUEUED],
        limit: 2,
        offset: 0,
      });

      // Assert
      expect(mockClient.listAnnotations).toHaveBeenCalledWith({
        statuses: [AnnotationStatusEnum.QUEUED],
        limit: 2,
        offset: 0,
      });
      const structured = result.structuredContent as Record<string, unknown>;
      const summaries = structured['annotations'] as unknown[];
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toEqual({
        id: 'ann_1',
        status: 'queued',
        timestamp: '2026-03-16T10:00:00Z',
        entryId: 'ds_btn',
        componentName: 'Button',
        userMessageExcerpt: 'Fix the button color to blue',
      });
      expect(summaries[1]).toEqual({
        id: 'ann_2',
        status: 'processed',
        timestamp: '2026-03-16T09:00:00Z',
        entryId: undefined,
        componentName: undefined,
        userMessageExcerpt: undefined,
      });
      expect(structured['total']).toBe(5);
      expect(structured['hasMore']).toBe(true);
    });

    it('should truncate userMessage to 100 characters', async () => {
      // Arrange
      const longMessage = 'x'.repeat(200);
      const mockClient = createMockRelayClient({
        listAnnotations: vi.fn().mockResolvedValue({
          annotations: [
            {
              metadata: {
                id: 'ann_1',
                status: 'queued',
                timestamp: '2026-03-16T10:00:00Z',
                schemaVersion: 1,
              },
              context: {
                userMessage: longMessage,
                manifestSnapshot: [],
              },
            },
          ],
          total: 1,
          hasMore: false,
        }),
      });
      const tool = new AnnotationsListTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      const summaries = structured['annotations'] as {
        userMessageExcerpt: string;
      }[];
      expect(summaries[0].userMessageExcerpt).toBe('x'.repeat(100));
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        listAnnotations: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new AnnotationsListTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationsListTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_LIST);
  });
});
