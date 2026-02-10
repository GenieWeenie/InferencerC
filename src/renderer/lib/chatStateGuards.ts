import { ChatMessage, ChatSession, Message, TokenLogprob, ToolCall } from '../../shared/types';

export const collectMessageIndicesToLoad = (
    startIndex: number,
    endIndex: number,
    totalMessages: number,
    loadedMessageIndices: Set<number>
): number[] => {
    if (totalMessages <= 0) {
        return [];
    }

    const clampedStart = Math.max(0, Math.min(startIndex, totalMessages - 1));
    const clampedEnd = Math.max(0, Math.min(endIndex, totalMessages - 1));
    if (clampedStart > clampedEnd) {
        return [];
    }

    const indicesToLoad: number[] = [];
    for (let i = clampedStart; i <= clampedEnd; i += 1) {
        if (!loadedMessageIndices.has(i)) {
            indicesToLoad.push(i);
        }
    }

    return indicesToLoad;
};

export const buildMessageLoadPatch = (
    allMessages: ChatMessage[],
    loadedMessageIndices: Set<number>,
    fullMessageCache: Map<number, ChatMessage>,
    indices: number[]
): { nextLoadedMessageIndices: Set<number>; nextFullMessageCache: Map<number, ChatMessage> } | null => {
    let nextLoadedMessageIndices: Set<number> | null = null;
    let nextFullMessageCache: Map<number, ChatMessage> | null = null;

    for (let i = 0; i < indices.length; i += 1) {
        const index = indices[i];
        if (index < 0 || index >= allMessages.length || loadedMessageIndices.has(index)) {
            continue;
        }

        if (!nextLoadedMessageIndices) {
            nextLoadedMessageIndices = new Set(loadedMessageIndices);
            nextFullMessageCache = new Map(fullMessageCache);
        }

        nextLoadedMessageIndices.add(index);
        nextFullMessageCache!.set(index, allMessages[index]);
    }

    if (!nextLoadedMessageIndices || !nextFullMessageCache) {
        return null;
    }

    return { nextLoadedMessageIndices, nextFullMessageCache };
};

export const buildDeleteMessagePatch = (
    history: ChatMessage[],
    fullMessageCache: Map<number, ChatMessage>,
    loadedMessageIndices: Set<number>,
    deleteFromIndex: number
): {
    nextHistory: ChatMessage[];
    nextFullMessageCache: Map<number, ChatMessage>;
    nextLoadedMessageIndices: Set<number>;
} | null => {
    if (deleteFromIndex < 0 || deleteFromIndex >= history.length) {
        return null;
    }

    const nextHistory = history.slice(0, deleteFromIndex);

    let nextFullMessageCache: Map<number, ChatMessage> = fullMessageCache;
    let nextLoadedMessageIndices: Set<number> = loadedMessageIndices;

    let cacheChanged = false;
    const cachePatch = new Map(fullMessageCache);
    for (let index = deleteFromIndex; index < history.length; index += 1) {
        if (cachePatch.delete(index)) {
            cacheChanged = true;
        }
    }
    if (cacheChanged) {
        nextFullMessageCache = cachePatch;
    }

    let loadedChanged = false;
    const loadedPatch = new Set(loadedMessageIndices);
    for (let index = deleteFromIndex; index < history.length; index += 1) {
        if (loadedPatch.delete(index)) {
            loadedChanged = true;
        }
    }
    if (loadedChanged) {
        nextLoadedMessageIndices = loadedPatch;
    }

    return {
        nextHistory,
        nextFullMessageCache,
        nextLoadedMessageIndices,
    };
};

export const buildMessageReplacePatch = (
    history: ChatMessage[],
    fullMessageCache: Map<number, ChatMessage>,
    messageIndex: number,
    updatedMessage: ChatMessage
): { nextHistory: ChatMessage[]; nextFullMessageCache: Map<number, ChatMessage> } | null => {
    if (messageIndex < 0 || messageIndex >= history.length) {
        return null;
    }

    const currentMessage = history[messageIndex];
    const currentCachedMessage = fullMessageCache.get(messageIndex);

    const historyChanged = currentMessage !== updatedMessage;
    const cacheChanged = currentCachedMessage !== updatedMessage;
    if (!historyChanged && !cacheChanged) {
        return null;
    }

    let nextHistory = history;
    if (historyChanged) {
        nextHistory = [...history];
        nextHistory[messageIndex] = updatedMessage;
    }

    let nextFullMessageCache = fullMessageCache;
    if (cacheChanged) {
        nextFullMessageCache = new Map(fullMessageCache);
        nextFullMessageCache.set(messageIndex, updatedMessage);
    }

    return {
        nextHistory,
        nextFullMessageCache,
    };
};

