import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { ChatMessage, ChatSession } from '../../shared/types';
import { HistoryService } from '../services/history';
import { crashRecoveryService } from '../services/crashRecovery';
import {
    buildHistoryResetPatch,
    buildLazySessionLoadPatch,
    buildMessageLoadPatch,
    buildSavedSessionsPatch,
    buildSessionReloadSignature,
    collectMessageIndicesToLoad,
    shouldSkipSessionReload,
} from '../lib/chatStateGuards';
import { SelectedTokenContextLike } from './useChatMessageMutations';

interface UseChatSessionManagerParams {
    sessionId: string;
    currentModel: string;
    setSessionId: Dispatch<SetStateAction<string>>;
    setSavedSessions: Dispatch<SetStateAction<ChatSession[]>>;
    setShowHistory: Dispatch<SetStateAction<boolean>>;
    setInput: Dispatch<SetStateAction<string>>;
    setCurrentModel: Dispatch<SetStateAction<string>>;
    setExpertMode: Dispatch<SetStateAction<string | null>>;
    setThinkingEnabled: Dispatch<SetStateAction<boolean>>;
    setSystemPrompt: Dispatch<SetStateAction<string>>;
    setTemperature: Dispatch<SetStateAction<number>>;
    setTopP: Dispatch<SetStateAction<number>>;
    setMaxTokens: Dispatch<SetStateAction<number>>;
    setBatchSize: Dispatch<SetStateAction<number>>;
    setSelectedToken: Dispatch<SetStateAction<SelectedTokenContextLike | null>>;
    applyHistoryStatePatch: (patch: {
        nextHistory: ChatMessage[];
        nextFullMessageCache: Map<number, ChatMessage>;
        nextLoadedMessageIndices: Set<number>;
    }) => void;
    historyRef: MutableRefObject<ChatMessage[]>;
    fullMessageCacheRef: MutableRefObject<Map<number, ChatMessage>>;
    loadedMessageIndicesRef: MutableRefObject<Set<number>>;
    selectedTokenRef: MutableRefObject<SelectedTokenContextLike | null>;
    loadedSessionIdRef: MutableRefObject<string | null>;
    loadedSessionMessagesRef: MutableRefObject<ChatMessage[]>;
    loadedSessionSignatureRef: MutableRefObject<string>;
    lastSidebarMetadataSignatureRef: MutableRefObject<string>;
    logComplianceEvent: (event: Record<string, unknown>) => void;
}

