/**
 * Search Index Service
 * 
 * Manages an inverted index for fast keyword lookups across conversations.
 * Optimizes search by mapping terms to session IDs.
 */

import { ChatSession } from '../../shared/types';

interface InvertedIndex {
    version: number;
    updatedAt: number;
    terms: Record<string, string[]>; // term -> sessionIds
    sessionTerms: Record<string, string[]>; // sessionId -> terms
}

type SearchIndexBatchOperation =
    | { kind: 'upsert'; session: ChatSession }
    | { kind: 'delete'; sessionId: string };

const INDEX_STORAGE_KEY = 'app_search_index';
const TOKEN_CACHE_LIMIT = 512;
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
    'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their',
    'what', 'which', 'who', 'whom', 'whose', 'why', 'how'
]);
let indexCache: InvertedIndex | null = null;
let indexCacheRaw: string | null = null;
const tokenizeCache = new Map<string, string[]>();

const createEmptyIndex = (): InvertedIndex => ({
    version: 1,
    updatedAt: Date.now(),
    terms: {},
    sessionTerms: {},
});

const hasSameTerms = (previousTerms: string[], nextTerms: Set<string>): boolean => {
    if (previousTerms.length !== nextTerms.size) {
        return false;
    }
    for (let i = 0; i < previousTerms.length; i++) {
        if (!nextTerms.has(previousTerms[i])) {
            return false;
        }
    }
    return true;
};

const cacheTokenized = (text: string, tokens: string[]): void => {
    if (tokenizeCache.has(text)) {
        tokenizeCache.delete(text);
    }
    tokenizeCache.set(text, tokens);
    if (tokenizeCache.size > TOKEN_CACHE_LIMIT) {
        const oldestKey = tokenizeCache.keys().next().value;
        if (oldestKey !== undefined) {
            tokenizeCache.delete(oldestKey);
        }
    }
};

const extractSessionTerms = (session: ChatSession): Set<string> => {
    const terms = new Set<string>();
    SearchIndexService.tokenize(session.title).forEach((term) => {
        terms.add(term);
    });

    session.messages.forEach((msg: any) => {
        if (typeof msg.content !== 'string') {
            return;
        }
        SearchIndexService.tokenize(msg.content).forEach((term) => {
            terms.add(term);
        });
    });

    return terms;
};

