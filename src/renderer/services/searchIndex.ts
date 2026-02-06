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
}

const INDEX_STORAGE_KEY = 'app_search_index';
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
    'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their',
    'what', 'which', 'who', 'whom', 'whose', 'why', 'how'
]);

export const SearchIndexService = {
    /**
     * Get the current index
     */
    getIndex: (): InvertedIndex => {
        try {
            const raw = localStorage.getItem(INDEX_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load search index', e);
        }
        return { version: 1, updatedAt: Date.now(), terms: {} };
    },

    /**
     * Save the index
     */
    saveIndex: (index: InvertedIndex) => {
        try {
            index.updatedAt = Date.now();
            localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(index));
        } catch (e) {
            console.error('Failed to save search index', e);
        }
    },

    /**
     * Tokenize text into unique terms
     */
    tokenize: (text: string): string[] => {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(term => term.length > 2 && !STOP_WORDS.has(term));
    },

    /**
     * Index a session (add/update)
     */
    indexSession: (session: ChatSession) => {
        const index = SearchIndexService.getIndex();
        const sessionId = session.id;

        // 1. Remove existing references to this session (cleanup mainly needed if terms change drastically, 
        // but for simplicity we just add new ones. Over time this might leave stale refs for terms no longer in session)
        // Optimization: Ideally we'd remove invalid refs. For now, we'll implement 'removeSession' logic first inside here? 
        // No, that's expensive. Index is additive. We can prune later or simple overwrite?
        // Let's implement fully "clean then add" methodology.
        SearchIndexService._removeSessionFromIndex(index, sessionId);

        // 2. Extract all text
        let fullText = session.title + ' ';
        session.messages.forEach((msg: any) => {
            if (typeof msg.content === 'string') {
                fullText += msg.content + ' ';
            }
        });

        // 3. Tokenize
        const terms = new Set(SearchIndexService.tokenize(fullText));

        // 4. Update Index
        terms.forEach(term => {
            if (!index.terms[term]) {
                index.terms[term] = [];
            }
            if (!index.terms[term].includes(sessionId)) {
                index.terms[term].push(sessionId);
            }
        });

        SearchIndexService.saveIndex(index);
    },

    /**
     * Remove a session from the index
     */
    removeSession: (sessionId: string) => {
        const index = SearchIndexService.getIndex();
        SearchIndexService._removeSessionFromIndex(index, sessionId);
        SearchIndexService.saveIndex(index);
    },

    /**
     * Internal helper to remove session from index object
     */
    _removeSessionFromIndex: (index: InvertedIndex, sessionId: string) => {
        Object.keys(index.terms).forEach(term => {
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
        const queryTerms = SearchIndexService.tokenize(query);
        const resultIds = new Set<string>();

        if (queryTerms.length === 0) return resultIds;

        // Find intersection of all terms (AND search)
        // Start with ids from first term
        const firstTerm = queryTerms[0];
        const firstIds = index.terms[firstTerm] || [];

        firstIds.forEach(id => resultIds.add(id));

        // Filter by subsequent terms
        for (let i = 1; i < queryTerms.length; i++) {
            const term = queryTerms[i];
            const termIds = new Set(index.terms[term] || []);

            // Intersection
            for (const id of resultIds) {
                if (!termIds.has(id)) {
                    resultIds.delete(id);
                }
            }
        }

        return resultIds;
    },

    /**
     * Rebuild entire index from History (useful for migration)
     * Note: This assumes HistoryService is available and updated to return all sessions
     */
    rebuildIndex: (sessions: ChatSession[]) => {
        const index: InvertedIndex = { version: 1, updatedAt: Date.now(), terms: {} };

        sessions.forEach(session => {
            // Tokenize
            let fullText = session.title + ' ';
            session.messages.forEach((msg: any) => {
                if (typeof msg.content === 'string') {
                    fullText += msg.content + ' ';
                }
            });

            const terms = new Set(SearchIndexService.tokenize(fullText));

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