const areTopLogprobsEqual = (a?: TokenLogprob['top_logprobs'], b?: TokenLogprob['top_logprobs']): boolean => {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
        if (
            a[i].token !== b[i].token ||
            a[i].logprob !== b[i].logprob
        ) {
            return false;
        }
    }

    return true;
};

const areTokenLogprobsEqual = (a: TokenLogprob[], b: TokenLogprob[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
        if (
            a[i].token !== b[i].token ||
            a[i].logprob !== b[i].logprob ||
            !areTopLogprobsEqual(a[i].top_logprobs, b[i].top_logprobs)
        ) {
            return false;
        }
    }

    return true;
};

export const areToolCallsEquivalent = (a?: ToolCall[], b?: ToolCall[]): boolean => {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
        if (
            a[i].id !== b[i].id ||
            a[i].type !== b[i].type ||
            a[i].function.name !== b[i].function.name ||
            a[i].function.arguments !== b[i].function.arguments
        ) {
            return false;
        }
    }

    return true;
};

interface BuildUpdatedMessageContentInput {
    existing: ChatMessage;
    content: string;
    isLoading: boolean;
    generationTime?: number;
    toolCalls?: ToolCall[];
    logprobs?: TokenLogprob[];
}

export const buildUpdatedMessageContent = ({
    existing,
    content,
    isLoading,
    generationTime,
    toolCalls,
    logprobs,
}: BuildUpdatedMessageContentInput): ChatMessage | null => {
    const nextGenerationTime = generationTime !== undefined ? generationTime : existing.generationTime;

    const nextToolCalls = toolCalls
        ? (areToolCallsEquivalent(toolCalls, existing.tool_calls) ? existing.tool_calls : toolCalls)
        : existing.tool_calls;

    let nextChoices = existing.choices;
    if (logprobs) {
        const existingLogprobs = existing.choices?.[0]?.logprobs?.content;
        const existingChoiceContent = existing.choices?.[0]?.message?.content;
        const canReuseExistingChoices = Boolean(
            existingLogprobs &&
            existingChoiceContent === content &&
            areTokenLogprobsEqual(existingLogprobs, logprobs)
        );

        nextChoices = canReuseExistingChoices
            ? existing.choices
            : [{
                message: { role: 'assistant' as const, content },
                index: 0,
                logprobs: { content: logprobs },
            }];
    }

    const hasChanges = !(
        existing.content === content &&
        existing.isLoading === isLoading &&
        existing.generationTime === nextGenerationTime &&
        existing.tool_calls === nextToolCalls &&
        existing.choices === nextChoices
    );

    if (!hasChanges) {
        return null;
    }

    return {
        ...existing,
        content,
        isLoading,
        generationTime: nextGenerationTime,
        tool_calls: nextToolCalls,
        choices: nextChoices,
    };
};

export const buildChoiceSelectionUpdate = (
    existing: ChatMessage,
    choiceIndex: number
): ChatMessage | null => {
    if (!existing.choices || !existing.choices[choiceIndex]) {
        return null;
    }

    const selectedChoice = existing.choices[choiceIndex];
    const nextContent = selectedChoice.message.content;
    const currentSelectedIndex = existing.selectedChoiceIndex || 0;

    const hasChanges = !(
        currentSelectedIndex === choiceIndex &&
        existing.content === nextContent
    );

    if (!hasChanges) {
        return null;
    }

    return {
        ...existing,
        selectedChoiceIndex: choiceIndex,
        content: nextContent,
    };
};

