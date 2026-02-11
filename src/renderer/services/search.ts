/**
 * Smart Search Service
 * 
 * Provides semantic search across all conversations with:
 * - Full-text search with relevance scoring
 * - Fuzzy matching for typos
 * - Keyword extraction and matching
 * - Message context grouping
 * - Search across titles, content, and metadata
 */

import { HistoryService } from './history';
import { ChatSession } from '../../shared/types';
import { SearchIndexService } from './searchIndex';
import { autoTaggingService, type ConversationTags } from './autoTagging';
import { workerManager } from './workerManager';
import { performanceService } from './performance';

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

export interface SearchFilters {
    dateFrom?: Date;
    dateTo?: Date;
    model?: string;
    tags?: string[];
    role?: 'user' | 'assistant' | 'all';
    sessionId?: string; // Search within specific session
    useRegex?: boolean;
    regexFlags?: string;
}

export interface SearchOptions {
    maxResults?: number;
    includeContext?: boolean;
    fuzzyMatch?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
}

export interface SearchStats {
    totalResults: number;
    sessionsSearched: number;
    messagesSearched: number;
    searchTimeMs: number;
    topKeywords: string[];
}

const RECENT_SEARCHES_KEY = 'recent_searches';

const readRecentSearchesFromStorage = (): string[] => {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const searches: string[] = [];
        for (let i = 0; i < parsed.length; i++) {
            if (typeof parsed[i] === 'string') {
                searches.push(parsed[i]);
            }
        }
        return searches;
    } catch {
        return [];
    }
};

