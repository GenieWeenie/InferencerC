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
    context?: {
        before?: string;
        after?: string;
    };
}

export interface SearchFilters {
    dateFrom?: Date;
    dateTo?: Date;
    model?: string;
    role?: 'user' | 'assistant' | 'all';
    sessionId?: string; // Search within specific session
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

export class SearchService {
    private static stopWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
        'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
        'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
        'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their'
    ]);

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

        // Apply session filter
        if (filters?.sessionId) {
            sessions = sessions.filter(s => s.id === filters.sessionId);
        }

        // Apply date filters
        if (filters?.dateFrom) {
            const fromTime = filters.dateFrom.getTime();
            sessions = sessions.filter(s => s.lastModified >= fromTime);
        }
        if (filters?.dateTo) {
            const toTime = filters.dateTo.getTime();
            sessions = sessions.filter(s => s.lastModified <= toTime);
        }

        // Apply model filter
        if (filters?.model) {
            sessions = sessions.filter(s => s.modelId === filters.model);
        }

        if (query.trim().length > 2) {
            const candidateIds = SearchIndexService.searchSessions(query);
            sessions = sessions.filter(s => candidateIds.has(s.id));
        }

        const results: SearchResult[] = [];
        const queryTerms = this.tokenize(query, opts.caseSensitive);
        const queryLower = opts.caseSensitive ? query : query.toLowerCase();

        for (const metaSession of sessions) {
            // Load full session details from storage
            const session = HistoryService.getSession(metaSession.id);
            if (!session) continue;

            if (session.encrypted) continue; // Skip encrypted sessions

            // Search in session title
            const titleMatch = this.matchText(session.title, queryLower, queryTerms, opts);
            if (titleMatch) {
                results.push({
                    sessionId: session.id,
                    sessionTitle: session.title,
                    messageIndex: -1, // -1 indicates title match
                    messageRole: 'system',
                    content: session.title,
                    matchedText: titleMatch.matchedText,
                    matchStart: titleMatch.start,
                    matchEnd: titleMatch.end,
                    relevanceScore: titleMatch.score * 1.5, // Boost title matches
                    timestamp: session.lastModified,
                });
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

                const match = this.matchText(content, queryLower, queryTerms, opts);
                if (match) {
                    const result: SearchResult = {
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
                    };

                    // Add context
                    if (opts.includeContext) {
                        const contextRadius = 100;
                        const beforeStart = Math.max(0, match.start - contextRadius);
                        const afterEnd = Math.min(content.length, match.end + contextRadius);

                        result.context = {
                            before: content.substring(beforeStart, match.start),
                            after: content.substring(match.end, afterEnd),
                        };
                    }

                    results.push(result);
                }
            }
        }

        // Sort by relevance score
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Limit results
        const limitedResults = results.slice(0, opts.maxResults);

        // Extract top keywords from results
        const topKeywords = this.extractTopKeywords(limitedResults);

        const endTime = performance.now();

        return {
            results: limitedResults,
            stats: {
                totalResults: results.length,
                sessionsSearched: sessions.length,
                messagesSearched,
                searchTimeMs: Math.round(endTime - startTime),
                topKeywords,
            },
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
        try {
            const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]') as string[];
            const matchingRecent = recentSearches.filter(s =>
                s.toLowerCase().startsWith(partialQuery.toLowerCase())
            );
            suggestions.push(...matchingRecent.slice(0, limit));
        } catch {
            // Ignore parsing errors
        }

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
            const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]') as string[];

            // Remove if already exists
            const filtered = recentSearches.filter(s => s !== query);

            // Add to front
            filtered.unshift(query);

            // Keep only last 20
            const trimmed = filtered.slice(0, 20);

            localStorage.setItem('recent_searches', JSON.stringify(trimmed));
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
        try {
            return JSON.parse(localStorage.getItem('recent_searches') || '[]') as string[];
        } catch {
            return [];
        }
    }

    /**
     * Match text against query with scoring
     */
    private static matchText(
        text: string,
        queryLower: string,
        queryTerms: string[],
        options: SearchOptions
    ): { matchedText: string; start: number; end: number; score: number } | null {
        const textToSearch = options.caseSensitive ? text : text.toLowerCase();

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

        // Term-based matching
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

        // Fuzzy matching (if enabled)
        if (options.fuzzyMatch && queryLower.length >= 3) {
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

        // Sliding window fuzzy match
        const windowSize = Math.min(query.length * 2, text.length);

        for (let i = 0; i <= text.length - query.length; i++) {
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
        return text
            .split(/\s+/)
            .filter(term => term.length >= 2 && !this.stopWords.has(term));
    }

    /**
     * Extract top keywords from results
     */
    private static extractTopKeywords(results: SearchResult[]): string[] {
        const wordCounts = new Map<string, number>();

        for (const result of results) {
            const words = result.content
                .toLowerCase()
                .split(/\W+/)
                .filter(w => w.length > 3 && !this.stopWords.has(w));

            for (const word of words) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        }

        return Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
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
