import fs from 'fs';
import path from 'path';
import { ModelDownloadService, DownloadStatus } from '../src/server/services/model-download';

global.fetch = jest.fn();

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  }),
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

jest.mock('../src/server/services/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('https');

const mockFs = jest.mocked(fs);
const mockCacheService = jest.requireMock<{ cacheService: { get: jest.Mock; set: jest.Mock } }>(
  '../src/server/services/cache'
).cacheService;

describe('ModelDownloadService', () => {
  let service: ModelDownloadService;

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    (global.fetch as jest.Mock).mockReset();
    mockCacheService.get.mockReset();
    mockCacheService.set.mockReset();
    service = new ModelDownloadService();
  });

  describe('constructor', () => {
    it('creates instance without configService', () => {
      const s = new ModelDownloadService();
      expect(s).toBeInstanceOf(ModelDownloadService);
    });

    it('creates instance with configService', () => {
      const configService = { addModel: jest.fn() } as unknown;
      const s = new ModelDownloadService(configService as import('../src/server/services/config').ConfigService);
      expect(s).toBeInstanceOf(ModelDownloadService);
    });
  });

  describe('setConfigService', () => {
    it('sets the config service', () => {
      const configService = { addModel: jest.fn() } as unknown;
      service.setConfigService(configService as import('../src/server/services/config').ConfigService);
      expect(service).toBeDefined();
    });
  });

  describe('searchHuggingFace', () => {
    it('returns cached results when available', async () => {
      const cached = [{ id: 'cached-model', modelId: 'cached' }];
      mockCacheService.get.mockReturnValue(cached);

      const result = await service.searchHuggingFace('test');

      expect(result).toEqual(cached);
      expect(mockCacheService.get).toHaveBeenCalledWith('hf-search-test');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches from API when not cached', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      const apiResults = [{ id: 'api-model' }];
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(apiResults),
      });

      const result = await service.searchHuggingFace('query');

      expect(result).toEqual(apiResults);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('huggingface.co/api/models')
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'hf-search-query',
        apiResults,
        600000
      );
    });

    it('handles fetch errors and returns empty array', async () => {
      mockCacheService.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const spy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.searchHuggingFace('query');

      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('getRepoFiles', () => {
    it('fetches and filters .gguf files', async () => {
      const files = [
        { path: 'model.gguf' },
        { path: 'other.bin' },
        { path: 'quant.gguf' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(files),
      });

      const result = await service.getRepoFiles('org/repo');

      expect(result).toEqual([{ path: 'model.gguf' }, { path: 'quant.gguf' }]);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://huggingface.co/api/models/org/repo/tree/main'
      );
    });

    it('handles fetch errors and returns empty array', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed'));
      const spy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.getRepoFiles('org/repo');

      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('getDownloadStatus / getAllDownloadStatuses', () => {
    it('returns undefined when download not found', () => {
      expect(service.getDownloadStatus('nonexistent')).toBeUndefined();
    });

    it('returns status after startDownload', () => {
      const id = service.startDownload('org/repo', 'model.gguf', 'My Model');

      const status = service.getDownloadStatus(id);
      expect(status).toBeDefined();
      expect(status?.modelId).toBe(id);
      expect(status?.fileName).toBe('model.gguf');
      expect(status?.status).toBe('downloading');
      expect(status?.progress).toBe(0);
    });

    it('getAllDownloadStatuses returns all statuses', () => {
      service.startDownload('org/repo', 'model.gguf', 'My Model');

      const statuses = service.getAllDownloadStatuses();
      expect(statuses.length).toBeGreaterThanOrEqual(1);
      expect(statuses.some((s: DownloadStatus) => s.fileName === 'model.gguf')).toBe(true);
    });
  });

  describe('cancelDownload', () => {
    it('sets status to error with Download cancelled message', () => {
      const id = service.startDownload('org/repo', 'model.gguf', 'My Model');

      service.cancelDownload(id);

      const status = service.getDownloadStatus(id);
      expect(status?.status).toBe('error');
      expect(status?.error).toBe('Download cancelled');
    });
  });

  describe('modelExists / getModelPath', () => {
    it('getModelPath returns correct path', () => {
      const p = service.getModelPath('model.gguf');
      expect(p).toBe(path.join(process.cwd(), 'models', 'model.gguf'));
    });

    it('modelExists delegates to fs.existsSync', () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = service.modelExists('model.gguf');

      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'models', 'model.gguf')
      );
    });

    it('modelExists returns false when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = service.modelExists('missing.gguf');

      expect(result).toBe(false);
    });
  });

  describe('startDownload', () => {
    it('creates download entry and returns ID', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
            releaseLock: jest.fn(),
          }),
        },
        headers: new Headers({ 'content-length': '3' }),
      });

      const id = service.startDownload('org/repo', 'model.gguf', 'My Model');

      expect(id).toBe('test-uuid-1234');
      expect(service.getDownloadStatus(id)).toBeDefined();
    });
  });
});
