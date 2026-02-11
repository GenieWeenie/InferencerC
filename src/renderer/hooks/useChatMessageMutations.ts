import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { ChatMessage, TokenLogprob, ToolCall } from '../../shared/types';
import {
    buildAppendMessagePatch,
    buildChoiceSelectionUpdate,
    buildDeleteMessagePatch,
    buildHistoryResetPatch,
    buildMessageReplacePatch,
    buildTokenEditUpdate,
    buildUpdatedMessageContent,
} from '../lib/chatStateGuards';
import type { SelectedTokenContext } from '../lib/chatSelectionTypes';

export type SelectedTokenContextLike = SelectedTokenContext;

interface UseChatMessageMutationsParams {
    applyHistoryStatePatch: (patch: {
        nextHistory: ChatMessage[];
        nextFullMessageCache: Map<number, ChatMessage>;
        nextLoadedMessageIndices: Set<number>;
    }) => void;
    historyRef: MutableRefObject<ChatMessage[]>;
    fullMessageCacheRef: MutableRefObject<Map<number, ChatMessage>>;
    loadedMessageIndicesRef: MutableRefObject<Set<number>>;
    selectedTokenRef: MutableRefObject<SelectedTokenContextLike | null>;
    setSelectedToken: Dispatch<SetStateAction<SelectedTokenContextLike | null>>;
}

export const useChatMessageMutations = ({
    applyHistoryStatePatch,
    historyRef,
    fullMessageCacheRef,
    loadedMessageIndicesRef,
    selectedTokenRef,
    setSelectedToken,
}: UseChatMessageMutationsParams) => {
    const applyMessageReplacePatch = useCallback((patch: NonNullable<ReturnType<typeof buildMessageReplacePatch>>) => {
        applyHistoryStatePatch({
            nextHistory: patch.nextHistory,
            nextFullMessageCache: patch.nextFullMessageCache,
            nextLoadedMessageIndices: loadedMessageIndicesRef.current,
        });
    }, [applyHistoryStatePatch, loadedMessageIndicesRef]);

    const replaceHistory = useCallback((nextHistory: ChatMessage[]) => {
        const resetPatch = buildHistoryResetPatch(nextHistory);
        applyHistoryStatePatch(resetPatch);
        setSelectedToken((previousSelectedToken) => {
            if (!previousSelectedToken || previousSelectedToken.messageIndex < nextHistory.length) {
                return previousSelectedToken;
            }
            selectedTokenRef.current = null;
            return null;
        });
    }, [applyHistoryStatePatch, selectedTokenRef, setSelectedToken]);

    const truncateHistory = useCallback((endExclusive: number) => {
        const currentHistory = historyRef.current;
        const boundedEnd = Math.max(0, Math.min(endExclusive, currentHistory.length));
        if (boundedEnd === currentHistory.length) {
            return;
        }
        replaceHistory(currentHistory.slice(0, boundedEnd));
    }, [historyRef, replaceHistory]);

    const appendMessage = useCallback((message: ChatMessage) => {
        const appendPatch = buildAppendMessagePatch(
            historyRef.current,
            fullMessageCacheRef.current,
            loadedMessageIndicesRef.current,
            message
        );
        applyHistoryStatePatch(appendPatch);
    }, [applyHistoryStatePatch, fullMessageCacheRef, historyRef, loadedMessageIndicesRef]);

    const deleteMessage = useCallback((index: number) => {
        const patch = buildDeleteMessagePatch(
            historyRef.current,
            fullMessageCacheRef.current,
            loadedMessageIndicesRef.current,
            index
        );
        if (!patch) {
            return;
        }

        applyHistoryStatePatch(patch);
        selectedTokenRef.current = null;
        setSelectedToken(null);
    }, [applyHistoryStatePatch, fullMessageCacheRef, historyRef, loadedMessageIndicesRef, selectedTokenRef, setSelectedToken]);

    const selectChoice = useCallback((messageIndex: number, choiceIndex: number) => {
        const targetMessage = historyRef.current[messageIndex];
        if (!targetMessage) {
            return;
        }

        const updatedMessage = buildChoiceSelectionUpdate(targetMessage, choiceIndex);
        if (!updatedMessage) {
            return;
        }

        const patch = buildMessageReplacePatch(
            historyRef.current,
            fullMessageCacheRef.current,
            messageIndex,
            updatedMessage
        );
        if (!patch) {
            return;
        }

        applyMessageReplacePatch(patch);
        selectedTokenRef.current = null;
        setSelectedToken(null);
    }, [applyMessageReplacePatch, fullMessageCacheRef, historyRef, selectedTokenRef, setSelectedToken]);

    const updateMessageContent = useCallback((index: number, content: string, isLoading: boolean, logprobs?: TokenLogprob[], generationTime?: number, toolCalls?: ToolCall[]) => {
        const existing = historyRef.current[index];
        if (!existing) {
            return;
        }

        const updatedMessage = buildUpdatedMessageContent({
            existing,
            content,
            isLoading,
            logprobs,
            generationTime,
            toolCalls,
        });
        if (!updatedMessage) {
            return;
        }

        const patch = buildMessageReplacePatch(
            historyRef.current,
            fullMessageCacheRef.current,
            index,
            updatedMessage
        );
        if (!patch) {
            return;
        }

        applyMessageReplacePatch(patch);
    }, [applyMessageReplacePatch, fullMessageCacheRef, historyRef]);

    const updateMessageToken = useCallback((messageIndex: number, tokenIndex: number, newToken: string) => {
        const currentMessage = historyRef.current[messageIndex];
        if (!currentMessage) {
            return;
        }

        const tokenUpdate = buildTokenEditUpdate(currentMessage, tokenIndex, newToken);
        if (!tokenUpdate) {
            return;
        }

        const patch = buildMessageReplacePatch(
            historyRef.current,
            fullMessageCacheRef.current,
            messageIndex,
            tokenUpdate.updatedMessage
        );
        if (!patch) {
            return;
        }

        applyMessageReplacePatch(patch);
        setSelectedToken((previousSelectedToken) => {
            if (
                !previousSelectedToken
                || previousSelectedToken.messageIndex !== messageIndex
                || previousSelectedToken.tokenIndex !== tokenIndex
            ) {
                return previousSelectedToken;
            }
            const nextSelectedToken = { ...previousSelectedToken, logprob: tokenUpdate.updatedToken };
            selectedTokenRef.current = nextSelectedToken;
            return nextSelectedToken;
        });
    }, [applyMessageReplacePatch, fullMessageCacheRef, historyRef, selectedTokenRef, setSelectedToken]);

    return {
        replaceHistory,
        truncateHistory,
        appendMessage,
        deleteMessage,
        selectChoice,
        updateMessageContent,
        updateMessageToken,
    };
};