export const useChatSessionManager = ({
    sessionId,
    currentModel,
    setSessionId,
    setSavedSessions,
    setShowHistory,
    setInput,
    setCurrentModel,
    setExpertMode,
    setThinkingEnabled,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setMaxTokens,
    setBatchSize,
    setSelectedToken,
    applyHistoryStatePatch,
    historyRef,
    fullMessageCacheRef,
    loadedMessageIndicesRef,
    selectedTokenRef,
    loadedSessionIdRef,
    loadedSessionMessagesRef,
    loadedSessionSignatureRef,
    lastSidebarMetadataSignatureRef,
    logComplianceEvent,
}: UseChatSessionManagerParams) => {
    const createNewSession = useCallback(() => {
        const newSession = HistoryService.createNewSession(currentModel || 'local-lmstudio');
        const resetPatch = buildHistoryResetPatch([]);
        lastSidebarMetadataSignatureRef.current = '';
        setSessionId(newSession.id);
        loadedSessionIdRef.current = newSession.id;
        loadedSessionMessagesRef.current = [];
        loadedSessionSignatureRef.current = buildSessionReloadSignature(newSession.id, newSession.lastModified);
        applyHistoryStatePatch(resetPatch);
        selectedTokenRef.current = null;
        setSelectedToken(null);
        HistoryService.setLastActiveSessionId(newSession.id);
        HistoryService.saveSession(newSession);
        setSavedSessions((previousSessions) => {
            const metadata: ChatSession = {
                ...newSession,
                messages: [],
            };
            const patch = buildSavedSessionsPatch(previousSessions, { type: 'upsertTop', metadata });
            return patch ?? previousSessions;
        });
        setShowHistory(false);

        const draft = crashRecoveryService.getDraft(newSession.id);
        if (draft) {
            setInput(draft);
        } else {
            setInput('');
        }

        logComplianceEvent({
            category: 'chat.session',
            action: 'created',
            result: 'success',
            resourceType: 'session',
            resourceId: newSession.id,
            details: {
                modelId: newSession.modelId,
            },
        });
    }, [
        applyHistoryStatePatch,
        currentModel,
        lastSidebarMetadataSignatureRef,
        loadedSessionIdRef,
        loadedSessionMessagesRef,
        loadedSessionSignatureRef,
        logComplianceEvent,
        selectedTokenRef,
        setInput,
        setSavedSessions,
        setSelectedToken,
        setSessionId,
        setShowHistory,
    ]);

    const loadSession = useCallback((id: string) => {
        const session = HistoryService.getSession(id);
        if (!session) {
            return;
        }

        if (shouldSkipSessionReload({
            activeSessionId: sessionId,
            loadedSessionSignature: loadedSessionSignatureRef.current,
            nextSessionId: session.id,
            nextSessionLastModified: session.lastModified,
        })) {
            setShowHistory(false);
            return;
        }

        lastSidebarMetadataSignatureRef.current = '';
        setSessionId(session.id);

        const initialLoadCount = 50;
        const allMessages = session.messages;
        const messageCount = allMessages.length;
        loadedSessionIdRef.current = session.id;
        loadedSessionMessagesRef.current = allMessages;
        loadedSessionSignatureRef.current = buildSessionReloadSignature(session.id, session.lastModified);
        const lazySessionPatch = buildLazySessionLoadPatch({
            allMessages,
            initialLoadCount,
        });
        applyHistoryStatePatch(lazySessionPatch);

        if (session.modelId) {
            setCurrentModel(session.modelId);
            localStorage.setItem('app_last_model', session.modelId);
        }
        if (session.expertMode !== undefined) setExpertMode(session.expertMode);
        if (session.thinkingEnabled !== undefined) setThinkingEnabled(session.thinkingEnabled);
        if (session.systemPrompt !== undefined) setSystemPrompt(session.systemPrompt);
        if (session.temperature !== undefined) setTemperature(session.temperature);
        if (session.topP !== undefined) setTopP(session.topP);
        if (session.maxTokens !== undefined) setMaxTokens(session.maxTokens);
        if (session.batchSize !== undefined) setBatchSize(session.batchSize);
        HistoryService.setLastActiveSessionId(session.id);
        selectedTokenRef.current = null;
        setSelectedToken(null);
        setShowHistory(false);

        const draft = crashRecoveryService.getDraft(session.id);
        if (draft) {
            setInput(draft);
        } else {
            setInput('');
        }

        logComplianceEvent({
            category: 'chat.session',
            action: 'loaded',
            result: 'success',
            resourceType: 'session',
            resourceId: session.id,
            details: {
                messageCount,
                modelId: session.modelId,
            },
        });
    }, [
        applyHistoryStatePatch,
        lastSidebarMetadataSignatureRef,
        loadedSessionIdRef,
        loadedSessionMessagesRef,
        loadedSessionSignatureRef,
        logComplianceEvent,
        selectedTokenRef,
        sessionId,
        setBatchSize,
        setCurrentModel,
        setExpertMode,
        setInput,
        setMaxTokens,
        setSelectedToken,
        setSessionId,
        setShowHistory,
        setSystemPrompt,
        setTemperature,
        setThinkingEnabled,
        setTopP,
    ]);

    const deleteSession = useCallback((id: string) => {
        lastSidebarMetadataSignatureRef.current = '';
        HistoryService.deleteSession(id);
        setSavedSessions((previousSessions) => {
            const patch = buildSavedSessionsPatch(previousSessions, { type: 'removeById', id });
            return patch ?? previousSessions;
        });
        if (id === sessionId) createNewSession();
        logComplianceEvent({
            category: 'chat.session',
            action: 'deleted',
            result: 'success',
            resourceType: 'session',
            resourceId: id,
            details: {},
        });
    }, [createNewSession, lastSidebarMetadataSignatureRef, logComplianceEvent, sessionId, setSavedSessions]);

    const resolveLazyLoadSourceMessages = useCallback((): ChatMessage[] => {
        if (sessionId && loadedSessionIdRef.current === sessionId && loadedSessionMessagesRef.current.length > 0) {
            return loadedSessionMessagesRef.current;
        }

        if (sessionId) {
            const session = HistoryService.getSession(sessionId);
            if (session && session.messages.length > 0) {
                loadedSessionIdRef.current = sessionId;
                loadedSessionMessagesRef.current = session.messages;
                return session.messages;
            }
        }

        return historyRef.current;
    }, [historyRef, loadedSessionIdRef, loadedSessionMessagesRef, sessionId]);

    const loadMessageContent = useCallback((indices: number[]) => {
        const allMessages = resolveLazyLoadSourceMessages();
        const patch = buildMessageLoadPatch(
            allMessages,
            loadedMessageIndicesRef.current,
            fullMessageCacheRef.current,
            indices
        );
        if (!patch) {
            return;
        }

        applyHistoryStatePatch({
            nextHistory: historyRef.current,
            nextFullMessageCache: patch.nextFullMessageCache,
            nextLoadedMessageIndices: patch.nextLoadedMessageIndices,
        });
    }, [applyHistoryStatePatch, fullMessageCacheRef, historyRef, loadedMessageIndicesRef, resolveLazyLoadSourceMessages]);

    const loadMessageRange = useCallback((startIndex: number, endIndex: number) => {
        const allMessages = resolveLazyLoadSourceMessages();
        const indicesToLoad = collectMessageIndicesToLoad(
            startIndex,
            endIndex,
            allMessages.length,
            loadedMessageIndicesRef.current
        );
        if (indicesToLoad.length > 0) {
            loadMessageContent(indicesToLoad);
        }
    }, [loadMessageContent, loadedMessageIndicesRef, resolveLazyLoadSourceMessages]);

    return {
        createNewSession,
        loadSession,
        deleteSession,
        loadMessageRange,
    };
};
