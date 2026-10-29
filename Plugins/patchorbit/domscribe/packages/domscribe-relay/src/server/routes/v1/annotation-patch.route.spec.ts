/**
 * Integration tests for PATCH /api/v1/annotations/:id
 *
 * Uses real AnnotationService backed by temp directories.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  createAnnotationViaAPI,
  createManifestEntry,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

describe('PATCH /api/v1/annotations/:id', () => {
  let server: TestServer;

  const manifestEntry = createManifestEntry({
    id: 'p1p1p1p1',
    file: 'src/Patch.tsx',
    componentName: 'PatchComp',
  });

  beforeAll(async () => {
    server = await createTestServer({ manifestEntries: [manifestEntry] });
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('should patch annotation context with partial update', async () => {
    const created = await createAnnotationViaAPI(server);
    const id = (created.metadata as { id: string }).id;

    const response = await server.app.inject({
      method: 'PATCH',
      url: `/api/v1/annotations/${id}`,
      payload: {
        context: {
          userMessage: 'Updated message via patch',
        },
      },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.context.userMessage).toBe(
      'Updated message via patch',
    );
    // Original fields should still be present
    expect(body.annotation.context.pageUrl).toBe('http://localhost:3000');
  });

  it('should patch annotation with manifestSnapshot context', async () => {
    const created = await createAnnotationViaAPI(server, {
      dataDs: manifestEntry.id,
    });
    const id = (created.metadata as { id: string }).id;

    const response = await server.app.inject({
      method: 'PATCH',
      url: `/api/v1/annotations/${id}`,
      payload: {
        context: {
          userMessage: 'Patched with manifest context',
        },
      },
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.context.userMessage).toBe(
      'Patched with manifest context',
    );
    // Manifest snapshot from creation should still be present
    expect(body.annotation.context.manifestSnapshot).toBeDefined();
  });

  it('should return 404 for nonexistent annotation', async () => {
    const response = await server.app.inject({
      method: 'PATCH',
      url: '/api/v1/annotations/ann_zzzzzzzz_0',
      payload: {
        context: { userMessage: 'Should fail' },
      },
    });

    expectStatus(response, 404);

    const body = response.json();
    expect(body.code).toBe('DS_ANNOTATION_NOTFOUND');
  });

  it('should accept empty context (no-op patch)', async () => {
    const created = await createAnnotationViaAPI(server);
    const id = (created.metadata as { id: string }).id;

    const response = await server.app.inject({
      method: 'PATCH',
      url: `/api/v1/annotations/${id}`,
      payload: {},
    });

    expectStatus(response, 200);

    const body = response.json();
    expect(body.annotation.metadata.id).toBe(id);
  });

  it('should return updated annotation verifiable via GET', async () => {
    const created = await createAnnotationViaAPI(server);
    const id = (created.metadata as { id: string }).id;

    await server.app.inject({
      method: 'PATCH',
      url: `/api/v1/annotations/${id}`,
      payload: {
        context: { userMessage: 'Persisted patch' },
      },
    });

    // Verify via GET
    const getResponse = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/${id}`,
    });

    expectStatus(getResponse, 200);

    const body = getResponse.json();
    expect(body.context.userMessage).toBe('Persisted patch');
  });
});
