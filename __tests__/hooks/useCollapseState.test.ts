/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useCollapseState } from '../../src/renderer/hooks/useCollapseState';

describe('useCollapseState', () => {
    const sessionId = 'test-session-123';
    const storageKey = `collapse-state-${sessionId}`;

    beforeEach(() => {
        sessionStorage.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    describe('initialization', () => {
        it('should initialize with empty state when no sessionStorage data exists', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));
            expect(result.current.collapseState).toEqual({});
        });

        it('should load state from sessionStorage on mount', () => {
            const initialState = { 'item-1': true, 'item-2': false };
            sessionStorage.setItem(storageKey, JSON.stringify(initialState));

            const { result } = renderHook(() => useCollapseState(sessionId));
            expect(result.current.collapseState).toEqual(initialState);
        });

        it('should handle invalid JSON in sessionStorage', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            sessionStorage.setItem(storageKey, 'invalid-json');

            const { result } = renderHook(() => useCollapseState(sessionId));
            expect(result.current.collapseState).toEqual({});
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to load collapse state from sessionStorage',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should ignore non-object persisted JSON without reporting parse errors', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            sessionStorage.setItem(storageKey, '[]');

            const { result } = renderHook(() => useCollapseState(sessionId));
            expect(result.current.collapseState).toEqual({});
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should not load state when sessionId is empty', () => {
            sessionStorage.setItem('collapse-state-', JSON.stringify({ 'item-1': true }));

            const { result } = renderHook(() => useCollapseState(''));
            expect(result.current.collapseState).toEqual({});
        });
    });

    describe('isCollapsed', () => {
        it('should return true for collapsed items', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': true }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            expect(result.current.isCollapsed('item-1')).toBe(true);
        });

        it('should return false for expanded items', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': false }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            expect(result.current.isCollapsed('item-1')).toBe(false);
        });

        it('should return false for items not in state', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));
            expect(result.current.isCollapsed('non-existent')).toBe(false);
        });
    });

    describe('toggleCollapse', () => {
        it('should toggle item from false to true', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.toggleCollapse('item-1');
            });

            expect(result.current.isCollapsed('item-1')).toBe(true);
        });

        it('should toggle item from true to false', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': true }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.toggleCollapse('item-1');
            });

            expect(result.current.isCollapsed('item-1')).toBe(false);
        });

        it('should toggle item from undefined to true', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.toggleCollapse('new-item');
            });

            expect(result.current.isCollapsed('new-item')).toBe(true);
        });
    });

    describe('setCollapsed', () => {
        it('should set item to collapsed', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            expect(result.current.isCollapsed('item-1')).toBe(true);
        });

        it('should set item to expanded', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': true }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.setCollapsed('item-1', false);
            });

            expect(result.current.isCollapsed('item-1')).toBe(false);
        });

        it('should update existing item state', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': false }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            expect(result.current.isCollapsed('item-1')).toBe(true);
        });
    });

    describe('collapseAll', () => {
        it('should collapse all specified items', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));
            const itemIds = ['item-1', 'item-2', 'item-3'];

            act(() => {
                result.current.collapseAll(itemIds);
            });

            itemIds.forEach(id => {
                expect(result.current.isCollapsed(id)).toBe(true);
            });
        });

        it('should preserve other item states when collapsing all', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'other-item': false }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.collapseAll(['item-1', 'item-2']);
            });

            expect(result.current.isCollapsed('item-1')).toBe(true);
            expect(result.current.isCollapsed('item-2')).toBe(true);
            expect(result.current.isCollapsed('other-item')).toBe(false);
        });

        it('should handle empty array', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.collapseAll([]);
            });

            expect(result.current.collapseState).toEqual({});
        });
    });

    describe('expandAll', () => {
        it('should expand all specified items', () => {
            const initialState = { 'item-1': true, 'item-2': true, 'item-3': true };
            sessionStorage.setItem(storageKey, JSON.stringify(initialState));
            const { result } = renderHook(() => useCollapseState(sessionId));

            const itemIds = ['item-1', 'item-2', 'item-3'];
            act(() => {
                result.current.expandAll(itemIds);
            });

            itemIds.forEach(id => {
                expect(result.current.isCollapsed(id)).toBe(false);
            });
        });

        it('should preserve other item states when expanding all', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({
                'item-1': true,
                'item-2': true,
                'other-item': true
            }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.expandAll(['item-1', 'item-2']);
            });

            expect(result.current.isCollapsed('item-1')).toBe(false);
            expect(result.current.isCollapsed('item-2')).toBe(false);
            expect(result.current.isCollapsed('other-item')).toBe(true);
        });

        it('should handle empty array', () => {
            const initialState = { 'item-1': true };
            sessionStorage.setItem(storageKey, JSON.stringify(initialState));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.expandAll([]);
            });

            expect(result.current.collapseState).toEqual(initialState);
        });
    });

    describe('getCollapsedItems', () => {
        it('should return array of collapsed item IDs', () => {
            const initialState = {
                'item-1': true,
                'item-2': false,
                'item-3': true,
                'item-4': false
            };
            sessionStorage.setItem(storageKey, JSON.stringify(initialState));
            const { result } = renderHook(() => useCollapseState(sessionId));

            const collapsedItems = result.current.getCollapsedItems();
            expect(collapsedItems).toEqual(['item-1', 'item-3']);
        });

        it('should return empty array when no items are collapsed', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({
                'item-1': false,
                'item-2': false
            }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            const collapsedItems = result.current.getCollapsedItems();
            expect(collapsedItems).toEqual([]);
        });

        it('should return empty array when state is empty', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            const collapsedItems = result.current.getCollapsedItems();
            expect(collapsedItems).toEqual([]);
        });
    });

    describe('clearState', () => {
        it('should clear all collapse state', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({
                'item-1': true,
                'item-2': false,
                'item-3': true
            }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.clearState();
            });

            expect(result.current.collapseState).toEqual({});
            expect(result.current.getCollapsedItems()).toEqual([]);
        });

        it('should clear state when already empty', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.clearState();
            });

            expect(result.current.collapseState).toEqual({});
        });
    });

    describe('sessionStorage persistence', () => {
        it('should persist state to sessionStorage when toggling', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.toggleCollapse('item-1');
            });

            const stored = sessionStorage.getItem(storageKey);
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!)).toEqual({ 'item-1': true });
        });

        it('should persist state to sessionStorage when setting', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.setCollapsed('item-1', true);
                result.current.setCollapsed('item-2', false);
            });

            const stored = sessionStorage.getItem(storageKey);
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!)).toEqual({ 'item-1': true, 'item-2': false });
        });

        it('should persist state to sessionStorage when collapsing all', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.collapseAll(['item-1', 'item-2']);
            });

            const stored = sessionStorage.getItem(storageKey);
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!)).toEqual({ 'item-1': true, 'item-2': true });
        });

        it('should persist state to sessionStorage when clearing', () => {
            sessionStorage.setItem(storageKey, JSON.stringify({ 'item-1': true }));
            const { result } = renderHook(() => useCollapseState(sessionId));

            act(() => {
                result.current.clearState();
            });

            const stored = sessionStorage.getItem(storageKey);
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored!)).toEqual({});
        });

        it('should continue to work even when sessionStorage fails', () => {
            // Mock console.error to suppress error output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useCollapseState(sessionId));

            // Mock sessionStorage.setItem to throw an error after initialization
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(key: string, value: string) {
                if (key === storageKey) {
                    throw new Error('Storage quota exceeded');
                }
                return originalSetItem.call(this, key, value);
            };

            // This should trigger a save that will fail, but state should still update
            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            // The state should still update locally even though save failed
            expect(result.current.isCollapsed('item-1')).toBe(true);
            expect(result.current.collapseState['item-1']).toBe(true);

            // Verify functionality continues to work
            act(() => {
                result.current.toggleCollapse('item-1');
            });

            expect(result.current.isCollapsed('item-1')).toBe(false);

            // Restore
            Storage.prototype.setItem = originalSetItem;
            consoleErrorSpy.mockRestore();
        });

        it('should not persist when sessionId is empty', () => {
            const { result } = renderHook(() => useCollapseState(''));

            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            const stored = sessionStorage.getItem('collapse-state-');
            expect(stored).toBeNull();
        });
    });

    describe('session isolation', () => {
        it('should use different storage for different sessions', () => {
            const session1 = 'session-1';
            const session2 = 'session-2';

            const { result: result1 } = renderHook(() => useCollapseState(session1));
            const { result: result2 } = renderHook(() => useCollapseState(session2));

            act(() => {
                result1.current.setCollapsed('item-1', true);
                result2.current.setCollapsed('item-1', false);
            });

            expect(result1.current.isCollapsed('item-1')).toBe(true);
            expect(result2.current.isCollapsed('item-1')).toBe(false);

            const stored1 = sessionStorage.getItem(`collapse-state-${session1}`);
            const stored2 = sessionStorage.getItem(`collapse-state-${session2}`);

            expect(JSON.parse(stored1!)).toEqual({ 'item-1': true });
            expect(JSON.parse(stored2!)).toEqual({ 'item-1': false });
        });
    });

    describe('callback stability', () => {
        it('should have stable callback references for state setters', () => {
            const { result, rerender } = renderHook(() => useCollapseState(sessionId));

            const initialCallbacks = {
                toggleCollapse: result.current.toggleCollapse,
                setCollapsed: result.current.setCollapsed,
                collapseAll: result.current.collapseAll,
                expandAll: result.current.expandAll,
                clearState: result.current.clearState,
            };

            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            rerender();

            // These callbacks don't depend on collapseState, so they should be stable
            expect(result.current.toggleCollapse).toBe(initialCallbacks.toggleCollapse);
            expect(result.current.setCollapsed).toBe(initialCallbacks.setCollapsed);
            expect(result.current.collapseAll).toBe(initialCallbacks.collapseAll);
            expect(result.current.expandAll).toBe(initialCallbacks.expandAll);
            expect(result.current.clearState).toBe(initialCallbacks.clearState);
        });

        it('should update isCollapsed and getCollapsedItems when state changes', () => {
            const { result } = renderHook(() => useCollapseState(sessionId));

            const initialIsCollapsed = result.current.isCollapsed;
            const initialGetCollapsedItems = result.current.getCollapsedItems;

            act(() => {
                result.current.setCollapsed('item-1', true);
            });

            // These callbacks depend on collapseState, so they will be recreated
            // But they should still function correctly
            expect(result.current.isCollapsed).not.toBe(initialIsCollapsed);
            expect(result.current.getCollapsedItems).not.toBe(initialGetCollapsedItems);

            // Verify they still work correctly
            expect(result.current.isCollapsed('item-1')).toBe(true);
            expect(result.current.getCollapsedItems()).toEqual(['item-1']);
        });
    });
});
