import { MutableRefObject, useCallback } from 'react';
import { toast } from 'sonner';
import { ChatMessage, Message, ToolCall } from '../../shared/types';
import { HistoryService } from '../services/history';
import { AVAILABLE_TOOLS } from '../lib/tools';
import { simulateLogprobs } from '../lib/chatUtils';
import type { ChatApiLogCallback } from '../lib/chatApiLogTypes';
import {
    applyChatStreamChunk,
    consumeChatStreamContent,
    createChatStreamParseState,
    flushChatStreamToolCalls,
} from '../lib/chatStreamParser';
import {
    buildChatCompletionRequest,
    mapChatRequestErrorMessage,
} from '../lib/chatStreamingRequest';

interface UseChatStreamingParams {
    onApiLog?: ChatApiLogCallback;
    openRouterApiKey: string | null;
    temperature: number;
    topP: number;
    maxTokens: number;
    batchSize: number;
    streamingEnabled: boolean;
    responseFormat: 'text' | 'json_object';
    enabledTools: Set<string>;
    prefill: string | null;
    sessionId: string;
    battleMode: boolean;
    loadedMessageIndices: Set<number>;
    fullMessageCache: Map<number, ChatMessage>;
    savedSessions: Array<{ id: string; title: string }>;
    loadedSessionIdRef: MutableRefObject<string | null>;
    loadedSessionMessagesRef: MutableRefObject<ChatMessage[]>;
    reportPerformanceLatency: (latencyMs: number) => void;
    updateMessageContent: (
        index: number,
        content: string,
        isLoading: boolean,
        logprobs?: ReturnType<typeof simulateLogprobs>,
        generationTime?: number,
        toolCalls?: ToolCall[],
    ) => void;
    trackAnalyticsMessage: (session: string, model: string, tokenEstimate: number) => void;
    logComplianceEvent: (event: Record<string, unknown>) => void;
    triggerConversationCompleteWebhooks: (payload: {
        sessionId: string;
        sessionTitle: string;
        modelId: string;
        messageCount: number;
        messages: ChatMessage[];
        metadata: {
            temperature?: number;
            topP?: number;
            maxTokens?: number;
        };
    }) => void;
}

const deriveSessionTitleFromMessages = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(
        (message) => message.role === 'user' && typeof message.content === 'string' && message.content.trim().length > 0
    );
    if (!firstUserMessage || typeof firstUserMessage.content !== 'string') {
        return 'New Chat';
    }
    const content = firstUserMessage.content;
    return content.slice(0, 30) + (content.length > 30 ? '...' : '');
};

