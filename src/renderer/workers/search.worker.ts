/**
 * Search Web Worker
 *
 * Handles heavy search operations off the main thread:
 * - Full-text search with fuzzy matching
 * - Relevance scoring
 * - Keyword extraction
 */

import { ChatSession, ChatMessage } from '../../shared/types';

interface SearchRequest {
    type: 'search' | 'index' | 'extractKeywords';
    id: string;
    sessions?: ChatSession[];
    query?: string;
    filters?: SearchFilters;
    options?: SearchOptions;
    messages?: ChatMessage[];
}

interface SearchFilters {
    dateFrom?: number;
    dateTo?: number;
    model?: string;
    role?: 'user' | 'assistant' | 'all';
    sessionId?: string;
}

interface SearchOptions {
    maxResults?: number;
    includeContext?: boolean;
    fuzzyMatch?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
}

interface SearchResult {
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

interface SearchStats {
    totalResults: number;
    sessionsSearched: number;
    messagesSearched: number;
    searchTimeMs: number;
    topKeywords: string[];
}

interface SearchResponse {
    type: 'search' | 'index' | 'extractKeywords';
    id: string;
    success: boolean;
    results?: SearchResult[];
    stats?: SearchStats;
    keywords?: string[];
    error?: string;
}

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
    'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their'
]);

/**
 * Tokenize a query into search terms
 */
function tokenize(query: string, caseSensitive: boolean): string[] {
    const text = caseSensitive ? query : query.toLowerCase();
    return text
        .split(/\s+/)
        .filter(term => term.length >= 2 && !STOP_WORDS.has(term));
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
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
 * Simple fuzzy matching using character-level comparison
 */
function fuzzyMatch(
    text: string,
    query: string
): { start: number; end: number; similarity: number } | null {
    const minSimilarity = 0.6;
    const windowSize = Math.min(query.length * 2, text.length);

    for (let i = 0; i <= text.length - query.length; i++) {
        const window = text.substring(i, i + windowSize);
        const similarity = calculateSimilarity(window, query);

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
 * Match text against query with scoring
 */
function matchText(
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
            score: 100 + queryLower.length,
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
        const fuzzyResult = fuzzyMatch(textToSearch, queryLower);
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
 * Extract top keywords from results
 */
function extractTopKeywords(results: SearchResult[]): string[] {
    const wordCounts = new Map<string, number>();

    for (const result of results) {
        const words = result.content
            .toLowerCase()
            .split(/\W+/)
            .filter(w => w.length > 3 && !STOP_WORDS.has(w));

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
 * Perform full search operation
 */
function performSearch(
    sessions: ChatSession[],
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
): { results: SearchResult[]; stats: SearchStats } {
    const startTime = performance.now();
    const opts: SearchOptions = {
        maxResults: 50,
        includeContext: true,
        fuzzyMatch: true,
        caseSensitive: false,
        wholeWord: false,
        ...options
    };

    let filteredSessions = sessions;
    let messagesSearched = 0;

    // Apply session filter
    if (filters.sessionId) {
        filteredSessions = filteredSessions.filter(s => s.id === filters.sessionId);
    }

    // Apply date filters
    if (filters.dateFrom) {
        filteredSessions = filteredSessions.filter(s => s.lastModified >= filters.dateFrom!);
    }
    if (filters.dateTo) {
        filteredSessions = filteredSessions.filter(s => s.lastModified <= filters.dateTo!);
    }

    // Apply model filter
    if (filters.model) {
        filteredSessions = filteredSessions.filter(s => s.modelId === filters.model);
    }

    const results: SearchResult[] = [];
    const queryTerms = tokenize(query, opts.caseSensitive || false);
    const queryLower = opts.caseSensitive ? query : query.toLowerCase();

    for (const session of filteredSessions) {
        if (session.encrypted) continue;

        // Search in session title
        const titleMatch = matchText(session.title, queryLower, queryTerms, opts);
        if (titleMatch) {
            results.push({
                sessionId: session.id,
                sessionTitle: session.title,
                messageIndex: -1,
                messageRole: 'system',
                content: session.title,
                matchedText: titleMatch.matchedText,
                matchStart: titleMatch.start,
                matchEnd: titleMatch.end,
                relevanceScore: titleMatch.score * 1.5,
                timestamp: session.lastModified,
            });
        }

        // Search in messages
        for (let i = 0; i < session.messages.length; i++) {
            const msg = session.messages[i];
            messagesSearched++;

            if (filters.role && filters.role !== 'all' && msg.role !== filters.role) {
                continue;
            }

            const content = typeof msg.content === 'string' ? msg.content : '';
            if (!content) continue;

            const match = matchText(content, queryLower, queryTerms, opts);
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
    const topKeywords = extractTopKeywords(limitedResults);

    const endTime = performance.now();

    return {
        results: limitedResults,
        stats: {
            totalResults: results.length,
            sessionsSearched: filteredSessions.length,
            messagesSearched,
            searchTimeMs: Math.round(endTime - startTime),
            topKeywords,
        },
    };
}

/**
 * Extract keywords from messages
 */
function extractKeywordsFromMessages(messages: ChatMessage[]): string[] {
    const wordCounts = new Map<string, number>();

    for (const msg of messages) {
        const content = typeof msg.content === 'string' ? msg.content : '';
        const words = content
            .toLowerCase()
            .split(/\W+/)
            .filter(w => w.length > 3 && !STOP_WORDS.has(w));

        for (const word of words) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
    }

    return Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);
}

// Message handler
self.onmessage = (event: MessageEvent<SearchRequest>) => {
    const { type, id, sessions, query, filters, options, messages } = event.data;

    const response: SearchResponse = {
        type,
        id,
        success: false,
    };

    try {
        switch (type) {
            case 'search':
                if (!sessions || !query) {
                    throw new Error('Missing sessions or query for search');
                }
                const searchResult = performSearch(sessions, query, filters, options);
                response.results = searchResult.results;
                response.stats = searchResult.stats;
                response.success = true;
                break;

            case 'extractKeywords':
                if (!messages) {
                    throw new Error('Missing messages for keyword extraction');
                }
                response.keywords = extractKeywordsFromMessages(messages);
                response.success = true;
                break;

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    } catch (error) {
        response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    self.postMessage(response);
};

// Indicate worker is ready
self.postMessage({ type: 'ready', id: 'init', success: true });
