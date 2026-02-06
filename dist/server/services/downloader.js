"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
const model_download_1 = require("./model-download");
class ModelManager {
    configService;
    downloadService;
    constructor(configService) {
        this.configService = configService;
        this.downloadService = new model_download_1.ModelDownloadService(configService);
    }
    // Search HF for GGUF models using the download service
    async searchHuggingFace(query) {
        return this.downloadService.searchHuggingFace(query);
    }
    /**
     * Downloads a model file from a URL
     * @param modelId The ID of the model
     * @param fileUrl The URL of the file to download
     * @param fileName The name to save the file as
     * @returns Promise resolving when download completes
     */
    async downloadModelFile(modelId, fileUrl, fileName) {
        return this.downloadService.downloadModelFile(modelId, fileUrl, fileName);
    }
    /**
     * Gets the status of an active download
     * @param modelId The ID of the model
     * @returns Download status or undefined if not found
     */
    getDownloadStatus(modelId) {
        return this.downloadService.getDownloadStatus(modelId);
    }
    /**
     * Gets all active download statuses
     * @returns Array of download statuses
     */
    getAllDownloadStatuses() {
        return this.downloadService.getAllDownloadStatuses();
    }
    /**
     * Cancels an active download
     * @param modelId The ID of the model to cancel
     */
    cancelDownload(modelId) {
        this.downloadService.cancelDownload(modelId);
    }
    /**
     * Get file list for a repo to allow picking quantization
     * @param repoId The repository ID
     * @returns Promise resolving to list of GGUF files
     */
    async getRepoFiles(repoId) {
        return this.downloadService.getRepoFiles(repoId);
    }
    /**
     * Starts a model download
     * @param repoId The repository ID
     * @param fileName The name of the file to download
     * @param modelName The name of the model
     * @returns Download ID
     */
    startDownload(repoId, fileName, modelName) {
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
exports.ModelManager = ModelManager;
//# sourceMappingURL=downloader.js.map