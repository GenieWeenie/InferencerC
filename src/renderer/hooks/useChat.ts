import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { TokenLogprob, Model, ChatMessage, ChatSession } from '../../shared/types';
import { HistoryService } from '../services/history';
import {
    buildOutgoingMessagePatch,
    buildSavedSessionsPatch,
    buildStopGenerationPatch,
} from '../lib/chatStateGuards';
import { useChatBootstrap } from './useChatBootstrap';
import { useChatModelDiscovery } from './useChatModelDiscovery';
import { useChatSessionPersistence } from './useChatSessionPersistence';
import { useChatMessageMutations } from './useChatMessageMutations';
import { useChatSendOrchestrator } from './useChatSendOrchestrator';
import { useChatSessionManager } from './useChatSessionManager';
import { useChatStreaming } from './useChatStreaming';
import { useChatAttachmentState } from './useChatAttachmentState';
import { crashRecoveryService } from '../services/crashRecovery';
import { performanceService } from '../services/performance';
import { useChatExpertMode } from './useChatExpertMode';
import { useChatWebFetch } from './useChatWebFetch';
import {
    hasLikelyOpenRouterCredential,
    loadAnalyticsService,
    loadCredentialService,
    loadEnterpriseComplianceService,
    loadWebhookService,
} from '../lib/useChatLazyServices';

export interface ApiLogCallback {
    (log: {
        id: string;
        timestamp: number;
        type: 'request' | 'response' | 'error';
        model: string;
        request?: any;
        response?: any;
        error?: string;
        duration?: number;
    }): void;
}

export interface SelectedTokenContext {
    logprob: TokenLogprob;
    messageIndex: number;
    tokenIndex: number;
}

