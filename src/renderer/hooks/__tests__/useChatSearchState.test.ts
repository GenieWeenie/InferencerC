import {
    deriveChatSearchState,
    type ChatSearchStateSnapshot,
} from '../useChatSearchState';

const BASE_PREVIOUS_STATE: ChatSearchStateSnapshot = {
    searchResults: [],
    currentSearchIndex: 0,
};

describe('deriveChatSearchState', () => {
    const searchableMessageContent = [
        'alpha beta',
        'beta gamma',
        'delta',
        'alpha delta',
    ];

    it('returns empty state for blank query input', () => {
        const result = deriveChatSearchState({
            searchQuery: '   ',
            searchableMessageContent,
            previousState: {
                searchResults: [1, 2],
                currentSearchIndex: 1,
            },
        });

        expect(result.searchResults).toEqual([]);
        expect(result.currentSearchIndex).toBe(0);
    });

    it('derives new matches and resets current index when matches change', () => {
        const result = deriveChatSearchState({
            searchQuery: 'alpha',
            searchableMessageContent,
            previousState: BASE_PREVIOUS_STATE,
        });

        expect(result.searchResults).toEqual([0, 3]);
        expect(result.currentSearchIndex).toBe(0);
    });

    it('preserves current state object when matches are unchanged and index is in range', () => {
        const previousState: ChatSearchStateSnapshot = {
            searchResults: [0, 3],
            currentSearchIndex: 1,
        };

        const result = deriveChatSearchState({
            searchQuery: 'alpha',
            searchableMessageContent,
            previousState,
        });

        expect(result).toBe(previousState);
    });

    it('clamps index when previous index is out of range for unchanged matches', () => {
        const result = deriveChatSearchState({
            searchQuery: 'alpha',
            searchableMessageContent,
            previousState: {
                searchResults: [0, 3],
                currentSearchIndex: 5,
            },
        });

        expect(result.searchResults).toEqual([0, 3]);
        expect(result.currentSearchIndex).toBe(1);
    });
});
