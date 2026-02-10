import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ChatResponse, Message, TokenLogprob, Model, ChatMessage, ChatSession, ToolCall } from '../../shared/types';
import { HistoryService } from '../services/history';
import { simulateLogprobs, detectIntent, findBestModelForIntent } from '../lib/chatUtils';
import { AVAILABLE_TOOLS } from '../lib/tools';
import { crashRecoveryService } from '../services/crashRecovery';
import { performanceService } from '../services/performance';
import { backendHealthService } from '../services/backendHealth';

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

type AnalyticsService = typeof import('../services/analytics')['analyticsService'];
type WebhookService = typeof import('../services/webhooks')['webhookService'];
type EnterpriseComplianceService = typeof import('../services/enterpriseCompliance')['enterpriseComplianceService'];
type CredentialService = typeof import('../services/credentials')['credentialService'];

let analyticsServicePromise: Promise<AnalyticsService> | null = null;
let webhookServicePromise: Promise<WebhookService> | null = null;
let enterpriseComplianceServicePromise: Promise<EnterpriseComplianceService> | null = null;
let credentialServicePromise: Promise<CredentialService> | null = null;
const OPENROUTER_CREDENTIAL_MARKER_KEY = 'secure_marker_openRouterApiKey';
const OPENROUTER_CREDENTIAL_LEGACY_KEY = 'openRouterApiKey';
const TEAM_WORKSPACES_ACTIVE_KEY = 'team_workspaces_active_v1';
const TEAM_WORKSPACES_STORAGE_KEY = 'team_workspaces_v1';

const loadAnalyticsService = async (): Promise<AnalyticsService> => {
    if (!analyticsServicePromise) {
        analyticsServicePromise = import('../services/analytics').then((mod) => mod.analyticsService);
    }
    return analyticsServicePromise;
};

const loadWebhookService = async (): Promise<WebhookService> => {
    if (!webhookServicePromise) {
        webhookServicePromise = import('../services/webhooks').then((mod) => mod.webhookService);
    }
    return webhookServicePromise;
};

const loadEnterpriseComplianceService = async (): Promise<EnterpriseComplianceService> => {
    if (!enterpriseComplianceServicePromise) {
        enterpriseComplianceServicePromise = import('../services/enterpriseCompliance').then((mod) => mod.enterpriseComplianceService);
    }
    return enterpriseComplianceServicePromise;
};

const loadCredentialService = async (): Promise<CredentialService> => {
    if (!credentialServicePromise) {
        credentialServicePromise = import('../services/credentials').then((mod) => mod.credentialService);
    }
    return credentialServicePromise;
};

const hasLikelyOpenRouterCredential = (): boolean => {
    try {
        return Boolean(
            localStorage.getItem(OPENROUTER_CREDENTIAL_MARKER_KEY) ||
            localStorage.getItem(OPENROUTER_CREDENTIAL_LEGACY_KEY)
        );
    } catch {
        return false;
    }
};

const hasLikelyActiveTeamWorkspace = (): boolean => {
    try {
        const activeWorkspace = localStorage.getItem(TEAM_WORKSPACES_ACTIVE_KEY);
        if (!activeWorkspace || activeWorkspace.trim().length === 0) {
            return false;
        }
        const workspacesRaw = localStorage.getItem(TEAM_WORKSPACES_STORAGE_KEY);
        return Boolean(workspacesRaw && workspacesRaw !== '[]');
    } catch {
        return false;
    }
};

type WorkspaceModelPolicy = {
    allowedProviders: string[];
    allowedModelIds: string[];
};

type SerializedWorkspace = {
    id: string;
    modelPolicy?: Partial<WorkspaceModelPolicy>;
};

const resolveModelProvider = (model: Model): string => {
    if (model.id.startsWith('openrouter/')) {
        return 'openrouter';
    }

    if (model.type === 'local-folder') {
        return 'local';
    }

    if (typeof model.pathOrUrl === 'string' && model.pathOrUrl.includes('localhost')) {
        return 'local';
    }

    return 'custom';
};

const getActiveWorkspaceModelPolicy = (): WorkspaceModelPolicy | null => {
    try {
        const activeWorkspaceId = localStorage.getItem(TEAM_WORKSPACES_ACTIVE_KEY);
        if (!activeWorkspaceId || activeWorkspaceId.trim().length === 0) {
            return null;
        }

        const workspacesRaw = localStorage.getItem(TEAM_WORKSPACES_STORAGE_KEY);
        if (!workspacesRaw) return null;

        const workspaces = JSON.parse(workspacesRaw) as SerializedWorkspace[];
        if (!Array.isArray(workspaces)) return null;

        const workspace = workspaces.find((entry) => entry?.id === activeWorkspaceId);
        if (!workspace) return null;

        return {
            allowedProviders: Array.isArray(workspace.modelPolicy?.allowedProviders)
                ? workspace.modelPolicy!.allowedProviders!
                : [],
            allowedModelIds: Array.isArray(workspace.modelPolicy?.allowedModelIds)
                ? workspace.modelPolicy!.allowedModelIds!
                : [],
        };
    } catch {
        return null;
    }
};

const filterModelsByWorkspacePolicy = (models: Model[]): Model[] => {
    const policy = getActiveWorkspaceModelPolicy();
    if (!policy) return models;

    if (policy.allowedProviders.length === 0 && policy.allowedModelIds.length === 0) {
        return models;
    }

    return models.filter((model) => {
        const providerAllowed = policy.allowedProviders.length === 0
            || policy.allowedProviders.includes(resolveModelProvider(model));
        const modelAllowed = policy.allowedModelIds.length === 0
            || policy.allowedModelIds.includes(model.id);
        return providerAllowed && modelAllowed;
    });
};

