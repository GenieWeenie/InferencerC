import React from 'react';
import type { ChatMessage } from '../../shared/types';
import {
    areSearchResultIndicesEqual,
    findChatSearchMatches,
    normalizeChatSearchQuery,
} from '../lib/chatSearch';

export interface ChatSearchStateSnapshot {
    searchResults: number[];
    currentSearchIndex: number;
}

interface DeriveChatSearchStateParams {
    searchQuery: string;
    searchableMessageContent: string[];
    previousState: ChatSearchStateSnapshot;
}

const DEFAULT_CHAT_SEARCH_STATE: ChatSearchStateSnapshot = {
    searchResults: [],
    currentSearchIndex: 0,
};

export const deriveChatSearchState = ({
    searchQuery,
    searchableMessageContent,
    previousState,
}: DeriveChatSearchStateParams): ChatSearchStateSnapshot => {
    const normalizedQuery = normalizeChatSearchQuery(searchQuery);

    if (!normalizedQuery) {
        if (previousState.searchResults.length === 0 && previousState.currentSearchIndex === 0) {
            return previousState;
        }

        return DEFAULT_CHAT_SEARCH_STATE;
    }

    const nextMatches = findChatSearchMatches(searchableMessageContent, normalizedQuery);
    const matchesChanged = !areSearchResultIndicesEqual(previousState.searchResults, nextMatches);

    if (matchesChanged) {
        return {
            searchResults: nextMatches,
            currentSearchIndex: 0,
        };
    }

    if (nextMatches.length === 0) {
        if (previousState.currentSearchIndex === 0) {
            return previousState;
        }
        return {
            searchResults: previousState.searchResults,
            currentSearchIndex: 0,
        };
    }

    if (previousState.currentSearchIndex >= nextMatches.length) {
        return {
            searchResults: previousState.searchResults,
            currentSearchIndex: nextMatches.length - 1,
        };
    }

    return previousState;
};

interface UseChatSearchStateParams {
    history: ChatMessage[];
    debounceMs?: number;
}

export const useChatSearchState = ({
    history,
    debounceMs = 300,
}: UseChatSearchStateParams) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
    const [searchState, setSearchState] = React.useState<ChatSearchStateSnapshot>(DEFAULT_CHAT_SEARCH_STATE);

    const searchableMessageContent = React.useMemo(
        () => history.map((msg) => (typeof msg.content === 'string' ? msg.content.toLowerCase() : '')),
        [history]
    );

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [searchQuery, debounceMs]);

    React.useEffect(() => {
        setSearchState((prev) => deriveChatSearchState({
            searchQuery: debouncedSearchQuery,
            searchableMessageContent,
            previousState: prev,
        }));
    }, [debouncedSearchQuery, searchableMessageContent]);

    const setCurrentSearchIndex = React.useCallback((nextIndex: number) => {
        setSearchState((prev) => {
            if (prev.currentSearchIndex === nextIndex) {
                return prev;
            }
            return {
                searchResults: prev.searchResults,
                currentSearchIndex: nextIndex,
            };
        });
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        searchResults: searchState.searchResults,
        currentSearchIndex: searchState.currentSearchIndex,
        setCurrentSearchIndex,
    };
};
