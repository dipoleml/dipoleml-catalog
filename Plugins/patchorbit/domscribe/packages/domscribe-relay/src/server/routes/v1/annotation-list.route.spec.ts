/**
 * Integration tests for GET /api/v1/annotations
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

describe('GET /api/v1/annotations', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();

    // Create 3 annotations via HTTP
    for (let i = 0; i < 3; i++) {
      await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations',
        payload: createAnnotationInput({
          userMessage: `Task ${i}`,
        }),
      });
    }
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should list all annotations', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(3);
    expect(body.total).toBe(3);
    expect(body.hasMore).toBe(false);
  });

  it('should paginate with limit and offset', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations?limit=2&offset=0',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(2);
    expect(body.total).toBe(3);
    expect(body.hasMore).toBe(true);
  });

  it('should filter by status', async () => {
    // Transition one annotation to processing
    const listResp = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations',
    });
    const firstId = listResp.json().annotations[0].metadata.id;

    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${firstId}/status`,
      payload: { status: 'processing' },
    });

    // Filter by queued only
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations?status=queued',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(2);
    expect(
      body.annotations.every(
        (a: { metadata: { status: string } }) => a.metadata.status === 'queued',
      ),
    ).toBe(true);
  });

  it('should return empty when no annotations match', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations?status=archived',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(0);
    expect(body.total).toBe(0);
    expect(body.hasMore).toBe(false);
  });

  it('should filter by multiple comma-separated statuses', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations?status=queued,processing',
    });

    expectStatus(response, 200);

    const body = response.json();
    // 2 queued + 1 processing from filter-by-status test above
    expect(body.annotations.length).toBe(3);
    expect(
      body.annotations.every(
        (a: { metadata: { status: string } }) =>
          a.metadata.status === 'queued' || a.metadata.status === 'processing',
      ),
    ).toBe(true);
  });

  it('should handle offset beyond total results', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations?offset=999',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(0);
    expect(body.hasMore).toBe(false);
  });
});