export class SearchService {
    private static stopWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
        'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
        'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
        'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their'
    ]);

    private static createEmptyStats(
        sessionsSearched: number,
        startTime: number
    ): SearchStats {
        const searchTimeMs = Math.max(0, Math.round(performance.now() - startTime));
        performanceService.reportSearchTime(searchTimeMs);
        return {
            totalResults: 0,
            sessionsSearched,
            messagesSearched: 0,
            searchTimeMs,
            topKeywords: [],
        };
    }

    private static filterSessions(
        sessions: ChatSession[],
        filters?: SearchFilters,
        tagsLookup?: Map<string, ConversationTags>
    ): ChatSession[] {
        if (!filters) {
            return sessions;
        }

        const fromTime = filters.dateFrom?.getTime();
        const toTime = filters.dateTo?.getTime();
        const selectedTags = filters.tags && filters.tags.length > 0
            ? new Set(filters.tags)
            : null;
        const hasAnyFilter = Boolean(
            filters.sessionId ||
            fromTime !== undefined ||
            toTime !== undefined ||
            filters.model ||
            selectedTags
        );
        if (!hasAnyFilter) {
            return sessions;
        }

        const filtered: ChatSession[] = [];
        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            if (filters.sessionId && session.id !== filters.sessionId) {
                continue;
            }
            if (fromTime !== undefined && session.lastModified < fromTime) {
                continue;
            }
            if (toTime !== undefined && session.lastModified > toTime) {
                continue;
            }
            if (filters.model && session.modelId !== filters.model) {
                continue;
            }

            if (selectedTags) {
                const conversationTags = tagsLookup?.get(session.id)?.tags;
                if (!conversationTags || conversationTags.length === 0) {
                    continue;
                }
                let hasSelectedTag = false;
                for (let tagIndex = 0; tagIndex < conversationTags.length; tagIndex++) {
                    if (selectedTags.has(conversationTags[tagIndex])) {
                        hasSelectedTag = true;
                        break;
                    }
                }
                if (!hasSelectedTag) {
                    continue;
                }
            }

            filtered.push(session);
        }

        return filtered;
    }

    private static resolveTagLookup(filters?: SearchFilters): Map<string, ConversationTags> | undefined {
        if (!filters?.tags || filters.tags.length === 0) {
            return undefined;
        }
        return autoTaggingService.getTagsLookup();
    }

    private static filterSessionsByCandidates(
        sessions: ChatSession[],
        candidateIds: Set<string>
    ): ChatSession[] {
        const filtered: ChatSession[] = [];
        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            if (candidateIds.has(session.id)) {
                filtered.push(session);
            }
        }
        return filtered;
    }

    private static hydrateFullSessions(sessions: ChatSession[]): ChatSession[] {
        const fullSessions: ChatSession[] = [];
        for (let i = 0; i < sessions.length; i++) {
            const hydrated = HistoryService.getSession(sessions[i].id);
            if (!hydrated || hydrated.encrypted) {
                continue;
            }
            fullSessions.push(hydrated);
        }
        return fullSessions;
    }

    /**
     * Search across all conversations
     */
    static search(
        query: string,
        filters?: SearchFilters,
        options?: SearchOptions
    ): { results: SearchResult[]; stats: SearchStats } {
        const startTime = performance.now();
        const opts = {
            maxResults: 50,
            includeContext: true,
            fuzzyMatch: true,
            caseSensitive: false,
            wholeWord: false,
            ...options
        };

        let sessions = HistoryService.getAllSessions();
        let messagesSearched = 0;
        const tagsLookup = this.resolveTagLookup(filters);
        sessions = this.filterSessions(sessions, filters, tagsLookup);

        let regex: RegExp | null = null;
        if (filters?.useRegex) {
            try {
                const flags = filters.regexFlags || (opts.caseSensitive ? 'g' : 'gi');
                regex = new RegExp(query, flags);
            } catch {
                const stats = this.createEmptyStats(sessions.length, startTime);
                return {
                    results: [],
                    stats,
                };
            }
        }

        if (!regex && query.trim().length > 2) {
            const candidateIds = SearchIndexService.searchSessions(query);
            sessions = this.filterSessionsByCandidates(sessions, candidateIds);
        }

        // Pre-compute query data once
        const queryTerms = this.tokenize(query, opts.caseSensitive);
        const queryLower = opts.caseSensitive ? query : query.toLowerCase();

        // Use a min-heap approach: maintain only top maxResults
        // Optimization: Use array + sort when full, but avoid storing all results
        const maxHeapSize = opts.maxResults * 2; // Keep 2x to allow for better sorting
        const results: SearchResult[] = [];
        let minScoreInHeap = 0;

        for (const metaSession of sessions) {
            // Load full session details from storage
            const session = HistoryService.getSession(metaSession.id);
            if (!session) continue;

            if (session.encrypted) continue; // Skip encrypted sessions

            // Search in session title
            const titleMatch = this.matchText(session.title, queryLower, queryTerms, opts, regex);
            if (titleMatch) {
                const titleScore = titleMatch.score * 1.5; // Boost title matches

                // Only add if score is high enough
                if (results.length < maxHeapSize || titleScore > minScoreInHeap) {
                    results.push({
                        sessionId: session.id,
                        sessionTitle: session.title,
                        messageIndex: -1, // -1 indicates title match
                        messageRole: 'system',
                        content: session.title,
                        matchedText: titleMatch.matchedText,
                        matchStart: titleMatch.start,
                        matchEnd: titleMatch.end,
                        relevanceScore: titleScore,
                        timestamp: session.lastModified,
                        // Defer context extraction
                    });

                    // If heap is full, trim and update min score
                    if (results.length > maxHeapSize) {
                        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
                        results.length = maxHeapSize;
                        minScoreInHeap = results[results.length - 1].relevanceScore;
                    }
                }
            }

            // Search in messages
            for (let i = 0; i < session.messages.length; i++) {
                const msg = session.messages[i];
                messagesSearched++;

                // Apply role filter
                if (filters?.role && filters.role !== 'all' && msg.role !== filters.role) {
                    continue;
                }

                const content = typeof msg.content === 'string' ? msg.content : '';
                if (!content) continue;

                const match = this.matchText(content, queryLower, queryTerms, opts, regex);
                if (match) {
                    // Only add if score is high enough
                    if (results.length < maxHeapSize || match.score > minScoreInHeap) {
                        results.push({
                            sessionId: session.id,
                            sessionTitle: session.title,
                            messageIndex: i,
                            messageRole: msg.role,
                            content: content,
                            matchedText: match.matchedText,
                            matchStart: match.start,
                            matchEnd: match.end,
                            relevanceScore: match.score,
                            timestamp: session.lastModified,
                            // Defer context extraction
                        });

                        // If heap is full, trim and update min score
                        if (results.length > maxHeapSize) {
                            results.sort((a, b) => b.relevanceScore - a.relevanceScore);
                            results.length = maxHeapSize;
                            minScoreInHeap = results[results.length - 1].relevanceScore;
                        }
                    }
                }
            }
        }

        // Final sort of remaining results
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Limit results
        const limitedResults = results.slice(0, opts.maxResults);

        // Add context only to final results
        if (opts.includeContext) {
            const contextRadius = 100;
            for (const result of limitedResults) {
                if (result.messageIndex !== -1) { // Not a title match
                    const beforeStart = Math.max(0, result.matchStart - contextRadius);
                    const afterEnd = Math.min(result.content.length, result.matchEnd + contextRadius);

                    result.context = {
                        before: result.content.substring(beforeStart, result.matchStart),
                        after: result.content.substring(result.matchEnd, afterEnd),
                    };
                }
            }
        }

        // Extract top keywords from results
        const topKeywords = this.extractTopKeywords(limitedResults);

        const endTime = performance.now();
        const searchTimeMs = Math.round(endTime - startTime);
        performanceService.reportSearchTime(searchTimeMs);

        return {
            results: limitedResults,
            stats: {
                totalResults: results.length,
                sessionsSearched: sessions.length,
                messagesSearched,
                searchTimeMs,
                topKeywords,
            },
        };
    }

    /**
     * Async search path backed by Web Worker for smoother UI.
     * Falls back to sync search when regex mode is enabled.
     */
    static async searchAsync(
        query: string,
        filters?: SearchFilters,
        options?: SearchOptions
    ): Promise<{ results: SearchResult[]; stats: SearchStats }> {
        if (filters?.useRegex) {
            return this.search(query, filters, options);
        }
        const startTime = performance.now();

        const opts = {
            maxResults: 50,
            includeContext: true,
            fuzzyMatch: true,
            caseSensitive: false,
            wholeWord: false,
            ...options
        };

        let sessions = HistoryService.getAllSessions();
        const tagsLookup = this.resolveTagLookup(filters);
        sessions = this.filterSessions(sessions, filters, tagsLookup);

        if (query.trim().length > 2) {
            const candidateIds = SearchIndexService.searchSessions(query);
            sessions = this.filterSessionsByCandidates(sessions, candidateIds);
            if (sessions.length === 0) {
                return {
                    results: [],
                    stats: this.createEmptyStats(0, startTime),
                };
            }
        }

        const fullSessions = this.hydrateFullSessions(sessions);

        if (fullSessions.length === 0) {
            return {
                results: [],
                stats: this.createEmptyStats(0, startTime),
            };
        }

        const workerFilters = {
            dateFrom: filters?.dateFrom?.getTime(),
            dateTo: filters?.dateTo?.getTime(),
            model: filters?.model,
            role: filters?.role,
            sessionId: filters?.sessionId,
        };

        const workerResult = await workerManager.search(fullSessions, query, workerFilters, opts);
        const rawStats = workerResult.stats as Partial<SearchStats> | undefined;
        const fallbackSearchTimeMs = Math.max(0, Math.round(performance.now() - startTime));
        const normalizedStats: SearchStats = {
            totalResults: typeof rawStats?.totalResults === 'number'
                ? rawStats.totalResults
                : workerResult.results.length,
            sessionsSearched: typeof rawStats?.sessionsSearched === 'number'
                ? rawStats.sessionsSearched
                : fullSessions.length,
            messagesSearched: typeof rawStats?.messagesSearched === 'number'
                ? rawStats.messagesSearched
                : 0,
            searchTimeMs: typeof rawStats?.searchTimeMs === 'number'
                ? rawStats.searchTimeMs
                : fallbackSearchTimeMs,
            topKeywords: Array.isArray(rawStats?.topKeywords) ? rawStats.topKeywords : [],
        };
        performanceService.reportSearchTime(normalizedStats.searchTimeMs);
        return {
            results: workerResult.results,
            stats: normalizedStats,
        };
    }

    /**
     * Search within a single conversation
     */
    static searchInSession(
        sessionId: string,
        query: string,
        options?: SearchOptions
    ): SearchResult[] {
        const { results } = this.search(query, { sessionId }, options);
        return results;
    }

    /**
     * Get search suggestions based on recent searches and common patterns
     */
    static getSuggestions(partialQuery: string, limit: number = 5): string[] {
        const suggestions: string[] = [];

        // Get recent searches from localStorage
        const recentSearches = readRecentSearchesFromStorage();
        const matchingRecent = recentSearches.filter(s =>
            s.toLowerCase().startsWith(partialQuery.toLowerCase())
        );
        suggestions.push(...matchingRecent.slice(0, limit));

        // Common search patterns/suggestions
        const commonPatterns = [
            'code', 'function', 'error', 'help', 'explain', 'how to',
            'example', 'fix', 'why', 'what is', 'typescript', 'react'
        ];

        const matchingPatterns = commonPatterns.filter(p =>
            p.toLowerCase().startsWith(partialQuery.toLowerCase()) &&
            !suggestions.includes(p)
        );
        suggestions.push(...matchingPatterns.slice(0, limit - suggestions.length));

        return suggestions.slice(0, limit);
    }

    /**
     * Save a search query to recent searches
     */
    static saveRecentSearch(query: string): void {
        try {
            const recentSearches = readRecentSearchesFromStorage();

            // Remove if already exists
            const filtered = recentSearches.filter(s => s !== query);

            // Add to front
            filtered.unshift(query);

            // Keep only last 20
            const trimmed = filtered.slice(0, 20);

            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
        } catch {
            // Ignore errors
        }
    }

    /**
     * Clear recent searches
     */
    static clearRecentSearches(): void {
        localStorage.removeItem('recent_searches');
    }

    /**
     * Get recent searches
     */
    static getRecentSearches(): string[] {
        return readRecentSearchesFromStorage();
    }

    /**
     * Match text against query with scoring
     */
    private static matchText(
        text: string,
        queryLower: string,
        queryTerms: string[],
        options: SearchOptions,
        regex: RegExp | null = null
    ): { matchedText: string; start: number; end: number; score: number } | null {
        // Early exit for empty text
        if (!text) return null;
        if (!regex && text.length < queryLower.length) return null;

        const textToSearch = options.caseSensitive ? text : text.toLowerCase();

        // Regex match (highest priority when enabled)
        if (regex) {
            regex.lastIndex = 0;
            const regexMatch = regex.exec(text);
            regex.lastIndex = 0;
            if (regexMatch && typeof regexMatch.index === 'number') {
                const matchedText = regexMatch[0] || '';
                const start = regexMatch.index;
                const end = start + matchedText.length;
                return {
                    matchedText,
                    start,
                    end,
                    score: 120 + matchedText.length,
                };
            }
        }

        // Direct substring match (highest priority)
        const directIndex = textToSearch.indexOf(queryLower);
        if (directIndex !== -1) {
            return {
                matchedText: text.substring(directIndex, directIndex + queryLower.length),
                start: directIndex,
                end: directIndex + queryLower.length,
                score: 100 + queryLower.length, // Longer matches score higher
            };
        }

        // Term-based matching (only if we have terms)
        if (queryTerms.length > 0) {
            let matchedTerms = 0;
            let firstMatch = -1;
            let lastMatch = -1;

            for (const term of queryTerms) {
                const termIndex = textToSearch.indexOf(term);
                if (termIndex !== -1) {
                    matchedTerms++;
                    if (firstMatch === -1 || termIndex < firstMatch) {
                        firstMatch = termIndex;
                    }
                    const endPos = termIndex + term.length;
                    if (endPos > lastMatch) {
                        lastMatch = endPos;
                    }
                }
            }

            if (matchedTerms > 0 && firstMatch !== -1) {
                // Calculate score based on how many terms matched
                const termMatchRatio = matchedTerms / queryTerms.length;
                return {
                    matchedText: text.substring(firstMatch, lastMatch),
                    start: firstMatch,
                    end: lastMatch,
                    score: 50 * termMatchRatio + matchedTerms * 10,
                };
            }
        }

        // Fuzzy matching (if enabled and text not too long)
        if (options.fuzzyMatch && queryLower.length >= 3 && textToSearch.length < 5000) {
            const fuzzyResult = this.fuzzyMatch(textToSearch, queryLower);
            if (fuzzyResult) {
                return {
                    matchedText: text.substring(fuzzyResult.start, fuzzyResult.end),
                    start: fuzzyResult.start,
                    end: fuzzyResult.end,
                    score: 20 + fuzzyResult.similarity * 30,
                };
            }
        }

        return null;
    }

    /**
     * Simple fuzzy matching using character-level comparison
     */
    private static fuzzyMatch(
        text: string,
        query: string
    ): { start: number; end: number; similarity: number } | null {
        const minSimilarity = 0.6;

        // Sliding window fuzzy match with optimizations
        const windowSize = Math.min(query.length * 2, text.length);
        const maxIterations = Math.min(1000, text.length - query.length + 1); // Limit iterations

        for (let i = 0; i < maxIterations; i++) {
            // Skip ahead if first character doesn't match at all
            if (i > 0 && query[0] !== text[i] && query[1] !== text[i]) {
                continue;
            }

            const window = text.substring(i, i + windowSize);
            const similarity = this.calculateSimilarity(window, query);

            if (similarity >= minSimilarity) {
                return {
                    start: i,
                    end: Math.min(i + query.length + 5, text.length),
                    similarity,
                };
            }
        }

        return null;
    }

    /**
     * Calculate similarity between two strings (0-1)
     */
    private static calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
            if (longer.indexOf(shorter[i]) !== -1) {
                matches++;
            }
        }

        return matches / longer.length;
    }

    /**
     * Tokenize a query into search terms
     */
    private static tokenize(query: string, caseSensitive: boolean): string[] {
        const text = caseSensitive ? query : query.toLowerCase();
        const rawTerms = text.split(/\s+/);
        const tokens: string[] = [];
        for (let i = 0; i < rawTerms.length; i++) {
            const term = rawTerms[i];
            if (term.length >= 2 && !this.stopWords.has(term)) {
                tokens.push(term);
            }
        }
        return tokens;
    }

    /**
     * Extract top keywords from results
     */
    private static extractTopKeywords(results: SearchResult[]): string[] {
        const wordCounts = new Map<string, number>();
        const maxResultsToProcess = Math.min(results.length, 20); // Limit processing

        for (let i = 0; i < maxResultsToProcess; i++) {
            const result = results[i];
            // Only process matched text and nearby context for efficiency
            const textToProcess = result.matchedText.length < 500
                ? result.matchedText
                : result.matchedText.substring(0, 500);

            const words = textToProcess.toLowerCase().split(/\W+/);
            for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                const word = words[wordIndex];
                if (word.length <= 3 || this.stopWords.has(word)) {
                    continue;
                }
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        }

        const topWords: string[] = [];
        const topCounts: number[] = [];
        for (const [word, count] of wordCounts) {
            let insertAt = -1;
            for (let i = 0; i < topCounts.length; i++) {
                if (count > topCounts[i]) {
                    insertAt = i;
                    break;
                }
            }

            if (insertAt === -1) {
                if (topCounts.length < 5) {
                    topWords.push(word);
                    topCounts.push(count);
                }
                continue;
            }

            topWords.splice(insertAt, 0, word);
            topCounts.splice(insertAt, 0, count);
            if (topCounts.length > 5) {
                topWords.pop();
                topCounts.pop();
            }
        }

        return topWords;
    }

    /**
     * Highlight matched text in a string
     */
    static highlightMatches(
        text: string,
        query: string,
        highlightClass: string = 'bg-yellow-500/30'
    ): string {
        if (!query) return text;

        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
    }

    /**
     * Escape special regex characters
     */
    private static escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

export default SearchService;
