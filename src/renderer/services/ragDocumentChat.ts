export type ChunkingStrategy = 'semantic' | 'fixed-size' | 'paragraph';

export interface RAGDocument {
    id: string;
    name: string;
    mimeType: string;
    sourceType: string;
    uploadedAt: number;
    size: number;
    strategy: ChunkingStrategy;
    chunkCount: number;
    preview: string;
}

export interface RAGChunk {
    id: string;
    documentId: string;
    text: string;
    index: number;
    lineStart: number;
    lineEnd: number;
    page: number;
}

export interface RAGCitation {
    documentId: string;
    documentName: string;
    chunkId: string;
    lineStart: number;
    lineEnd: number;
    page: number;
    excerpt: string;
}

export interface RAGSearchResult {
    chunk: RAGChunk;
    score: number;
    citation: RAGCitation;
}

export interface RAGAnswerResult {
    answer: string;
    citations: RAGCitation[];
    resultsUsed: number;
}

interface TextSegment {
    text: string;
    lineStart: number;
    lineEnd: number;
    page: number;
}

interface EmbeddingCacheStats {
    entries: number;
    hits: number;
    misses: number;
}

const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'js', 'ts', 'tsx', 'jsx', 'py', 'json', 'yaml', 'yml',
    'html', 'css', 'c', 'cpp', 'h', 'hpp', 'java', 'go', 'rs', 'sql', 'xml',
    'sh', 'bash', 'zsh', 'ini', 'toml',
]);
const MAX_EMBEDDING_CACHE_ENTRIES = 5000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export class RagDocumentChatService {
    private static instance: RagDocumentChatService;
    private readonly EMBEDDING_CACHE_KEY = 'rag_embedding_cache_v1';
    private readonly EMBEDDING_DIM = 128;

    private documents = new Map<string, RAGDocument>();
    private chunksByDocument = new Map<string, RAGChunk[]>();
    private embeddingCache = new Map<string, number[]>();
    private memoryStorage = new Map<string, string>();
    private cacheHits = 0;
    private cacheMisses = 0;

    private constructor() {
        this.loadEmbeddingCache();
    }

    static getInstance(): RagDocumentChatService {
        if (!RagDocumentChatService.instance) {
            RagDocumentChatService.instance = new RagDocumentChatService();
        }
        return RagDocumentChatService.instance;
    }

    async ingestFile(file: File, strategy: ChunkingStrategy): Promise<RAGDocument> {
        const extension = this.getFileExtension(file.name);
        let text = '';

        if (TEXT_EXTENSIONS.has(extension) || file.type.startsWith('text/')) {
            text = await file.text();
        } else {
            const buffer = await file.arrayBuffer();
            text = this.extractTextFromBinary(buffer);
        }

        return this.ingestTextDocument({
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            sourceType: extension || 'binary',
            size: file.size,
            strategy,
            text,
        });
    }

    ingestTextDocument(input: {
        name: string;
        mimeType?: string;
        sourceType?: string;
        size?: number;
        strategy: ChunkingStrategy;
        text: string;
    }): RAGDocument {
        const normalized = this.normalizeText(input.text);
        if (!normalized.trim()) {
            throw new Error('Document has no readable text content');
        }

        const documentId = this.createId();
        const chunks = this.chunkText(documentId, normalized, input.strategy);
        if (chunks.length === 0) {
            throw new Error('Unable to chunk document content');
        }

        // Warm embeddings and cache for retrieval.
        chunks.forEach(chunk => {
            this.getEmbedding(chunk.text);
        });

        const document: RAGDocument = {
            id: documentId,
            name: input.name,
            mimeType: input.mimeType || 'text/plain',
            sourceType: input.sourceType || 'text',
            uploadedAt: Date.now(),
            size: input.size || normalized.length,
            strategy: input.strategy,
            chunkCount: chunks.length,
            preview: normalized.slice(0, 1500),
        };

        this.documents.set(documentId, document);
        this.chunksByDocument.set(documentId, chunks);
        return document;
    }

    getDocuments(): RAGDocument[] {
        return Array.from(this.documents.values()).sort((a, b) => b.uploadedAt - a.uploadedAt);
    }

    getDocument(documentId: string): RAGDocument | undefined {
        return this.documents.get(documentId);
    }

    getDocumentChunks(documentId: string): RAGChunk[] {
        return this.chunksByDocument.get(documentId) || [];
    }

    removeDocument(documentId: string): void {
        this.documents.delete(documentId);
        this.chunksByDocument.delete(documentId);
    }

    clearDocuments(): void {
        this.documents.clear();
        this.chunksByDocument.clear();
    }

    search(query: string, options?: { topK?: number; documentIds?: string[] }): RAGSearchResult[] {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return [];

        const topK = options?.topK || 5;
        const filter = options?.documentIds ? new Set(options.documentIds) : null;
        const queryEmbedding = this.getEmbedding(normalizedQuery);
        const results: RAGSearchResult[] = [];

        this.chunksByDocument.forEach((chunks, documentId) => {
            if (filter && !filter.has(documentId)) return;
            const document = this.documents.get(documentId);
            if (!document) return;

            chunks.forEach(chunk => {
                const score = this.cosineSimilarity(queryEmbedding, this.getEmbedding(chunk.text));
                if (score <= 0) return;

                results.push({
                    chunk,
                    score,
                    citation: {
                        documentId,
                        documentName: document.name,
                        chunkId: chunk.id,
                        lineStart: chunk.lineStart,
                        lineEnd: chunk.lineEnd,
                        page: chunk.page,
                        excerpt: this.summarize(chunk.text, 180),
                    },
                });
            });
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    answerQuestion(query: string, options?: { topK?: number; documentIds?: string[] }): RAGAnswerResult {
        const matches = this.search(query, options);
        if (matches.length === 0) {
            return {
                answer: 'No relevant document context was found for that question.',
                citations: [],
                resultsUsed: 0,
            };
        }

        const selected = matches.slice(0, Math.min(3, matches.length));
        const responseLines = selected.map((match, index) => {
            const sentence = this.extractSentence(match.chunk.text);
            return `[${index + 1}] ${sentence}`;
        });

        const citationLines = selected.map((match, index) => {
            return `[${index + 1}] ${match.citation.documentName} (page ${match.citation.page}, lines ${match.citation.lineStart}-${match.citation.lineEnd})`;
        });

        return {
            answer: `${responseLines.join('\n')}\n\nSources:\n${citationLines.join('\n')}`,
            citations: selected.map(item => item.citation),
            resultsUsed: selected.length,
        };
    }

    getEmbeddingCacheStats(): EmbeddingCacheStats {
        return {
            entries: this.embeddingCache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
        };
    }

    private chunkText(documentId: string, text: string, strategy: ChunkingStrategy): RAGChunk[] {
        const segments = this.splitIntoSegments(text);
        if (segments.length === 0) return [];

        let grouped: TextSegment[];
        if (strategy === 'paragraph') {
            grouped = segments;
        } else if (strategy === 'fixed-size') {
            grouped = this.groupSegmentsByTargetSize(segments, 900);
        } else {
            grouped = this.semanticGroupSegments(segments);
        }

        return grouped
            .filter(segment => segment.text.trim().length > 0)
            .map((segment, index) => ({
                id: `${documentId}-chunk-${index + 1}`,
                documentId,
                index,
                text: segment.text.trim(),
                lineStart: segment.lineStart,
                lineEnd: segment.lineEnd,
                page: segment.page,
            }));
    }

    private splitIntoSegments(text: string): TextSegment[] {
        const normalized = text.replace(/\f/g, '\n\f\n');
        const lines = normalized.split('\n');
        const segments: TextSegment[] = [];
        let currentPage = 1;
        let buffer: string[] = [];
        let startLine = 1;
        let segmentPage = 1;

        const flush = (endLine: number) => {
            const content = buffer.join('\n').trim();
            if (!content) {
                buffer = [];
                return;
            }
            segments.push({
                text: content,
                lineStart: startLine,
                lineEnd: endLine,
                page: segmentPage,
            });
            buffer = [];
        };

        lines.forEach((rawLine, idx) => {
            const lineNumber = idx + 1;
            const line = rawLine || '';

            if (line.trim() === '\f') {
                flush(lineNumber - 1);
                currentPage += 1;
                startLine = lineNumber + 1;
                segmentPage = currentPage;
                return;
            }

            if (line.trim() === '') {
                flush(lineNumber - 1);
                startLine = lineNumber + 1;
                segmentPage = currentPage;
                return;
            }

            if (buffer.length === 0) {
                startLine = lineNumber;
                segmentPage = currentPage;
            }
            buffer.push(line);
        });

        flush(lines.length);
        return segments;
    }

    private groupSegmentsByTargetSize(segments: TextSegment[], targetChars: number): TextSegment[] {
        const grouped: TextSegment[] = [];
        let current: TextSegment | null = null;

        segments.forEach(segment => {
            if (!current) {
                current = { ...segment };
                return;
            }

            if ((current.text.length + segment.text.length) < targetChars) {
                current = {
                    text: `${current.text}\n\n${segment.text}`,
                    lineStart: current.lineStart,
                    lineEnd: segment.lineEnd,
                    page: current.page,
                };
            } else {
                grouped.push(current);
                current = { ...segment };
            }
        });

        if (current) {
            grouped.push(current);
        }
        return grouped;
    }

    private semanticGroupSegments(segments: TextSegment[]): TextSegment[] {
        const grouped: TextSegment[] = [];
        let current: TextSegment | null = null;
        const headingPattern = /^(#{1,6}\s|[0-9]+[\).\s]|(class|function|interface|type)\s)/i;

        segments.forEach(segment => {
            const startsWithHeading = headingPattern.test(segment.text.trim());
            if (!current) {
                current = { ...segment };
                return;
            }

            const shouldSplit = startsWithHeading || (current.text.length + segment.text.length > 1400);
            if (shouldSplit) {
                grouped.push(current);
                current = { ...segment };
                return;
            }

            current = {
                text: `${current.text}\n\n${segment.text}`,
                lineStart: current.lineStart,
                lineEnd: segment.lineEnd,
                page: current.page,
            };
        });

        if (current) {
            grouped.push(current);
        }
        return grouped;
    }

    private extractSentence(text: string): string {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const firstSentence = cleaned.match(/[^.!?]+[.!?]/)?.[0] || cleaned;
        return this.summarize(firstSentence, 220);
    }

    private summarize(text: string, maxLen: number): string {
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen - 3)}...`;
    }

    private normalizeText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\u0000/g, '')
            .replace(/[^\x09\x0A\x0C\x0D\x20-\x7E]/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{4,}/g, '\n\n\n');
    }

    private extractTextFromBinary(buffer: ArrayBuffer): string {
        // Fallback extraction for binary formats (PDF/DOCX). This is heuristic but
        // provides usable retrieval text when full parsers are unavailable.
        const bytes = new Uint8Array(buffer);
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return decoded.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ');
    }

    private getEmbedding(text: string): number[] {
        const normalized = text.toLowerCase().trim();
        const cacheKey = `h:${this.hashString(normalized)}`;
        const cached = this.embeddingCache.get(cacheKey);
        if (cached) {
            this.cacheHits += 1;
            return cached;
        }

        this.cacheMisses += 1;
        const vector = new Array(this.EMBEDDING_DIM).fill(0);
        const tokens = normalized.split(/[^a-z0-9_]+/).filter(Boolean);
        tokens.forEach(token => {
            const bucket = this.hashString(token, this.EMBEDDING_DIM);
            vector[bucket] += 1;
        });

        const normalizedVector = this.normalizeVector(vector);
        this.embeddingCache.set(cacheKey, normalizedVector);
        this.trimEmbeddingCache();
        this.persistEmbeddingCache();
        return normalizedVector;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < this.EMBEDDING_DIM; i++) {
            sum += (a[i] || 0) * (b[i] || 0);
        }
        return sum;
    }

    private normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0)) || 1;
        return vector.map(value => value / magnitude);
    }

    private hashString(input: string, modulo?: number): number {
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) + hash) + input.charCodeAt(i);
            hash |= 0;
        }
        const abs = Math.abs(hash);
        if (modulo && modulo > 0) {
            return abs % modulo;
        }
        return abs;
    }

    private createId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `rag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private getFileExtension(name: string): string {
        const parts = name.split('.');
        if (parts.length < 2) return '';
        return parts[parts.length - 1].toLowerCase();
    }

    private hasUsableLocalStorage(): boolean {
        const candidate = (globalThis as Record<string, unknown>).localStorage as Record<string, unknown> | undefined;
        return Boolean(
            candidate &&
            typeof candidate.getItem === 'function' &&
            typeof candidate.setItem === 'function'
        );
    }

    private storageGet(key: string): string | null {
        if (this.hasUsableLocalStorage()) {
            return (globalThis.localStorage as Storage).getItem(key);
        }
        return this.memoryStorage.get(key) || null;
    }

    private storageSet(key: string, value: string): void {
        if (this.hasUsableLocalStorage()) {
            (globalThis.localStorage as Storage).setItem(key, value);
            return;
        }
        this.memoryStorage.set(key, value);
    }

    private loadEmbeddingCache(): void {
        try {
            const raw = this.storageGet(this.EMBEDDING_CACHE_KEY);
            if (!raw) return;
            const parsed = parseJson(raw);
            if (!isRecord(parsed)) {
                return;
            }
            let loaded = 0;
            Object.entries(parsed).forEach(([key, value]) => {
                if (loaded >= MAX_EMBEDDING_CACHE_ENTRIES) {
                    return;
                }
                const vector = this.sanitizeEmbeddingVector(value);
                if (!vector) {
                    return;
                }
                this.embeddingCache.set(key, vector);
                loaded += 1;
            });
            this.trimEmbeddingCache();
        } catch {
            // Ignore malformed cache.
        }
    }

    private sanitizeEmbeddingVector(value: unknown): number[] | null {
        if (!Array.isArray(value) || value.length !== this.EMBEDDING_DIM) {
            return null;
        }

        const sanitized = new Array<number>(this.EMBEDDING_DIM);
        for (let i = 0; i < this.EMBEDDING_DIM; i++) {
            const entry = value[i];
            if (!isFiniteNumber(entry)) {
                return null;
            }
            sanitized[i] = entry;
        }
        return sanitized;
    }

    private trimEmbeddingCache(): void {
        while (this.embeddingCache.size > MAX_EMBEDDING_CACHE_ENTRIES) {
            const oldestKey = this.embeddingCache.keys().next().value as string | undefined;
            if (!oldestKey) {
                return;
            }
            this.embeddingCache.delete(oldestKey);
        }
    }

    private persistEmbeddingCache(): void {
        try {
            const serialized = JSON.stringify(Object.fromEntries(this.embeddingCache.entries()));
            this.storageSet(this.EMBEDDING_CACHE_KEY, serialized);
        } catch {
            // Ignore storage failures.
        }
    }
}

export const ragDocumentChatService = RagDocumentChatService.getInstance();
