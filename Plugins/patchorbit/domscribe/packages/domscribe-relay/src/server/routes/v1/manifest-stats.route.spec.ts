/**
 * Integration tests for GET /api/v1/manifest/stats
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

describe('GET /api/v1/manifest/stats', () => {
  describe('empty manifest', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await createTestServer();
    });

    afterAll(() => {
      cleanupTestServer(server);
    });

    it('should return 200 with entryCount: 0', async () => {
      const response = await server.app.inject({
        method: 'GET',
        url: '/api/v1/manifest/stats',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.entryCount).toBe(0);
      expect(body.fileCount).toBe(0);
      expect(body.componentCount).toBe(0);
    });
  });

  describe('seeded manifest', () => {
    let server: TestServer;

    beforeAll(async () => {
      const entries = [
        createManifestEntry({
          id: 'dddddddd',
          file: 'src/D.tsx',
          componentName: 'CompD',
        }),
        createManifestEntry({
          id: 'eeeeeeee',
          file: 'src/D.tsx',
          componentName: 'CompD',
        }),
        createManifestEntry({
          id: 'ffffffff',
          file: 'src/F.tsx',
          componentName: 'CompF',
        }),
      ];
      server = await createTestServer({ manifestEntries: entries });
    });

    afterAll(() => {
      cleanupTestServer(server);
    });

    it('should return real counts from manifest', async () => {
      const response = await server.app.inject({
        method: 'GET',
        url: '/api/v1/manifest/stats',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.entryCount).toBe(3);
      expect(body.fileCount).toBe(2);
      expect(body.componentCount).toBe(2);
    });
  });
});
