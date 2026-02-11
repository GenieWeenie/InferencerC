import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from 'react';
import { ChatMessage, ChatSession } from '../../shared/types';
import { HistoryService } from '../services/history';
import { buildSavedSessionsPatch } from '../lib/chatStateGuards';

interface UseChatSessionPersistenceParams {
    history: ChatMessage[];
    sessionId: string;
    currentModel: string;
    expertMode: string | null;
    thinkingEnabled: boolean;
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    batchSize: number;
    loadedMessageIndices: Set<number>;
    fullMessageCache: Map<number, ChatMessage>;
    setSavedSessions: Dispatch<SetStateAction<ChatSession[]>>;
    loadedSessionIdRef: MutableRefObject<string | null>;
    loadedSessionMessagesRef: MutableRefObject<ChatMessage[]>;
    lastSidebarMetadataSignatureRef: MutableRefObject<string>;
    battleMode: boolean;
    secondaryModel: string;
    autoRouting: boolean;
    responseFormat: 'text' | 'json_object';
    input: string;
    prefill: string | null;
    enabledTools: Set<string>;
}

export const useChatSessionPersistence = ({
    history,
    sessionId,
    currentModel,
    expertMode,
    thinkingEnabled,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    batchSize,
    loadedMessageIndices,
    fullMessageCache,
    setSavedSessions,
    loadedSessionIdRef,
    loadedSessionMessagesRef,
    lastSidebarMetadataSignatureRef,
    battleMode,
    secondaryModel,
    autoRouting,
    responseFormat,
    input,
    prefill,
    enabledTools,
}: UseChatSessionPersistenceParams) => {
    useEffect(() => {
        if (!sessionId || !currentModel) return;

        const timer = setTimeout(() => {
            const canPersistCurrentHistoryDirectly = loadedMessageIndices.size >= history.length;
            const needsSessionFallback = !canPersistCurrentHistoryDirectly;
            const existingSessionMessages = needsSessionFallback
                ? (
                    loadedSessionIdRef.current === sessionId
                        ? loadedSessionMessagesRef.current
                        : (HistoryService.getSession(sessionId)?.messages ?? [])
                )
                : [];
            const persistedAt = Date.now();
            const persistedTitle = history.length > 0
                ? (history[0].content.slice(0, 30) + (history[0].content.length > 30 ? '...' : ''))
                : 'New Chat';
            const messagesToSave = canPersistCurrentHistoryDirectly
                ? history
                : history.map((message, index) => {
                    if (loadedMessageIndices.has(index) && fullMessageCache.has(index)) {
                        return fullMessageCache.get(index)!;
                    }
                    if (existingSessionMessages[index]) {
                        return existingSessionMessages[index];
                    }
                    return message;
                });

            HistoryService.saveSession({
                id: sessionId,
                title: persistedTitle,
                lastModified: persistedAt,
                modelId: currentModel,
                messages: messagesToSave,
                expertMode,
                thinkingEnabled,
                systemPrompt,
                temperature,
                topP,
                maxTokens,
                batchSize,
            });
            loadedSessionIdRef.current = sessionId;
            loadedSessionMessagesRef.current = messagesToSave;

            const sidebarMetadataSignature = JSON.stringify({
                sessionId,
                persistedTitle,
                currentModel,
                expertMode: expertMode ?? null,
                thinkingEnabled: Boolean(thinkingEnabled),
                systemPrompt,
                temperature,
                topP,
                maxTokens,
                batchSize,
                messageCount: messagesToSave.length,
            });
            if (lastSidebarMetadataSignatureRef.current === sidebarMetadataSignature) {
                return;
            }
            lastSidebarMetadataSignatureRef.current = sidebarMetadataSignature;

            setSavedSessions((prev) => {
                const metadata: ChatSession = {
                    id: sessionId,
                    title: persistedTitle,
                    lastModified: persistedAt,
                    modelId: currentModel,
                    messages: [],
                    expertMode,
                    thinkingEnabled,
                    systemPrompt,
                    temperature,
                    topP,
                    maxTokens,
                    batchSize,
                };
                const patch = buildSavedSessionsPatch(prev, { type: 'upsertTop', metadata });
                return patch ?? prev;
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [history, sessionId, currentModel, expertMode, thinkingEnabled, loadedMessageIndices, fullMessageCache, setSavedSessions, loadedSessionIdRef, loadedSessionMessagesRef, lastSidebarMetadataSignatureRef, systemPrompt, temperature, topP, maxTokens, batchSize]);

    useEffect(() => {
        if (!sessionId) return;

        const saveRecoveryState = () => {
            try {
                const recoveryState = {
                    timestamp: Date.now(),
                    sessionId,
                    history,
                    currentModel,
                    systemPrompt,
                    temperature,
                    topP,
                    maxTokens,
                    batchSize,
                    expertMode,
                    thinkingEnabled,
                    battleMode,
                    secondaryModel,
                    autoRouting,
                    responseFormat,
                    input,
                    prefill,
                    enabledTools: Array.from(enabledTools),
                };
                localStorage.setItem('app_recovery_state', JSON.stringify(recoveryState));
            } catch (error) {
                console.error('Failed to save recovery state', error);
            }
        };

        saveRecoveryState();
        const interval = setInterval(saveRecoveryState, 30000);
        return () => clearInterval(interval);
    }, [
        sessionId,
        history,
        currentModel,
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        batchSize,
        expertMode,
        thinkingEnabled,
        battleMode,
        secondaryModel,
        autoRouting,
        responseFormat,
        input,
        prefill,
        enabledTools,
    ]);
};