export const useChat = (onApiLog?: ApiLogCallback, streamingEnabled: boolean = true) => {
    const didBootstrapSessionsRef = useRef(false);
    const didApplyInitialModelSelectionRef = useRef(false);
    const loadedSessionIdRef = useRef<string | null>(null);
    const loadedSessionMessagesRef = useRef<ChatMessage[]>([]);
    const loadedSessionSignatureRef = useRef<string>('');
    const lastSidebarMetadataSignatureRef = useRef<string>('');

    // Logic State
    const [input, setInput] = useState('');
    const [prefill, setPrefill] = useState<string | null>(null);
    const [thinkingEnabled, setThinkingEnabled] = useState(false);
    const [expertMode, setExpertMode] = useState<string | null>(null);
    const [battleMode, setBattleMode] = useState(false);
    const [autoRouting, setAutoRouting] = useState(false);
    const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
    const [responseFormat, setResponseFormat] = useState<'text' | 'json_object'>('text');
    const [secondaryModel, setSecondaryModel] = useState<string>('');

    const [sessionId, setSessionId] = useState<string>('');

    const [history, setHistory] = useState<ChatMessage[]>([]);
    // Lazy loading state - track which messages have full content loaded
    const [loadedMessageIndices, setLoadedMessageIndices] = useState<Set<number>>(new Set());
    const [fullMessageCache, setFullMessageCache] = useState<Map<number, ChatMessage>>(new Map());
    const [selectedToken, setSelectedToken] = useState<SelectedTokenContext | null>(null);
    const [availableModels, setAvailableModels] = useState<Model[]>([]);
    const [currentModel, setCurrentModel] = useState<string>('');
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
    const [temperature, setTemperature] = useState(0.7);
    const [topP, setTopP] = useState(0.9);
    const [maxTokens, setMaxTokens] = useState(2048);
    const [batchSize, setBatchSize] = useState(1);
    const [abortControllers, setAbortControllers] = useState<AbortController[]>([]);

    // UI State
    const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);
    const [showExpertMenu, setShowExpertMenu] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{ local: 'online' | 'offline' | 'checking', remote: 'online' | 'offline' | 'checking' | 'none' }>({
        local: 'checking',
        remote: 'checking'
    });

    const [openRouterApiKey, setOpenRouterApiKey] = useState<string | null>(null);
    const historyRef = useRef<ChatMessage[]>([]);
    const loadedMessageIndicesRef = useRef<Set<number>>(new Set());
    const fullMessageCacheRef = useRef<Map<number, ChatMessage>>(new Map());
    const selectedTokenRef = useRef<SelectedTokenContext | null>(null);

    useEffect(() => {
        historyRef.current = history;
    }, [history]);

    useEffect(() => {
        loadedMessageIndicesRef.current = loadedMessageIndices;
    }, [loadedMessageIndices]);

    useEffect(() => {
        fullMessageCacheRef.current = fullMessageCache;
    }, [fullMessageCache]);

    useEffect(() => {
        selectedTokenRef.current = selectedToken;
    }, [selectedToken]);

    const applyHistoryStatePatch = useCallback((patch: {
        nextHistory: ChatMessage[];
        nextFullMessageCache: Map<number, ChatMessage>;
        nextLoadedMessageIndices: Set<number>;
    }) => {
        if (historyRef.current !== patch.nextHistory) {
            historyRef.current = patch.nextHistory;
            setHistory(patch.nextHistory);
        }
        if (fullMessageCacheRef.current !== patch.nextFullMessageCache) {
            fullMessageCacheRef.current = patch.nextFullMessageCache;
            setFullMessageCache(patch.nextFullMessageCache);
        }
        if (loadedMessageIndicesRef.current !== patch.nextLoadedMessageIndices) {
            loadedMessageIndicesRef.current = patch.nextLoadedMessageIndices;
            setLoadedMessageIndices(patch.nextLoadedMessageIndices);
        }
    }, []);

    const logComplianceEvent = useCallback((event: any) => {
        void loadEnterpriseComplianceService()
            .then((service) => service.logEvent(event))
            .catch(() => {
                // Non-blocking telemetry/compliance logging.
            });
    }, []);

    const reportPerformanceLatency = useCallback((latencyMs: number) => {
        performanceService.reportLatency(latencyMs);
    }, []);

    const trackAnalyticsMessage = useCallback((session: string, model: string, tokenEstimate: number) => {
        void loadAnalyticsService()
            .then((service) => service.trackMessage(session, model, tokenEstimate))
            .catch(() => {
                // Non-blocking analytics.
            });
    }, []);

    const triggerConversationCompleteWebhooks = useCallback((payload: {
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
    }) => {
        void loadWebhookService()
            .then((service) => service.triggerWebhooks('conversation_complete', payload))
            .catch(() => {
                // Non-blocking webhooks.
            });
    }, []);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let idleId: number | null = null;
        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const refreshOpenRouterKey = async () => {
            try {
                const credentialService = await loadCredentialService();
                const key = await credentialService.getOpenRouterApiKey();
                if (isMounted) {
                    setOpenRouterApiKey(key);
                }
            } catch (error) {
                if (isMounted) {
                    setOpenRouterApiKey(null);
                }
            }
        };

        const handleCredentialUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ key?: string }>;
            if (!customEvent.detail?.key || customEvent.detail.key === 'openRouterApiKey') {
                void refreshOpenRouterKey();
            }
        };

        if (hasLikelyOpenRouterCredential()) {
            if (idleWindow.requestIdleCallback) {
                idleId = idleWindow.requestIdleCallback(() => {
                    void refreshOpenRouterKey();
                }, { timeout: 2000 });
            } else {
                timeoutId = setTimeout(() => {
                    void refreshOpenRouterKey();
                }, 600);
            }
        } else {
            setOpenRouterApiKey(null);
        }

        window.addEventListener('credentials-updated', handleCredentialUpdate as EventListener);

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (idleId !== null && idleWindow.cancelIdleCallback) {
                idleWindow.cancelIdleCallback(idleId);
            }
            window.removeEventListener('credentials-updated', handleCredentialUpdate as EventListener);
        };
    }, []);

    const { handleExpertSelect } = useChatExpertMode({
        setExpertMode,
        setShowExpertMenu,
        setSystemPrompt,
        setTemperature,
        setTopP,
    });

    useChatModelDiscovery({
        openRouterApiKey,
        setAvailableModels,
        setCurrentModel,
        setConnectionStatus,
        didApplyInitialModelSelectionRef,
    });

    // Memory monitoring for long conversations
    useEffect(() => {
        if ((performance as any).memory) {
            const memory = (performance as any).memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
            const loadedCount = loadedMessageIndices.size;
            const totalMessages = history.length;
            const cacheSize = fullMessageCache.size;

            // Log memory stats when history size changes significantly (every 100 messages)
            if (totalMessages > 0 && totalMessages % 100 === 0) {
                console.log(`[Memory] History: ${totalMessages} messages | Loaded: ${loadedCount} | Cache: ${cacheSize} | Heap: ${usedMB}MB / ${limitMB}MB`);
            }

            // Warn if memory usage is high with large conversation
            if (totalMessages > 500 && usedMB > 1500) {
                console.warn(`[Memory] Large conversation (${totalMessages} messages) with high memory usage (${usedMB}MB)`);
            }
        }
    }, [history.length, loadedMessageIndices.size, fullMessageCache.size]);

    useChatSessionPersistence({
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
    });

    // Draft persistence - save draft message whenever input changes
    useEffect(() => {
        if (!sessionId) return;

        const timer = setTimeout(() => {
            crashRecoveryService.saveDraft(sessionId, input);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [input, sessionId]);

    const {
        replaceHistory,
        truncateHistory,
        appendMessage,
        deleteMessage,
        selectChoice,
        updateMessageContent,
        updateMessageToken,
    } = useChatMessageMutations({
        applyHistoryStatePatch,
        historyRef,
        fullMessageCacheRef,
        loadedMessageIndicesRef,
        selectedTokenRef,
        setSelectedToken,
    });

    const {
        createNewSession,
        loadSession,
        deleteSession,
        loadMessageRange,
    } = useChatSessionManager({
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
    });

    useChatBootstrap({
        didBootstrapSessionsRef,
        setSavedSessions,
        loadSession,
        createNewSession,
        availableModels,
        history,
        currentModel,
        setCurrentModel,
        maxTokens,
        setMaxTokens,
    });

    const {
        isFetchingWeb,
        showUrlInput,
        setShowUrlInput,
        urlInput,
        setUrlInput,
        executeWebFetch,
    } = useChatWebFetch({
        appendMessage,
        logComplianceEvent,
    });

    const { streamResponse } = useChatStreaming({
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
    });

    const applyStopGenerationPatch = useCallback((patch: NonNullable<ReturnType<typeof buildStopGenerationPatch>>) => {
        applyHistoryStatePatch({
            nextHistory: patch.nextHistory,
            nextFullMessageCache: patch.nextFullMessageCache,
            nextLoadedMessageIndices: loadedMessageIndicesRef.current,
        });
    }, [applyHistoryStatePatch]);

    const stopGeneration = useCallback(() => {
        abortControllers.forEach(c => c.abort());
        if (abortControllers.length > 0) {
            setAbortControllers([]);
        }
        const stopPatch = buildStopGenerationPatch(historyRef.current, fullMessageCacheRef.current);
        if (stopPatch) {
            applyStopGenerationPatch(stopPatch);
        }
        toast.info("Generation stopped.");
        logComplianceEvent({
            category: 'chat.message',
            action: 'generation.stopped',
            result: 'info',
            resourceType: 'session',
            resourceId: sessionId,
            details: {
                activeControllers: abortControllers.length,
            },
        });
    }, [abortControllers, applyStopGenerationPatch, logComplianceEvent, sessionId]);

    const {
        attachments,
        setAttachments,
        imageAttachments,
        setImageAttachments,
        addAttachment,
        removeAttachment,
        addImageAttachment,
        removeImageAttachment,
    } = useChatAttachmentState();

    const applyOutgoingPatch = useCallback((outgoingPatch: ReturnType<typeof buildOutgoingMessagePatch>) => {
        applyHistoryStatePatch(outgoingPatch);
    }, [applyHistoryStatePatch]);

    const { sendMessage } = useChatSendOrchestrator({
        input,
        setInput,
        prefill,
        setPrefill,
        attachments,
        setAttachments,
        imageAttachments,
        setImageAttachments,
        sessionId,
        currentModel,
        setCurrentModel,
        availableModels,
        systemPrompt,
        thinkingEnabled,
        autoRouting,
        battleMode,
        secondaryModel,
        setAbortControllers,
        historyRef,
        fullMessageCacheRef,
        loadedMessageIndicesRef,
        applyOutgoingPatch,
        streamResponse,
        logComplianceEvent,
        responseFormat,
    });

    const renameSession = useCallback((id: string, newTitle: string) => {
        HistoryService.renameSession(id, newTitle);
        setSavedSessions((prev) => {
            const patch = buildSavedSessionsPatch(prev, {
                type: 'updateById',
                id,
                updater: (session) => ({ ...session, title: newTitle }),
            });
            return patch ?? prev;
        });
        logComplianceEvent({
            category: 'chat.session',
            action: 'renamed',
            result: 'success',
            resourceType: 'session',
            resourceId: id,
            details: { newTitle },
        });
    }, [logComplianceEvent]);

    const togglePinSession = useCallback((id: string) => {
        HistoryService.togglePinSession(id);
        setSavedSessions((prev) => {
            const patch = buildSavedSessionsPatch(prev, {
                type: 'updateById',
                id,
                updater: (session) => ({ ...session, pinned: !Boolean(session.pinned) }),
            });
            return patch ?? prev;
        });
        logComplianceEvent({
            category: 'chat.session',
            action: 'pin_toggled',
            result: 'success',
            resourceType: 'session',
            resourceId: id,
            details: {},
        });
    }, [logComplianceEvent]);

    return {
        input, setInput,
        prefill, setPrefill,
        attachments, addAttachment, removeAttachment,
        imageAttachments, addImageAttachment, removeImageAttachment, // Vision/Image support
        thinkingEnabled, setThinkingEnabled,
        battleMode, setBattleMode,
        secondaryModel, setSecondaryModel,
        expertMode, setExpertMode,
        sessionId,
        history, setHistory,
        replaceHistory,
        truncateHistory,
        appendMessage,
        selectedToken, setSelectedToken,
        availableModels,
        currentModel, setCurrentModel,
        systemPrompt, setSystemPrompt,
        temperature, setTemperature,
        topP, setTopP,
        maxTokens, setMaxTokens,
        batchSize, setBatchSize,
        savedSessions,
        isFetchingWeb,
        showUrlInput, setShowUrlInput,
        urlInput, setUrlInput,
        showExpertMenu, setShowExpertMenu,
        showAdvanced, setShowAdvanced,
        showHistory, setShowHistory,

        handleExpertSelect,
        createNewSession,
        loadSession,
        deleteSession,
        renameSession,
        togglePinSession,
        executeWebFetch,
        deleteMessage,
        selectChoice,
        sendMessage,
        stopGeneration,
        connectionStatus,
        autoRouting, setAutoRouting,
        enabledTools, setEnabledTools,
        responseFormat, setResponseFormat,
        updateMessageToken,
        // Lazy loading support
        loadMessageRange,
        loadedMessageIndices
    };
};
