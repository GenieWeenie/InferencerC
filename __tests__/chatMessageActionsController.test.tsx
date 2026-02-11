/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatMessageActionsController } from '../src/renderer/hooks/useChatMessageActionsController';
import { HistoryService } from '../src/renderer/services/history';

jest.mock('../src/renderer/services/history', () => ({
    HistoryService: {
        getSession: jest.fn(),
        createNewSession: jest.fn(),
        saveSession: jest.fn(),
        setLastActiveSessionId: jest.fn(),
    },
}));

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

const historyServiceMocks = HistoryService as jest.Mocked<typeof HistoryService>;

describe('useChatMessageActionsController', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.clear();
        historyServiceMocks.getSession.mockReset();
        historyServiceMocks.createNewSession.mockReset();
        historyServiceMocks.saveSession.mockReset();
        historyServiceMocks.setLastActiveSessionId.mockReset();

        historyServiceMocks.getSession.mockReturnValue(undefined);
        historyServiceMocks.createNewSession.mockImplementation((modelId: string) => ({
            id: `branch-${modelId}`,
            title: 'New Chat',
            lastModified: Date.now(),
            modelId,
            messages: [],
        }));
        historyServiceMocks.saveSession.mockImplementation(() => undefined);
        historyServiceMocks.setLastActiveSessionId.mockImplementation(() => undefined);
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

    it('creates a branched session via HistoryService and loads it', () => {
        const handleLoadSession = jest.fn();
        historyServiceMocks.getSession.mockReturnValue({
            id: 's1',
            title: 'Original',
            lastModified: 1,
            modelId: 'm1',
            messages: [],
        });
        historyServiceMocks.createNewSession.mockReturnValue({
            id: 'branch-id',
            title: 'New Chat',
            lastModified: 2,
            modelId: 'm1',
            messages: [],
        });

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

        expect(historyServiceMocks.saveSession).toHaveBeenCalledTimes(2);
        expect(historyServiceMocks.setLastActiveSessionId).toHaveBeenCalledWith('branch-id');
        expect(handleLoadSession).toHaveBeenCalledWith('branch-id');

        const currentSession = historyServiceMocks.saveSession.mock.calls[0][0] as { id: string; modelId: string };
        const branchedSession = historyServiceMocks.saveSession.mock.calls[1][0] as { id: string; messages: Array<{ content?: string }> };
        expect(currentSession.id).toBe('s1');
        expect(currentSession.modelId).toBe('m1');
        expect(branchedSession.id).toBe('branch-id');
        expect(branchedSession.messages).toHaveLength(1);
        expect(branchedSession.messages[0].content).toBe('a');
    });

    it('does not branch when index is outside history bounds', () => {
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
            result.current.handleBranchConversation(9);
        });

        expect(historyServiceMocks.saveSession).not.toHaveBeenCalled();
        expect(historyServiceMocks.setLastActiveSessionId).not.toHaveBeenCalled();
        expect(handleLoadSession).not.toHaveBeenCalled();
    });
});
