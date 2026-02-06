import { Model } from '../../shared/types';
import { ConfigService } from './config';
import { ModelDownloadService, DownloadStatus } from './model-download';

export class ModelManager {
  private configService: ConfigService;
  private downloadService: ModelDownloadService;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.downloadService = new ModelDownloadService(configService);
  }

  // Search HF for GGUF models using the download service
  async searchHuggingFace(query: string) {
    return this.downloadService.searchHuggingFace(query);
  }

  /**
   * Downloads a model file from a URL
   * @param modelId The ID of the model
   * @param fileUrl The URL of the file to download
   * @param fileName The name to save the file as
   * @returns Promise resolving when download completes
   */
  async downloadModelFile(modelId: string, fileUrl: string, fileName: string): Promise<void> {
    return this.downloadService.downloadModelFile(modelId, fileUrl, fileName);
  }

  /**
   * Gets the status of an active download
   * @param modelId The ID of the model
   * @returns Download status or undefined if not found
   */
  getDownloadStatus(modelId: string): DownloadStatus | undefined {
    return this.downloadService.getDownloadStatus(modelId);
  }

  /**
   * Gets all active download statuses
   * @returns Array of download statuses
   */
  getAllDownloadStatuses(): DownloadStatus[] {
    return this.downloadService.getAllDownloadStatuses();
  }

  /**
   * Cancels an active download
   * @param modelId The ID of the model to cancel
   */
  cancelDownload(modelId: string): void {
    this.downloadService.cancelDownload(modelId);
  }

  /**
   * Get file list for a repo to allow picking quantization
   * @param repoId The repository ID
   * @returns Promise resolving to list of GGUF files
   */
  async getRepoFiles(repoId: string) {
    return this.downloadService.getRepoFiles(repoId);
  }

  /**
   * Starts a model download
   * @param repoId The repository ID
   * @param fileName The name of the file to download
   * @param modelName The name of the model
   * @returns Download ID
   */
  startDownload(repoId: string, fileName: string, modelName: string): string {
    return this.downloadService.startDownload(repoId, fileName, modelName);
  }

  /**
   * Gets all active downloads
   * @returns Array of all download statuses
   */
  getAllDownloads() {
    return this.downloadService.getAllDownloads();
  }
}