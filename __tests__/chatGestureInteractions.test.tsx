/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatGestureInteractions } from '../src/renderer/hooks/useChatGestureInteractions';

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
    },
}));

jest.mock('../src/renderer/hooks/useGestures', () => ({
    useLongPress: jest.fn(),
    usePinchZoom: jest.fn(),
    useSwipeNavigation: jest.fn(),
}));

const createParams = (overrides: Record<string, unknown> = {}) => ({
    history: [{ role: 'user', content: 'hello' }],
    sessionId: 'session-a',
    savedSessions: [{ id: 'session-a' }, { id: 'session-b' }],
    loadSession: jest.fn(),
    messageListRef: { current: document.createElement('div') } as React.RefObject<HTMLDivElement>,
    longPressMenuRef: { current: document.createElement('div') } as React.RefObject<HTMLDivElement>,
    onEditMessage: jest.fn(),
    onRegenerateResponse: jest.fn(),
    onBranchConversation: jest.fn(),
    onDeleteMessage: jest.fn(),
    ...overrides,
});

describe('useChatGestureInteractions', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('persists bookmark toggles to session-local storage', () => {
        const { result } = renderHook(() => useChatGestureInteractions(createParams()));

        act(() => {
            result.current.toggleBookmark(2);
        });

        expect(Array.from(result.current.bookmarkedMessages)).toEqual([2]);
        expect(localStorage.getItem('bookmarks_session-a')).toBe('[2]');

        act(() => {
            result.current.toggleBookmark(2);
        });

        expect(Array.from(result.current.bookmarkedMessages)).toEqual([]);
        expect(localStorage.getItem('bookmarks_session-a')).toBe('[]');
    });

    it('hydrates bookmarks when the session changes', () => {
        localStorage.setItem('bookmarks_session-b', JSON.stringify([1, 4]));

        const { result, rerender } = renderHook(
            ({ sessionId }) => useChatGestureInteractions(createParams({ sessionId })),
            { initialProps: { sessionId: 'session-a' } }
        );

        expect(Array.from(result.current.bookmarkedMessages)).toEqual([]);

        rerender({ sessionId: 'session-b' });
        expect(Array.from(result.current.bookmarkedMessages)).toEqual([1, 4]);
    });

    it('clamps invalid or extreme stored font size values on hydration', () => {
        localStorage.setItem('chat_font_size', '999');
        const { result, unmount } = renderHook(() => useChatGestureInteractions(createParams()));
        expect(result.current.conversationFontSize).toBe(28);
        unmount();

        localStorage.setItem('chat_font_size', '-5');
        const { result: second } = renderHook(() => useChatGestureInteractions(createParams()));
        expect(second.current.conversationFontSize).toBe(12);
    });
});
