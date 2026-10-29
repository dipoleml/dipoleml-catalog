import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationGetTool } from './annotation-get.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationGetTool', () => {
  describe('toolCallback', () => {
    it('should retrieve annotation by ID', async () => {
      // Arrange
      const annotation = {
        metadata: {
          id: 'ann_123',
          status: 'queued',
          timestamp: '2026-03-16T10:00:00Z',
          schemaVersion: 1,
        },
        context: {
          userMessage: 'Fix button color',
          manifestSnapshot: [],
        },
      };
      const mockClient = createMockRelayClient({
        getAnnotation: vi.fn().mockResolvedValue(annotation),
      });
      const tool = new AnnotationGetTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_123',
      });

      // Assert
      expect(mockClient.getAnnotation).toHaveBeenCalledWith('ann_123');
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['annotation']).toEqual(annotation);
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        getAnnotation: vi.fn().mockRejectedValue(new Error('Not found')),
      });
      const tool = new AnnotationGetTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_missing',
      });

      // Assert
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(getResultText(result));
      expect(parsed.title).toBe('Not found');
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationGetTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_GET);
  });
});
