export const normalizeChatSearchQuery = (query: string): string => {
    return query.trim().toLowerCase();
};

export const findChatSearchMatches = (
    searchableMessageContent: string[],
    normalizedQuery: string
): number[] => {
    if (!normalizedQuery) {
        return [];
    }

    const matches: number[] = [];
    for (let index = 0; index < searchableMessageContent.length; index += 1) {
        if (searchableMessageContent[index].includes(normalizedQuery)) {
            matches.push(index);
        }
    }
    return matches;
};

export const areSearchResultIndicesEqual = (a: number[], b: number[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};
