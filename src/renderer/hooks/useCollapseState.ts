import { useState, useEffect, useCallback } from 'react';

export interface CollapseStateItem {
    id: string;
    type: 'code-block' | 'message-section';
    collapsed: boolean;
}

export interface CollapseState {
    [key: string]: boolean;
}

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
                const parsed = JSON.parse(stored);
                setCollapseState(parsed);
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
