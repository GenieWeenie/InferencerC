/**
 * Worker Manager Service
 *
 * Central coordinator for all Web Workers.
 * Provides promise-based APIs for async worker operations.
 */

import { ChatMessage, ChatSession } from '../../shared/types';

// Worker types
type WorkerType = 'encryption' | 'search' | 'export';

// Request/Response types
interface WorkerRequest {
    type: string;
    id: string;
    [key: string]: unknown;
}

interface WorkerResponse {
    type: string;
    id: string;
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// Pending request tracker
interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

// Search types (re-exported for convenience)
export interface SearchFilters {
    dateFrom?: number;
    dateTo?: number;
    model?: string;
    role?: 'user' | 'assistant' | 'all';
    sessionId?: string;
}

export interface SearchOptions {
    maxResults?: number;
    includeContext?: boolean;
    fuzzyMatch?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
}

export interface SearchResult {
    sessionId: string;
    sessionTitle: string;
    messageIndex: number;
    messageRole: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    matchedText: string;
    matchStart: number;
    matchEnd: number;
    relevanceScore: number;
    timestamp: number;
    isInCollapsedSection?: boolean;
    context?: {
        before?: string;
        after?: string;
    };
}

export interface SearchStats {
    totalResults: number;
    sessionsSearched: number;
    messagesSearched: number;
    searchTimeMs: number;
    topKeywords: string[];
}

// Export types
export type ExportFormat = 'html' | 'markdown' | 'json';

export interface ExportOptions {
    title?: string;
    includeMetadata?: boolean;
    includeTimestamps?: boolean;
    includeImages?: boolean;
    theme?: 'light' | 'dark';
}

class WorkerManagerService {
    private workers: Map<WorkerType, Worker> = new Map();
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private requestCounter = 0;
    private workerReady: Map<WorkerType, boolean> = new Map();
    private initPromises: Map<WorkerType, Promise<void>> = new Map();
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

    constructor() {
        // Lazy initialization - workers are created on first use
    }

    /**
     * Generate unique request ID
     */
    private generateId(): string {
        return `req_${++this.requestCounter}_${Date.now()}`;
    }

