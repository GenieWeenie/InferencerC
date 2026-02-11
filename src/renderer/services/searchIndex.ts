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
const QUERY_TERM_CACHE_LIMIT = 256;
const POSTING_SET_CACHE_LIMIT = 1024;
const EMPTY_TERMS: string[] = [];
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
const queryTermCache = new Map<string, string[]>();
const postingSetCache = new Map<string, { idsRef: string[]; idsSet: Set<string> }>();
const remainingTermSetScratch: Set<string>[] = [];

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
    tokenizeCache.delete(text);
    tokenizeCache.set(text, tokens);
    if (tokenizeCache.size > TOKEN_CACHE_LIMIT) {
        const oldestKey = tokenizeCache.keys().next().value;
        if (oldestKey !== undefined) {
            tokenizeCache.delete(oldestKey);
        }
    }
};

const cacheQueryTerms = (query: string, terms: string[]): void => {
    queryTermCache.delete(query);
    queryTermCache.set(query, terms);
    if (queryTermCache.size > QUERY_TERM_CACHE_LIMIT) {
        const oldestKey = queryTermCache.keys().next().value;
        if (oldestKey !== undefined) {
            queryTermCache.delete(oldestKey);
        }
    }
};

const getUniqueQueryTerms = (query: string): string[] => {
    const cached = queryTermCache.get(query);
    if (cached) {
        return cached;
    }

    const tokens = SearchIndexService.tokenize(query);
    if (tokens.length <= 1) {
        cacheQueryTerms(query, tokens);
        return tokens;
    }
    if (tokens.length === 2) {
        if (tokens[0] === tokens[1]) {
            const deduped = [tokens[0]];
            cacheQueryTerms(query, deduped);
            return deduped;
        }
        cacheQueryTerms(query, tokens);
        return tokens;
    }
    if (tokens.length === 3) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        let deduped: string[];

        if (first === second) {
            deduped = first === third ? [first] : [first, third];
        } else if (first === third) {
            deduped = [first, second];
        } else if (second === third) {
            deduped = [first, second];
        } else {
            deduped = tokens;
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 4) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 5) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 6) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 7) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 8) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 9) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    const dedupedTerms: string[] = [];
    const seenDedupedTerms = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (seenDedupedTerms.has(token)) {
            continue;
        }
        seenDedupedTerms.add(token);
        dedupedTerms.push(token);
    }

    cacheQueryTerms(query, dedupedTerms);
    return dedupedTerms;
};

const clearPostingSetCache = (): void => {
    postingSetCache.clear();
};

const getPostingSet = (term: string, ids: string[]): Set<string> => {
    const cached = postingSetCache.get(term);
    if (cached && cached.idsRef === ids) {
        postingSetCache.delete(term);
        postingSetCache.set(term, cached);
        return cached.idsSet;
    }
    const idsSet = new Set(ids);
    postingSetCache.delete(term);
    postingSetCache.set(term, { idsRef: ids, idsSet });
    if (postingSetCache.size > POSTING_SET_CACHE_LIMIT) {
        const oldestKey = postingSetCache.keys().next().value;
        if (oldestKey !== undefined) {
            postingSetCache.delete(oldestKey);
        }
    }
    return idsSet;
};

const createSingletonResult = (sessionId: string): Set<string> => {
    const result = new Set<string>();
    result.add(sessionId);
    return result;
};

const singletonMatchesPostingLists = (
    sessionId: string,
    queryTerms: string[],
    postingLists: string[][],
    smallestTermIndex: number
): boolean => {
    for (let i = 0; i < postingLists.length; i++) {
        if (i === smallestTermIndex) {
            continue;
        }
        if (!getPostingSet(queryTerms[i], postingLists[i]).has(sessionId)) {
            return false;
        }
    }
    return true;
};

const collectPostingLists = (
    queryTerms: string[],
    indexTerms: Record<string, string[]>
): string[][] | null => {
    const postingLists = new Array<string[]>(queryTerms.length);
    for (let i = 0; i < queryTerms.length; i++) {
        const ids = indexTerms[queryTerms[i]];
        if (!ids || ids.length === 0) {
            return null;
        }
        postingLists[i] = ids;
    }
    return postingLists;
};

