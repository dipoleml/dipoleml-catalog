/**
 * Integration tests for GET /api/v1/manifest/query
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

describe('GET /api/v1/manifest/query', () => {
  let server: TestServer;

  const entries = [
    createManifestEntry({
      id: 'j1j1j1j1',
      file: 'src/Query.tsx',
      componentName: 'QueryComp',
      tagName: 'div',
    }),
    createManifestEntry({
      id: 'j2j2j2j2',
      file: 'src/Query.tsx',
      componentName: 'QueryComp',
      tagName: 'span',
    }),
    createManifestEntry({
      id: 'j3j3j3j3',
      file: 'src/Other.tsx',
      componentName: 'OtherComp',
      tagName: 'div',
    }),
    createManifestEntry({
      id: 'j4j4j4j4',
      file: 'src/Query.tsx',
      componentName: 'QueryComp',
      tagName: 'button',
    }),
    createManifestEntry({
      id: 'j5j5j5j5',
      file: 'src/Query.tsx',
      componentName: 'QueryComp',
      tagName: 'div',
    }),
  ];

  beforeAll(async () => {
    server = await createTestServer({ manifestEntries: entries });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should query by file', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?file=src/Query.tsx',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.entries.length).toBe(4);
    expect(body.total).toBe(4);
    expect(
      body.entries.every((e: { file: string }) => e.file === 'src/Query.tsx'),
    ).toBe(true);
  });

  it('should query by componentName', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?componentName=OtherComp',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.entries.length).toBe(1);
    expect(body.entries[0].id).toBe('j3j3j3j3');
  });

  it('should support pagination with limit', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?file=src/Query.tsx&limit=2',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.entries.length).toBe(2);
    expect(body.total).toBe(4);
    expect(body.hasMore).toBe(true);
  });

  it('should return 400 when no filter is provided', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query',
    });

    expectStatus(response, 400);

    const body = response.json();
    expect(body.code).toBe('DS_INVALID_INPUT');
  });

  it('should filter by tagName when combined with file', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?file=src/Query.tsx&tagName=div',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.entries.length).toBe(2);
    expect(
      body.entries.every((e: { tagName: string }) => e.tagName === 'div'),
    ).toBe(true);
  });

  it('should return 400 when tagName is used without file or componentName', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?tagName=div',
    });

    expectStatus(response, 400);

    const body = response.json();
    expect(body.code).toBe('DS_INVALID_INPUT');
    expect(body.error).toMatch(/tagName filter requires/);
  });

  it('should cap limit at 500', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?file=src/Query.tsx&limit=9999',
    });

    expectStatus(response, 200);

    const body = response.json();
    // 4 entries in src/Query.tsx, all returned (under 500 cap)
    expect(body.entries.length).toBe(4);
    expect(body.hasMore).toBe(false);
  });

  it('should narrow results when file and componentName and tagName are combined', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/api/v1/manifest/query?file=src/Query.tsx&tagName=button',
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.entries.length).toBe(1);
    expect(body.entries[0].tagName).toBe('button');
  });
});
