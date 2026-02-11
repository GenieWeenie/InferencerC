/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatMessageActionsController } from '../src/renderer/hooks/useChatMessageActionsController';

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
    },
}));

const createSetStateMock = <T,>() =>
    (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<T>>;

describe('useChatMessageActionsController', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('starts editing user messages', () => {
        const setEditingMessageIndex = createSetStateMock<number | null>();
        const setEditedMessageContent = createSetStateMock<string>();

        const { result } = renderHook(() => useChatMessageActionsController({
            history: [{ role: 'user', content: 'hello' }],
            sessionId: 's1',
            currentModel: 'm1',
            expertMode: null,
            thinkingEnabled: false,
            editedMessageContent: '',
            sendMessageWithContext: jest.fn(),
            replaceHistory: jest.fn(),
            truncateHistory: jest.fn(),
            setEditingMessageIndex,
            setEditedMessageContent,
            handleLoadSession: jest.fn(),
        }));

        act(() => {
            result.current.handleEditMessage(0);
        });

        expect(setEditingMessageIndex).toHaveBeenCalledWith(0);
        expect(setEditedMessageContent).toHaveBeenCalledWith('hello');
    });

    it('truncates and resends during regenerate', () => {
        const truncateHistory = jest.fn();
        const sendMessageWithContext = jest.fn();

        const { result } = renderHook(() => useChatMessageActionsController({
            history: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }],
            sessionId: 's1',
            currentModel: 'm1',
            expertMode: null,
            thinkingEnabled: false,
            editedMessageContent: '',
            sendMessageWithContext,
            replaceHistory: jest.fn(),
            truncateHistory,
            setEditingMessageIndex: createSetStateMock<number | null>(),
            setEditedMessageContent: createSetStateMock<string>(),
            handleLoadSession: jest.fn(),
        }));

        act(() => {
            result.current.handleRegenerateResponse(1);
            jest.runAllTimers();
        });

        expect(truncateHistory).toHaveBeenCalledWith(1);
        expect(sendMessageWithContext).toHaveBeenCalled();
    });

    it('creates a branched session and loads it', () => {
        localStorage.setItem('app_chat_sessions', JSON.stringify([
            { id: 's1', title: 'Original', messages: [] },
        ]));

        const handleLoadSession = jest.fn();

        const { result } = renderHook(() => useChatMessageActionsController({
            history: [{ role: 'user', content: 'a' }],
            sessionId: 's1',
            currentModel: 'm1',
            expertMode: null,
            thinkingEnabled: false,
            editedMessageContent: '',
            sendMessageWithContext: jest.fn(),
            replaceHistory: jest.fn(),
            truncateHistory: jest.fn(),
            setEditingMessageIndex: createSetStateMock<number | null>(),
            setEditedMessageContent: createSetStateMock<string>(),
            handleLoadSession,
        }));

        act(() => {
            result.current.handleBranchConversation(0);
        });

        expect(handleLoadSession).toHaveBeenCalledTimes(1);
        const nextId = handleLoadSession.mock.calls[0][0] as string;
        expect(nextId.startsWith('session-')).toBe(true);

        const saved = JSON.parse(localStorage.getItem('app_chat_sessions') || '[]');
        expect(saved.some((session: any) => session.id === nextId)).toBe(true);
    });
});
