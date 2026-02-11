import React from 'react';
import { toast } from 'sonner';
import type { ChatMessage, ChatSession } from '../../shared/types';
import { HistoryService } from '../services/history';

interface UseChatMessageActionsControllerParams {
    history: ChatMessage[];
    sessionId: string;
    currentModel: string;
    expertMode: string | null;
    thinkingEnabled: boolean;
    editedMessageContent: string;
    sendMessageWithContext: () => void | Promise<void>;
    replaceHistory: (nextHistory: ChatMessage[]) => void;
    truncateHistory: (index: number) => void;
    setEditingMessageIndex: React.Dispatch<React.SetStateAction<number | null>>;
    setEditedMessageContent: React.Dispatch<React.SetStateAction<string>>;
    handleLoadSession: (sessionId: string) => void;
}

export const useChatMessageActionsController = ({
    history,
    sessionId,
    currentModel,
    expertMode,
    thinkingEnabled,
    editedMessageContent,
    sendMessageWithContext,
    replaceHistory,
    truncateHistory,
    setEditingMessageIndex,
    setEditedMessageContent,
    handleLoadSession,
}: UseChatMessageActionsControllerParams) => {
    const resolveModelId = React.useCallback((candidate?: string) => {
        return candidate && candidate.trim() ? candidate : 'local-lmstudio';
    }, []);

    const buildFallbackSessionTitle = React.useCallback((prefix: string, timestamp: number) => {
        return `${prefix} ${new Date(timestamp).toLocaleDateString()}`;
    }, []);

    const latestMessageActionsRef = React.useRef({
        history,
        sessionId,
        currentModel,
        expertMode,
        thinkingEnabled,
        editedMessageContent,
        sendMessageWithContext,
        replaceHistory,
        truncateHistory,
    });

    React.useEffect(() => {
        latestMessageActionsRef.current = {
            history,
            sessionId,
            currentModel,
            expertMode,
            thinkingEnabled,
            editedMessageContent,
            sendMessageWithContext,
            replaceHistory,
            truncateHistory,
        };
    }, [
        history,
        sessionId,
        currentModel,
        expertMode,
        thinkingEnabled,
        editedMessageContent,
        sendMessageWithContext,
        replaceHistory,
        truncateHistory,
    ]);

    const handleEditMessage = React.useCallback((index: number) => {
        const message = latestMessageActionsRef.current.history[index];
        if (message && message.role === 'user') {
            setEditingMessageIndex(index);
            setEditedMessageContent(message.content || '');
        }
    }, [setEditedMessageContent, setEditingMessageIndex]);

    const handleSaveEdit = React.useCallback((index: number) => {
        const {
            history: currentHistory,
            editedMessageContent: editContent,
            replaceHistory: applyHistoryReplace,
        } = latestMessageActionsRef.current;

        if (editContent.trim() === '') {
            toast.error('Message cannot be empty');
            return;
        }

        if (!currentHistory[index]) {
            return;
        }

        const nextHistory = currentHistory.slice(0, index + 1);
        nextHistory[index] = {
            ...nextHistory[index],
            content: editContent,
        };
        applyHistoryReplace(nextHistory);

        setEditingMessageIndex(null);
        setEditedMessageContent('');
        toast.success('Message updated. Regenerating response...');

        setTimeout(() => {
            void latestMessageActionsRef.current.sendMessageWithContext();
        }, 100);
    }, [setEditedMessageContent, setEditingMessageIndex]);

    const handleCancelEdit = React.useCallback(() => {
        setEditingMessageIndex(null);
        setEditedMessageContent('');
    }, [setEditedMessageContent, setEditingMessageIndex]);

    const handleRegenerateResponse = React.useCallback((index: number) => {
        const {
            history: currentHistory,
            truncateHistory: applyHistoryTruncate,
        } = latestMessageActionsRef.current;

        if (index < 0 || index > currentHistory.length) {
            return;
        }

        if (index < currentHistory.length) {
            applyHistoryTruncate(index);
        }

        toast.info('Regenerating response...');
        setTimeout(() => {
            void latestMessageActionsRef.current.sendMessageWithContext();
        }, 100);
    }, []);

    const handleBranchConversation = React.useCallback((index: number) => {
        const {
            history: currentHistory,
            sessionId: currentSessionId,
            currentModel: currentModelId,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled,
        } = latestMessageActionsRef.current;

        if (index < 0 || index >= currentHistory.length) {
            return;
        }

        const now = Date.now();
        const branchHistory = currentHistory.slice(0, index + 1);
        const persistedSession = HistoryService.getSession(currentSessionId);
        const modelId = resolveModelId(currentModelId || persistedSession?.modelId);

        const currentSession: ChatSession = {
            ...(persistedSession ?? HistoryService.createNewSession(modelId)),
            id: currentSessionId,
            title: persistedSession?.title ?? buildFallbackSessionTitle('Chat', now),
            lastModified: now,
            modelId,
            messages: currentHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled,
        };

        const branchSeed = HistoryService.createNewSession(modelId);
        const branchedSession: ChatSession = {
            ...branchSeed,
            title: buildFallbackSessionTitle('Branch from', now),
            lastModified: now,
            messages: branchHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled,
        };

        try {
            HistoryService.saveSession(currentSession);
            HistoryService.saveSession(branchedSession);
            HistoryService.setLastActiveSessionId(branchedSession.id);
            handleLoadSession(branchedSession.id);
            toast.success('Conversation branched!');
        } catch {
            toast.error('Failed to branch conversation');
        }
    }, [buildFallbackSessionTitle, handleLoadSession, resolveModelId]);

    return {
        handleEditMessage,
        handleSaveEdit,
        handleCancelEdit,
        handleRegenerateResponse,
        handleBranchConversation,
    };
};