export const useChatStreaming = ({
    onApiLog,
    openRouterApiKey,
    temperature,
    topP,
    maxTokens,
    batchSize,
    streamingEnabled,
    responseFormat,
    enabledTools,
    prefill,
    sessionId,
    battleMode,
    loadedMessageIndices,
    fullMessageCache,
    savedSessions,
    loadedSessionIdRef,
    loadedSessionMessagesRef,
    reportPerformanceLatency,
    updateMessageContent,
    trackAnalyticsMessage,
    logComplianceEvent,
    triggerConversationCompleteWebhooks,
}: UseChatStreamingParams) => {
    const streamResponse = useCallback(async (
        modelId: string,
        messages: Message[],
        targetIndex: number,
        signal: AbortSignal,
        labelPrefix: string = '',
        webhookHistorySnapshot: ChatMessage[] | null = null,
    ) => {
        const startTime = Date.now();
        const logId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        let finalToolCalls: ToolCall[] | undefined;

        try {
            const { url, headers, actualModelId, requestBody } = buildChatCompletionRequest({
                modelId,
                openRouterApiKey,
                messages,
                temperature,
                topP,
                maxTokens,
                batchSize,
                streamingEnabled,
                responseFormat,
                enabledTools,
                availableTools: AVAILABLE_TOOLS,
            });

            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'request',
                    model: actualModelId,
                    request: requestBody,
                });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                signal,
                body: JSON.stringify(requestBody),
            });

            reportPerformanceLatency(Date.now() - startTime);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            let fullContent = labelPrefix ? `**${labelPrefix}**\n\n` : (prefill || '');

            if (streamingEnabled) {
                if (!response.body) {
                    throw new Error('No response body');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let lastUpdate = Date.now();
                const parserState = createChatStreamParseState();
                let cachedToolCalls: ToolCall[] = [];

                while (!done) {
                    const { value, done: isDone } = await reader.read();
                    done = isDone;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        applyChatStreamChunk(parserState, chunk, isDone);
                    }

                    const now = Date.now();
                    const shouldUpdate = (
                        done
                        || parserState.contentBuffer.length > 50
                        || (parserState.toolCallsDirty && (now - lastUpdate > 100))
                        || ((now - lastUpdate > 100) && parserState.contentBuffer.length > 0)
                    );
                    if (!shouldUpdate) {
                        continue;
                    }

                    const flushedToolCalls = flushChatStreamToolCalls(parserState);
                    if (flushedToolCalls) {
                        cachedToolCalls = flushedToolCalls;
                    }
                    fullContent += consumeChatStreamContent(parserState);
                    lastUpdate = now;
                    updateMessageContent(
                        targetIndex,
                        fullContent,
                        !done,
                        undefined,
                        undefined,
                        cachedToolCalls.length > 0 ? cachedToolCalls : undefined
                    );
                }

                const flushedToolCalls = flushChatStreamToolCalls(parserState);
                if (flushedToolCalls) {
                    cachedToolCalls = flushedToolCalls;
                }
                if (cachedToolCalls.length > 0) {
                    finalToolCalls = cachedToolCalls;
                }
            } else {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                fullContent += content;
                updateMessageContent(targetIndex, fullContent, false);
            }

            const processedLogprobs = simulateLogprobs(fullContent);
            const totalTime = Date.now() - startTime;
            updateMessageContent(targetIndex, fullContent, false, processedLogprobs, totalTime, finalToolCalls);

            const estimatedTokens = Math.ceil(fullContent.length / 4);
            trackAnalyticsMessage(sessionId, modelId, estimatedTokens);

            logComplianceEvent({
                category: 'chat.message',
                action: 'generation.completed',
                result: 'success',
                resourceType: 'session',
                resourceId: sessionId,
                details: {
                    modelId,
                    tokenEstimate: estimatedTokens,
                    battleMode,
                    streamingEnabled,
                },
            });

            let webhookMessages: ChatMessage[] | null = null;
            let webhookTitle: string | null = null;

            if (webhookHistorySnapshot) {
                const cachedSessionMessages = loadedSessionIdRef.current === sessionId
                    ? loadedSessionMessagesRef.current
                    : [];
                let missingMessages = false;

                webhookMessages = webhookHistorySnapshot.map((message, index) => {
                    if (index === targetIndex) {
                        return {
                            ...message,
                            role: 'assistant',
                            content: fullContent,
                            isLoading: false,
                            generationTime: totalTime,
                            tool_calls: finalToolCalls || message.tool_calls,
                            choices: [{
                                message: { role: 'assistant', content: fullContent },
                                index: 0,
                                logprobs: { content: processedLogprobs },
                            }],
                        } as ChatMessage;
                    }
                    if (loadedMessageIndices.has(index) && fullMessageCache.has(index)) {
                        return fullMessageCache.get(index)!;
                    }
                    if (cachedSessionMessages[index]) {
                        return cachedSessionMessages[index];
                    }
                    missingMessages = true;
                    return message;
                });

                if (!missingMessages) {
                    const savedTitle = savedSessions.find((session) => session.id === sessionId)?.title;
                    webhookTitle = savedTitle && savedTitle.trim().length > 0 && savedTitle !== 'New Chat'
                        ? savedTitle
                        : deriveSessionTitleFromMessages(webhookMessages);
                } else {
                    webhookMessages = null;
                }
            } else {
                const currentSession = HistoryService.getSession(sessionId);
                if (currentSession) {
                    webhookMessages = currentSession.messages;
                    webhookTitle = currentSession.title;
                }
            }

            if (webhookMessages) {
                loadedSessionIdRef.current = sessionId;
                loadedSessionMessagesRef.current = webhookMessages;
                triggerConversationCompleteWebhooks({
                    sessionId,
                    sessionTitle: webhookTitle || 'New Chat',
                    modelId,
                    messageCount: webhookMessages.length,
                    messages: webhookMessages,
                    metadata: {
                        temperature,
                        topP,
                        maxTokens,
                    },
                });
            }

            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'response',
                    model: actualModelId,
                    response: {
                        content: fullContent,
                        finish_reason: 'stop',
                    },
                    duration: totalTime,
                });
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            const originalErrorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorMessage = mapChatRequestErrorMessage(modelId, originalErrorMessage);

            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'error',
                    model: modelId,
                    error: errorMessage,
                    duration: Date.now() - startTime,
                });
            }

            updateMessageContent(targetIndex, `Error: ${errorMessage}`, false);
            toast.error(errorMessage);
            logComplianceEvent({
                category: 'chat.message',
                action: 'generation.failed',
                result: 'failure',
                resourceType: 'session',
                resourceId: sessionId,
                details: {
                    modelId,
                    error: errorMessage,
                },
            });
        }
    }, [
        battleMode,
        batchSize,
        enabledTools,
        fullMessageCache,
        loadedMessageIndices,
        loadedSessionIdRef,
        loadedSessionMessagesRef,
        logComplianceEvent,
        maxTokens,
        onApiLog,
        openRouterApiKey,
        prefill,
        reportPerformanceLatency,
        responseFormat,
        savedSessions,
        sessionId,
        streamingEnabled,
        temperature,
        topP,
        trackAnalyticsMessage,
        triggerConversationCompleteWebhooks,
        updateMessageContent,
    ]);

    return {
        streamResponse,
    };
};
