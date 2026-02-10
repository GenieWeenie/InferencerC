import { ChatMessage, TokenLogprob, ToolCall } from '../../shared/types';

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