export const buildTokenEditUpdate = (
    existing: ChatMessage,
    tokenIndex: number,
    newToken: string
): { updatedMessage: ChatMessage; updatedToken: TokenLogprob } | null => {
    const currentChoice = existing.choices?.[0];
    const currentLogprobs = currentChoice?.logprobs?.content;
    if (!currentChoice || !currentLogprobs || !currentLogprobs[tokenIndex]) {
        return null;
    }

    if (currentLogprobs[tokenIndex].token === newToken) {
        return null;
    }

    const nextLogprobs = [...currentLogprobs];
    nextLogprobs[tokenIndex] = { ...nextLogprobs[tokenIndex], token: newToken };
    const nextContent = nextLogprobs.map((lp) => lp.token).join('');

    const updatedMessage: ChatMessage = {
        ...existing,
        content: nextContent,
        choices: [{
            ...currentChoice,
            message: { ...currentChoice.message, content: nextContent },
            logprobs: { content: nextLogprobs },
        }],
    };

    return {
        updatedMessage,
        updatedToken: nextLogprobs[tokenIndex],
    };
};

const STOPPED_SUFFIX = ' [Stopped]';

export const buildStopGenerationPatch = (
    history: ChatMessage[],
    fullMessageCache: Map<number, ChatMessage>
): { nextHistory: ChatMessage[]; nextFullMessageCache: Map<number, ChatMessage> } | null => {
    let nextHistory: ChatMessage[] | null = null;
    let nextFullMessageCache: Map<number, ChatMessage> | null = null;

    for (let index = 0; index < history.length; index += 1) {
        const message = history[index];
        if (!message?.isLoading) {
            continue;
        }

        if (!nextHistory) {
            nextHistory = [...history];
            nextFullMessageCache = new Map(fullMessageCache);
        }

        const nextContent = message.content.endsWith(STOPPED_SUFFIX)
            ? message.content
            : `${message.content}${STOPPED_SUFFIX}`;
        const stoppedMessage: ChatMessage = {
            ...message,
            isLoading: false,
            content: nextContent,
        };

        nextHistory[index] = stoppedMessage;
        nextFullMessageCache!.set(index, stoppedMessage);
    }

    if (!nextHistory || !nextFullMessageCache) {
        return null;
    }

    return {
        nextHistory,
        nextFullMessageCache,
    };
};

interface BuildOutgoingMessagePatchInput {
    history: ChatMessage[];
    fullMessageCache: Map<number, ChatMessage>;
    loadedMessageIndices: Set<number>;
    userMessage: ChatMessage;
    assistantMessages: ChatMessage[];
}

export const buildOutgoingMessagePatch = ({
    history,
    fullMessageCache,
    loadedMessageIndices,
    userMessage,
    assistantMessages,
}: BuildOutgoingMessagePatchInput): {
    nextHistory: ChatMessage[];
    nextFullMessageCache: Map<number, ChatMessage>;
    nextLoadedMessageIndices: Set<number>;
    userMessageIndex: number;
    assistantStartIndex: number;
} => {
    const nextHistory = [...history, userMessage, ...assistantMessages];
    const nextFullMessageCache = new Map(fullMessageCache);
    const nextLoadedMessageIndices = new Set(loadedMessageIndices);

    const userMessageIndex = history.length;
    const assistantStartIndex = userMessageIndex + 1;

    for (let index = userMessageIndex; index < nextHistory.length; index += 1) {
        nextFullMessageCache.set(index, nextHistory[index]);
        nextLoadedMessageIndices.add(index);
    }

    return {
        nextHistory,
        nextFullMessageCache,
        nextLoadedMessageIndices,
        userMessageIndex,
        assistantStartIndex,
    };
};

interface BuildContextMessagesPatchInput {
    history: ChatMessage[];
    excludedIndices: Set<number>;
    finalSystemPrompt: string;
    contextSummary?: string;
    userMessageContent: any;
}

export const buildContextMessagesPatch = ({
    history,
    excludedIndices,
    finalSystemPrompt,
    contextSummary,
    userMessageContent,
}: BuildContextMessagesPatchInput): Message[] => {
    const messages: Message[] = [{ role: 'system', content: finalSystemPrompt }];
    if (contextSummary) {
        messages.push({ role: 'system', content: contextSummary });
    }

    for (let index = 0; index < history.length; index += 1) {
        if (excludedIndices.has(index)) {
            continue;
        }
        const message = history[index];
        messages.push({ role: message.role, content: message.content });
    }

    messages.push({ role: 'user', content: userMessageContent });
    return messages;
};