export const useChat = (onApiLog?: ApiLogCallback, streamingEnabled: boolean = true) => {
    const didBootstrapSessionsRef = useRef(false);
    const didApplyInitialModelSelectionRef = useRef(false);
    const loadedSessionIdRef = useRef<string | null>(null);
    const loadedSessionMessagesRef = useRef<ChatMessage[]>([]);

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
    const [isFetchingWeb, setIsFetchingWeb] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showExpertMenu, setShowExpertMenu] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{ local: 'online' | 'offline' | 'checking', remote: 'online' | 'offline' | 'checking' | 'none' }>({
        local: 'checking',
        remote: 'checking'
    });

    const [openRouterApiKey, setOpenRouterApiKey] = useState<string | null>(null);

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

    const handleExpertSelect = (mode: string | null) => {
        setExpertMode(mode);
        setShowExpertMenu(false);
        if (mode === 'coding') {
            setSystemPrompt("You are an expert software engineer. You write clean, efficient, and well-documented code. Always invoke standard libraries where possible.");
            setTemperature(0.2);
            setTopP(0.1);
        }
        else if (mode === 'creative') {
            setSystemPrompt("You are a creative writer. Use vivid imagery, engaging hooks, and varied sentence structures.");
            setTemperature(0.9);
            setTopP(0.95);
        }
        else if (mode === 'math') {
            setSystemPrompt("You are a mathematician. Solve problems step-by-step, showing all work. Use LaTeX for math notation.");
            setTemperature(0.1);
            setTopP(0.1);
        }
        else if (mode === 'reasoning') {
            setSystemPrompt("You are a logic expert. Analyze every problem deeply. Break it down into first principles.");
            setTemperature(0.2);
            setTopP(0.2);
        }
        else {
            setSystemPrompt("You are a helpful assistant.");
            setTemperature(0.7);
            setTopP(0.9);
        }
    };

    useEffect(() => {
        const fetchModels = async () => {
            let models: Model[] = [];
            let localStatus: 'online' | 'offline' = backendHealthService.isOnline() ? 'online' : 'offline';
            let remoteStatus: 'online' | 'offline' | 'none' = openRouterApiKey ? 'offline' : 'none';

            if (backendHealthService.isOnline()) {
                try {
                    const res = await fetch('http://localhost:3000/v1/models', { signal: AbortSignal.timeout(3000) });
                    const data = await res.json();
                    if (data && Array.isArray(data.data)) {
                        models = [...models, ...data.data];
                        localStatus = 'online';
                        backendHealthService.reportRequestResult(true);
                    }
                } catch (e) {
                    localStatus = 'offline';
                    backendHealthService.reportRequestResult(false);
                }
            } else {
                // Shared health service handles backend recovery probing with backoff.
                void backendHealthService.checkNow();
            }

            if (openRouterApiKey) {
                try {
                    const res = await fetch('https://openrouter.ai/api/v1/models', {
                        headers: { 'Authorization': `Bearer ${openRouterApiKey}` },
                        signal: AbortSignal.timeout(5000)
                    });
                    const data = await res.json();
                    if (data && Array.isArray(data.data)) {
                        const orModels = data.data.map((m: any) => ({
                            id: `openrouter/${m.id}`,
                            name: `[OR] ${m.name || m.id}`,
                            pathOrUrl: 'https://openrouter.ai',
                            type: 'remote-endpoint',
                            status: 'loaded',
                            adapter: 'openrouter',
                            contextLength: m.context_length || m.contextLength || undefined
                        }));
                        models = [...models, ...orModels];
                        remoteStatus = 'online';
                    }
                } catch (e) {
                    remoteStatus = 'offline';
                }
            }
            const filteredModels = hasLikelyActiveTeamWorkspace()
                ? filterModelsByWorkspacePolicy(models)
                : models;
            setAvailableModels(filteredModels);
            if (filteredModels.length === 0) {
                setCurrentModel('');
            }
            setConnectionStatus({ local: localStatus, remote: remoteStatus });

            // Restore last model selection from localStorage once, after models are first available.
            if (!didApplyInitialModelSelectionRef.current && models.length > 0) {
                didApplyInitialModelSelectionRef.current = true;
                setCurrentModel(prevModel => {
                    if (!prevModel) {
                        const lastModel = localStorage.getItem('app_last_model');
                        if (lastModel && models.some(m => m.id === lastModel)) {
                            return lastModel;
                        }
                    }
                    return prevModel;
                });
            }
        };

        fetchModels();
        // Auto-reconnect / Health check interval
        const interval = setInterval(fetchModels, 30000); // Check every 30s

        const handleWorkspaceChange = () => {
            fetchModels();
        };
        const handleConnectionRefresh = () => {
            fetchModels();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('team-workspace-changed', handleWorkspaceChange);
            window.addEventListener('chat-refresh-connections', handleConnectionRefresh as EventListener);
        }

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('team-workspace-changed', handleWorkspaceChange);
                window.removeEventListener('chat-refresh-connections', handleConnectionRefresh as EventListener);
            }
        };
    }, [openRouterApiKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (didBootstrapSessionsRef.current) return;
        didBootstrapSessionsRef.current = true;

        setSavedSessions(HistoryService.getAllSessions());
        const lastId = HistoryService.getLastActiveSessionId();
        if (lastId) {
            loadSession(lastId);
        } else {
            createNewSession();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Separate effect to handle model switching with proper history dependency
    useEffect(() => {
        // Only auto-select/switch model if:
        // 1. No active generation is happening (no messages loading)
        // 2. Models are available
        const hasActiveGeneration = history.some(msg => msg.isLoading);
        if (hasActiveGeneration) return; // NEVER change model during generation

        const currentModelExists = availableModels.some(m => m.id === currentModel);

        if (!currentModel && availableModels.length > 0) {
            const lastModel = localStorage.getItem('app_last_model');
            const preferredModel = lastModel && availableModels.some(m => m.id === lastModel)
                ? lastModel
                : (availableModels.find((m: Model) => m.id === 'local-lmstudio')?.id || availableModels[0].id);
            setCurrentModel(preferredModel);
            localStorage.setItem('app_last_model', preferredModel);
        } else if (currentModel && !currentModelExists && availableModels.length > 0) {
            // Current model no longer exists, fallback to preferred or first available
            const lastModel = localStorage.getItem('app_last_model');
            const preferredModel = lastModel && availableModels.some(m => m.id === lastModel)
                ? lastModel
                : (availableModels.find((m: Model) => m.id === 'local-lmstudio')?.id || availableModels[0].id);
            setCurrentModel(preferredModel);
            localStorage.setItem('app_last_model', preferredModel);
        } else if (currentModel && currentModelExists) {
            // Model still exists, persist it
            localStorage.setItem('app_last_model', currentModel);
        }
    }, [availableModels, history, currentModel]); // Only run when these change, and history check prevents switching during generation

    // Separate effect to adjust maxTokens when model changes
    useEffect(() => {
        if (!currentModel || availableModels.length === 0) return;

        const model = availableModels.find(m => m.id === currentModel);
        if (model?.contextLength && maxTokens > model.contextLength) {
            // Cap maxTokens to model's context length (but allow up to 95% to leave room for input)
            const maxAllowed = Math.floor(model.contextLength * 0.95);
            setMaxTokens(prev => Math.min(prev, maxAllowed));
        }
    }, [currentModel, availableModels]); // Only adjust when model changes, not when maxTokens changes

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
                : history.map((msg, index) => {
                    // If message is in cache, use full version
                    if (loadedMessageIndices.has(index) && fullMessageCache.has(index)) {
                        return fullMessageCache.get(index)!;
                    }
                    // Otherwise, retrieve from the session snapshot loaded once for this save pass.
                    if (existingSessionMessages[index]) {
                        return existingSessionMessages[index];
                    }
                    // Fallback to current message
                    return msg;
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
                batchSize
            });
            loadedSessionIdRef.current = sessionId;
            loadedSessionMessagesRef.current = messagesToSave;

            // Keep sidebar history in sync without reparsing full storage every autosave tick.
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

                const existingIndex = prev.findIndex((session) => session.id === sessionId);
                if (existingIndex === -1) {
                    return [metadata, ...prev];
                }

                const merged = { ...prev[existingIndex], ...metadata };
                if (existingIndex === 0) {
                    return [merged, ...prev.slice(1)];
                }

                return [merged, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
            });
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [history, sessionId, currentModel, expertMode, thinkingEnabled, loadedMessageIndices, fullMessageCache]);

    // Auto-save recovery state every 30 seconds
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
                    enabledTools: Array.from(enabledTools)
                };
                localStorage.setItem('app_recovery_state', JSON.stringify(recoveryState));
            } catch (e) {
                console.error('Failed to save recovery state', e);
            }
        };

        // Save immediately on mount
        saveRecoveryState();

        // Then save every 30 seconds
        const interval = setInterval(saveRecoveryState, 30000);

        return () => clearInterval(interval);
    }, [sessionId, history, currentModel, systemPrompt, temperature, topP, maxTokens, batchSize, expertMode, thinkingEnabled, battleMode, secondaryModel, autoRouting, responseFormat, input, prefill, enabledTools]);

    // Draft persistence - save draft message whenever input changes
    useEffect(() => {
        if (!sessionId) return;

        const timer = setTimeout(() => {
            crashRecoveryService.saveDraft(sessionId, input);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [input, sessionId]);

    const createNewSession = () => {
        const newSession = HistoryService.createNewSession(currentModel || 'local-lmstudio');
        setSessionId(newSession.id);
        loadedSessionIdRef.current = newSession.id;
        loadedSessionMessagesRef.current = [];
        setHistory([]);
        setSelectedToken(null);
        // Reset lazy loading state
        setLoadedMessageIndices(new Set());
        setFullMessageCache(new Map());
        HistoryService.setLastActiveSessionId(newSession.id);
        HistoryService.saveSession(newSession);
        setSavedSessions((prev) => {
            const metadata: ChatSession = {
                ...newSession,
                messages: [],
            };
            return [metadata, ...prev.filter((session) => session.id !== newSession.id)];
        });
        setShowHistory(false);

        // Restore draft for new session
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
    };

    const loadSession = (id: string) => {
        const session = HistoryService.getSession(id);
        if (session) {
            setSessionId(session.id);

            // Lazy loading: Only load recent messages initially
            const INITIAL_LOAD_COUNT = 50; // Load last 50 messages with full content
            const allMessages = session.messages;
            const messageCount = allMessages.length;
            loadedSessionIdRef.current = session.id;
            loadedSessionMessagesRef.current = allMessages;

            // Reset lazy loading state
            const newCache = new Map<number, ChatMessage>();
            const newLoadedIndices = new Set<number>();

            let lightweightHistory: ChatMessage[];

            if (messageCount <= INITIAL_LOAD_COUNT) {
                // Load all messages if count is small
                lightweightHistory = allMessages;
                allMessages.forEach((msg, index) => {
                    newCache.set(index, msg);
                    newLoadedIndices.add(index);
                });
            } else {
                // Create lightweight versions for old messages
                lightweightHistory = allMessages.map((msg, index) => {
                    const shouldLoadFull = index >= messageCount - INITIAL_LOAD_COUNT;

                    if (shouldLoadFull) {
                        // Load recent messages with full content
                        newCache.set(index, msg);
                        newLoadedIndices.add(index);
                        return msg;
                    } else {
                        // Create lightweight placeholder for old messages
                        return {
                            role: msg.role,
                            content: msg.content.length > 100
                                ? msg.content.substring(0, 100) + '...'
                                : msg.content,
                            isLoading: false
                        } as ChatMessage;
                    }
                });
            }

            setHistory(lightweightHistory);
            setFullMessageCache(newCache);
            setLoadedMessageIndices(newLoadedIndices);

            if (session.modelId) {
                setCurrentModel(session.modelId);
                localStorage.setItem('app_last_model', session.modelId);
            }
            // Restore all session state
            if (session.expertMode !== undefined) setExpertMode(session.expertMode);
            if (session.thinkingEnabled !== undefined) setThinkingEnabled(session.thinkingEnabled);
            if (session.systemPrompt !== undefined) setSystemPrompt(session.systemPrompt);
            if (session.temperature !== undefined) setTemperature(session.temperature);
            if (session.topP !== undefined) setTopP(session.topP);
            if (session.maxTokens !== undefined) setMaxTokens(session.maxTokens);
            if (session.batchSize !== undefined) setBatchSize(session.batchSize);
            HistoryService.setLastActiveSessionId(session.id);
            setSelectedToken(null);
            setShowHistory(false);

            // Restore draft for this session
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
        }
    };

    const deleteSession = (id: string) => {
        HistoryService.deleteSession(id);
        setSavedSessions((prev) => prev.filter((session) => session.id !== id));
        if (id === sessionId) createNewSession();
        logComplianceEvent({
            category: 'chat.session',
            action: 'deleted',
            result: 'success',
            resourceType: 'session',
            resourceId: id,
            details: {},
        });
    };

    const resolveLazyLoadSourceMessages = (): ChatMessage[] => {
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

        return history;
    };

    // Lazy loading: Load message content on demand
    const loadMessageContent = (indices: number[]) => {
        const allMessages = resolveLazyLoadSourceMessages();
        const newCache = new Map(fullMessageCache);
        const newLoadedIndices = new Set(loadedMessageIndices);

        indices.forEach(index => {
            if (index >= 0 && index < allMessages.length && !loadedMessageIndices.has(index)) {
                // Store full message in cache
                newCache.set(index, allMessages[index]);
                newLoadedIndices.add(index);
            }
        });

        setFullMessageCache(newCache);
        setLoadedMessageIndices(newLoadedIndices);
    };

    // Load a range of messages (for scrolling/pagination)
    const loadMessageRange = (startIndex: number, endIndex: number) => {
        const allMessages = resolveLazyLoadSourceMessages();
        const indicesToLoad: number[] = [];
        for (let i = startIndex; i <= Math.min(endIndex, allMessages.length - 1); i++) {
            if (!loadedMessageIndices.has(i)) {
                indicesToLoad.push(i);
            }
        }
        if (indicesToLoad.length > 0) {
            loadMessageContent(indicesToLoad);
        }
    };

    const executeWebFetch = async () => {
        if (!urlInput) { setShowUrlInput(false); return; }
        const url = urlInput;
        setShowUrlInput(false);
        setUrlInput('');
        setIsFetchingWeb(true);


        try {
            const res = await fetch('http://localhost:3000/v1/tools/web-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const content = `[CONTEXT FROM WEB: ${url}]\n\n${data.content}`;
            setHistory(prev => [...prev, { role: 'user', content }]);
            toast.success("Web content added to conversation context.");
            logComplianceEvent({
                category: 'chat.tools',
                action: 'web_fetch.completed',
                result: 'success',
                details: { url },
                piiFields: ['url'],
            });
        } catch (err: any) {
            toast.error(err.message);
            logComplianceEvent({
                category: 'chat.tools',
                action: 'web_fetch.failed',
                result: 'failure',
                details: { url, error: err?.message || 'Unknown error' },
                piiFields: ['url'],
            });
        } finally {
            setIsFetchingWeb(false);
        }
    };

    const deleteMessage = (index: number) => {
        const newHistory = history.slice(0, index);
        setHistory(newHistory);
        setSelectedToken(null);

        // Clean up lazy loading cache - remove entries for deleted messages
        setFullMessageCache(cache => {
            const newCache = new Map(cache);
            // Remove all entries >= index
            for (let i = index; i < history.length; i++) {
                newCache.delete(i);
            }
            return newCache;
        });

        setLoadedMessageIndices(indices => {
            const newIndices = new Set(indices);
            // Remove all indices >= index
            for (let i = index; i < history.length; i++) {
                newIndices.delete(i);
            }
            return newIndices;
        });
    };

    const selectChoice = (messageIndex: number, choiceIndex: number) => {
        setHistory(prev => {
            const newHistory = [...prev];
            const targetMsg = newHistory[messageIndex];
            if (!targetMsg || !targetMsg.choices || !targetMsg.choices[choiceIndex]) return prev;

            const updatedMessage: ChatMessage = {
                ...targetMsg,
                selectedChoiceIndex: choiceIndex,
                content: targetMsg.choices[choiceIndex].message.content
            };
            newHistory[messageIndex] = updatedMessage;

            // Update cache for lazy loading
            setFullMessageCache(cache => {
                const newCache = new Map(cache);
                newCache.set(messageIndex, updatedMessage);
                return newCache;
            });

            return newHistory;
        });
        setSelectedToken(null);
    };



    const updateMessageContent = (index: number, content: string, isLoading: boolean, logprobs?: TokenLogprob[], generationTime?: number, toolCalls?: ToolCall[]) => {
        setHistory(prev => {
            const newHistory = [...prev];
            if (!newHistory[index]) return prev;

            const existing = newHistory[index];
            const updatedMessage: ChatMessage = {
                ...existing,
                content,
                isLoading,
                generationTime: generationTime !== undefined ? generationTime : existing.generationTime,
                tool_calls: toolCalls || existing.tool_calls,
                choices: logprobs ? [{
                    message: { role: 'assistant' as const, content },
                    index: 0,
                    logprobs: { content: logprobs }
                }] : existing.choices
            };
            newHistory[index] = updatedMessage;

            // Update cache for lazy loading
            setFullMessageCache(cache => {
                const newCache = new Map(cache);
                newCache.set(index, updatedMessage);
                return newCache;
            });

            return newHistory;
        });
    };

    const updateMessageToken = (messageIndex: number, tokenIndex: number, newToken: string) => {
        setHistory(prev => {
            const newHistory = [...prev];
            const msg = newHistory[messageIndex];
            if (!msg || !msg.choices?.[0]?.logprobs?.content) return prev;

            const newLogprobs = [...msg.choices[0].logprobs.content];
            newLogprobs[tokenIndex] = { ...newLogprobs[tokenIndex], token: newToken };

            const newContent = newLogprobs.map(lp => lp.token).join('');

            const updatedMessage: ChatMessage = {
                ...msg,
                content: newContent,
                choices: [{
                    ...msg.choices[0],
                    message: { ...msg.choices[0].message, content: newContent },
                    logprobs: { content: newLogprobs }
                }]
            };

            newHistory[messageIndex] = updatedMessage;

            // Update cache for lazy loading
            setFullMessageCache(cache => {
                const newCache = new Map(cache);
                newCache.set(messageIndex, updatedMessage);
                return newCache;
            });

            // Also update selected token if it matches
            if (selectedToken && selectedToken.messageIndex === messageIndex && selectedToken.tokenIndex === tokenIndex) {
                setSelectedToken({ ...selectedToken, logprob: newLogprobs[tokenIndex] });
            }

            return newHistory;
        });
    };

    const deriveSessionTitleFromMessages = (messages: ChatMessage[]): string => {
        const firstUserMessage = messages.find(
            (message) => message.role === 'user' && typeof message.content === 'string' && message.content.trim().length > 0
        );
        if (!firstUserMessage || typeof firstUserMessage.content !== 'string') {
            return 'New Chat';
        }
        const content = firstUserMessage.content;
        return content.slice(0, 30) + (content.length > 30 ? '...' : '');
    };


    const streamResponse = async (
        modelId: string,
        messages: Message[],
        targetIndex: number,
        signal: AbortSignal,
        labelPrefix: string = "",
        webhookHistorySnapshot: ChatMessage[] | null = null
    ) => {
        const startTime = Date.now(); // Track generation start time
        const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let finalToolCalls: ToolCall[] | undefined;

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            let url = 'http://localhost:3000/v1/chat/completions';
            let actualModelId = modelId;

            if (modelId.startsWith('openrouter/') && openRouterApiKey) {
                url = 'https://openrouter.ai/api/v1/chat/completions';
                actualModelId = modelId.replace('openrouter/', '');
                headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                headers['HTTP-Referer'] = 'http://localhost:5173';
                headers['X-Title'] = 'WinInferencer';
            }

            const requestBody = {
                model: actualModelId,
                messages,
                temperature,
                top_p: topP,
                max_tokens: maxTokens,
                n: batchSize,
                stream: streamingEnabled,
                response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined
            };

            // OpenAI/compatible APIs require 'JSON' in message if json_object is set
            if (responseFormat === 'json_object') {
                const sysMsg = requestBody.messages.find(m => m.role === 'system');
                if (sysMsg && !sysMsg.content.toLowerCase().includes('json')) {
                    sysMsg.content += " You are a helpful assistant designed to output JSON.";
                }
            }

            // Add Tools
            const activeTools = AVAILABLE_TOOLS.filter(t => enabledTools.has(t.name)).map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));

            if (activeTools.length > 0) {
                // @ts-ignore
                requestBody.tools = activeTools;
                // @ts-ignore
                requestBody.tool_choice = "auto";
            }

            // Log request
            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'request',
                    model: actualModelId,
                    request: requestBody
                });
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                signal,
                body: JSON.stringify(requestBody)
            });

            // Report TTFB Latency
            reportPerformanceLatency(Date.now() - startTime);

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            let fullContent = labelPrefix ? `**${labelPrefix}**\n\n` : (prefill || '');

            if (streamingEnabled) {
                // Streaming mode
                if (!res.body) throw new Error("No response body");

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let buffer = '';
                let streamBuffer = '';
                let lastUpdate = Date.now();

                let toolCallsBuffer: Record<number, any> = {};

                while (!done) {
                    const { value, done: isDone } = await reader.read();
                    done = isDone;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        streamBuffer += chunk;
                        const lines = streamBuffer.split('\n');
                        streamBuffer = isDone ? '' : lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('data:')) {
                                const dataStr = trimmed.replace(/^data:\s*/, '').trim();
                                if (!dataStr || dataStr === '[DONE]') continue;
                                try {
                                    const parsed = JSON.parse(dataStr);
                                    const delta = parsed.choices?.[0]?.delta;

                                    if (delta) {
                                        if (delta.content) buffer += delta.content;
                                        if (delta.tool_calls) {
                                            for (const tc of delta.tool_calls) {
                                                const idx = tc.index;
                                                if (!toolCallsBuffer[idx]) {
                                                    toolCallsBuffer[idx] = {
                                                        id: tc.id || '',
                                                        type: 'function',
                                                        function: { name: tc.function?.name || '', arguments: '' }
                                                    };
                                                }
                                                if (tc.id) toolCallsBuffer[idx].id = tc.id;
                                                if (tc.function?.name) toolCallsBuffer[idx].function.name += tc.function.name;
                                                if (tc.function?.arguments) toolCallsBuffer[idx].function.arguments += tc.function.arguments;
                                            }
                                        }
                                    }
                                } catch (e) { }
                            }
                        }
                    }

                    const now = Date.now();
                    // Optimize: Update more frequently for better UX, but batch small updates
                    const toolCallsKeys = Object.keys(toolCallsBuffer);
                    const shouldUpdate = (
                        done ||
                        buffer.length > 50 ||
                        toolCallsKeys.length > 0 && (now - lastUpdate > 100) ||
                        (now - lastUpdate > 100 && buffer.length > 0)
                    );
                    if (shouldUpdate) {
                        fullContent += buffer;
                        buffer = '';
                        lastUpdate = now;
                        updateMessageContent(targetIndex, fullContent, !done, undefined, undefined, Object.values(toolCallsBuffer));
                    }
                }
                const completedToolCalls = Object.values(toolCallsBuffer) as ToolCall[];
                if (completedToolCalls.length > 0) {
                    finalToolCalls = completedToolCalls;
                }
            } else {
                // Non-streaming mode - get full response at once
                const data = await res.json();
                const content = data.choices?.[0]?.message?.content || '';
                fullContent += content;
                updateMessageContent(targetIndex, fullContent, false);
            }

            // Final logprob simulation
            const processedLogprobs = simulateLogprobs(fullContent);
            const totalTime = Date.now() - startTime;
            updateMessageContent(targetIndex, fullContent, false, processedLogprobs, totalTime, finalToolCalls);

            // Track analytics - estimate token count (rough: ~4 chars per token)
            const estimatedTokens = Math.ceil(fullContent.length / 4);
            trackAnalyticsMessage(sessionId, modelId, estimatedTokens);

            logComplianceEvent({
                category: 'chat.message',
                action: 'generation.completed',
                result: 'success',
                resourceType: 'session',
                resourceId: sessionId,
                details: {
                    modelId,
                    tokenEstimate: estimatedTokens,
                    battleMode,
                    streamingEnabled,
                },
            });

            const canUseInMemoryWebhookSnapshot = Boolean(
                webhookHistorySnapshot
            );

            let webhookMessages: ChatMessage[] | null = null;
            let webhookTitle: string | null = null;

            if (canUseInMemoryWebhookSnapshot && webhookHistorySnapshot) {
                const cachedSessionMessages = loadedSessionIdRef.current === sessionId
                    ? loadedSessionMessagesRef.current
                    : [];
                let missingMessages = false;
                webhookMessages = webhookHistorySnapshot.map((message, index) => {
                    if (index === targetIndex) {
                        return {
                            ...message,
                            role: 'assistant',
                            content: fullContent,
                            isLoading: false,
                            generationTime: totalTime,
                            tool_calls: finalToolCalls || message.tool_calls,
                            choices: [{
                                message: { role: 'assistant', content: fullContent },
                                index: 0,
                                logprobs: { content: processedLogprobs },
                            }],
                        } as ChatMessage;
                    }
                    if (loadedMessageIndices.has(index) && fullMessageCache.has(index)) {
                        return fullMessageCache.get(index)!;
                    }
                    if (cachedSessionMessages[index]) {
                        return cachedSessionMessages[index];
                    }
                    missingMessages = true;
                    return message;
                });

                if (!missingMessages) {
                    const savedTitle = savedSessions.find((session) => session.id === sessionId)?.title;
                    webhookTitle = savedTitle && savedTitle.trim().length > 0 && savedTitle !== 'New Chat'
                        ? savedTitle
                        : deriveSessionTitleFromMessages(webhookMessages);
                } else {
                    webhookMessages = null;
                }
            } else {
                // Fallback to persisted session when lazy placeholders are still present.
                const currentSession = HistoryService.getSession(sessionId);
                if (currentSession) {
                    webhookMessages = currentSession.messages;
                    webhookTitle = currentSession.title;
                }
            }

            if (webhookMessages) {
                loadedSessionIdRef.current = sessionId;
                loadedSessionMessagesRef.current = webhookMessages;
                triggerConversationCompleteWebhooks({
                    sessionId,
                    sessionTitle: webhookTitle || 'New Chat',
                    modelId: modelId,
                    messageCount: webhookMessages.length,
                    messages: webhookMessages,
                    metadata: {
                        temperature,
                        topP,
                        maxTokens,
                    },
                });
            }

            // Log successful response
            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'response',
                    model: actualModelId,
                    response: {
                        content: fullContent,
                        finish_reason: 'stop'
                    },
                    duration: totalTime
                });
            }

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            let errorMsg = err.message;

            if (err.message.includes('Failed to fetch')) {
                if (modelId.startsWith('openrouter/')) {
                    errorMsg = "Connection error. Check your internet or OpenRouter API key.";
                } else {
                    errorMsg = "Could not connect to LM Studio. Make sure it's running on port 3000.";
                }
            } else if (err.message.includes('429')) {
                errorMsg = "Rate limit exceeded (429). Please wait a moment.";
            } else if (err.message.includes('401')) {
                errorMsg = "Unauthorized (401). Check your API key.";
            } else if (err.message.includes('404')) {
                errorMsg = `Model not found (404): ${modelId}`;
            }

            // Log error
            if (onApiLog) {
                onApiLog({
                    id: logId,
                    timestamp: Date.now(),
                    type: 'error',
                    model: modelId,
                    error: errorMsg,
                    duration: Date.now() - startTime
                });
            }

            updateMessageContent(targetIndex, `Error: ${errorMsg}`, false);
            toast.error(errorMsg);
            logComplianceEvent({
                category: 'chat.message',
                action: 'generation.failed',
                result: 'failure',
                resourceType: 'session',
                resourceId: sessionId,
                details: {
                    modelId,
                    error: errorMsg,
                },
            });
        }
    };

    const stopGeneration = () => {
        abortControllers.forEach(c => c.abort());
        setAbortControllers([]);
        setHistory(prev => {
            const newHistory = prev.map((msg, index) => {
                if (msg.isLoading) {
                    const stoppedMsg = { ...msg, isLoading: false, content: msg.content + " [Stopped]" };
                    // Update cache
                    setFullMessageCache(cache => {
                        const newCache = new Map(cache);
                        newCache.set(index, stoppedMsg);
                        return newCache;
                    });
                    return stoppedMsg;
                }
                return msg;
            });
            return newHistory;
        });
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
    };

    const [attachments, setAttachments] = useState<{ id: string, name: string, content: string }[]>([]);
    const [imageAttachments, setImageAttachments] = useState<{ id: string, name: string, mimeType: string, base64: string, thumbnailUrl: string }[]>([]);

    const addAttachment = (file: { name: string, content: string }) => {
        setAttachments(prev => [...prev, { id: crypto.randomUUID(), ...file }]);
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const addImageAttachment = (file: { name: string, mimeType: string, base64: string, thumbnailUrl: string }) => {
        setImageAttachments(prev => [...prev, { id: crypto.randomUUID(), ...file }]);
    };

    const removeImageAttachment = (id: string) => {
        setImageAttachments(prev => prev.filter(a => a.id !== id));
    };

    const sendMessage = async (contextOptions?: {
        excludedMessageIndices?: number[];
        contextSummary?: string;
    }) => {
        if (!input.trim() && attachments.length === 0 && imageAttachments.length === 0) return;

        let finalInput = input;

        // Auto-Routing Logic
        let modelToUse = currentModel;
        if (autoRouting && availableModels.length > 0 && !battleMode) {
            const intent = detectIntent(finalInput);
            const best = findBestModelForIntent(intent, availableModels);
            if (best && best !== currentModel) {
                modelToUse = best;
                // Don't change persistent model, just route this request? 
                // Or change it? Changing it feels better for continuity.
                setCurrentModel(best);
                toast.info(`Auto-routed to ${best} (${intent})`);
                logComplianceEvent({
                    category: 'chat.routing',
                    action: 'auto_route.selected',
                    result: 'info',
                    resourceType: 'session',
                    resourceId: sessionId,
                    details: {
                        fromModel: currentModel,
                        toModel: best,
                        intent,
                    },
                });
            }
        }

        logComplianceEvent({
            category: 'chat.message',
            action: 'send.requested',
            result: 'info',
            resourceType: 'session',
            resourceId: sessionId,
            details: {
                modelId: modelToUse,
                battleMode,
                attachmentCount: attachments.length,
                imageCount: imageAttachments.length,
                excludedContextCount: contextOptions?.excludedMessageIndices?.length || 0,
            },
        });

        // Append text attachments to the user message transparently
        if (attachments.length > 0) {
            const attachmentText = attachments.map(a => `\n\n--- FILE: ${a.name} ---\n${a.content}\n--- END FILE ---`).join('');
            finalInput += attachmentText;
        }

        // Append project context if provided (will be passed from Chat component)
        // This is handled in Chat.tsx by modifying input before sendMessage

        let finalSystemPrompt = systemPrompt;
        if (thinkingEnabled) {
            finalSystemPrompt += "\n\nIMPORTANT: You must engage in a deep thought process before answering. Enclose your thought process inside <thinking>...</thinking> XML tags. In the thinking block, break down the problem step-by-step, consider multiple angles, and critique your own reasoning. Then provide your final answer outside the tags.";
        }

        // Build the user message content (may be multimodal with images)
        let userMessageContent: any = finalInput;

        // If there are images, use the OpenAI vision format
        if (imageAttachments.length > 0) {
            const contentParts: any[] = [];

            // Add text content first if present
            if (finalInput.trim()) {
                contentParts.push({ type: 'text', text: finalInput });
            }

            // Add image content parts
            for (const img of imageAttachments) {
                contentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mimeType};base64,${img.base64}`,
                        detail: 'auto' // Can be 'low', 'high', or 'auto'
                    }
                });
            }

            userMessageContent = contentParts;
        }

        const excludedIndices = new Set(contextOptions?.excludedMessageIndices || []);
        const contextHistory = history.filter((_, index) => !excludedIndices.has(index));

        const baseMessages: Message[] = [
            { role: 'system', content: finalSystemPrompt },
            ...(contextOptions?.contextSummary
                ? [{ role: 'system' as const, content: contextOptions.contextSummary }]
                : []),
            ...contextHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessageContent }
        ];

        // UI display content
        const imageCountText = imageAttachments.length > 0 ? `[${imageAttachments.length} image(s)]` : '';
        const fileCountText = attachments.length > 0 ? `[${attachments.length} file(s)]` : '';
        const uiContent = input || `${imageCountText} ${fileCountText}`.trim() || '[Empty message]';

        // Store image thumbnails in the user message for display
        const userMsg: ChatMessage = {
            role: 'user',
            content: uiContent,
            images: imageAttachments.map(img => ({
                id: img.id,
                name: img.name,
                mimeType: img.mimeType as any,
                base64: img.base64,
                thumbnailUrl: img.thumbnailUrl
            }))
        };

        let newHistory = [...history, userMsg];
        let controllers: AbortController[] = [];

        // Track new messages as loaded in lazy loading cache
        const userMsgIndex = newHistory.length - 1;
        const newCache = new Map(fullMessageCache);
        const newLoadedIndices = new Set(loadedMessageIndices);
        newCache.set(userMsgIndex, userMsg);
        newLoadedIndices.add(userMsgIndex);

        if (battleMode && secondaryModel) {
            // Battle Mode: 2 Assistant Messages
            const indexA = newHistory.length;
            const indexB = newHistory.length + 1;

            const msgA: ChatMessage = { role: 'assistant', content: '', isLoading: true };
            const msgB: ChatMessage = { role: 'assistant', content: '', isLoading: true };

            newHistory.push(msgA, msgB);

            // Track battle mode messages as loaded
            newCache.set(indexA, msgA);
            newCache.set(indexB, msgB);
            newLoadedIndices.add(indexA);
            newLoadedIndices.add(indexB);

            setFullMessageCache(newCache);
            setLoadedMessageIndices(newLoadedIndices);
            setHistory(newHistory);

            setInput('');
            setAttachments([]);
            setImageAttachments([]);
            setPrefill(null);

            // Clear draft after sending message
            crashRecoveryService.saveDraft(sessionId, '');

            const ctrlA = new AbortController();
            const ctrlB = new AbortController();
            controllers = [ctrlA, ctrlB];
            setAbortControllers([ctrlA, ctrlB]);

            // Model Name Lookup
            const nameA = availableModels.find(m => m.id === modelToUse)?.name || modelToUse;
            const nameB = availableModels.find(m => m.id === secondaryModel)?.name || secondaryModel;

            // Trigger Parallel Streams
            streamResponse(modelToUse, baseMessages, indexA, ctrlA.signal, `Model A: ${nameA}`, newHistory);
            streamResponse(secondaryModel, baseMessages, indexB, ctrlB.signal, `Model B: ${nameB}`, newHistory);

        } else {
            // Normal Mode
            const targetIndex = newHistory.length;
            const loadingItem: ChatMessage = { role: 'assistant', content: prefill || '', isLoading: true };
            newHistory.push(loadingItem);

            // Track assistant message as loaded
            newCache.set(targetIndex, loadingItem);
            newLoadedIndices.add(targetIndex);

            setFullMessageCache(newCache);
            setLoadedMessageIndices(newLoadedIndices);
            setHistory(newHistory);

            setInput('');
            setAttachments([]);
            setImageAttachments([]);
            setPrefill(null);

            // Clear draft after sending message
            crashRecoveryService.saveDraft(sessionId, '');

            const ctrl = new AbortController();
            controllers = [ctrl];
            setAbortControllers([ctrl]);

            let messagesToSend = [...baseMessages];
            if (prefill) messagesToSend.push({ role: 'assistant', content: prefill });

            streamResponse(modelToUse, messagesToSend, targetIndex, ctrl.signal, "", newHistory);
        }
    };

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
        renameSession: (id: string, newTitle: string) => {
            HistoryService.renameSession(id, newTitle);
            setSavedSessions((prev) => {
                const index = prev.findIndex((session) => session.id === id);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], title: newTitle };
                return next;
            });
            logComplianceEvent({
                category: 'chat.session',
                action: 'renamed',
                result: 'success',
                resourceType: 'session',
                resourceId: id,
                details: { newTitle },
            });
        },
        togglePinSession: (id: string) => {
            HistoryService.togglePinSession(id);
            setSavedSessions((prev) => {
                const index = prev.findIndex((session) => session.id === id);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], pinned: !Boolean(next[index].pinned) };
                return next;
            });
            logComplianceEvent({
                category: 'chat.session',
                action: 'pin_toggled',
                result: 'success',
                resourceType: 'session',
                resourceId: id,
                details: {},
            });
        },
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
