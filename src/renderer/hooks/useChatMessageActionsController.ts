import React from 'react';
import { toast } from 'sonner';

interface MessageLike {
    role: string;
    content?: string;
}

interface UseChatMessageActionsControllerParams {
    history: MessageLike[];
    sessionId: string;
    currentModel: string;
    expertMode: string | null;
    thinkingEnabled: boolean;
    editedMessageContent: string;
    sendMessageWithContext: () => void | Promise<void>;
    replaceHistory: (nextHistory: MessageLike[]) => void;
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

        const branchHistory = currentHistory.slice(0, index + 1);
        const newSessionId = `session-${Date.now()}`;

        const currentSession = {
            id: currentSessionId,
            title: `Chat ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModelId,
            messages: currentHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled,
        };

        const branchedSession = {
            id: newSessionId,
            title: `Branch from ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModelId,
            messages: branchHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled,
        };

        try {
            const sessions = JSON.parse(localStorage.getItem('app_chat_sessions') || '[]');
            const updatedSessions = sessions.map((session: any) =>
                session.id === currentSessionId ? currentSession : session
            );
            updatedSessions.push(branchedSession);
            localStorage.setItem('app_chat_sessions', JSON.stringify(updatedSessions));

            handleLoadSession(newSessionId);
            toast.success('Conversation branched!');
        } catch {
            toast.error('Failed to branch conversation');
        }
    }, [handleLoadSession]);

    return {
        handleEditMessage,
        handleSaveEdit,
        handleCancelEdit,
        handleRegenerateResponse,
        handleBranchConversation,
    };
};
