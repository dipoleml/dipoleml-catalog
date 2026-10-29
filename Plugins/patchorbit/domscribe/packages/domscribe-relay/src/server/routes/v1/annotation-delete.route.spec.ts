/**
 * Integration tests for DELETE /api/v1/annotations/:id
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

describe('DELETE /api/v1/annotations/:id', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should delete annotation and return 204', async () => {
    // Create
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    // Verify exists
    expect(annotationExistsOnDisk(server.tempDir, id, 'queued')).toBe(true);

    // Delete
    const response = await server.app.inject({
      method: 'DELETE',
      url: `/api/v1/annotations/${id}`,
    });

    expectStatus(response, 204);

    // Verify removed from disk
    expect(annotationExistsOnDisk(server.tempDir, id, 'queued')).toBe(false);
  });

  it('should return 404 for nonexistent annotation', async () => {
    const response = await server.app.inject({
      method: 'DELETE',
      url: '/api/v1/annotations/ann_xxxxxxxx_0000000000000',
    });

    expectStatus(response, 404);

    const body = response.json();
    expect(body.code).toBe('DS_ANNOTATION_NOTFOUND');
  });
});
