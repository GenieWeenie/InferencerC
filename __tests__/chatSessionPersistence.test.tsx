/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { ChatMessage, ChatSession } from '../src/shared/types';

const saveSessionMock = jest.fn();
const getSessionMock = jest.fn();

jest.mock('../src/renderer/services/history', () => ({
    HistoryService: {
        saveSession: (...args: unknown[]) => saveSessionMock(...args),
        getSession: (...args: unknown[]) => getSessionMock(...args),
    },
}));

import { useChatSessionPersistence } from '../src/renderer/hooks/useChatSessionPersistence';

interface HookProps {
    history: ChatMessage[];
    sessionId: string;
    currentModel: string;
}

const createBaseHookProps = (overrides: Partial<HookProps> = {}) => {
    const setSavedSessions = jest.fn<React.Dispatch<React.SetStateAction<ChatSession[]>>, [React.SetStateAction<ChatSession[]>]>();
    return {
        history: overrides.history ?? [{ role: 'user', content: 'Hello world' }],
        sessionId: overrides.sessionId ?? 'session-1',
        currentModel: overrides.currentModel ?? 'model-a',
        expertMode: null,
        thinkingEnabled: false,
        systemPrompt: '',
        temperature: 0.7,
        topP: 1,
        maxTokens: 2048,
        batchSize: 1,
        loadedMessageIndices: new Set<number>([0]),
        fullMessageCache: new Map<number, ChatMessage>([[0, { role: 'user', content: 'Hello world' }]]),
        setSavedSessions,
        loadedSessionIdRef: { current: null as string | null },
        loadedSessionMessagesRef: { current: [] as ChatMessage[] },
        lastSidebarMetadataSignatureRef: { current: '' },
        battleMode: false,
        secondaryModel: '',
        autoRouting: false,
        responseFormat: 'text' as const,
        input: '',
        prefill: null as string | null,
        enabledTools: new Set<string>(['mcp.search']),
    };
};

describe('useChatSessionPersistence', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.clear();
        saveSessionMock.mockReset();
        getSessionMock.mockReset();
        getSessionMock.mockReturnValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('autosaves session metadata and skips sidebar update when signature is unchanged', () => {
        const props = createBaseHookProps();
        const { rerender } = renderHook((hookProps: typeof props) => {
            useChatSessionPersistence(hookProps);
        }, { initialProps: props });

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(saveSessionMock).toHaveBeenCalledTimes(1);
        expect(props.setSavedSessions).toHaveBeenCalledTimes(1);
        expect(props.loadedSessionIdRef.current).toBe('session-1');
        expect(props.loadedSessionMessagesRef.current).toHaveLength(1);

        const rerendered = {
            ...props,
            history: [{ role: 'user', content: 'Hello world' }],
        };
        rerender(rerendered);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(saveSessionMock).toHaveBeenCalledTimes(2);
        expect(props.setSavedSessions).toHaveBeenCalledTimes(1);
    });

    it('writes recovery snapshots immediately and skips writes for invalid model context', () => {
        const props = createBaseHookProps({
            sessionId: 'session-2',
            currentModel: 'model-b',
        });
        const { rerender } = renderHook((hookProps: typeof props) => {
            useChatSessionPersistence(hookProps);
        }, { initialProps: props });

        const initialSnapshotRaw = localStorage.getItem('app_recovery_state');
        expect(initialSnapshotRaw).not.toBeNull();
        expect(JSON.parse(initialSnapshotRaw || '{}').currentModel).toBe('model-b');

        act(() => {
            jest.advanceTimersByTime(30000);
        });
        const refreshedSnapshotRaw = localStorage.getItem('app_recovery_state');
        expect(refreshedSnapshotRaw).not.toBeNull();

        const beforeInvalidContext = localStorage.getItem('app_recovery_state');
        rerender({
            ...props,
            currentModel: '   ',
        });

        act(() => {
            jest.advanceTimersByTime(30000);
        });

        expect(localStorage.getItem('app_recovery_state')).toBe(beforeInvalidContext);
    });
});
