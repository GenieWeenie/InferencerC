/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatExternalActions } from '../src/renderer/hooks/useChatExternalActions';

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
    },
}));

const loadApiClientServiceMock = jest.fn();
jest.mock('../src/renderer/lib/chatLazyServices', () => ({
    loadApiClientService: (...args: unknown[]) => loadApiClientServiceMock(...args),
}));

describe('useChatExternalActions', () => {
    beforeEach(() => {
        loadApiClientServiceMock.mockReset();
    });

    it('executes chat completion through the api client service', async () => {
        const buildChatCompletionRequest = jest.fn().mockResolvedValue({ endpoint: '/chat' });
        const makeRequest = jest.fn().mockResolvedValue({
            status: 200,
            statusText: 'OK',
            body: {
                choices: [{ message: { content: 'assistant response' } }],
                usage: { total_tokens: 19 },
            },
        });
        loadApiClientServiceMock.mockResolvedValue({
            buildChatCompletionRequest,
            makeRequest,
        });

        const { result } = renderHook(() => useChatExternalActions({
            availableModels: [{ id: 'm1' }],
            currentModel: 'm1',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 300,
            appendMessage: jest.fn(),
            githubUrl: '',
            setGithubUrl: (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>,
            mcpAvailable: false,
            mcpTools: [],
            executeMcpTool: jest.fn(),
        }));

        let response: { content: string; tokensUsed?: number } | null = null;
        await act(async () => {
            response = await result.current.executeChatCompletion({
                prompt: 'hello',
            });
        });

        expect(response).toEqual({ content: 'assistant response', tokensUsed: 19 });
        expect(buildChatCompletionRequest).toHaveBeenCalled();
        expect(makeRequest).toHaveBeenCalled();
    });

    it('builds MCP write_file arguments and executes tool call', async () => {
        const executeMcpTool = jest.fn().mockResolvedValue({ isError: false, content: '' });

        const { result } = renderHook(() => useChatExternalActions({
            availableModels: [{ id: 'm1' }],
            currentModel: 'm1',
            temperature: 0.5,
            topP: 0.8,
            maxTokens: 256,
            appendMessage: jest.fn(),
            githubUrl: '',
            setGithubUrl: (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>,
            mcpAvailable: true,
            mcpTools: [{
                name: 'write_file',
                serverId: 'server-1',
                inputSchema: {
                    properties: {
                        path: {},
                        content: {},
                        language: {},
                    },
                },
            }],
            executeMcpTool,
        }));

        await act(async () => {
            await result.current.handleInsertToFile('const a = 1;', 'typescript', '/tmp/test.ts');
        });

        expect(executeMcpTool).toHaveBeenCalledWith(expect.objectContaining({
            name: 'write_file',
            serverId: 'server-1',
            arguments: expect.objectContaining({
                path: '/tmp/test.ts',
                content: 'const a = 1;',
                language: 'typescript',
            }),
        }));
    });
});