interface BuildInitialLazySessionStateInput {
    allMessages: ChatMessage[];
    initialLoadCount: number;
    previewLength?: number;
}

export const buildInitialLazySessionState = ({
    allMessages,
    initialLoadCount,
    previewLength = 100,
}: BuildInitialLazySessionStateInput): {
    lightweightHistory: ChatMessage[];
    nextFullMessageCache: Map<number, ChatMessage>;
    nextLoadedMessageIndices: Set<number>;
} => {
    const nextFullMessageCache = new Map<number, ChatMessage>();
    const nextLoadedMessageIndices = new Set<number>();
    const messageCount = allMessages.length;

    if (messageCount <= initialLoadCount) {
        for (let index = 0; index < messageCount; index += 1) {
            nextFullMessageCache.set(index, allMessages[index]);
            nextLoadedMessageIndices.add(index);
        }
        return {
            lightweightHistory: allMessages,
            nextFullMessageCache,
            nextLoadedMessageIndices,
        };
    }

    const lightweightHistory = allMessages.map((message, index) => {
        const shouldLoadFull = index >= messageCount - initialLoadCount;
        if (shouldLoadFull) {
            nextFullMessageCache.set(index, message);
            nextLoadedMessageIndices.add(index);
            return message;
        }

        const previewContent = message.content.length > previewLength
            ? `${message.content.substring(0, previewLength)}...`
            : message.content;
        return {
            role: message.role,
            content: previewContent,
            isLoading: false,
        } as ChatMessage;
    });

    return {
        lightweightHistory,
        nextFullMessageCache,
        nextLoadedMessageIndices,
    };
};

const areChatSessionMetadataEqual = (a: ChatSession, b: ChatSession): boolean => {
    return (
        a.id === b.id &&
        a.title === b.title &&
        a.lastModified === b.lastModified &&
        a.modelId === b.modelId &&
        a.expertMode === b.expertMode &&
        a.thinkingEnabled === b.thinkingEnabled &&
        a.pinned === b.pinned &&
        a.systemPrompt === b.systemPrompt &&
        a.temperature === b.temperature &&
        a.topP === b.topP &&
        a.maxTokens === b.maxTokens &&
        a.batchSize === b.batchSize &&
        a.encrypted === b.encrypted &&
        a.encryptedHash === b.encryptedHash &&
        a.usesTreeStructure === b.usesTreeStructure
    );
};

type SavedSessionsPatchOperation =
    | {
        type: 'upsertTop';
        metadata: ChatSession;
    }
    | {
        type: 'updateById';
        id: string;
        updater: (session: ChatSession) => ChatSession;
    }
    | {
        type: 'removeById';
        id: string;
    };

export const buildSavedSessionsPatch = (
    sessions: ChatSession[],
    operation: SavedSessionsPatchOperation
): ChatSession[] | null => {
    if (operation.type === 'removeById') {
        const index = sessions.findIndex((session) => session.id === operation.id);
        if (index === -1) {
            return null;
        }
        return [...sessions.slice(0, index), ...sessions.slice(index + 1)];
    }

    if (operation.type === 'updateById') {
        const index = sessions.findIndex((session) => session.id === operation.id);
        if (index === -1) {
            return null;
        }
        const updatedSession = operation.updater(sessions[index]);
        if (areChatSessionMetadataEqual(updatedSession, sessions[index])) {
            return null;
        }
        const nextSessions = [...sessions];
        nextSessions[index] = updatedSession;
        return nextSessions;
    }

    const { metadata } = operation;
    const index = sessions.findIndex((session) => session.id === metadata.id);
    if (index === -1) {
        return [metadata, ...sessions];
    }

    const merged = { ...sessions[index], ...metadata };
    if (index === 0 && areChatSessionMetadataEqual(merged, sessions[0])) {
        return null;
    }

    return [merged, ...sessions.slice(0, index), ...sessions.slice(index + 1)];
};
