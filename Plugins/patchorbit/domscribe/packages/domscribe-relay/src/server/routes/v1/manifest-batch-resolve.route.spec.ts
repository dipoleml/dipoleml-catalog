/**
 * Integration tests for POST /api/v1/manifest/resolve/batch
 *
 * Uses real ManifestReader backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createManifestEntry,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('POST /api/v1/manifest/resolve/batch', () => {
  let server: TestServer;

  const entryA = createManifestEntry({
    id: 'h1h1h1h1',
    file: 'src/BatchA.tsx',
  });
  const entryB = createManifestEntry({
    id: 'h2h2h2h2',
    file: 'src/BatchB.tsx',
  });
  const entryC = createManifestEntry({
    id: 'h3h3h3h3',
    file: 'src/BatchC.tsx',
  });

  beforeAll(async () => {
    server = await createTestServer({
      manifestEntries: [entryA, entryB, entryC],
    });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should resolve all known entries', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: { entryIds: [entryA.id, entryB.id, entryC.id] },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.count).toBe(3);
    expect(body.resolveTimeMs).toBeGreaterThanOrEqual(0);

    expect(body.results[entryA.id].success).toBe(true);
    expect(body.results[entryA.id].entry.file).toBe('src/BatchA.tsx');
    expect(body.results[entryB.id].success).toBe(true);
    expect(body.results[entryC.id].success).toBe(true);
  });

  it('should handle mixed found and not-found IDs', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: { entryIds: [entryA.id, 'zzzzzzzz', entryC.id] },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.count).toBe(3);
    expect(body.results[entryA.id].success).toBe(true);
    expect(body.results['zzzzzzzz'].success).toBe(false);
    expect(body.results[entryC.id].success).toBe(true);
  });

  it('should handle empty entryIds array', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: { entryIds: [] },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.count).toBe(0);
  });

  it('should return 400 when body is missing', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: {},
    });

    expectStatus(response, 400);
  });

  it('should return 400 when entryIds exceeds 100', async () => {
    const ids = Array.from({ length: 101 }, (_, i) =>
      String(i).padStart(8, 'x'),
    );

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: { entryIds: ids },
    });

    expectStatus(response, 400);

    const body = response.json();
    expect(body.code).toBe('DS_INVALID_INPUT');
    expect(body.error).toMatch(/maximum/i);
  });

  it('should return 400 when entryIds is not an array', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve/batch',
      payload: { entryIds: 'not-an-array' },
    });

    expectStatus(response, 400);
  });
});