const findSmallestPostingListIndex = (postingLists: string[][]): number => {
    let smallestIndex = 0;
    let smallestLength = postingLists[0].length;
    for (let i = 1; i < postingLists.length; i++) {
        const currentLength = postingLists[i].length;
        if (currentLength < smallestLength) {
            smallestLength = currentLength;
            smallestIndex = i;
        }
    }
    return smallestIndex;
};

const intersectBySmallestPostingList = (
    queryTerms: string[],
    indexTerms: Record<string, string[]>
): Set<string> => {
    const postingLists = collectPostingLists(queryTerms, indexTerms);
    if (!postingLists) {
        return new Set<string>();
    }
    const smallestTermIndex = findSmallestPostingListIndex(postingLists);
    const candidateIds = postingLists[smallestTermIndex];

    if (candidateIds.length === 1) {
        const sessionId = candidateIds[0];
        return singletonMatchesPostingLists(sessionId, queryTerms, postingLists, smallestTermIndex)
            ? createSingletonResult(sessionId)
            : new Set<string>();
    }

    const remainingTermCount = queryTerms.length - 1;
    if (remainingTermSetScratch.length < remainingTermCount) {
        remainingTermSetScratch.length = remainingTermCount;
    }
    const remainingTermSets = remainingTermSetScratch;
    let remainingTermSetIndex = 0;
    for (let i = 0; i < queryTerms.length; i++) {
        if (i === smallestTermIndex) {
            continue;
        }
        remainingTermSets[remainingTermSetIndex] = getPostingSet(queryTerms[i], postingLists[i]);
        remainingTermSetIndex++;
    }

    let resultIds: Set<string> | null = null;
    for (let i = 0; i < candidateIds.length; i++) {
        const sessionId = candidateIds[i];
        let matchesAll = true;

        for (let j = 0; j < remainingTermCount; j++) {
            if (!remainingTermSets[j].has(sessionId)) {
                matchesAll = false;
                break;
            }
        }

        if (matchesAll) {
            if (!resultIds) {
                resultIds = new Set<string>();
            }
            resultIds.add(sessionId);
        }
    }

    return resultIds ?? new Set<string>();
};

const extractSessionTerms = (session: ChatSession): Set<string> => {
    const terms = new Set<string>();
    const titleTerms = SearchIndexService.tokenize(session.title);
    for (let i = 0; i < titleTerms.length; i++) {
        terms.add(titleTerms[i]);
    }

    const messages = session.messages;
    for (let i = 0; i < messages.length; i++) {
        const content = messages[i]?.content;
        if (typeof content !== 'string') {
            continue;
        }
        const contentTerms = SearchIndexService.tokenize(content);
        for (let j = 0; j < contentTerms.length; j++) {
            terms.add(contentTerms[j]);
        }
    }

    return terms;
};

const removeSessionIdFromTerm = (index: InvertedIndex, term: string, sessionId: string): void => {
    const ids = index.terms[term];
    if (!ids || ids.length === 0) {
        return;
    }

    const firstMatchIndex = ids.indexOf(sessionId);
    if (firstMatchIndex === -1) {
        return;
    }

    if (firstMatchIndex === ids.length - 1) {
        if (firstMatchIndex === 0) {
            delete index.terms[term];
            return;
        }
        ids.length = firstMatchIndex;
        return;
    }

    let writeIndex = firstMatchIndex;
    for (let readIndex = firstMatchIndex + 1; readIndex < ids.length; readIndex++) {
        const currentId = ids[readIndex];
        if (currentId !== sessionId) {
            ids[writeIndex] = currentId;
            writeIndex++;
        }
    }

    if (writeIndex === 0) {
        delete index.terms[term];
        return;
    }

    ids.length = writeIndex;
};

