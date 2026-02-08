/**
 * Global Search Dialog
 * 
 * A powerful search interface for finding content across all conversations.
 * Features:
 * - Real-time search with debouncing
 * - Fuzzy matching and relevance scoring
 * - Filter by date, model, and role
 * - Search result previews with highlighting
 * - Jump to specific messages
 * - Recent searches history
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    Clock,
    MessageSquare,
    User,
    Bot,
    ArrowRight,
    Calendar,
    Filter,
    Trash2,
    Loader2,
    Sparkles,
    History,
    EyeOff,
} from 'lucide-react';
import { SearchService, SearchResult, SearchFilters, SearchStats } from '../services/search';
import LoadingSpinner from './LoadingSpinner';
import { HistoryService } from '../services/history';
import { autoTaggingService } from '../services/autoTagging';

export interface ExpandMetadata {
    expandMessage?: boolean;
    expandCodeBlock?: string; // Code hash to expand
}

interface GlobalSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToMessage: (sessionId: string, messageIndex: number, expandMetadata?: ExpandMetadata) => void;
    currentSessionId?: string;
    currentSessionTitle?: string;
}

const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
    isOpen,
    onClose,
    onNavigateToMessage,
    currentSessionId,
    currentSessionTitle,
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [stats, setStats] = useState<SearchStats | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [regexError, setRegexError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Load recent searches on mount
    useEffect(() => {
        if (isOpen) {
            setRecentSearches(SearchService.getRecentSearches());
            const sessions = HistoryService.getAllSessions();
            const models = Array.from(new Set(sessions.map(s => s.modelId).filter(Boolean))).sort();
            setAvailableModels(models);
            setAvailableTags(autoTaggingService.getAllTags());
            setRegexError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setStats(null);
            setRegexError(null);
            setIsSearching(false);
            return;
        }

        if (filters.useRegex) {
            try {
                // Validate regex pattern early for better UX.
                new RegExp(query, filters.regexFlags || 'gi');
                setRegexError(null);
            } catch (error: any) {
                setRegexError(error?.message || 'Invalid regex');
                setResults([]);
                setStats(null);
                return;
            }
        } else {
            setRegexError(null);
        }

        let cancelled = false;
        const timeoutId = setTimeout(() => {
            setIsSearching(true);

            const runSearch = async () => {
                try {
                    const { results: searchResults, stats: searchStats } = await SearchService.searchAsync(
                        query,
                        filters,
                        {
                            maxResults: 50,
                            includeContext: true,
                            fuzzyMatch: true,
                        }
                    );

                    if (cancelled) return;
                    setResults(searchResults);
                    setStats(searchStats);
                    setSelectedIndex(0);
                } catch (error) {
                    if (cancelled) return;
                    console.error('Search failed:', error);
                    setResults([]);
                } finally {
                    if (!cancelled) {
                        setIsSearching(false);
                    }
                }
            };

            void runSearch();
        }, 200);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [query, filters]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleResultClick(results[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Scroll selected result into view
    useEffect(() => {
        if (resultsRef.current && results.length > 0) {
            const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, results]);

    const handleResultClick = useCallback((result: SearchResult) => {
        SearchService.saveRecentSearch(query);

        // Determine what needs to be expanded if result is in collapsed section
        let expandMetadata: ExpandMetadata | undefined;

        if (result.isInCollapsedSection) {
            expandMetadata = {};

            try {
                // Load collapse state from sessionStorage
                const storageKey = `collapse-state-${result.sessionId}`;
                const stored = sessionStorage.getItem(storageKey);

                if (stored) {
                    const collapseState = JSON.parse(stored) as Record<string, boolean>;

                    // Check if entire message is collapsed
                    if (collapseState['message'] === true) {
                        expandMetadata.expandMessage = true;
                    }

                    // Check if match is within a collapsed code block
                    const codeBlockRegex = /```[\s\S]*?```/g;
                    let match: RegExpExecArray | null;

                    while ((match = codeBlockRegex.exec(result.content)) !== null) {
                        const blockStart = match.index;
                        const blockEnd = blockStart + match[0].length;

                        // Check if the search match is within this code block
                        if (result.matchStart >= blockStart && result.matchEnd <= blockEnd) {
                            // Extract the code content (without the backticks and language identifier)
                            const codeContent = match[0].replace(/^```[\w]*\n?/, '').replace(/```$/, '');
                            const codeHash = codeContent.substring(0, 50);

                            // Check if this code block is collapsed
                            if (collapseState[codeHash] === true) {
                                expandMetadata.expandCodeBlock = codeHash;
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                // If we can't determine what to expand, just navigate without expansion metadata
            }
        }

        onNavigateToMessage(result.sessionId, result.messageIndex, expandMetadata);
        onClose();
    }, [query, onNavigateToMessage, onClose]);

    const handleRecentSearchClick = useCallback((search: string) => {
        setQuery(search);
    }, []);

    const clearRecentSearches = useCallback(() => {
        SearchService.clearRecentSearches();
        setRecentSearches([]);
    }, []);

    const applyDatePreset = useCallback((preset: 'today' | 'week') => {
        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (preset === 'today') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            setFilters(prev => ({
                ...prev,
                dateFrom: startOfToday,
                dateTo: endOfToday,
            }));
            return;
        }

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0);
        setFilters(prev => ({
            ...prev,
            dateFrom: startOfWeek,
            dateTo: endOfToday,
        }));
    }, []);

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'user':
                return <User size={14} className="text-blue-400" />;
            case 'assistant':
                return <Bot size={14} className="text-green-400" />;
            default:
                return <MessageSquare size={14} className="text-slate-400" />;
        }
    };

    const highlightMatch = (text: string, matchStart: number, matchEnd: number) => {
        if (matchStart < 0 || matchEnd <= matchStart) return text;

        const before = text.substring(0, matchStart);
        const match = text.substring(matchStart, matchEnd);
        const after = text.substring(matchEnd);

        return (
            <>
                {before}
                <mark className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded">{match}</mark>
                {after}
            </>
        );
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-[10%] -translate-x-1/2 w-full max-w-2xl max-h-[80vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl z-[101] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={filters.sessionId ? 'Search within this conversation...' : 'Search across all conversations...'}
                                        className="w-full bg-slate-800 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-lg"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-3 rounded-xl border transition-colors ${showFilters
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-slate-800 border-slate-600/50 text-slate-400 hover:text-white hover:border-slate-500'
                                        }`}
                                    title="Toggle filters"
                                >
                                    <Filter size={20} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Filters */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                            <select
                                                value={filters.sessionId || 'all'}
                                                onChange={(e) => {
                                                    const next = e.target.value;
                                                    setFilters({
                                                        ...filters,
                                                        sessionId: next === 'all' ? undefined : next,
                                                    });
                                                }}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            >
                                                <option value="all">Scope: Global</option>
                                                {currentSessionId && (
                                                    <option value={currentSessionId}>
                                                        Scope: This conversation ({currentSessionTitle || 'Current'})
                                                    </option>
                                                )}
                                            </select>

                                            <select
                                                value={filters.role || 'all'}
                                                onChange={(e) => setFilters({ ...filters, role: e.target.value as SearchFilters['role'] })}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            >
                                                <option value="all">All roles</option>
                                                <option value="user">User only</option>
                                                <option value="assistant">Assistant only</option>
                                            </select>

                                            <select
                                                value={filters.model || 'all'}
                                                onChange={(e) => {
                                                    const next = e.target.value;
                                                    setFilters({ ...filters, model: next === 'all' ? undefined : next });
                                                }}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            >
                                                <option value="all">All models</option>
                                                {availableModels.map(model => (
                                                    <option key={model} value={model}>
                                                        {model}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                value={filters.tags?.[0] || 'all'}
                                                onChange={(e) => {
                                                    const next = e.target.value;
                                                    setFilters({ ...filters, tags: next === 'all' ? undefined : [next] });
                                                }}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            >
                                                <option value="all">All tags</option>
                                                {availableTags.map(tag => (
                                                    <option key={tag} value={tag}>
                                                        {tag}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="date"
                                                value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                                                onChange={(e) => setFilters({
                                                    ...filters,
                                                    dateFrom: e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined
                                                })}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="From date"
                                            />
                                            <input
                                                type="date"
                                                value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                                                onChange={(e) => setFilters({
                                                    ...filters,
                                                    dateTo: e.target.value ? new Date(`${e.target.value}T23:59:59`) : undefined
                                                })}
                                                className="px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="To date"
                                            />

                                            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => applyDatePreset('today')}
                                                    className="px-2 py-1 text-xs rounded bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-colors"
                                                >
                                                    Today
                                                </button>
                                                <button
                                                    onClick={() => applyDatePreset('week')}
                                                    className="px-2 py-1 text-xs rounded bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-colors"
                                                >
                                                    This Week
                                                </button>
                                                <label className="ml-2 inline-flex items-center gap-2 text-xs text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(filters.useRegex)}
                                                        onChange={(e) => setFilters({ ...filters, useRegex: e.target.checked || undefined })}
                                                        className="rounded border-slate-600 bg-slate-800"
                                                    />
                                                    Regex
                                                </label>
                                                {filters.useRegex && (
                                                    <input
                                                        type="text"
                                                        value={filters.regexFlags || 'gi'}
                                                        onChange={(e) => setFilters({ ...filters, regexFlags: e.target.value || undefined })}
                                                        className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-600/50 rounded text-white"
                                                        title="Regex flags (e.g. gi)"
                                                    />
                                                )}
                                            </div>

                                            {(filters.role || filters.dateFrom || filters.dateTo || filters.model || filters.sessionId || (filters.tags && filters.tags.length > 0) || filters.useRegex) && (
                                                <button
                                                    onClick={() => setFilters({})}
                                                    className="md:col-span-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Results */}
                        <div ref={resultsRef} className="flex-1 overflow-y-auto">
                            {regexError && (
                                <div className="px-4 py-2 text-xs text-red-300 border-b border-red-900/40 bg-red-500/10">
                                    Invalid regex: {regexError}
                                </div>
                            )}

                            {/* Stats */}
                            {stats && query && (
                                <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-800 flex items-center gap-3">
                                    <span>
                                        <Sparkles size={12} className="inline mr-1" />
                                        {stats.totalResults} results
                                    </span>
                                    <span>•</span>
                                    <span>{stats.sessionsSearched} sessions searched</span>
                                    <span>•</span>
                                    <span>{stats.searchTimeMs}ms</span>
                                </div>
                            )}

                            {/* No query - show recent searches */}
                            {!query && recentSearches.length > 0 && (
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <History size={14} />
                                            <span>Recent searches</span>
                                        </div>
                                        <button
                                            onClick={clearRecentSearches}
                                            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {recentSearches.slice(0, 5).map((search, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleRecentSearchClick(search)}
                                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800/50 rounded-lg transition-colors text-left group"
                                            >
                                                <Clock size={14} className="text-slate-500" />
                                                <span className="text-slate-300 flex-1">{search}</span>
                                                <ArrowRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No query and no recent searches */}
                            {!query && recentSearches.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                        <Search size={32} className="text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">
                                        Search your conversations
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-sm">
                                        Find any message across all your chats. Use keywords, phrases, or even partial matches.
                                    </p>
                                </div>
                            )}

                            {/* Loading state */}
                            {query && isSearching && (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <LoadingSpinner size="lg" className="mb-4" />
                                    <p className="text-sm text-slate-400">Searching conversations...</p>
                                </div>
                            )}

                            {/* Search results */}
                            {query && !isSearching && results.length > 0 && (
                                <div className="divide-y divide-slate-800">
                                    {results.map((result, index) => (
                                        <motion.button
                                            key={`${result.sessionId}-${result.messageIndex}-${index}`}
                                            data-index={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            onClick={() => handleResultClick(result)}
                                            className={`w-full p-4 text-left transition-colors ${index === selectedIndex
                                                    ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                                    : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                                                }`}
                                        >
                                            {/* Session title and metadata */}
                                            <div className="flex items-center gap-2 mb-2">
                                                {getRoleIcon(result.messageRole)}
                                                <span className="text-sm font-medium text-white">
                                                    {result.sessionTitle}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {result.messageIndex >= 0
                                                        ? `Message #${result.messageIndex + 1}`
                                                        : 'Title'}
                                                </span>
                                                <span className="text-xs text-slate-600">•</span>
                                                <span className="text-xs text-slate-500">
                                                    {formatTimestamp(result.timestamp)}
                                                </span>
                                                {result.isInCollapsedSection && (
                                                    <>
                                                        <span className="text-xs text-slate-600">•</span>
                                                        <span
                                                            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-900/30 border border-amber-700/50 rounded-full text-amber-400"
                                                            title="Match is in a collapsed section"
                                                        >
                                                            <EyeOff size={12} />
                                                            <span>Collapsed</span>
                                                        </span>
                                                    </>
                                                )}
                                                <span className="ml-auto text-xs px-2 py-0.5 bg-slate-700/50 rounded-full text-slate-400">
                                                    {Math.round(result.relevanceScore)}% match
                                                </span>
                                            </div>

                                            {/* Content preview with highlighting */}
                                            <div className="text-sm text-slate-400 line-clamp-2">
                                                {result.context?.before && (
                                                    <span className="text-slate-500">...{result.context.before}</span>
                                                )}
                                                {highlightMatch(
                                                    result.matchedText,
                                                    0,
                                                    result.matchedText.length
                                                )}
                                                {result.context?.after && (
                                                    <span className="text-slate-500">{result.context.after}...</span>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}

                            {/* No results */}
                            {query && !isSearching && results.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                        <Search size={32} className="text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">
                                        No results found
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-sm">
                                        Try different keywords or check your filters. We search across all your conversations.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700/50 bg-slate-800/30 flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">↑↓</kbd>
                                <span>Navigate</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Enter</kbd>
                                <span>Open</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd>
                                <span>Close</span>
                            </div>
                            <div className="ml-auto text-slate-600">
                                Powered by Smart Search™
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default GlobalSearchDialog;
