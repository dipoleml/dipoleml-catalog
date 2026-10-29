import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationStatusEnum } from '@domscribe/core';
import { AnnotationsUpdateStatusTool } from './annotation-update-status.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationsUpdateStatusTool', () => {
  describe('toolCallback', () => {
    it('should update status and return success', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationStatus: vi.fn().mockResolvedValue({
          annotation: {
            metadata: { id: 'ann_123', status: 'processed' },
          },
        }),
      });
      const tool = new AnnotationsUpdateStatusTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_123',
        status: AnnotationStatusEnum.PROCESSED,
      });

      // Assert
      expect(mockClient.updateAnnotationStatus).toHaveBeenCalledWith(
        'ann_123',
        AnnotationStatusEnum.PROCESSED,
        { errorDetails: undefined },
      );
      expect(result.structuredContent).toEqual({
        success: true,
        newStatus: 'processed',
        annotationId: 'ann_123',
      });
    });

    it('should pass errorDetails for failed status', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationStatus: vi.fn().mockResolvedValue({
          annotation: {
            metadata: { id: 'ann_123', status: 'failed' },
          },
        }),
      });
      const tool = new AnnotationsUpdateStatusTool(mockClient);

      // Act
      await tool.toolCallback({
        annotationId: 'ann_123',
        status: AnnotationStatusEnum.FAILED,
        errorDetails: 'Could not parse component',
      });

      // Assert
      expect(mockClient.updateAnnotationStatus).toHaveBeenCalledWith(
        'ann_123',
        AnnotationStatusEnum.FAILED,
        { errorDetails: 'Could not parse component' },
      );
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationStatus: vi
          .fn()
          .mockRejectedValue(new Error('Invalid transition')),
      });
      const tool = new AnnotationsUpdateStatusTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_123',
        status: AnnotationStatusEnum.PROCESSED,
      });

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationsUpdateStatusTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_UPDATE_STATUS);
  });
});
