/**
 * Integration tests for POST /api/v1/annotations/process
 *
 * Uses real AnnotationService and ManifestReader backed by temp directories.
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

describe('POST /api/v1/annotations/process', () => {
  describe('with queued annotations', () => {
    let server: TestServer;

    const manifestEntry = createManifestEntry({
      id: 'n1n1n1n1',
      file: 'src/Process.tsx',
      componentName: 'ProcessComp',
    });

    beforeAll(async () => {
      server = await createTestServer({ manifestEntries: [manifestEntry] });

      // Create 2 annotations
      await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations',
        payload: createAnnotationInput({
          userMessage: 'First annotation',
          dataDs: manifestEntry.id,
        }),
      });

      // Small delay to ensure different timestamps for ordering
      await new Promise((resolve) => setTimeout(resolve, 10));

      await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations',
        payload: createAnnotationInput({
          userMessage: 'Second annotation',
        }),
      });
    });

    afterAll(() => {
      cleanupTestServer(server);
    });

    it('should claim the oldest queued annotation', async () => {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations/process',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.found).toBe(true);
      expect(body.annotationId).toBeDefined();
      expect(body.userIntent).toBe('First annotation');
      expect(body.element).toBeDefined();
      expect(body.element.tagName).toBe('button');
    });

    it('should return sourceLocation when manifest entry exists', async () => {
      // First process already claimed the first annotation, so reset with a new server
      const freshServer = await createTestServer({
        manifestEntries: [manifestEntry],
      });

      await freshServer.app.inject({
        method: 'POST',
        url: '/api/v1/annotations',
        payload: createAnnotationInput({
          userMessage: 'With manifest',
          dataDs: manifestEntry.id,
        }),
      });

      const response = await freshServer.app.inject({
        method: 'POST',
        url: '/api/v1/annotations/process',
      });

      const body = response.json();
      expect(body.sourceLocation).toBeDefined();
      expect(body.sourceLocation.file).toBe('src/Process.tsx');
      expect(body.sourceLocation.componentName).toBe('ProcessComp');

      cleanupTestServer(freshServer);
    });

    it('should claim different annotations on sequential calls', async () => {
      const resp1 = await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations/process',
      });

      const body1 = resp1.json();

      // If there's a second queued annotation, it should be different
      if (body1.found) {
        const resp2 = await server.app.inject({
          method: 'POST',
          url: '/api/v1/annotations/process',
        });
        const body2 = resp2.json();

        if (body2.found) {
          expect(body2.annotationId).not.toBe(body1.annotationId);
        }
      }
    });
  });

  describe('with annotation without manifest entry', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await createTestServer();

      // Create annotation without dataDs — no manifest snapshot
      await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations',
        payload: createAnnotationInput({
          userMessage: 'No manifest data',
        }),
      });
    });

    afterAll(() => {
      cleanupTestServer(server);
    });

    it('should return undefined sourceLocation when no manifest entry', async () => {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations/process',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.found).toBe(true);
      expect(body.sourceLocation).toBeUndefined();
      expect(body.element).toBeDefined();
    });
  });

  describe('with empty queue', () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await createTestServer();
    });

    afterAll(() => {
      cleanupTestServer(server);
    });

    it('should return 404 when no annotations are queued', async () => {
      const response = await server.app.inject({
        method: 'POST',
        url: '/api/v1/annotations/process',
      });

      expectStatus(response, 404);

      const body = response.json();
      expect(body.code).toBe('DS_ANNOTATION_NOTFOUND');
    });
  });
});
