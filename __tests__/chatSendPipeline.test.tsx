/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatSendPipeline } from '../src/renderer/hooks/useChatSendPipeline';

const createSetStateMock = <T,>() =>
    (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<T>>;

describe('useChatSendPipeline', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('processes variables, appends context summary, then sends with deferred state update', async () => {
        const setInput = createSetStateMock<string>();
        const sendMessage = jest.fn();
        const beginPerfBenchmark = jest.fn();
        const buildContextSendOptions = jest.fn((text: string) => ({ text }));

        const loadPromptVariableService = jest.fn().mockResolvedValue({
            hasVariables: () => true,
            processText: async () => 'Hello Bob',
            getUserName: () => 'Bob',
        });

        const loadProjectContextService = jest.fn().mockResolvedValue({
            getContextSummary: () => '\n[CTX] summary',
        });

        const { result } = renderHook(() => useChatSendPipeline({
            input: 'Hello {{name}}',
            setInput,
            projectContext: { enabled: true },
            includeContextInMessages: true,
            sendMessage,
            currentModel: 'm1',
            availableModels: [{ id: 'm1', name: 'Model One' }],
            sessionId: 'session-1',
            savedSessions: [{ id: 'session-1', title: 'Session 1' }],
            historyLength: 2,
            buildContextSendOptions,
            beginPerfBenchmark,
            loadPromptVariableService,
            loadProjectContextService,
        }));

        await act(async () => {
            await result.current.sendMessageWithContext();
        });

        act(() => {
            jest.runAllTimers();
        });

        expect(setInput).toHaveBeenCalledWith('Hello Bob\n[CTX] summary');
        expect(buildContextSendOptions).toHaveBeenCalledWith('Hello Bob\n[CTX] summary');
        expect(beginPerfBenchmark).toHaveBeenCalledWith('Hello Bob\n[CTX] summary');
        expect(sendMessage).toHaveBeenCalledWith({ text: 'Hello Bob\n[CTX] summary' });
    });
});
