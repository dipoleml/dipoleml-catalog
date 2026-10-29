/**
 * Integration tests for GET /health
 *
 * Uses real AnnotationService and ManifestReader backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  InteractionModeEnum,
  InteractionTypeEnum,
} from '@domscribe/core';
import {
  createTestServer,
  cleanupTestServer,
  createManifestEntry,
  expectStatus,
  type TestServer,
} from '../__test-utils__/setup.js';
import { RELAY_VERSION } from '../../version.js';

describe('GET /health', () => {
  let server: TestServer;

  afterAll(() => {
    cleanupTestServer(server);
  });

  describe('with empty workspace', () => {
    beforeAll(async () => {
      server = await createTestServer();
    });

    it('should return 200 with healthy status', async () => {
      const response = await server.app.inject({
        method: 'GET',
        url: '/health',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.status).toBe('healthy');
      expect(body.version).toBe(RELAY_VERSION);
      expect(body.timestamp).toBeDefined();
      expect(body.services.annotations.counts).toBeDefined();
      expect(body.services.manifest.entryCount).toBe(0);
    });
  });

  describe('with seeded data', () => {
    let seededServer: TestServer;

    beforeAll(async () => {
      const entries = [
        createManifestEntry({ id: 'aaaaaaaa', file: 'src/A.tsx' }),
        createManifestEntry({ id: 'bbbbbbbb', file: 'src/B.tsx' }),
      ];
      seededServer = await createTestServer({ manifestEntries: entries });

      // Create an annotation via the real service
      seededServer.annotationService.create({
        mode: InteractionModeEnum.ELEMENT_CLICK,
        interaction: {
          type: InteractionTypeEnum.ELEMENT_ANNOTATION,
          selectedElement: {
            tagName: 'div',
            selector: 'body > div',
          },
        },
        context: {
          pageUrl: 'http://localhost:3000',
          pageTitle: 'Test',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Test/1.0',
        },
      });
    });

    afterAll(() => {
      cleanupTestServer(seededServer);
    });

    it('should return real counts from disk', async () => {
      const response = await seededServer.app.inject({
        method: 'GET',
        url: '/health',
      });

      expectStatus(response, 200);

      const body = response.json();
      expect(body.services.manifest.entryCount).toBe(2);
      expect(body.services.manifest.fileCount).toBe(2);
      expect(body.services.annotations.counts.queued).toBe(1);
    });
  });
});
