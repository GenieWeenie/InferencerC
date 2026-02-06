"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelDownloadService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const uuid_1 = require("uuid");
const cache_1 = require("./cache");
const MODELS_DIR = path_1.default.join(process.cwd(), 'models');
if (!fs_1.default.existsSync(MODELS_DIR)) {
    fs_1.default.mkdirSync(MODELS_DIR, { recursive: true });
}
const activeDownloads = {};
/**
 * Service class for managing model downloads from external sources
 * Handles searching, downloading, and tracking the status of model downloads
 */
class ModelDownloadService {
    configService = null;
    /**
     * Constructor for ModelDownloadService
     * @param configService Optional config service to register models after download
     */
    constructor(configService) {
        if (configService) {
            this.configService = configService;
        }
    }
    /**
     * Sets the config service for model registration
     * @param configService The config service to use
     */
    setConfigService(configService) {
        this.configService = configService;
    }
    /**
     * Searches Hugging Face for GGUF models matching the query
     * @param query The search query
     * @returns Promise resolving to search results
     */
    async searchHuggingFace(query) {
        // Create a cache key based on the query
        const cacheKey = `hf-search-${query}`;
        const cachedResult = cache_1.cacheService.get(cacheKey);
        if (cachedResult) {
            console.log(`[ModelDownloadService] Returning cached search results for query: ${query}`);
            return cachedResult;
        }
        const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&limit=10&full=true`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            // Cache the results for 10 minutes
            cache_1.cacheService.set(cacheKey, data, 10 * 60 * 1000);
            return data;
        }
        catch (err) {
            console.error("HF Search failed:", err);
            return [];
        }
    }
    /**
     * Downloads a model file from a URL
     * @param modelId The ID of the model
     * @param fileUrl The URL of the file to download
     * @param fileName The name to save the file as
     * @returns Promise resolving when download completes
     */
    async downloadModelFile(modelId, fileUrl, fileName) {
        return new Promise((resolve, reject) => {
            const filePath = path_1.default.join(MODELS_DIR, fileName);
            const fileStream = fs_1.default.createWriteStream(filePath);
            // Update download status
            activeDownloads[modelId] = {
                modelId,
                fileName,
                progress: 0,
                status: 'downloading'
            };
            https_1.default.get(fileUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
                    return;
                }
                const totalLength = response.headers['content-length'];
                let downloadedLength = 0;
                response.on('data', (chunk) => {
                    downloadedLength += chunk.length;
                    if (totalLength) {
                        const progress = (downloadedLength / parseInt(totalLength)) * 100;
                        activeDownloads[modelId].progress = progress;
                    }
                });
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    activeDownloads[modelId].progress = 100;
                    activeDownloads[modelId].status = 'completed';
                    console.log(`[ModelDownloadService] Download completed: ${fileName}`);
                    resolve();
                });
                fileStream.on('error', (err) => {
                    activeDownloads[modelId].status = 'error';
                    activeDownloads[modelId].error = err.message;
                    console.error(`[ModelDownloadService] Download failed: ${fileName}`, err);
                    reject(err);
                });
            }).on('error', (err) => {
                activeDownloads[modelId].status = 'error';
                activeDownloads[modelId].error = err.message;
                console.error(`[ModelDownloadService] Failed to initiate download: ${fileName}`, err);
                reject(err);
            });
        });
    }
    /**
     * Gets the status of an active download
     * @param modelId The ID of the model
     * @returns Download status or undefined if not found
     */
    getDownloadStatus(modelId) {
        return activeDownloads[modelId];
    }
    /**
     * Gets all active download statuses
     * @returns Array of download statuses
     */
    getAllDownloadStatuses() {
        return Object.values(activeDownloads);
    }
    /**
     * Cancels an active download
     * @param modelId The ID of the model to cancel
     */
    cancelDownload(modelId) {
        // In a real implementation, we would cancel the ongoing HTTP request
        // For now, we'll just update the status
        if (activeDownloads[modelId]) {
            activeDownloads[modelId].status = 'error';
            activeDownloads[modelId].error = 'Download cancelled';
        }
    }
    /**
     * Gets file list for a repo to allow picking quantization
     * @param repoId The repository ID
     * @returns Promise resolving to list of GGUF files
     */
    async getRepoFiles(repoId) {
        const url = `https://huggingface.co/api/models/${repoId}/tree/main`;
        try {
            const res = await fetch(url);
            const files = await res.json();
            // Filter for .gguf files
            return files.filter((f) => f.path.endsWith('.gguf'));
        }
        catch (err) {
            console.error("Failed to fetch repo files:", err);
            return [];
        }
    }
    /**
     * Starts a model download
     * @param repoId The repository ID
     * @param fileName The name of the file to download
     * @param modelName The name of the model
     * @returns Download ID
     */
    startDownload(repoId, fileName, modelName) {
        const downloadId = (0, uuid_1.v4)();
        const fileUrl = `https://huggingface.co/${repoId}/resolve/main/${fileName}`;
        const destinationPath = path_1.default.join(MODELS_DIR, fileName);
        activeDownloads[downloadId] = {
            modelId: downloadId,
            fileName,
            progress: 0,
            status: 'downloading'
        };
        // RE-IMPLEMENTATION WITH FETCH (handles redirects)
        this.downloadWithFetch(fileUrl, destinationPath, downloadId, fileName, modelName, repoId);
        return downloadId;
    }
    /**
     * Private method to download with fetch
     * @private
     */
    async downloadWithFetch(url, destPath, id, fileName, modelName, repoId) {
        try {
            const res = await fetch(url);
            if (!res.ok || !res.body)
                throw new Error(`HTTP ${res.status}`);
            const totalSize = parseInt(res.headers.get('content-length') || '0', 10);
            let downloaded = 0;
            const fileStream = fs_1.default.createWriteStream(destPath);
            // @ts-ignore - ReadableStream iterator
            for await (const chunk of res.body) {
                fileStream.write(chunk);
                downloaded += chunk.length;
                if (totalSize > 0) {
                    activeDownloads[id].progress = Math.round((downloaded / totalSize) * 100);
                }
            }
            fileStream.end();
            activeDownloads[id].status = 'completed';
            activeDownloads[id].progress = 100;
            // Auto-register the model in config if config service is available
            if (this.configService) {
                this.configService.addModel({
                    id: (0, uuid_1.v4)(),
                    name: `${modelName} (${fileName})`,
                    pathOrUrl: destPath,
                    type: 'local-folder',
                    status: 'loaded',
                    adapter: 'mock' // For now, local files default to mock unless we have a real local runner
                });
            }
        }
        catch (err) {
            activeDownloads[id].status = 'error';
            activeDownloads[id].error = err.message;
        }
    }
    /**
     * Gets the local path for a downloaded model
     * @param fileName The name of the model file
     * @returns Full path to the model file
     */
    getModelPath(fileName) {
        return path_1.default.join(MODELS_DIR, fileName);
    }
    /**
     * Checks if a model file exists locally
     * @param fileName The name of the model file
     * @returns True if the file exists, false otherwise
     */
    modelExists(fileName) {
        return fs_1.default.existsSync(this.getModelPath(fileName));
    }
    /**
     * Gets all active downloads
     * @returns Array of all download statuses
     */
    getAllDownloads() {
        return Object.values(activeDownloads);
    }
}
exports.ModelDownloadService = ModelDownloadService;
//# sourceMappingURL=model-download.js.map