    /**
     * Initialize a worker if not already initialized
     */
    private async initWorker(type: WorkerType): Promise<Worker> {
        // Return existing worker if ready
        if (this.workers.has(type) && this.workerReady.get(type)) {
            return this.workers.get(type)!;
        }

        // Check if initialization is in progress
        if (this.initPromises.has(type)) {
            await this.initPromises.get(type);
            return this.workers.get(type)!;
        }

        // Create initialization promise
        const initPromise = new Promise<void>((resolve, reject) => {
            let worker: Worker;

            try {
                // Worker creation using Vite's worker URL pattern
                const baseUrl = import.meta.url;

                switch (type) {
                    case 'encryption':
                        worker = new Worker(
                            new URL('../workers/encryption.worker.ts', baseUrl),
                            { type: 'module' }
                        );
                        break;
                    case 'search':
                        worker = new Worker(
                            new URL('../workers/search.worker.ts', baseUrl),
                            { type: 'module' }
                        );
                        break;
                    case 'export':
                        worker = new Worker(
                            new URL('../workers/export.worker.ts', baseUrl),
                            { type: 'module' }
                        );
                        break;
                    default:
                        throw new Error(`Unknown worker type: ${type}`);
                }

                // Set up message handler
                worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                    const response = event.data;

                    // Handle ready message
                    if (response.type === 'ready') {
                        this.workerReady.set(type, true);
                        resolve();
                        return;
                    }

                    // Handle normal responses
                    const pending = this.pendingRequests.get(response.id);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingRequests.delete(response.id);

                        if (response.success) {
                            pending.resolve(response);
                        } else {
                            pending.reject(new Error(response.error || 'Unknown worker error'));
                        }
                    }
                };

                // Set up error handler
                worker.onerror = (error) => {
                    console.error(`Worker ${type} error:`, error);
                    reject(new Error(`Worker ${type} failed: ${error.message}`));
                };

                this.workers.set(type, worker);

                // Timeout for worker initialization
                setTimeout(() => {
                    if (!this.workerReady.get(type)) {
                        reject(new Error(`Worker ${type} initialization timeout`));
                    }
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });

        this.initPromises.set(type, initPromise);

        try {
            await initPromise;
        } finally {
            this.initPromises.delete(type);
        }

        return this.workers.get(type)!;
    }

    /**
     * Send request to worker and wait for response
     */
    private async sendRequest<T>(
        type: WorkerType,
        request: Omit<WorkerRequest, 'id'>
    ): Promise<T> {
        const worker = await this.initWorker(type);
        const id = this.generateId();

        return new Promise<T>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Worker request timeout: ${request.type}`));
            }, this.REQUEST_TIMEOUT);

            this.pendingRequests.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
                timeout,
            });

            worker.postMessage({ ...request, id });
        });
    }

    // ==================== Encryption API ====================

    /**
     * Encrypt data using web worker
     */
    async encrypt(plaintext: string, keyBase64: string): Promise<string> {
        const response = await this.sendRequest<{ result: string }>('encryption', {
            type: 'encrypt',
            data: plaintext,
            keyBase64,
        });
        return response.result;
    }

    /**
     * Decrypt data using web worker
     */
    async decrypt(ciphertext: string, keyBase64: string): Promise<string> {
        const response = await this.sendRequest<{ result: string }>('encryption', {
            type: 'decrypt',
            data: ciphertext,
            keyBase64,
        });
        return response.result;
    }

    /**
     * Generate new encryption key using web worker
     */
    async generateEncryptionKey(): Promise<string> {
        const response = await this.sendRequest<{ result: string }>('encryption', {
            type: 'generateKey',
        });
        return response.result;
    }

    // ==================== Search API ====================

    /**
     * Perform search using web worker
     */
    async search(
        sessions: ChatSession[],
        query: string,
        filters?: SearchFilters,
        options?: SearchOptions
    ): Promise<{ results: SearchResult[]; stats: SearchStats }> {
        const response = await this.sendRequest<{
            results: SearchResult[];
            stats: SearchStats;
        }>('search', {
            type: 'search',
            sessions,
            query,
            filters,
            options,
        });
        return {
            results: response.results,
            stats: response.stats,
        };
    }

    /**
     * Extract keywords from messages using web worker
     */
    async extractKeywords(messages: ChatMessage[]): Promise<string[]> {
        const response = await this.sendRequest<{ keywords: string[] }>('search', {
            type: 'extractKeywords',
            messages,
        });
        return response.keywords;
    }

    // ==================== Export API ====================

    /**
     * Export conversation using web worker (HTML, Markdown, JSON)
     */
    async export(
        format: ExportFormat,
        messages: ChatMessage[],
        options: ExportOptions
    ): Promise<{ content: string; mimeType: string }> {
        const response = await this.sendRequest<{
            content: string;
            mimeType: string;
        }>('export', {
            type: 'export',
            format,
            messages,
            options,
        });
        return {
            content: response.content,
            mimeType: response.mimeType,
        };
    }

    // ==================== Worker Management ====================

    /**
     * Terminate a specific worker
     */
    terminateWorker(type: WorkerType): void {
        const worker = this.workers.get(type);
        if (worker) {
            worker.terminate();
            this.workers.delete(type);
            this.workerReady.delete(type);
        }
    }

    /**
     * Terminate all workers
     */
    terminateAll(): void {
        for (const [type, worker] of this.workers) {
            worker.terminate();
        }
        this.workers.clear();
        this.workerReady.clear();
        this.pendingRequests.clear();
    }

    /**
     * Check if a worker is available and ready
     */
    isWorkerReady(type: WorkerType): boolean {
        return this.workerReady.get(type) || false;
    }

    /**
     * Get worker status
     */
    getStatus(): Record<WorkerType, 'ready' | 'initializing' | 'not_started'> {
        const status: Record<WorkerType, 'ready' | 'initializing' | 'not_started'> = {
            encryption: 'not_started',
            search: 'not_started',
            export: 'not_started',
        };

        for (const type of ['encryption', 'search', 'export'] as WorkerType[]) {
            if (this.workerReady.get(type)) {
                status[type] = 'ready';
            } else if (this.initPromises.has(type)) {
                status[type] = 'initializing';
            }
        }

        return status;
    }

    /**
     * Check if Web Workers are supported
     */
    static isSupported(): boolean {
        return typeof Worker !== 'undefined';
    }
}

// Export singleton instance
export const workerManager = new WorkerManagerService();

// Export class for testing
export { WorkerManagerService };
