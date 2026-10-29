/**
 * Integration tests for POST /api/v1/annotations
 *
 * Uses real AnnotationService and ManifestReader backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createManifestEntry,
  createAnnotationInput,
  annotationExistsOnDisk,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('POST /api/v1/annotations', () => {
  let server: TestServer;

  const manifestEntry = createManifestEntry({
    id: 'k1k1k1k1',
    file: 'src/Create.tsx',
    componentName: 'CreateComp',
  });

  beforeAll(async () => {
    server = await createTestServer({ manifestEntries: [manifestEntry] });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should create annotation and return 201', async () => {
    const input = createAnnotationInput();

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: input,
    });

    expectStatus(response, 201);

    const body = response.json();
    expect(body.metadata.id).toMatch(/^ann_/);
    expect(body.metadata.status).toBe('queued');
    expect(body.metadata.mode).toBe('element-click');
    expect(body.interaction.selectedElement.tagName).toBe('button');
    expect(body.context.userMessage).toBe('Make this button red');
  });

  it('should resolve manifest entry when dataDs is provided', async () => {
    const input = createAnnotationInput({ dataDs: manifestEntry.id });

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: input,
    });

    expectStatus(response, 201);

    const body = response.json();
    expect(body.context.manifestSnapshot).toBeDefined();
    expect(body.context.manifestSnapshot.length).toBe(1);
    expect(body.context.manifestSnapshot[0].file).toBe('src/Create.tsx');
  });

  it('should return 400 for missing required fields', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: { mode: 'element-click' },
    });

    expectStatus(response, 400);
  });

  it('should write annotation file to disk in queued dir', async () => {
    const input = createAnnotationInput();

    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: input,
    });

    const body = response.json();
    expect(
      annotationExistsOnDisk(server.tempDir, body.metadata.id, 'queued'),
    ).toBe(true);
  });
});
