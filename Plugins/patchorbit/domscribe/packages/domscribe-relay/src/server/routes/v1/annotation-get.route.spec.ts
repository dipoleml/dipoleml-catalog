/**
 * Integration tests for GET /api/v1/annotations/:id
 *
 * Uses real AnnotationService backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationInput,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('GET /api/v1/annotations/:id', () => {
  let server: TestServer;
  let createdId: string;

  beforeAll(async () => {
    server = await createTestServer();

    // Create an annotation
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({ userMessage: 'Get test' }),
    });
    createdId = response.json().metadata.id;
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should return annotation by ID', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/${createdId}`,
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.metadata.id).toBe(createdId);
    expect(body.context.userMessage).toBe('Get test');
  });

  it('should return 404 for nonexistent ID', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/ann_xxxxxxxx_0000000000000',
    });

    expectStatus(response, 404);

    const body = response.json();
    expect(body.code).toBe('DS_ANNOTATION_NOTFOUND');
  });

  it('should return 400 for malformed ID', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/bad-id',
    });

    expectStatus(response, 400);
  });
});
