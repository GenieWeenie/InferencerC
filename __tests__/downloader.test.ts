import { ModelManager } from '../src/server/services/downloader';
import { ConfigService } from '../src/server/services/config';
import { ModelDownloadService } from '../src/server/services/model-download';

jest.mock('../src/server/services/model-download', () => {
  return {
    ModelDownloadService: jest.fn().mockImplementation(() => ({
      searchHuggingFace: jest.fn().mockResolvedValue([{ id: 'model-1' }]),
      downloadModelFile: jest.fn().mockResolvedValue(undefined),
      getDownloadStatus: jest.fn().mockReturnValue({
        modelId: 'test',
        progress: 50,
        status: 'downloading',
        fileName: 'test.gguf',
      }),
      getAllDownloadStatuses: jest.fn().mockReturnValue([]),
      cancelDownload: jest.fn(),
      getRepoFiles: jest.fn().mockResolvedValue([]),
      startDownload: jest.fn().mockReturnValue('download-id'),
      getAllDownloads: jest.fn().mockReturnValue([]),
    })),
  };
});

jest.mock('../src/server/services/config', () => {
  return {
    ConfigService: jest.fn().mockImplementation(() => ({})),
  };
});

describe('ModelManager', () => {
  let manager: ModelManager;
  let mockConfigService: ConfigService;
  let mockDownloadService: {
    searchHuggingFace: jest.Mock;
    downloadModelFile: jest.Mock;
    getDownloadStatus: jest.Mock;
    getAllDownloadStatuses: jest.Mock;
    cancelDownload: jest.Mock;
    getRepoFiles: jest.Mock;
    startDownload: jest.Mock;
    getAllDownloads: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = new ConfigService() as ConfigService;
    manager = new ModelManager(mockConfigService);
    mockDownloadService = (ModelDownloadService as jest.Mock).mock.results[
      (ModelDownloadService as jest.Mock).mock.results.length - 1
    ].value;
  });

  describe('constructor', () => {
    it('creates ModelManager with ConfigService, delegates to ModelDownloadService', () => {
      expect(ConfigService).toHaveBeenCalled();
      expect(ModelDownloadService).toHaveBeenCalledWith(mockConfigService);
    });
  });

  describe('searchHuggingFace', () => {
    it('delegates to downloadService.searchHuggingFace', async () => {
      const result = await manager.searchHuggingFace('test-query');
      expect(mockDownloadService.searchHuggingFace).toHaveBeenCalledWith('test-query');
      expect(result).toEqual([{ id: 'model-1' }]);
    });
  });

  describe('downloadModelFile', () => {
    it('delegates correctly', async () => {
      await manager.downloadModelFile('model-1', 'https://example.com/file.gguf', 'file.gguf');
      expect(mockDownloadService.downloadModelFile).toHaveBeenCalledWith(
        'model-1',
        'https://example.com/file.gguf',
        'file.gguf'
      );
    });
  });

  describe('getDownloadStatus', () => {
    it('delegates and returns status', () => {
      const status = manager.getDownloadStatus('test');
      expect(mockDownloadService.getDownloadStatus).toHaveBeenCalledWith('test');
      expect(status).toEqual({
        modelId: 'test',
        progress: 50,
        status: 'downloading',
        fileName: 'test.gguf',
      });
    });
  });

  describe('getAllDownloadStatuses', () => {
    it('delegates and returns array', () => {
      const statuses = manager.getAllDownloadStatuses();
      expect(mockDownloadService.getAllDownloadStatuses).toHaveBeenCalled();
      expect(statuses).toEqual([]);
    });
  });

  describe('cancelDownload', () => {
    it('delegates', () => {
      manager.cancelDownload('model-1');
      expect(mockDownloadService.cancelDownload).toHaveBeenCalledWith('model-1');
    });
  });

  describe('getRepoFiles', () => {
    it('delegates', async () => {
      const files = await manager.getRepoFiles('repo-1');
      expect(mockDownloadService.getRepoFiles).toHaveBeenCalledWith('repo-1');
      expect(files).toEqual([]);
    });
  });

  describe('startDownload', () => {
    it('delegates and returns ID', () => {
      const id = manager.startDownload('repo-1', 'model.gguf', 'My Model');
      expect(mockDownloadService.startDownload).toHaveBeenCalledWith('repo-1', 'model.gguf', 'My Model');
      expect(id).toBe('download-id');
    });
  });

  describe('getAllDownloads', () => {
    it('delegates', () => {
      const downloads = manager.getAllDownloads();
      expect(mockDownloadService.getAllDownloads).toHaveBeenCalled();
      expect(downloads).toEqual([]);
    });
  });
});
