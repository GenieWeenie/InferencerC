import React from 'react';
import type { ChatMessage, Model } from '../../shared/types';

interface UseChatPageEffectsParams {
    setIsLoadingSessions: React.Dispatch<React.SetStateAction<boolean>>;
    setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>;
    setSecondaryModel: React.Dispatch<React.SetStateAction<string>>;
    setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
    history: ChatMessage[];
    isLoadingMessages: boolean;
    battleMode: boolean;
    secondaryModel: string;
    availableModels: Model[];
    currentModel: string;
    isCompactViewport: boolean;
    showHistory: boolean;
    branchingEnabled: boolean;
    sessionId: string;
    input: string;
    syncTreeWithHistory: (messages: ChatMessage[]) => void;
    loadAutoCategorizationService: () => Promise<{
        categorizeConversation: (sessionId: string) => Promise<unknown> | unknown;
    }>;
    loadAutoTaggingService: () => Promise<{
        tagConversation: (sessionId: string) => Promise<unknown> | unknown;
    }>;
    loadWorkflowsService: () => Promise<{
        checkWorkflows: (message: string, history: ChatMessage[], currentModel: string) => Promise<unknown> | unknown;
    }>;
}

export const useChatPageEffects = ({
    setIsLoadingSessions,
    setIsLoadingMessages,
    setSecondaryModel,
    setShowHistory,
    history,
    isLoadingMessages,
    battleMode,
    secondaryModel,
    availableModels,
    currentModel,
    isCompactViewport,
    showHistory,
    branchingEnabled,
    sessionId,
    input,
    syncTreeWithHistory,
    loadAutoCategorizationService,
    loadAutoTaggingService,
    loadWorkflowsService,
}: UseChatPageEffectsParams) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingSessions(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [setIsLoadingSessions]);

    React.useEffect(() => {
        if (history.length > 0 && isLoadingMessages) {
            setIsLoadingMessages(false);
        }
    }, [history, isLoadingMessages, setIsLoadingMessages]);

    React.useEffect(() => {
        if (battleMode && !secondaryModel && availableModels.length > 1) {
            setSecondaryModel(availableModels.find((model) => model.id !== currentModel)?.id || availableModels[0].id);
        }
    }, [battleMode, availableModels, currentModel, secondaryModel, setSecondaryModel]);

    React.useEffect(() => {
        if (isCompactViewport && showHistory) {
            setShowHistory(false);
        }
    }, [isCompactViewport, setShowHistory, showHistory]);

    React.useEffect(() => {
        if (branchingEnabled && history.length > 0) {
            syncTreeWithHistory(history);
        }
    }, [branchingEnabled, history, syncTreeWithHistory]);

    React.useEffect(() => {
        if (history.length > 0 && sessionId) {
            if (history.length >= 3) {
                void loadAutoCategorizationService()
                    .then((service) => service.categorizeConversation(sessionId))
                    .catch(console.error);
            }

            if (history.length >= 2) {
                void loadAutoTaggingService()
                    .then((service) => service.tagConversation(sessionId))
                    .catch(console.error);
            }
        }
    }, [history.length, sessionId, loadAutoCategorizationService, loadAutoTaggingService]);

    React.useEffect(() => {
        if (history.length > 0) {
            const lastMessage = history[history.length - 1];
            if (lastMessage?.role === 'user' && lastMessage.content) {
                void loadWorkflowsService()
                    .then((service) => service.checkWorkflows(
                        lastMessage.content,
                        history,
                        currentModel
                    ))
                    .catch(console.error);
            }
        }
    }, [history, currentModel, loadWorkflowsService]);

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (input.trim() !== '' || (history.length > 0 && history[history.length - 1].isLoading)) {
                event.preventDefault();
                event.returnValue = '';
                return '';
            }
            return undefined;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [input, history]);
};
