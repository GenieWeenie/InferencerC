/**
 * Web Workers Index
 *
 * Re-exports worker manager for easy access.
 * Workers are initialized lazily on first use.
 *
 * Available workers:
 * - encryption: AES-GCM encryption/decryption
 * - search: Full-text search with fuzzy matching
 * - export: HTML/Markdown/JSON export generation
 */

export {
    workerManager,
    WorkerManagerService,
    type SearchFilters,
    type SearchOptions,
    type SearchResult,
    type SearchStats,
    type ExportFormat,
    type ExportOptions,
} from '../services/workerManager';
