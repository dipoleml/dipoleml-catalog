import { AnnotationStatusEnum, DomscribeErrorCode } from '@domscribe/core';
import { RelayHttpClient, RelayError } from './relay-http-client.js';

describe('RelayHttpClient', () => {
  let client: RelayHttpClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new RelayHttpClient('127.0.0.1', 9876);
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockError(status: number, body: unknown) {
    fetchSpy.mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(body),
    });
  }

  describe('URL construction', () => {
    // Mock fetch to return ok:false so we can inspect the URL without
    // needing full valid response bodies for Zod parsing
    beforeEach(() => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({ code: 'DS_INTERNAL_ERROR', error: 'test' }),
      });
    });

    it('should set base URL from host and port', async () => {
      const custom = new RelayHttpClient('10.0.0.1', 4567);

      await custom.resolveManifestEntry('ds_1').catch(() => {
        //
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('http://10.0.0.1:4567');
    });

    it('should pass entry ID as query param for resolve', async () => {
      await client.resolveManifestEntry('ds_abc').catch(() => {
        //
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('id=ds_abc');
    });

    it('should pass status filters as comma-separated query param', async () => {
      await client
        .listAnnotations({
          statuses: [
            AnnotationStatusEnum.QUEUED,
            AnnotationStatusEnum.PROCESSING,
          ],
          limit: 5,
          offset: 10,
        })
        .catch(() => {
          //
        });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('status=queued%2Cprocessing');
      expect(url).toContain('limit=5');
      expect(url).toContain('offset=10');
    });

    it('should omit undefined query params for listAnnotations', async () => {
      await client.listAnnotations({}).catch(() => {
        //
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).not.toContain('status=');
      expect(url).not.toContain('limit=');
      expect(url).not.toContain('offset=');
    });

    it('should pass manifest query filters as search params', async () => {
      await client
        .queryManifestEntries({
          file: 'Button.tsx',
          componentName: 'Button',
          tagName: 'button',
          limit: 10,
        })
        .catch(() => {
          //
        });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('file=Button.tsx');
      expect(url).toContain('componentName=Button');
      expect(url).toContain('tagName=button');
      expect(url).toContain('limit=10');
    });

    it('should include annotation ID in path for getAnnotation', async () => {
      await client.getAnnotation('ann_xyz').catch(() => {
        //
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('ann_xyz');
    });

    it('should include annotation ID in path for updateAnnotationStatus', async () => {
      await client
        .updateAnnotationStatus('ann_123', AnnotationStatusEnum.PROCESSED, {})
        .catch(() => {
          //
        });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('ann_123');
      expect(url).toContain('/status');
    });
  });

  describe('request bodies', () => {
    beforeEach(() => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({ code: 'DS_INTERNAL_ERROR', error: 'test' }),
      });
    });

    it('should POST entry IDs for batch resolve', async () => {
      await client
        .batchResolveManifestEntries(['ds_1', 'ds_2'])
        .catch(() => {
          //
        });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ entryIds: ['ds_1', 'ds_2'] });
    });

    it('should PUT status and errorDetails for updateAnnotationStatus', async () => {
      await client
        .updateAnnotationStatus('ann_1', AnnotationStatusEnum.FAILED, {
          errorDetails: 'Timed out',
        })
        .catch(() => {
          //
        });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.status).toBe('failed');
      expect(body.errorDetails).toBe('Timed out');
    });

    it('should PUT message for updateAnnotationResponse', async () => {
      await client.updateAnnotationResponse('ann_1', 'Done').catch(() => {
        //
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ message: 'Done' });
    });

    it('should POST nonce for shutdown', async () => {
      await client.shutdown('my-nonce').catch(() => {
        //
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ nonce: 'my-nonce' });
    });

    it('should pass abort signal to getHealth', async () => {
      const controller = new AbortController();

      await client.getHealth({ signal: controller.signal }).catch(() => {
        //
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('error handling', () => {
    it('should throw RelayError for structured error responses', async () => {
      mockError(404, {
        code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        error: 'Not found',
        detail: 'Annotation not found',
      });

      await expect(client.getAnnotation('ann_missing')).rejects.toThrow(
        RelayError,
      );
    });

    it('should throw RelayError with DS_RELAY_UNAVAILABLE for unparseable responses', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not json')),
      });

      try {
        await client.getAnnotation('ann_1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RelayError);
        expect((error as RelayError).code).toBe(
          DomscribeErrorCode.DS_RELAY_UNAVAILABLE,
        );
      }
    });
  });
});

describe('RelayError', () => {
  it('should extend DomscribeError with hint', () => {
    const error = new RelayError({
      code: DomscribeErrorCode.DS_RELAY_UNAVAILABLE,
      error: 'Unavailable',
      hint: 'Is the relay running?',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.hint).toBe('Is the relay running?');
    expect(error.code).toBe(DomscribeErrorCode.DS_RELAY_UNAVAILABLE);
  });
});
