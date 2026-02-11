import { useState, useEffect, useCallback } from 'react';

export interface CollapseStateItem {
    id: string;
    type: 'code-block' | 'message-section';
    collapsed: boolean;
}

export interface CollapseState {
    [key: string]: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseJson = (raw: string): { ok: true; value: unknown } | { ok: false } => {
    try {
        return { ok: true, value: JSON.parse(raw) };
    } catch {
        return { ok: false };
    }
};

const parseStoredCollapseStateWithStatus = (raw: string): { state: CollapseState; hadParseError: boolean } => {
    const parsed = parseJson(raw);
    if (!parsed.ok) {
        return { state: {}, hadParseError: true };
    }
    if (!isRecord(parsed.value)) {
        return { state: {}, hadParseError: false };
    }
    const state: CollapseState = {};
    Object.entries(parsed.value).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            state[key] = value;
        }
    });
    return { state, hadParseError: false };
};

export const parseStoredCollapseState = (raw: string): CollapseState => {
    return parseStoredCollapseStateWithStatus(raw).state;
};

export const useCollapseState = (sessionId: string) => {
    const [collapseState, setCollapseState] = useState<CollapseState>({});

    // Storage key for this session
    const storageKey = `collapse-state-${sessionId}`;

    // Load collapse state from sessionStorage on mount
    useEffect(() => {
        if (!sessionId) return;

        try {
            const stored = sessionStorage.getItem(storageKey);
            if (stored) {
                const parsed = parseStoredCollapseStateWithStatus(stored);
                setCollapseState(parsed.state);
                if (parsed.hadParseError) {
                    console.error('Failed to load collapse state from sessionStorage', new Error('Invalid JSON'));
                }
            }
        } catch (e) {
            console.error('Failed to load collapse state from sessionStorage', e);
            setCollapseState({});
        }
    }, [sessionId, storageKey]);

    // Persist collapse state to sessionStorage whenever it changes
    useEffect(() => {
        if (!sessionId) return;

        try {
            sessionStorage.setItem(storageKey, JSON.stringify(collapseState));
        } catch (e) {
            console.error('Failed to save collapse state to sessionStorage', e);
        }
    }, [collapseState, sessionId, storageKey]);

    // Check if an item is collapsed
    const isCollapsed = useCallback((itemId: string): boolean => {
        return collapseState[itemId] === true;
    }, [collapseState]);

    // Toggle collapse state for a specific item
    const toggleCollapse = useCallback((itemId: string) => {
        setCollapseState(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    }, []);

    // Set collapse state for a specific item
    const setCollapsed = useCallback((itemId: string, collapsed: boolean) => {
        setCollapseState(prev => ({
            ...prev,
            [itemId]: collapsed
        }));
    }, []);

    // Collapse all items
    const collapseAll = useCallback((itemIds: string[]) => {
        setCollapseState(prev => {
            const newState = { ...prev };
            itemIds.forEach(id => {
                newState[id] = true;
            });
            return newState;
        });
    }, []);

    // Expand all items
    const expandAll = useCallback((itemIds: string[]) => {
        setCollapseState(prev => {
            const newState = { ...prev };
            itemIds.forEach(id => {
                newState[id] = false;
            });
            return newState;
        });
    }, []);

    // Get all collapsed item IDs
    const getCollapsedItems = useCallback((): string[] => {
        return Object.keys(collapseState).filter(id => collapseState[id] === true);
    }, [collapseState]);

    // Clear all collapse state
    const clearState = useCallback(() => {
        setCollapseState({});
    }, []);

    return {
        collapseState,
        isCollapsed,
        toggleCollapse,
        setCollapsed,
        collapseAll,
        expandAll,
        getCollapsedItems,
        clearState
    };
};
