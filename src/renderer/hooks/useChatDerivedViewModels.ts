import React from 'react';
import type { Model, ChatSession } from '../../shared/types';

interface UseChatDerivedViewModelsParams {
    availableModels: Model[];
    currentModel: string;
    savedSessions: ChatSession[];
    sessionId: string;
    isCompactViewport: boolean;
    composerOverlayHeight: number;
}

export interface ChatDerivedViewModels {
    currentModelObj: Model | undefined;
    currentModelName: string;
    currentSessionTitle: string;
    contextWindowTokens: number;
    composerBottomInset: number;
    messageListFooterHeight: number;
}

export const buildChatDerivedViewModels = ({
    availableModels,
    currentModel,
    savedSessions,
    sessionId,
    isCompactViewport,
    composerOverlayHeight,
}: UseChatDerivedViewModelsParams): ChatDerivedViewModels => {
    const currentModelObj = availableModels.find((model) => model.id === currentModel);
    const currentModelName = currentModelObj?.name || currentModel;
    const currentSessionTitle = savedSessions.find((session) => session.id === sessionId)?.title || 'New Chat';
    const contextWindowTokens = currentModelObj?.contextLength || 32768;
    const composerBottomInset = isCompactViewport ? 16 : 24;
    const messageListFooterHeight = Math.max(132, composerOverlayHeight + composerBottomInset + 16);

    return {
        currentModelObj,
        currentModelName,
        currentSessionTitle,
        contextWindowTokens,
        composerBottomInset,
        messageListFooterHeight,
    };
};

export const useChatDerivedViewModels = (params: UseChatDerivedViewModelsParams): ChatDerivedViewModels => {
    return React.useMemo(() => buildChatDerivedViewModels(params), [
        params.availableModels,
        params.currentModel,
        params.savedSessions,
        params.sessionId,
        params.isCompactViewport,
        params.composerOverlayHeight,
    ]);
};
