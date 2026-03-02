/**
 * Unit tests for WebService (src/server/services/web.ts).
 * Mocks fetch; validates URL handling and fetch behavior.
 */
import { WebService } from '../src/server/services/web';

describe('WebService', () => {
  let service: WebService;

  beforeEach(() => {
    service = new WebService();
    jest.restoreAllMocks();
  });

  describe('fetchUrl', () => {
    it('rejects invalid URL (no protocol)', async () => {
      await expect(service.fetchUrl('not-a-url')).rejects.toThrow(/Invalid URL/);
    });

    it('rejects localhost URLs', async () => {
      await expect(service.fetchUrl('http://localhost/page')).rejects.toThrow(/Invalid URL/);
    });

    it('rejects 127.0.0.1', async () => {
      await expect(service.fetchUrl('https://127.0.0.1/page')).rejects.toThrow(/Invalid URL/);
    });

    it('rejects private IP 192.168.x.x', async () => {
      await expect(service.fetchUrl('https://192.168.1.1/page')).rejects.toThrow(/Invalid URL/);
    });

    it('fetches valid public URL and returns markdown', async () => {
      const html = '<html><body><p>Hello world</p></body></html>';
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(html) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      } as unknown as Response);

      const result = await service.fetchUrl('https://example.com/page');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('throws when response is not ok', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(service.fetchUrl('https://example.com/missing')).rejects.toThrow(/Failed to fetch/);
    });
  });
});
