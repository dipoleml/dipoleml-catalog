/**
 * Integration tests for PUT /api/v1/annotations/:id/response
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

describe('PUT /api/v1/annotations/:id/response', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should store agent response with message', async () => {
    // Create and transition to processing
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

    // Store response
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: { message: 'Changed button color to red via CSS class' },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.annotation.agentResponse.message).toBe(
      'Changed button color to red via CSS class',
    );
  });

  it('should return 400 when neither message nor patchBundle is provided', async () => {
    // Create and transition to processing
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

    // Send empty response
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: {},
    });

    expectStatus(response, 400);

    const body = response.json();
    expect(body.code).toBe('DS_INVALID_INPUT');
  });

  it('should return 500 when annotation is not in processing status', async () => {
    // Create (stays queued)
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput(),
    });
    const id = createResp.json().metadata.id;

    // Attempt response on queued annotation
    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: { message: 'This should fail' },
    });

    expectStatus(response, 500);
  });

  it('should return 400 when message is empty string', async () => {
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

    const response = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: { message: '' },
    });

    expectStatus(response, 400);

    const body = response.json();
    expect(body.code).toBe('DS_INVALID_INPUT');
  });

  it('should return 500 for nonexistent annotation', async () => {
    const response = await server.app.inject({
      method: 'PUT',
      url: '/api/v1/annotations/ann_zzzzzzzz_0/response',
      payload: { message: 'Should fail' },
    });

    expectStatus(response, 500);
  });
});
