/**
 * Integration tests for GET /api/v1/annotations/search
 *
 * Uses real AnnotationService backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationInput,
  createManifestEntry,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('GET /api/v1/annotations/search', () => {
  let server: TestServer;

  const manifestEntry = createManifestEntry({
    id: 'm1m1m1m1',
    file: 'src/Search.tsx',
  });

  beforeAll(async () => {
    server = await createTestServer({ manifestEntries: [manifestEntry] });

    // Create annotations with different messages and dataDs
    await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({
        userMessage: 'Change the header color to blue',
        dataDs: manifestEntry.id,
      }),
    });

    await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({
        userMessage: 'Fix the footer alignment',
      }),
    });

    await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: createAnnotationInput({
        userMessage: 'Change the sidebar background',
      }),
    });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should search by query text', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/search?query=Change',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(2);
    expect(body.total).toBe(2);
  });

  it('should search by entryId', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/search?entryId=${manifestEntry.id}`,
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(1);
  });

  it('should respect limit parameter', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/search?query=the&limit=1',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(1);
    expect(body.total).toBeGreaterThan(1);
  });

  it('should search by file when manifest snapshot exists', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/search?file=src/Search.tsx',
    });

    expectStatus(response, 200);

    const body = response.json();
    // Only the annotation created with dataDs pointing to src/Search.tsx
    expect(body.annotations.length).toBe(1);
  });

  it('should return empty results for file with no matches', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/search?file=src/NonExistent.tsx',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(0);
  });

  it('should combine query and entryId filters', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/search?query=header&entryId=${manifestEntry.id}`,
    });

    expectStatus(response, 200);

    const body = response.json();
    // Only the annotation with both "header" in message AND matching entryId
    expect(body.annotations.length).toBe(1);
    expect(body.total).toBe(1);
  });

  it('should filter by status', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/annotations/search?query=Change&status=queued',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotations.length).toBe(2);
    expect(
      body.annotations.every((a: { status: string }) => a.status === 'queued'),
    ).toBe(true);
  });
});
