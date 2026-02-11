/**
 * Model Downloader Service
 * 
 * Provides functionality to search and download GGUF models from HuggingFace.
 */

export interface HFModel {
    id: string; // e.g., "TheBloke/Llama-2-7B-Chat-GGUF"
    author: string;
    modelId: string; // e.g., "Llama-2-7B-Chat-GGUF"
    downloads: number;
    likes: number;
    tags: string[];
    lastModified: string;
    private: boolean;
}

export interface GGUFFile {
    name: string;
    size: number; // in bytes
    downloadUrl: string;
    quantization?: string; // e.g., "Q4_K_M", "Q5_K_S"
}

export interface DownloadProgress {
    modelId: string;
    fileName: string;
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
    error?: string;
    speed?: number; // bytes per second
    eta?: number; // seconds remaining
}

interface HFModelSearchResponseItem {
    id?: string;
    author?: string;
    modelId?: string;
    downloads?: number;
    likes?: number;
    tags?: string[];
    lastModified?: string;
    private?: boolean;
}

interface HFModelTreeResponseItem {
    path?: string;
    size?: number;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

// Popular quantization types and their descriptions
export const QUANTIZATION_INFO: Record<string, { name: string; description: string; quality: number }> = {
    'Q2_K': { name: 'Q2_K', description: 'Smallest, lowest quality', quality: 1 },
    'Q3_K_S': { name: 'Q3_K_S', description: 'Very small, low quality', quality: 2 },
    'Q3_K_M': { name: 'Q3_K_M', description: 'Small, low quality', quality: 2 },
    'Q4_0': { name: 'Q4_0', description: 'Legacy format, medium quality', quality: 3 },
    'Q4_K_S': { name: 'Q4_K_S', description: 'Small, good quality', quality: 4 },
    'Q4_K_M': { name: 'Q4_K_M', description: 'Medium, good quality (recommended)', quality: 5 },
    'Q5_0': { name: 'Q5_0', description: 'Legacy format, high quality', quality: 5 },
    'Q5_K_S': { name: 'Q5_K_S', description: 'Small, high quality', quality: 6 },
    'Q5_K_M': { name: 'Q5_K_M', description: 'Medium, high quality', quality: 7 },
    'Q6_K': { name: 'Q6_K', description: 'Large, very high quality', quality: 8 },
    'Q8_0': { name: 'Q8_0', description: 'Largest, near-lossless', quality: 9 },
    'F16': { name: 'F16', description: 'Full precision (huge)', quality: 10 },
};

// Recommended models for different use cases
export const RECOMMENDED_MODELS = [
    { id: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF', name: 'Mistral 7B Instruct v0.2', category: 'General', size: '7B' },
    { id: 'TheBloke/Llama-2-7B-Chat-GGUF', name: 'Llama 2 7B Chat', category: 'General', size: '7B' },
    { id: 'TheBloke/Llama-2-13B-Chat-GGUF', name: 'Llama 2 13B Chat', category: 'General', size: '13B' },
    { id: 'TheBloke/CodeLlama-7B-Instruct-GGUF', name: 'CodeLlama 7B', category: 'Coding', size: '7B' },
    { id: 'TheBloke/CodeLlama-13B-Instruct-GGUF', name: 'CodeLlama 13B', category: 'Coding', size: '13B' },
    { id: 'TheBloke/Nous-Hermes-2-Mistral-7B-DPO-GGUF', name: 'Nous Hermes 2 Mistral', category: 'General', size: '7B' },
    { id: 'TheBloke/OpenHermes-2.5-Mistral-7B-GGUF', name: 'OpenHermes 2.5 Mistral', category: 'General', size: '7B' },
    { id: 'TheBloke/Phind-CodeLlama-34B-v2-GGUF', name: 'Phind CodeLlama 34B', category: 'Coding', size: '34B' },
    { id: 'TheBloke/WizardCoder-Python-34B-V1.0-GGUF', name: 'WizardCoder Python 34B', category: 'Coding', size: '34B' },
    { id: 'TheBloke/zephyr-7B-beta-GGUF', name: 'Zephyr 7B Beta', category: 'General', size: '7B' },
];

const HF_API_BASE = 'https://huggingface.co/api';

class ModelDownloader {
    private downloads: Map<string, DownloadProgress> = new Map();
    private listeners: Set<() => void> = new Set();
    private abortControllers: Map<string, AbortController> = new Map();

    /**
     * Subscribe to download state changes
     */
    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notifyListeners(): void {
        this.listeners.forEach(fn => fn());
    }

    /**
     * Get all active downloads
     */
    getDownloads(): DownloadProgress[] {
        return Array.from(this.downloads.values());
    }

    /**
     * Search for GGUF models on HuggingFace
     */
    async searchModels(query: string, limit: number = 20): Promise<HFModel[]> {
        try {
            const params = new URLSearchParams({
                search: query,
                filter: 'gguf',
                sort: 'downloads',
                direction: '-1',
                limit: limit.toString()
            });

            const response = await fetch(`${HF_API_BASE}/models?${params}`);

            if (!response.ok) {
                throw new Error(`HuggingFace API error: ${response.status}`);
            }

            const rawData: unknown = await response.json();
            const data = Array.isArray(rawData) ? (rawData as HFModelSearchResponseItem[]) : [];

            return data.map((model) => ({
                id: model.id || model.modelId || '',
                author: model.author || model.id?.split('/')[0] || 'Unknown',
                modelId: model.modelId || model.id?.split('/')[1] || model.id || '',
                downloads: model.downloads || 0,
                likes: model.likes || 0,
                tags: model.tags || [],
                lastModified: model.lastModified || '',
                private: model.private || false
            }));
        } catch (error: unknown) {
            console.error('Failed to search models:', error);
            throw error;
        }
    }

    /**
     * Get GGUF files available for a model
     */
    async getModelFiles(modelId: string): Promise<GGUFFile[]> {
        try {
            const response = await fetch(`${HF_API_BASE}/models/${modelId}/tree/main`);

            if (!response.ok) {
                throw new Error(`Failed to fetch model files: ${response.status}`);
            }

            const rawFiles: unknown = await response.json();
            const files = Array.isArray(rawFiles) ? (rawFiles as HFModelTreeResponseItem[]) : [];

            // Filter for GGUF files
            const ggufFiles = files
                .filter((f) => f.path?.toLowerCase().endsWith('.gguf'))
                .map(f => {
                    // Extract quantization from filename
                    const name = f.path ?? '';
                    let quantization = 'Unknown';

                    for (const quant of Object.keys(QUANTIZATION_INFO)) {
                        if (name.toUpperCase().includes(quant.toUpperCase())) {
                            quantization = quant;
                            break;
                        }
                    }

                    return {
                        name: name,
                        size: f.size || 0,
                        downloadUrl: `https://huggingface.co/${modelId}/resolve/main/${name}`,
                        quantization
                    };
                })
                .sort((a, b) => {
                    // Sort by quantization quality
                    const qA = QUANTIZATION_INFO[a.quantization]?.quality || 0;
                    const qB = QUANTIZATION_INFO[b.quantization]?.quality || 0;
                    return qA - qB;
                });

            return ggufFiles;
        } catch (error: unknown) {
            console.error('Failed to get model files:', error);
            throw error;
        }
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format seconds to time string
     */
    formatTime(seconds: number): string {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }

    /**
     * Start downloading a model file
     * Note: Actual file download would need to happen in Electron main process
     * This is a mock/placeholder for the UI
     */
    async downloadModel(modelId: string, file: GGUFFile): Promise<void> {
        const downloadId = `${modelId}/${file.name}`;

        // Check if already downloading
        if (this.downloads.has(downloadId)) {
            throw new Error('Already downloading this file');
        }

        const progress: DownloadProgress = {
            modelId,
            fileName: file.name,
            downloadedBytes: 0,
            totalBytes: file.size,
            percentage: 0,
            status: 'pending'
        };

        this.downloads.set(downloadId, progress);
        this.notifyListeners();

        // Create abort controller
        const abortController = new AbortController();
        this.abortControllers.set(downloadId, abortController);

        try {
            progress.status = 'downloading';
            this.notifyListeners();

            // Check if Electron IPC is available for real download
            if (window.electronAPI?.downloadModel) {
                await window.electronAPI.downloadModel({
                    modelId,
                    fileName: file.name,
                    url: file.downloadUrl,
                    size: file.size
                });

                progress.status = 'completed';
                progress.percentage = 100;
                progress.downloadedBytes = file.size;
            } else {
                // Mock download progress for development
                const totalChunks = 100;
                const chunkSize = file.size / totalChunks;
                const startTime = Date.now();

                for (let i = 0; i <= totalChunks; i++) {
                    if (abortController.signal.aborted) {
                        progress.status = 'cancelled';
                        break;
                    }

                    await new Promise(r => setTimeout(r, 50)); // Simulate network delay

                    progress.downloadedBytes = Math.min(chunkSize * i, file.size);
                    progress.percentage = Math.round((i / totalChunks) * 100);

                    // Calculate speed and ETA
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (elapsed > 0) {
                        progress.speed = progress.downloadedBytes / elapsed;
                        const remaining = file.size - progress.downloadedBytes;
                        progress.eta = progress.speed > 0 ? remaining / progress.speed : 0;
                    }

                    this.notifyListeners();
                }

                if (progress.status !== 'cancelled') {
                    progress.status = 'completed';
                    progress.percentage = 100;
                }
            }
        } catch (error: unknown) {
            progress.status = 'error';
            progress.error = getErrorMessage(error, 'Download failed');
        }

        this.notifyListeners();
        this.abortControllers.delete(downloadId);
    }

    /**
     * Cancel an active download
     */
    cancelDownload(modelId: string, fileName: string): void {
        const downloadId = `${modelId}/${fileName}`;
        const controller = this.abortControllers.get(downloadId);

        if (controller) {
            controller.abort();
        }

        const progress = this.downloads.get(downloadId);
        if (progress) {
            progress.status = 'cancelled';
            this.notifyListeners();
        }
    }

    /**
     * Remove a download from the list
     */
    removeDownload(modelId: string, fileName: string): void {
        const downloadId = `${modelId}/${fileName}`;
        this.downloads.delete(downloadId);
        this.notifyListeners();
    }

    /**
     * Estimate VRAM requirement for a quantization type
     */
    estimateVRAM(fileSizeBytes: number, quantization: string): { vramGB: number; suggestion: string } {
        // Rough estimates - actual VRAM usage depends on context length and model architecture
        const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);

        // VRAM is typically file size + some overhead for KV cache
        const vramMultiplier = 1.2; // 20% overhead
        const vramGB = fileSizeGB * vramMultiplier;

        let suggestion = '';
        if (vramGB <= 4) {
            suggestion = 'Great for most GPUs (4GB+ VRAM)';
        } else if (vramGB <= 6) {
            suggestion = 'Requires 6GB+ VRAM';
        } else if (vramGB <= 8) {
            suggestion = 'Requires 8GB+ VRAM';
        } else if (vramGB <= 12) {
            suggestion = 'Requires 12GB+ VRAM (RTX 3060 12GB, RTX 4070)';
        } else if (vramGB <= 24) {
            suggestion = 'Requires 24GB+ VRAM (RTX 3090, RTX 4090)';
        } else {
            suggestion = 'Very large model - may require multiple GPUs or CPU offloading';
        }

        return { vramGB: Math.round(vramGB * 10) / 10, suggestion };
    }
}

// Singleton instance
export const modelDownloader = new ModelDownloader();

// Note: Window.electronAPI is declared in services/mcp.ts
// The downloadModel method should be added to that interface when implementing real downloads