export const SearchIndexService = {
    /**
     * Get the current index
     */
    getIndex: (): InvertedIndex => {
        try {
            const raw = localStorage.getItem(INDEX_STORAGE_KEY);
            if (indexCache && raw === indexCacheRaw) {
                return indexCache;
            }

            if (raw) {
                const parsed = JSON.parse(raw) as Partial<InvertedIndex>;
                const normalized = {
                    version: parsed.version || 1,
                    updatedAt: parsed.updatedAt || Date.now(),
                    terms: parsed.terms || {},
                    sessionTerms: parsed.sessionTerms || {},
                };
                indexCache = normalized;
                indexCacheRaw = raw;
                return normalized;
            }
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = raw;
            return empty;
        } catch (e) {
            console.error('Failed to load search index', e);
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = null;
            return empty;
        }
    },

    /**
     * Save the index
     */
    saveIndex: (index: InvertedIndex) => {
        try {
            index.updatedAt = Date.now();
            const raw = JSON.stringify(index);
            localStorage.setItem(INDEX_STORAGE_KEY, raw);
            indexCache = index;
            indexCacheRaw = raw;
        } catch (e) {
            console.error('Failed to save search index', e);
        }
    },

    /**
     * Tokenize text into unique terms
     */
    tokenize: (text: string): string[] => {
        const cached = tokenizeCache.get(text);
        if (cached) {
            return cached;
        }

        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(term => term.length > 2 && !STOP_WORDS.has(term));
        cacheTokenized(text, tokens);
        return tokens;
    },

    /**
     * Apply multiple index operations in one load/save cycle.
     */
    applyOperations: (operations: SearchIndexBatchOperation[]) => {
        if (operations.length === 0) return;
        const index = SearchIndexService.getIndex();
        let didChange = false;

        operations.forEach((operation) => {
            if (operation.kind === 'delete') {
                const previousTerms = index.sessionTerms[operation.sessionId] || [];
                if (!(operation.sessionId in index.sessionTerms) && previousTerms.length === 0) {
                    return;
                }
                SearchIndexService._removeSessionFromIndex(index, operation.sessionId, previousTerms);
                delete index.sessionTerms[operation.sessionId];
                didChange = true;
                return;
            }

            const session = operation.session;
            const sessionId = session.id;
            const previousTerms = index.sessionTerms[sessionId] || [];
            const terms = extractSessionTerms(session);
            const hasPreviousEntry = sessionId in index.sessionTerms;

            if (hasPreviousEntry && hasSameTerms(previousTerms, terms)) {
                return;
            }

            SearchIndexService._removeSessionFromIndex(index, sessionId, previousTerms);
            terms.forEach(term => {
                if (!index.terms[term]) {
                    index.terms[term] = [];
                }
                if (!index.terms[term].includes(sessionId)) {
                    index.terms[term].push(sessionId);
                }
            });
            index.sessionTerms[sessionId] = Array.from(terms);
            didChange = true;
        });

        if (didChange) {
            SearchIndexService.saveIndex(index);
        }
    },

    /**
     * Index a session (add/update)
     */
    indexSession: (session: ChatSession) => {
        SearchIndexService.applyOperations([{ kind: 'upsert', session }]);
    },

    /**
     * Remove a session from the index
     */
    removeSession: (sessionId: string) => {
        SearchIndexService.applyOperations([{ kind: 'delete', sessionId }]);
    },

    /**
     * Internal helper to remove session from index object
     */
    _removeSessionFromIndex: (index: InvertedIndex, sessionId: string, termsHint?: string[]) => {
        const termsToScan = termsHint && termsHint.length > 0 ? termsHint : Object.keys(index.terms);
        termsToScan.forEach(term => {
            if (!index.terms[term]) return;
            index.terms[term] = index.terms[term].filter(id => id !== sessionId);
            if (index.terms[term].length === 0) {
                delete index.terms[term];
            }
        });
    },

    /**
     * Search for sessions containing terms
     * Returns a Set of Session IDs
     */
    searchSessions: (query: string): Set<string> => {
        const index = SearchIndexService.getIndex();
        const queryTerms = Array.from(new Set(SearchIndexService.tokenize(query)));
        const resultIds = new Set<string>();

        if (queryTerms.length === 0) return resultIds;

        // Intersect terms in increasing posting-list size order.
        const sortedTerms = queryTerms
            .map((term) => ({
                term,
                ids: index.terms[term] || [],
            }))
            .sort((a, b) => a.ids.length - b.ids.length);

        const firstIds = sortedTerms[0].ids;
        if (firstIds.length === 0) {
            return resultIds;
        }

        firstIds.forEach(id => resultIds.add(id));

        // Filter by subsequent terms
        for (let i = 1; i < sortedTerms.length; i++) {
            const termIdsRaw = sortedTerms[i].ids;
            if (termIdsRaw.length === 0) {
                resultIds.clear();
                return resultIds;
            }
            const termIds = new Set(termIdsRaw);

            // Intersection
            for (const id of resultIds) {
                if (!termIds.has(id)) {
                    resultIds.delete(id);
                }
            }

            if (resultIds.size === 0) {
                return resultIds;
            }
        }

        return resultIds;
    },

    /**
     * Rebuild entire index from History (useful for migration)
     * Note: This assumes HistoryService is available and updated to return all sessions
     */
    rebuildIndex: (sessions: ChatSession[]) => {
        const index: InvertedIndex = { version: 1, updatedAt: Date.now(), terms: {}, sessionTerms: {} };

        sessions.forEach(session => {
            const terms = extractSessionTerms(session);
            index.sessionTerms[session.id] = Array.from(terms);

            terms.forEach(term => {
                if (!index.terms[term]) {
                    index.terms[term] = [];
                }
                index.terms[term].push(session.id);
            });
        });

        SearchIndexService.saveIndex(index);
    }
};
