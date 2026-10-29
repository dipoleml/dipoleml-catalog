/**
 * Integration tests for PUT /api/v1/annotations/:id (status update)
 *
 * Uses real AnnotationService backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationInput,
  annotationExistsOnDisk,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('PUT /api/v1/annotations/:id (status)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should transition from queued to processing', async () => {
    // Create
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    // Update status
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing' },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.metadata.status).toBe('processing');

    // Verify file moved on disk
    expect(annotationExistsOnDisk(server.tempDir, id, 'processing')).toBe(true);
    expect(annotationExistsOnDisk(server.tempDir, id, 'queued')).toBe(false);
  });

  it('should store errorDetails when transitioning to failed', async () => {
    // Create and move to processing
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing' },
    });

    // Fail with error details
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'failed', errorDetails: 'Agent timeout after 30s' },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.metadata.status).toBe('failed');
    expect(body.annotation.metadata.errorDetails).toBe(
      'Agent timeout after 30s',
    );
  });

  it('should return 500 for invalid status transition', async () => {
    // Create (queued)
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    // Try invalid transition: queued → processed
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processed' },
    });

    expectStatus(response, 500);
  });

  it('should return 400 when status field is missing', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: {},
    });

    expectStatus(response, 400);
  });

  it('should accept errorDetails when transitioning to processing', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    // errorDetails on a non-failed status — should still be accepted
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing', errorDetails: 'some note' },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.metadata.status).toBe('processing');
  });

  it('should return 500 for nonexistent annotation', async () => {
    const response = await server.app.inject({
      method: 'PUT',
      url: '/api/v1/annotations/ann_zzzzzzzz_0/status',
      payload: { status: 'processing' },
    });

    expectStatus(response, 500);
  });
});
