/**
 * Integration tests for GET /api/v1/manifest/resolve
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

describe('GET /api/v1/manifest/resolve', () => {
  let server: TestServer;

  const knownEntry = createManifestEntry({
    id: 'g1g1g1g1',
    file: 'src/Resolve.tsx',
    componentName: 'ResolveComp',
  });

  beforeAll(async () => {
    server = await createTestServer({ manifestEntries: [knownEntry] });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should resolve a known entry by ID', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/manifest/resolve?id=${knownEntry.id}`,
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.entry.id).toBe(knownEntry.id);
    expect(body.entry.file).toBe('src/Resolve.tsx');
    expect(body.resolveTimeMs).toBeGreaterThanOrEqual(0);
    expect(typeof body.cacheHit).toBe('boolean');
  });

  it('should return 404 for unknown ID', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/resolve?id=zzzzzzzz',
    });

    expectStatus(response, 404);

    const body = response.json();
    expect(body.code).toBe('DS_ELEMENT_NOT_FOUND');
  });

  it('should return 400 when id query param is missing', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/resolve',
    });

    expectStatus(response, 400);
  });

  it('should show cache hit on second resolve of same ID', async () => {
    // First resolve
    await server.app.inject({
      method: 'GET',
      url: `/api/v1/manifest/resolve?id=${knownEntry.id}`,
    });

    // Second resolve
    const response = await server.app.inject({
      method: 'GET',
      url: `/api/v1/manifest/resolve?id=${knownEntry.id}`,
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.cacheHit).toBe(true);
  });
});