const appendSessionIdIfMissing = (termIds: string[], sessionId: string): boolean => {
    const termIdsLength = termIds.length;
    if (termIdsLength === 0) {
        termIds.push(sessionId);
        return true;
    }

    if (termIds[termIdsLength - 1] === sessionId) {
        return false;
    }

    for (let i = termIdsLength - 2; i >= 0; i--) {
        if (termIds[i] === sessionId) {
            return false;
        }
    }

    termIds.push(sessionId);
    return true;
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
                clearPostingSetCache();
                return normalized;
            }
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = raw;
            clearPostingSetCache();
            return empty;
        } catch (e) {
            console.error('Failed to load search index', e);
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = null;
            clearPostingSetCache();
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
            clearPostingSetCache();
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

        const rawTokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/);
        const tokens: string[] = [];
        for (let i = 0; i < rawTokens.length; i++) {
            const term = rawTokens[i];
            if (term.length <= 2 || STOP_WORDS.has(term)) {
                continue;
            }
            tokens.push(term);
        }
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

        for (let opIndex = 0; opIndex < operations.length; opIndex++) {
            const operation = operations[opIndex];
            if (operation.kind === 'delete') {
                const previousTerms = index.sessionTerms[operation.sessionId] ?? EMPTY_TERMS;
                if (previousTerms === EMPTY_TERMS) {
                    continue;
                }
                SearchIndexService._removeSessionFromIndex(index, operation.sessionId, previousTerms);
                delete index.sessionTerms[operation.sessionId];
                didChange = true;
                continue;
            }

            const session = operation.session;
            const sessionId = session.id;
            const previousTerms = index.sessionTerms[sessionId] ?? EMPTY_TERMS;
            const terms = extractSessionTerms(session);
            const hasPreviousEntry = previousTerms !== EMPTY_TERMS;

            if (hasPreviousEntry && hasSameTerms(previousTerms, terms)) {
                continue;
            }

            SearchIndexService._removeSessionFromIndex(index, sessionId, previousTerms);
            const termCount = terms.size;
            if (termCount === 0) {
                if (hasPreviousEntry) {
                    delete index.sessionTerms[sessionId];
                    didChange = true;
                }
                continue;
            }
            const termList = Array.from(terms);
            const previousTermsLookup = hasPreviousEntry && previousTerms.length > 0
                ? new Set(previousTerms)
                : null;
            const indexTerms = index.terms;
            if (previousTermsLookup && previousTermsLookup.size > 0) {
                for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                    const term = termList[termIndex];
                    let termIds = indexTerms[term];
                    if (!termIds) {
                        indexTerms[term] = [sessionId];
                        continue;
                    }
                    if (previousTermsLookup.has(term)) {
                        termIds.push(sessionId);
                        continue;
                    }
                    appendSessionIdIfMissing(termIds, sessionId);
                }
            } else {
                for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                    const term = termList[termIndex];
                    let termIds = indexTerms[term];
                    if (!termIds) {
                        indexTerms[term] = [sessionId];
                        continue;
                    }
                    appendSessionIdIfMissing(termIds, sessionId);
                }
            }
            index.sessionTerms[sessionId] = termList;
            didChange = true;
        }

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
        if (termsHint) {
            if (termsHint.length === 0) {
                return;
            }
            for (let i = 0; i < termsHint.length; i++) {
                removeSessionIdFromTerm(index, termsHint[i], sessionId);
            }
            return;
        }

        for (const term in index.terms) {
            if (!Object.prototype.hasOwnProperty.call(index.terms, term)) {
                continue;
            }
            removeSessionIdFromTerm(index, term, sessionId);
        }
    },

    /**
     * Search for sessions containing terms
     * Returns a Set of Session IDs
     */
    searchSessions: (query: string): Set<string> => {
        const index = SearchIndexService.getIndex();
        const queryTerms = getUniqueQueryTerms(query);
        const queryTermCount = queryTerms.length;
        if (queryTermCount === 0) {
            return new Set<string>();
        }
        if (queryTermCount === 1) {
            const ids = index.terms[queryTerms[0]];
            if (!ids || ids.length === 0) {
                return new Set<string>();
            }
            if (ids.length === 1) {
                const singleton = new Set<string>();
                singleton.add(ids[0]);
                return singleton;
            }
            return new Set(ids);
        }

        return intersectBySmallestPostingList(queryTerms, index.terms);
    },

    /**
     * Rebuild entire index from History (useful for migration)
     * Note: This assumes HistoryService is available and updated to return all sessions
     */
    rebuildIndex: (sessions: ChatSession[]) => {
        const index: InvertedIndex = { version: 1, updatedAt: Date.now(), terms: {}, sessionTerms: {} };

        for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
            const session = sessions[sessionIndex];
            const terms = extractSessionTerms(session);
            if (terms.size === 0) {
                continue;
            }
            const termList = Array.from(terms);
            index.sessionTerms[session.id] = termList;

            for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                const term = termList[termIndex];
                if (!index.terms[term]) {
                    index.terms[term] = [];
                }
                index.terms[term].push(session.id);
            }
        }

        SearchIndexService.saveIndex(index);
    }
};

export const __searchIndexInternals = {
    getUniqueQueryTerms,
};
