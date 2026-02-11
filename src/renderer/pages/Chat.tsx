import React from 'react';
import { Clock, Plus, X, Globe, Settings, Activity, AlertTriangle, ChevronRight, Check, AlertCircle, Brain, Users, Wrench, Eraser, Download, Search, ChevronUp, ChevronDown, FileText, ThumbsUp, ThumbsDown, Code2, BarChart3, FolderOpen, Eye, EyeOff, Github, Network, HelpCircle, Zap, LayoutGrid, FileJson, TestTube, Sparkles, MessageSquare, Mail, Calendar, Package, Video, Link, Bot, Shield, Menu, Cloud, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatComposerShell } from '../components/chat/ChatComposerShell';
import { ChatControlsTabPanel } from '../components/chat/ChatControlsTabPanel';
import {
    ExperimentalFeaturesDropdown,
    HeaderConnectionStatus,
    TopHeaderModelUtilityControls,
    TopHeaderPrimaryActions,
    TopHeaderSecondaryActions,
} from '../components/chat/ChatHeaderCluster';
import {
    ChatInspectorTabPanel,
    ComposerAttachmentsPanel,
    ComposerAuxPanels,
} from '../components/chat/ChatInspectorComposerPanels';
import {
    ComposerActionButtons,
    ComposerControlPills,
    LongPressActionMenu,
    SidebarTabsHeader,
    type SidebarTab,
} from '../components/chat/ChatInlinePanels';
import { ChatMessageRow } from '../components/chat/ChatMessageRow';
import { ChatOverlays } from '../components/chat/ChatOverlays';
import { ChatSearchPanel, SearchResultRow } from '../components/chat/ChatSearchPanel';
import { ChatSidebar, type ChatSidebarPanels } from '../components/chat/ChatSidebar';
import { ChatWorkspaceShell } from '../components/chat/ChatWorkspaceShell';
import type { LaunchReadinessStep } from '../components/ChatEmptyState';
import type { LogEntry } from '../components/RequestResponseLog';
import type { CloudSyncStatus } from '../services/cloudSync';
const PromptManager = React.lazy(() => import('../components/PromptManager'));
import { useChat } from '../hooks/useChat';
import { usePrompts } from '../hooks/usePrompts';
import { useConversationTree } from '../hooks/useConversationTree';
import { useChatComposerInteractions } from '../hooks/useChatComposerInteractions';
import { useChatContextOptimizer } from '../hooks/useChatContextOptimizer';
import { useChatComposerControlBar } from '../hooks/useChatComposerControlBar';
import { useChatDevMonitors } from '../hooks/useChatDevMonitors';
import { useChatDiagnosticsPanel } from '../hooks/useChatDiagnosticsPanel';
import { useChatExternalActions } from '../hooks/useChatExternalActions';
import { useChatGestureInteractions } from '../hooks/useChatGestureInteractions';
import { useChatHeaderActions } from '../hooks/useChatHeaderActions';
import { useChatLifecycleState } from '../hooks/useChatLifecycleState';
import { useChatKeyboardController } from '../hooks/useChatKeyboardController';
import { useChatMessageActionsController } from '../hooks/useChatMessageActionsController';
import { useChatHeaderUtilityControls } from '../hooks/useChatHeaderUtilityControls';
import { useChatMessageListSearch } from '../hooks/useChatMessageListSearch';
import { formatPerfMs, useChatPerfBenchmarks } from '../hooks/useChatPerfBenchmarks';
import { useChatSendPipeline } from '../hooks/useChatSendPipeline';
import { useChatSessionIntegrations } from '../hooks/useChatSessionIntegrations';
import { useChatSlashPrompts } from '../hooks/useChatSlashPrompts';
import { useChatStartupRecovery } from '../hooks/useChatStartupRecovery';
import { buildReadinessSteps, getDiagnosticsStatus } from '../lib/chatDiagnosticsModels';
import {
    loadActivityLogService,
    loadAnalyticsStore,
    loadAutoCategorizationService,
    loadAutoTaggingService,
    loadCloudSyncService,
    loadContextManagementService,
    loadMultiModalAIService,
    loadProjectContextService,
    loadPromptVariableService,
    loadWorkflowsService,
} from '../lib/chatLazyServices';
import {
    areSearchResultIndicesEqual,
    findChatSearchMatches,
    normalizeChatSearchQuery,
} from '../lib/chatSearch';
import {
    createChatRowMetadataCacheState,
    type SearchResultPreviewCacheEntry,
} from '../lib/chatRenderModels';
import {
    type ChatMessageActionCapabilities,
    getMessageActionCapabilities,
} from '../lib/chatMessageActions';
import { useMCP } from '../hooks/useMCP';
import type { UsageStatsRecord } from '../services/analyticsStore';
import type { ProjectContext } from '../services/projectContext';
import type { ConversationTemplate } from '../services/templates';

const KeyboardShortcutsModal = React.lazy(() => import('../components/KeyboardShortcutsModal'));
const RequestResponseLog = React.lazy(() => import('../components/RequestResponseLog'));
const AnalyticsDashboard = React.lazy(() => import('../components/AnalyticsDashboard'));
const SidebarHistory = React.lazy(() => import('../components/SidebarHistory'));
const ConversationTreeView = React.lazy(() => import('../components/ConversationTreeView'));
const ExportDialog = React.lazy(() => import('../components/ExportDialog'));
const GlobalSearchDialog = React.lazy(() => import('../components/GlobalSearchDialog'));
const ConversationSummaryPanel = React.lazy(() => import('../components/ConversationSummaryPanel'));
const TemplateLibraryDialog = React.lazy(() => import('../components/TemplateLibraryDialog'));
const RecoveryDialog = React.lazy(() => import('../components/RecoveryDialog'));
const ChatEmptyState = React.lazy(() => import('../components/ChatEmptyState'));
const ChatDiagnosticsPopover = React.lazy(() => import('../components/ChatDiagnosticsPopover'));
const PerformanceMonitorOverlay = React.lazy(() =>
    import('../components/PerformanceMonitorOverlay').then((mod) => ({ default: mod.PerformanceMonitorOverlay }))
);
const DocumentChatPanel = React.lazy(() =>
    import('../components/DocumentChatPanel').then((mod) => ({ default: mod.DocumentChatPanel }))
);
const ABTestingPanel = React.lazy(() =>
    import('../components/ABTestingPanel').then((mod) => ({ default: mod.ABTestingPanel }))
);
const PromptOptimizationPanel = React.lazy(() =>
    import('../components/PromptOptimizationPanel').then((mod) => ({ default: mod.PromptOptimizationPanel }))
);
const CalendarScheduleDialog = React.lazy(() =>
    import('../components/CalendarScheduleDialog').then((mod) => ({ default: mod.CalendarScheduleDialog }))
);
const ConversationRecommendationsPanel = React.lazy(() =>
    import('../components/ConversationRecommendationsPanel').then((mod) => ({ default: mod.ConversationRecommendationsPanel }))
);
const WorkflowsManager = React.lazy(() =>
    import('../components/WorkflowsManager').then((mod) => ({ default: mod.WorkflowsManager }))
);
const APIPlayground = React.lazy(() =>
    import('../components/APIPlayground').then((mod) => ({ default: mod.APIPlayground }))
);
const DeveloperDocumentationPanel = React.lazy(() =>
    import('../components/DeveloperDocumentationPanel').then((mod) => ({ default: mod.DeveloperDocumentationPanel }))
);
const PluginManager = React.lazy(() =>
    import('../components/PluginManager').then((mod) => ({ default: mod.PluginManager }))
);
const CodeIntegrationPanel = React.lazy(() =>
    import('../components/CodeIntegrationPanel').then((mod) => ({ default: mod.CodeIntegrationPanel }))
);
const WorkspaceViewsPanel = React.lazy(() =>
    import('../components/WorkspaceViewsPanel').then((mod) => ({ default: mod.WorkspaceViewsPanel }))
);
const InteractiveTutorial = React.lazy(() =>
    import('../components/InteractiveTutorial').then((mod) => ({ default: mod.InteractiveTutorial }))
);
const BCIPanel = React.lazy(() =>
    import('../components/BCIPanel').then((mod) => ({ default: mod.BCIPanel }))
);
const MultiModalAIPanel = React.lazy(() =>
    import('../components/MultiModalAIPanel').then((mod) => ({ default: mod.MultiModalAIPanel }))
);
const RealTimeCollaborationPanel = React.lazy(() =>
    import('../components/RealTimeCollaborationPanel').then((mod) => ({ default: mod.RealTimeCollaborationPanel }))
);
const CloudSyncPanel = React.lazy(() =>
    import('../components/CloudSyncPanel').then((mod) => ({ default: mod.CloudSyncPanel }))
);
const TeamWorkspacesPanel = React.lazy(() =>
    import('../components/TeamWorkspacesPanel').then((mod) => ({ default: mod.TeamWorkspacesPanel }))
);
const EnterpriseCompliancePanel = React.lazy(() =>
    import('../components/EnterpriseCompliancePanel').then((mod) => ({ default: mod.EnterpriseCompliancePanel }))
);
const BlockchainPanel = React.lazy(() =>
    import('../components/BlockchainPanel').then((mod) => ({ default: mod.BlockchainPanel }))
);
const AIAgentsPanel = React.lazy(() =>
    import('../components/AIAgentsPanel').then((mod) => ({ default: mod.AIAgentsPanel }))
);
const FederatedLearningPanel = React.lazy(() =>
    import('../components/FederatedLearningPanel').then((mod) => ({ default: mod.FederatedLearningPanel }))
);

const CHAT_PERF_HISTORY_KEY = 'chat_message_perf_benchmarks_v1';
const CHAT_DEV_MONITORS_ENABLED_KEY = 'chat_dev_monitors_enabled_v1';
const ACTIVITY_LOG_COUNT_KEY = 'api_activity_log_count';
const PROJECT_CONTEXT_FEATURE_ENABLED_KEY = 'project_context_feature_enabled_v1';
const MAX_ACTIVITY_LOG_ENTRIES = 200;

type ContextManagementServiceType = typeof import('../services/contextManagement')['ContextManagementService'];

const readPersistedProjectContextFeatureEnabled = (): boolean => {
    try {
        return localStorage.getItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY) === '1';
    } catch {
        return false;
    }
};

const persistProjectContextFeatureEnabled = (enabled: boolean): void => {
    try {
        if (enabled) {
            localStorage.setItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY, '1');
        } else {
            localStorage.removeItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY);
        }
    } catch {
        // Ignore local persistence errors for this optional UI flag.
    }
};

const readPersistedApiLogCount = (): number => {
    try {
        const rawCount = localStorage.getItem(ACTIVITY_LOG_COUNT_KEY);
        if (rawCount === null) return 0;
        const parsed = Number(rawCount);
        return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
        return 0;
    }
};

const Chat: React.FC = () => {
    // API logs state (defined before useChat so it can be passed as callback)
    const [apiLogs, setApiLogs] = React.useState<LogEntry[]>([]);
    const [apiLogCount, setApiLogCount] = React.useState<number>(readPersistedApiLogCount);
    const [hasHydratedApiLogs, setHasHydratedApiLogs] = React.useState(false);
    const [showRequestLog, setShowRequestLog] = React.useState(false);

    const [streamingEnabled, setStreamingEnabled] = React.useState(true);
    const [isLoadingSessions, setIsLoadingSessions] = React.useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);

    const handleApiLog = React.useCallback((log: LogEntry) => {
        setApiLogCount((prev) => Math.min(prev + 1, MAX_ACTIVITY_LOG_ENTRIES));
        if (hasHydratedApiLogs || showRequestLog) {
            setApiLogs((prev) => [...prev, log].slice(-MAX_ACTIVITY_LOG_ENTRIES));
        }

        void loadActivityLogService()
            .then((service) => {
                const next = service.append(log);
                setApiLogCount(next.length);
                if (hasHydratedApiLogs || showRequestLog) {
                    setApiLogs(next);
                }
            })
            .catch(() => {
                // Keep UI responsive even if activity-log persistence is unavailable.
            });
    }, [hasHydratedApiLogs, showRequestLog]);

    const {
        input, setInput,
        prefill, setPrefill,
        thinkingEnabled, setThinkingEnabled,
        expertMode, setExpertMode,
        autoRouting, setAutoRouting,
        enabledTools, setEnabledTools,
        responseFormat, setResponseFormat,
        updateMessageToken,

        sessionId,
        history,
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
        showHistory, setShowHistory,

        handleExpertSelect,
        createNewSession,
        loadSession,
        deleteSession,
        executeWebFetch,
        deleteMessage,
        selectChoice,
        addAttachment,
        removeAttachment,
        attachments,
        imageAttachments,
        addImageAttachment,
        removeImageAttachment,
        sendMessage,
        stopGeneration,
        battleMode, setBattleMode,
        secondaryModel, setSecondaryModel,
        togglePinSession, renameSession,
        connectionStatus,
        loadMessageRange,
        loadedMessageIndices
    } = useChat(handleApiLog, streamingEnabled);

    const {
        showTutorial,
        currentTutorial,
        showRecoveryDialog,
        setShowRecoveryDialog,
        recoveryState,
        handleRestoreSession,
        handleDismissRecovery,
        handleCompleteTutorial,
        handleSkipTutorial,
    } = useChatStartupRecovery({
        loadSession,
        setInput,
    });

    // Simulate initial session loading for skeleton UI
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingSessions(false);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // Show skeleton loaders on initial message load
    React.useEffect(() => {
        if (history.length > 0 && isLoadingMessages) {
            setIsLoadingMessages(false);
        }
    }, [history, isLoadingMessages]);

    // Default secondary model if not set
    React.useEffect(() => {
        if (battleMode && !secondaryModel && availableModels.length > 1) {
            setSecondaryModel(availableModels.find(m => m.id !== currentModel)?.id || availableModels[0].id);
        }
    }, [battleMode, availableModels, currentModel, secondaryModel, setSecondaryModel]);

    const { prompts } = usePrompts();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<number[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = React.useState(0);
    const [showSearchResultsList, setShowSearchResultsList] = React.useState(false);
    const {
        hasConfiguredMcpServers,
        isCompactViewport,
        VirtuosoComponent,
        isCloudSyncAuthenticated,
        setIsCloudSyncAuthenticated,
        githubConfigured,
        integrationAvailability,
    } = useChatLifecycleState({
        historyLength: history.length,
        showSearchResultsList,
        searchResultsLength: searchResults.length,
    });
    const {
        tools: mcpTools,
        connectedCount: mcpConnectedCount,
        isAvailable: mcpAvailable,
        executeTool: executeMcpTool,
    } = useMCP({ enabled: hasConfiguredMcpServers, deferUntilIdle: true });
    const [isDragging, setIsDragging] = React.useState(false);
    const [showInspector, setShowInspector] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<SidebarTab>('controls');
    const [isEditingSystemPrompt, setIsEditingSystemPrompt] = React.useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = React.useState<number | null>(null);
    const [editedMessageContent, setEditedMessageContent] = React.useState<string>('');
    const [showShortcutsModal, setShowShortcutsModal] = React.useState(false);
    const virtuosoRef = React.useRef<any>(null);
    const searchResultPreviewCacheRef = React.useRef<Map<number, SearchResultPreviewCacheEntry>>(new Map());
    const rowMetadataCacheRef = React.useRef(createChatRowMetadataCacheState());

    const [hasCompletedLaunchChecklist, setHasCompletedLaunchChecklist] = React.useState<boolean>(() => {
        return localStorage.getItem('chat_launch_checklist_completed') === '1';
    });
    const [showBottomControls, setShowBottomControls] = React.useState<boolean>(() => {
        const stored = localStorage.getItem('chat_show_bottom_controls');
        return stored !== '0';
    });
    const [devMonitorsEnabled, setDevMonitorsEnabled] = React.useState<boolean>(() => {
        return localStorage.getItem(CHAT_DEV_MONITORS_ENABLED_KEY) === '1';
    });
    const [messageRatings, setMessageRatings] = React.useState<Record<number, 'up' | 'down'>>({});
    const [jsonMode, setJsonMode] = React.useState(false);
    const [showAnalytics, setShowAnalytics] = React.useState(false);
    const [usageStats, setUsageStats] = React.useState<UsageStatsRecord[]>([]);
    const [comparisonIndex, setComparisonIndex] = React.useState<number | null>(null);
    const [projectContext, setProjectContext] = React.useState<ProjectContext | null>(null);
    const [projectContextFeatureEnabled, setProjectContextFeatureEnabled] = React.useState(readPersistedProjectContextFeatureEnabled);
    const [includeContextInMessages, setIncludeContextInMessages] = React.useState(true);
    const [showGithubInput, setShowGithubInput] = React.useState(false);
    const [githubUrl, setGithubUrl] = React.useState('');

    // Conversation branching state
    const [showTreeView, setShowTreeView] = React.useState(false);
    const [branchingEnabled, setBranchingEnabled] = React.useState(false);

    // Export dialog state
    const [showExportDialog, setShowExportDialog] = React.useState(false);

    // Global search dialog state
    const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);

    // A/B Testing panel state
    const [showABTesting, setShowABTesting] = React.useState(false);

    // Prompt Optimization panel state
    const [showPromptOptimization, setShowPromptOptimization] = React.useState(false);

    // Calendar schedule dialog state
    const [showCalendarSchedule, setShowCalendarSchedule] = React.useState(false);

    // Smart Suggestions state
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [showRecommendations, setShowRecommendations] = React.useState(false);
    const [showWorkflows, setShowWorkflows] = React.useState(false);
    const [showAPIPlayground, setShowAPIPlayground] = React.useState(false);
    const [showDeveloperDocs, setShowDeveloperDocs] = React.useState(false);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [showPluginManager, setShowPluginManager] = React.useState(false);
    const [showCodeIntegration, setShowCodeIntegration] = React.useState(false);
    const [selectedCode, setSelectedCode] = React.useState<{ code: string; language: string } | null>(null);
    const [showWorkspaceViews, setShowWorkspaceViews] = React.useState(false);
    const [contextManagementService, setContextManagementService] = React.useState<ContextManagementServiceType | null>(null);
    const [showBCI, setShowBCI] = React.useState(false);
    const [showMultiModal, setShowMultiModal] = React.useState(false);
    const [showCollaboration, setShowCollaboration] = React.useState(false);
    const [showCloudSync, setShowCloudSync] = React.useState(false);
    const [showTeamWorkspaces, setShowTeamWorkspaces] = React.useState(false);
    const [showEnterpriseCompliance, setShowEnterpriseCompliance] = React.useState(false);
    const [cloudSyncStatus, setCloudSyncStatus] = React.useState<CloudSyncStatus | null>(null);
    const [showBlockchain, setShowBlockchain] = React.useState(false);
    const [showAIAgents, setShowAIAgents] = React.useState(false);
    const [showFederatedLearning, setShowFederatedLearning] = React.useState(false);

    // Template library dialog state
    const [showTemplateLibrary, setShowTemplateLibrary] = React.useState(false);

    // Variable insert menu state
    const [showVariableMenu, setShowVariableMenu] = React.useState(false);
    const messageListRef = React.useRef<HTMLDivElement | null>(null);
    const composerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const longPressMenuRef = React.useRef<HTMLDivElement | null>(null);

    const [composerOverlayHeight, setComposerOverlayHeight] = React.useState<number>(showBottomControls ? 300 : 196);

    // Initialize conversation tree only when branching is enabled.
    const treeHook = useConversationTree(history, { enabled: branchingEnabled });

    const hydrateUsageStats = React.useCallback(async () => {
        try {
            const analyticsStore = await loadAnalyticsStore();
            setUsageStats(analyticsStore.readAnalyticsUsageStats());
        } catch {
            setUsageStats([]);
        }
    }, []);

    const shouldLoadContextManagement = history.length > 0 || sidebarOpen || projectContextFeatureEnabled;
    React.useEffect(() => {
        if (!shouldLoadContextManagement || contextManagementService) {
            return;
        }

        let isMounted = true;
        void loadContextManagementService()
            .then((service) => {
                if (!isMounted) return;
                setContextManagementService(() => service);
            })
            .catch(() => {
                if (!isMounted) return;
                setContextManagementService(null);
            });
        return () => {
            isMounted = false;
        };
    }, [shouldLoadContextManagement, contextManagementService]);

    const shouldLoadCloudSyncService = showCloudSync || isCloudSyncAuthenticated;
    React.useEffect(() => {
        if (!shouldLoadCloudSyncService) {
            setCloudSyncStatus(null);
            return;
        }

        let cancelled = false;

        const refreshCloudSyncStatus = async () => {
            try {
                const cloudSyncService = await loadCloudSyncService();
                if (cancelled) return;
                setCloudSyncStatus(cloudSyncService.getSyncStatus());
                setIsCloudSyncAuthenticated(cloudSyncService.isAuthenticated());
            } catch {
                if (cancelled) return;
                setCloudSyncStatus(null);
            }
        };

        void refreshCloudSyncStatus();
        const interval = setInterval(() => {
            void refreshCloudSyncStatus();
        }, 5000);

        const handleRefresh = () => {
            void refreshCloudSyncStatus();
        };
        window.addEventListener('focus', handleRefresh);
        window.addEventListener('storage', handleRefresh);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', handleRefresh);
            window.removeEventListener('storage', handleRefresh);
        };
    }, [shouldLoadCloudSyncService]);

    const cloudSyncBadge = React.useMemo(() => {
        if (!isCloudSyncAuthenticated) {
            return {
                label: 'Cloud Off',
                className: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
                title: 'Cloud sync is not authenticated',
            };
        }

        if (!cloudSyncStatus?.lastSyncedAt) {
            return {
                label: 'Cloud Ready',
                className: 'bg-cyan-900/40 hover:bg-cyan-800/40 text-cyan-300 border-cyan-700/60',
                title: 'Cloud sync is authenticated and ready',
            };
        }

        const ageMs = Date.now() - cloudSyncStatus.lastSyncedAt;
        if (ageMs < 5 * 60 * 1000) {
            return {
                label: 'Cloud Synced',
                className: 'bg-emerald-900/40 hover:bg-emerald-800/40 text-emerald-300 border-emerald-700/60',
                title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
            };
        }

        return {
            label: 'Cloud Stale',
            className: 'bg-amber-900/40 hover:bg-amber-800/40 text-amber-300 border-amber-700/60',
            title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
        };
    }, [cloudSyncStatus, isCloudSyncAuthenticated]);

    React.useEffect(() => {
        if (isCompactViewport && showHistory) {
            setShowHistory(false);
        }
    }, [isCompactViewport, setShowHistory, showHistory]);

    React.useEffect(() => {
        if (!showRequestLog || hasHydratedApiLogs) return;
        let cancelled = false;
        void loadActivityLogService()
            .then((service) => {
                if (cancelled) return;
                setApiLogs(service.getEntries());
                setApiLogCount(service.getEntryCount());
                setHasHydratedApiLogs(true);
            })
            .catch(() => {
                if (cancelled) return;
                setApiLogs([]);
                setHasHydratedApiLogs(true);
            });
        return () => {
            cancelled = true;
        };
    }, [showRequestLog, hasHydratedApiLogs]);

    React.useEffect(() => {
        if (!showAnalytics) return;
        void hydrateUsageStats();
    }, [showAnalytics, hydrateUsageStats]);

    React.useEffect(() => {
        localStorage.setItem('chat_show_bottom_controls', showBottomControls ? '1' : '0');
        if (!showBottomControls) {
            setShowExpertMenu(false);
            setShowVariableMenu(false);
        }
    }, [showBottomControls]);

    React.useEffect(() => {
        const composerElement = composerContainerRef.current;
        if (!composerElement) return;

        const measureComposerHeight = () => {
            const nextHeight = Math.ceil(composerElement.getBoundingClientRect().height);
            if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
            setComposerOverlayHeight((previousHeight) => (previousHeight === nextHeight ? previousHeight : nextHeight));
        };

        measureComposerHeight();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            measureComposerHeight();
        });
        resizeObserver.observe(composerElement);

        return () => {
            resizeObserver.disconnect();
        };
    }, [showBottomControls, isCompactViewport]);

    React.useEffect(() => {
        try {
            localStorage.setItem(CHAT_DEV_MONITORS_ENABLED_KEY, devMonitorsEnabled ? '1' : '0');
        } catch {
            // Ignore storage failures for dev monitor preferences.
        }
    }, [devMonitorsEnabled]);

    // Sync tree with history when branching is enabled or when history changes
    React.useEffect(() => {
        if (branchingEnabled && history.length > 0) {
            // Replace messages in tree with current history
            console.log('[TreeSync] Syncing tree with history:', history.length, 'messages');
            treeHook.replaceMessages(history);
        }
    }, [branchingEnabled, history.length]); // Run when branching is enabled OR history length changes

    useChatDevMonitors({
        enabled: devMonitorsEnabled,
        historyLength: history.length,
        virtuosoRef,
        virtuosoReadyKey: VirtuosoComponent,
    });
    const {
        isFetchingGithub,
        executeGithubFetch,
        executeChatCompletion,
        handleInsertToFile,
    } = useChatExternalActions({
        availableModels,
        currentModel,
        temperature,
        topP,
        maxTokens,
        appendMessage,
        githubUrl,
        setGithubUrl,
        mcpAvailable,
        mcpTools,
        executeMcpTool,
    });

    const currentModelObj = React.useMemo(
        () => availableModels.find(m => m.id === currentModel),
        [availableModels, currentModel]
    );
    const navigateToTab = React.useCallback((tab: 'chat' | 'models' | 'settings') => {
        window.dispatchEvent(new CustomEvent('app:navigate-tab', { detail: { tab } }));
    }, []);
    const requestConnectionRefresh = React.useCallback(() => {
        window.dispatchEvent(new CustomEvent('chat-refresh-connections'));
        toast.info('Refreshing provider connection checks...');
    }, []);
    const selectFirstModel = React.useCallback(() => {
        if (!availableModels.length) {
            toast.error('No models available to select yet.');
            return;
        }
        setCurrentModel(availableModels[0].id);
        toast.success(`Selected model: ${availableModels[0].name}`);
    }, [availableModels, setCurrentModel]);
    const insertStarterPrompt = React.useCallback(() => {
        setInput('Help me validate my setup and run a quick first task.');
        toast.success('Starter prompt inserted.');
    }, [setInput]);
    const providerReady = connectionStatus.local === 'online' || connectionStatus.remote === 'online';
    const modelReady = Boolean(currentModel);
    const promptReady = input.trim().length > 0;
    const readinessSteps = React.useMemo<LaunchReadinessStep[]>(
        () =>
            buildReadinessSteps({
                providerReady,
                localStatus: connectionStatus.local,
                remoteStatus: connectionStatus.remote,
                modelReady,
                modelLabel: currentModelObj?.name || currentModel,
                promptReady,
            }),
        [providerReady, connectionStatus.local, connectionStatus.remote, modelReady, currentModelObj, currentModel, promptReady]
    );
    const readinessCompletedCount = readinessSteps.filter(step => step.complete).length;
    const launchChecklistComplete = readinessCompletedCount === readinessSteps.length;
    const shouldShowLaunchChecklist = !hasCompletedLaunchChecklist && !launchChecklistComplete;
    const diagnosticsStatus = React.useMemo(
        () =>
            getDiagnosticsStatus({
                providerReady,
                modelReady,
                historyLength: history.length,
                promptReady,
            }),
        [providerReady, modelReady, history.length, promptReady]
    );
    React.useEffect(() => {
        if (!launchChecklistComplete || hasCompletedLaunchChecklist) return;
        setHasCompletedLaunchChecklist(true);
        localStorage.setItem('chat_launch_checklist_completed', '1');
    }, [launchChecklistComplete, hasCompletedLaunchChecklist]);

    const handleToggleDevMonitors = React.useCallback(() => {
        setDevMonitorsEnabled((prev) => !prev);
    }, []);
    const handleOpenSettingsTab = React.useCallback(() => {
        navigateToTab('settings');
    }, [navigateToTab]);
    const handleOpenModelsTab = React.useCallback(() => {
        navigateToTab('models');
    }, [navigateToTab]);

    const {
        showDiagnosticsPanel,
        diagnosticsPanelPosition,
        diagnosticsPanelRef,
        diagnosticsButtonRef,
        diagnosticsPopoverRef,
        handleToggleDiagnosticsPanel,
        handleCloseDiagnosticsPanel,
        handleDiagnosticsOpenSettings,
        handleDiagnosticsOpenModels,
        handleDiagnosticsInsertStarterPrompt,
    } = useChatDiagnosticsPanel({
        onOpenSettings: handleOpenSettingsTab,
        onOpenModels: handleOpenModelsTab,
        onInsertStarterPrompt: insertStarterPrompt,
    });

    const {
        recentPerfBenchmarks,
        activePerfBenchmark,
        latestPerfBenchmark,
        perfSummary,
        beginPerfBenchmark,
        clearPerfHistory,
    } = useChatPerfBenchmarks({
        storageKey: CHAT_PERF_HISTORY_KEY,
        history,
        attachmentsLength: attachments.length,
        imageAttachmentsLength: imageAttachments.length,
        battleMode,
        secondaryModel,
        prefill,
        currentModel,
    });

    const diagnosticsPopover = React.useMemo(() => {
        if (!showDiagnosticsPanel) {
            return null;
        }

        return (
            <React.Suspense fallback={null}>
                <ChatDiagnosticsPopover
                    ref={diagnosticsPopoverRef}
                    position={diagnosticsPanelPosition}
                    status={diagnosticsStatus}
                    activePerfBenchmark={activePerfBenchmark}
                    recentPerfBenchmarksCount={recentPerfBenchmarks.length}
                    latestPerfBenchmark={latestPerfBenchmark}
                    perfSummary={perfSummary}
                    formatPerfMs={formatPerfMs}
                    devMonitorsEnabled={devMonitorsEnabled}
                    providerReady={providerReady}
                    modelReady={modelReady}
                    historyLength={history.length}
                    promptReady={promptReady}
                    onClose={handleCloseDiagnosticsPanel}
                    onClearPerfHistory={clearPerfHistory}
                    onToggleDevMonitors={handleToggleDevMonitors}
                    onRequestConnectionRefresh={requestConnectionRefresh}
                    onAutoSelectFirstModel={selectFirstModel}
                    onOpenSettings={handleDiagnosticsOpenSettings}
                    onOpenModels={handleDiagnosticsOpenModels}
                    onInsertStarterPrompt={handleDiagnosticsInsertStarterPrompt}
                />
            </React.Suspense>
        );
    }, [
        showDiagnosticsPanel,
        diagnosticsPanelPosition,
        diagnosticsStatus,
        activePerfBenchmark,
        recentPerfBenchmarks.length,
        latestPerfBenchmark,
        perfSummary,
        formatPerfMs,
        devMonitorsEnabled,
        providerReady,
        modelReady,
        history.length,
        promptReady,
        handleCloseDiagnosticsPanel,
        clearPerfHistory,
        handleToggleDevMonitors,
        requestConnectionRefresh,
        selectFirstModel,
        handleDiagnosticsOpenSettings,
        handleDiagnosticsOpenModels,
        handleDiagnosticsInsertStarterPrompt,
    ]);

    const contextWindowTokens = currentModelObj?.contextLength || 32768;
    const {
        autoSummarizeContext,
        setAutoSummarizeContext,
        contextUsage,
        trimSuggestionRows,
        recentContextRows,
        toggleMessageContextInclusion,
        applyTrimSuggestions,
        includeAllContext,
        excludeTrimSuggestion,
        buildContextSendOptions,
    } = useChatContextOptimizer({
        sessionId,
        history,
        systemPrompt,
        input,
        maxTokens,
        maxContextTokens: contextWindowTokens,
        contextManagementService,
    });

    const enableProjectContextFeature = React.useCallback(() => {
        setProjectContextFeatureEnabled(true);
        persistProjectContextFeatureEnabled(true);
    }, []);

    const { sendMessageWithContext } = useChatSendPipeline({
        input,
        setInput,
        projectContext,
        includeContextInMessages,
        sendMessage,
        currentModel,
        availableModels,
        sessionId,
        savedSessions,
        historyLength: history.length,
        buildContextSendOptions,
        beginPerfBenchmark,
        loadPromptVariableService,
        loadProjectContextService,
    });

    // Project Context subscription (lazily enabled when the feature is used)
    React.useEffect(() => {
        if (!projectContextFeatureEnabled) return;
        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        void loadProjectContextService()
            .then((projectContextService) => {
                if (!isMounted) return;
                unsubscribe = projectContextService.subscribe((context) => {
                    setProjectContext(context);
                });
                setProjectContext(projectContextService.getContext());
            })
            .catch(() => {
                if (!isMounted) return;
                setProjectContext(null);
            });

        return () => {
            isMounted = false;
            unsubscribe?.();
        };
    }, [projectContextFeatureEnabled]);

    // Auto-categorization and auto-tagging
    React.useEffect(() => {
        if (history.length > 0 && sessionId) {
            // Auto-categorize after 3+ messages
            if (history.length >= 3) {
                void loadAutoCategorizationService()
                    .then((service) => service.categorizeConversation(sessionId))
                    .catch(console.error);
            }
            // Auto-tag after 2+ messages
            if (history.length >= 2) {
                void loadAutoTaggingService()
                    .then((service) => service.tagConversation(sessionId))
                    .catch(console.error);
            }
        }
    }, [history.length, sessionId]);

    // Check workflows when message is sent
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
    }, [history.length, currentModel]);

    // Debounce search query (300ms delay)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);
    const searchableMessageContent = React.useMemo(
        () => history.map((msg) => (typeof msg.content === 'string' ? msg.content.toLowerCase() : '')),
        [history]
    );

    // Search within chat
    React.useEffect(() => {
        const normalizedQuery = normalizeChatSearchQuery(debouncedSearchQuery);
        if (!normalizedQuery) {
            setSearchResults((prev) => (prev.length === 0 ? prev : []));
            setCurrentSearchIndex((prev) => (prev === 0 ? prev : 0));
            return;
        }

        const nextMatches = findChatSearchMatches(searchableMessageContent, normalizedQuery);
        const matchesChanged = !areSearchResultIndicesEqual(searchResults, nextMatches);
        if (matchesChanged) {
            setSearchResults(nextMatches);
            if (currentSearchIndex !== 0) {
                setCurrentSearchIndex(0);
            }
            return;
        }

        if (nextMatches.length === 0) {
            if (currentSearchIndex !== 0) {
                setCurrentSearchIndex(0);
            }
            return;
        }

        if (currentSearchIndex >= nextMatches.length) {
            setCurrentSearchIndex(nextMatches.length - 1);
        }
    }, [debouncedSearchQuery, searchableMessageContent, searchResults, currentSearchIndex]);

    // Navigate to specific search result
    const navigateToSearchResult = React.useCallback((resultIndex: number) => {
        setCurrentSearchIndex(resultIndex);
        setShowSearchResultsList(false);
    }, []);

    // Scroll to current search result
    React.useEffect(() => {
        if (searchResults.length > 0 && virtuosoRef.current) {
            const targetIndex = searchResults[currentSearchIndex];
            virtuosoRef.current.scrollToIndex({
                index: targetIndex,
                align: 'center',
                behavior: 'smooth'
            });
        }
    }, [currentSearchIndex, searchResults]);

    // Confirm before closing unsaved
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (input.trim() !== '' || (history.length > 0 && history[history.length - 1].isLoading)) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome/Electron
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [input, history]);

    const {
        slashMatch,
        setSlashMatch,
        activePromptIndex,
        setActivePromptIndex,
        textareaRef,
        filteredPrompts,
        insertPrompt,
    } = useChatSlashPrompts({
        prompts,
        input,
        setInput,
    });

    // Wrapper for loadSession with loading state
    const handleLoadSession = React.useCallback((id: string) => {
        setIsLoadingMessages(true);
        loadSession(id);
        // Simulate brief loading state for smooth skeleton transition
        setTimeout(() => {
            setIsLoadingMessages(false);
        }, 300);
    }, [loadSession]);
    const {
        handleEditMessage,
        handleSaveEdit,
        handleCancelEdit,
        handleRegenerateResponse,
        handleBranchConversation,
    } = useChatMessageActionsController({
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
    });

    const handleRateMessage = (index: number, rating: 'up' | 'down') => {
        setMessageRatings(prev => {
            const newRatings = { ...prev };
            if (newRatings[index] === rating) {
                // Remove rating if clicking the same button
                delete newRatings[index];
            } else {
                newRatings[index] = rating;
            }
            return newRatings;
        });
    };

    const handleToggleHistoryPanel = React.useCallback(() => {
        setShowHistory((prev) => !prev);
    }, []);

    const {
        handleOpenCodeIntegration,
        handleOpenExportDialog,
        handleExportSessionToObsidian,
        handleSaveSessionToNotion,
        handleSendSessionToSlack,
        handleSendSessionToDiscord,
        handleSendSessionByEmail,
        handleOpenCalendarSchedule,
    } = useChatSessionIntegrations({
        sessionId,
        history,
        setSelectedCode,
        setShowCodeIntegration,
        setShowExportDialog,
        setShowCalendarSchedule,
    });

    const {
        topHeaderPrimaryActions,
        experimentalFeatureActions,
        handleOpenCloudSyncPanel,
    } = useChatHeaderActions({
        createNewSession,
        setShowTemplateLibrary,
        setShowABTesting,
        setShowPromptOptimization,
        setShowWorkflows,
        setShowAPIPlayground,
        setShowDeveloperDocs,
        setShowPluginManager,
        setShowWorkspaceViews,
        setShowCloudSync,
        setShowBCI,
        setShowMultiModal,
        setShowCollaboration,
        setShowTeamWorkspaces,
        setShowEnterpriseCompliance,
        setShowBlockchain,
        setShowAIAgents,
        setShowFederatedLearning,
    });

    const {
        modelOptionItems,
        allModelOptionElements,
        nonCurrentModelOptionElements,
        modelNameById,
        handleCurrentModelChange,
        handleSecondaryModelChange,
        handleToggleRequestLog,
        handleToggleSearch,
    } = useChatHeaderUtilityControls({
        availableModels,
        currentModel,
        setCurrentModel,
        setSecondaryModel,
        setShowRequestLog,
        setShowSearch,
    });
    const {
        bookmarkedMessages,
        conversationFontSize,
        longPressMenu,
        swipeSessionIndicator,
        toggleBookmark,
        handleLongPressAction,
    } = useChatGestureInteractions({
        history,
        sessionId,
        savedSessions,
        loadSession,
        messageListRef,
        longPressMenuRef,
        onEditMessage: handleEditMessage,
        onRegenerateResponse: handleRegenerateResponse,
        onBranchConversation: handleBranchConversation,
        onDeleteMessage: deleteMessage,
    });

    const handleClearChat = React.useCallback(() => {
        if (history.length > 0 && window.confirm('Clear all messages in this chat?')) {
            replaceHistory([]);
            toast.success('Chat cleared');
        }
    }, [history.length, replaceHistory]);

    const handleCopyLastResponse = React.useCallback(() => {
        const lastAssistantMessage = [...history].reverse().find((message) => message.role === 'assistant');
        if (lastAssistantMessage?.content) {
            void navigator.clipboard.writeText(lastAssistantMessage.content);
            toast.success('Last response copied to clipboard');
        }
    }, [history]);

    const handleOpenExportDialogShortcut = React.useCallback(() => {
        if (history.length > 0) {
            setShowExportDialog(true);
            return;
        }
        toast.info('No messages to export');
    }, [history.length]);

    const handleToggleTreeView = React.useCallback(() => {
        setShowTreeView((prev) => !prev);
        if (!branchingEnabled) {
            setBranchingEnabled(true);
            toast.info('Conversation branching enabled');
        }
    }, [branchingEnabled]);

    const handleToggleBranching = React.useCallback(() => {
        if (!branchingEnabled) {
            setBranchingEnabled(true);
            toast.success('Conversation branching enabled! Create branches by sending different messages.');
            return;
        }
        toast.info('Branching is ready - send a different message to create a branch');
    }, [branchingEnabled]);

    const handleNavigateBranch = React.useCallback((direction: -1 | 1) => {
        const currentIndex = treeHook.getCurrentSiblingIndex();
        treeHook.switchToSibling(currentIndex + direction);
    }, [treeHook]);

    useChatKeyboardController({
        historyLength: history.length,
        branchingEnabled,
        showShortcutsModal,
        editingMessageIndex,
        onOpenShortcutsModal: () => setShowShortcutsModal(true),
        onNewChat: createNewSession,
        onToggleHistory: handleToggleHistoryPanel,
        onClearChat: handleClearChat,
        onToggleSearch: handleToggleSearch,
        onCopyLastResponse: handleCopyLastResponse,
        onOpenExportDialog: handleOpenExportDialogShortcut,
        onOpenGlobalSearch: () => setShowGlobalSearch(true),
        onOpenRecommendations: () => setShowRecommendations(true),
        onToggleTreeView: handleToggleTreeView,
        onToggleBranching: handleToggleBranching,
        onNavigateBranch: handleNavigateBranch,
        onCloseShortcutsModal: () => setShowShortcutsModal(false),
        onCancelEdit: handleCancelEdit,
        onStopGeneration: stopGeneration,
    });

    const {
        handleToggleSearchResultsList,
        handleSearchQueryChange,
        handlePreviousSearchResult,
        handleNextSearchResult,
        handleCloseSearchPanel,
        renderItemContent,
        renderSearchResultItem,
    } = useChatMessageListSearch({
        history,
        isLoadingMessages,
        searchResults,
        currentSearchIndex,
        editingMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        selectedToken,
        messageRatings,
        editedMessageContent,
        loadedMessageIndices,
        rowMetadataCacheRef,
        searchResultPreviewCacheRef,
        loadMessageRange,
        setEditedMessageContent,
        setShowSearchResultsList,
        setSearchQuery,
        setCurrentSearchIndex,
        setShowSearch,
        deleteMessage,
        handleEditMessage,
        handleRegenerateResponse,
        handleBranchConversation,
        mcpAvailable,
        handleInsertToFile,
        setSelectedToken,
        setActiveTab,
        setComparisonIndex,
        modelNameById,
        currentModel,
        secondaryModel,
        handleRateMessage,
        showInspector,
        textareaRef,
        setInput,
        handleCancelEdit,
        handleSaveEdit,
        selectChoice,
        toggleBookmark,
        conversationFontSize,
        isCompactViewport,
        navigateToSearchResult,
    });

    const longPressMessage = longPressMenu ? history[longPressMenu.messageIndex] : null;
    const longPressMessageCapabilities = React.useMemo(
        () => getMessageActionCapabilities(longPressMessage),
        [longPressMessage?.role, longPressMessage?.isLoading]
    );
    const isLongPressMessageBookmarked = React.useMemo(
        () => Boolean(longPressMenu && bookmarkedMessages.has(longPressMenu.messageIndex)),
        [bookmarkedMessages, longPressMenu]
    );
    const {
        handleToggleBottomControls,
        handleToggleSuggestions,
        handleSendComposerMessage,
        handleComposerDragOver,
        handleComposerDragLeave,
        handleComposerDrop,
        handleComposerInputChange,
        handleComposerInputPaste,
        handleComposerInputKeyDown,
        handleSelectSuggestion,
        handleCloseSuggestionsPanel,
        handlePrefillChange,
        handleUrlInputChange,
        handleUrlInputKeyDown,
        handleGithubUrlChange,
        handleGithubInputKeyDown,
        handleToggleIncludeContextInMessages,
        handleClearProjectContext,
        handleStartWatchingProjectContext,
        handleTogglePrefill,
        handleToggleUrlInput,
        handleToggleGithubInput,
        handleProjectContextControlClick,
    } = useChatComposerInteractions({
        setShowBottomControls,
        setShowSuggestions,
        setIsDragging,
        setSlashMatch,
        setActivePromptIndex,
        setInput,
        setPrefill,
        setShowUrlInput,
        setShowGithubInput,
        setUrlInput,
        setGithubUrl,
        setIncludeContextInMessages,
        textareaRef,
        slashMatch,
        filteredPrompts,
        activePromptIndex,
        executeWebFetch,
        executeGithubFetch,
        sendMessageWithContext,
        insertPrompt,
        addAttachment,
        addImageAttachment,
        projectContext,
        enableProjectContextFeature,
        loadProjectContextService,
    });
    const {
        handleToggleThinking,
        handleCloseVariableMenu,
        handleInsertVariable,
        handleCloseSidebar,
        handleSelectInspectorTab,
        handleSelectControlsTab,
        handleSelectPromptsTab,
        handleSelectDocumentsTab,
        handleStartEditingSystemPrompt,
        handleStopEditingSystemPrompt,
        handleSystemPromptChange,
        handleToggleBattleModeWithSecondaryFallback,
        handleToggleAutoRouting,
        handleToggleToolByName,
        handleToggleResponseFormat,
        handleToggleAutoSummarizeContext,
        handleApplySuggestedTrim,
        handleIncludeAllContext,
        handleExcludeTrimSuggestion,
        handleBatchSizeChange,
        handleTemperatureChange,
        handleTopPChange,
        handleMaxTokensChange,
        secondaryModelDisplayName,
        maxTokensSliderConfig,
        composerControlPillActions,
        composerVariableContext,
    } = useChatComposerControlBar({
        prefill,
        showUrlInput,
        githubConfigured,
        showGithubInput,
        hasProjectContext: Boolean(projectContext),
        thinkingEnabled,
        setThinkingEnabled,
        battleMode,
        setBattleMode,
        showInspector,
        setShowInspector,
        expertMode,
        setShowExpertMenu,
        showVariableMenu,
        setShowVariableMenu,
        jsonMode,
        setJsonMode,
        streamingEnabled,
        setStreamingEnabled,
        historyLength: history.length,
        sidebarOpen,
        setSidebarOpen,
        setShowAnalytics,
        setShowRecommendations,
        setInput,
        setActiveTab,
        setIsEditingSystemPrompt,
        setSystemPrompt,
        secondaryModel,
        modelOptionItems,
        currentModel,
        setSecondaryModel,
        setAutoRouting,
        setEnabledTools,
        setResponseFormat,
        setAutoSummarizeContext,
        applyTrimSuggestions,
        includeAllContext,
        excludeTrimSuggestion,
        setBatchSize,
        setTemperature,
        setTopP,
        setMaxTokens,
        modelNameById,
        currentModelContextLength: currentModelObj?.contextLength,
        modelName: availableModels.find((model) => model.id === currentModel)?.name || currentModel,
        sessionId,
        sessionTitle: savedSessions.find((session) => session.id === sessionId)?.title || 'New Chat',
        handleTogglePrefill,
        handleToggleUrlInput,
        handleToggleGithubInput,
        handleProjectContextControlClick,
    });
    const composerBottomInset = isCompactViewport ? 16 : 24;
    const messageListFooterHeight = Math.max(132, composerOverlayHeight + composerBottomInset + 16);

    return (
        <ChatWorkspaceShell
            showHistory={showHistory}
            isCompactViewport={isCompactViewport}
            historySidebar={(
                <>
                    <div className="p-4 border-b border-slate-800 font-bold flex justify-between items-center text-slate-200">
                        <span className="flex items-center gap-2"><Clock size={16} /> Recent Chats</span>
                        <button onClick={() => setShowHistory(false)} className="touch-target hover:text-white text-slate-400 transition-colors"><X size={18} /></button>
                    </div>
                    <React.Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading chat history...</div>}>
                        <SidebarHistory
                            sessions={savedSessions}
                            currentSessionId={sessionId}
                            onLoadSession={handleLoadSession}
                            onDeleteSession={deleteSession}
                            onRenameSession={renameSession}
                            onTogglePinSession={togglePinSession}
                            isLoading={isLoadingSessions}
                        />
                    </React.Suspense>
                </>
            )}
            header={(
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 backdrop-blur-sm shadow-sm z-10 flex-wrap">
                    <TopHeaderPrimaryActions
                        isCompactViewport={isCompactViewport}
                        showHistory={showHistory}
                        onToggleHistory={handleToggleHistoryPanel}
                        actions={topHeaderPrimaryActions}
                    />
                    <ExperimentalFeaturesDropdown actions={experimentalFeatureActions} />
                    <button
                        onClick={handleOpenCloudSyncPanel}
                        title={cloudSyncBadge.title}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${cloudSyncBadge.className}`}
                    >
                        <Cloud size={14} /> <span>{cloudSyncBadge.label}</span>
                    </button>
                    <TopHeaderSecondaryActions
                        hasHistory={history.length > 0}
                        showTreeView={showTreeView}
                        integrationAvailability={integrationAvailability}
                        onOpenCodeIntegration={handleOpenCodeIntegration}
                        onClearChat={handleClearChat}
                        onOpenExportDialog={handleOpenExportDialog}
                        onToggleTreeView={handleToggleTreeView}
                        onExportSessionToObsidian={handleExportSessionToObsidian}
                        onSaveToNotion={handleSaveSessionToNotion}
                        onSendToSlack={handleSendSessionToSlack}
                        onSendToDiscord={handleSendSessionToDiscord}
                        onSendToEmail={handleSendSessionByEmail}
                        onOpenCalendarSchedule={handleOpenCalendarSchedule}
                    />
                    <TopHeaderModelUtilityControls
                        battleMode={battleMode}
                        currentModel={currentModel}
                        secondaryModel={secondaryModel}
                        allModelOptionElements={allModelOptionElements}
                        onCurrentModelChange={handleCurrentModelChange}
                        onSecondaryModelChange={handleSecondaryModelChange}
                        showRequestLog={showRequestLog}
                        onToggleRequestLog={handleToggleRequestLog}
                        apiLogCount={apiLogCount}
                        hasHistory={history.length > 0}
                        showSearch={showSearch}
                        onToggleSearch={handleToggleSearch}
                        diagnosticsPanelRef={diagnosticsPanelRef}
                        diagnosticsButtonRef={diagnosticsButtonRef}
                        diagnosticsStatusClassName={diagnosticsStatus.className}
                        diagnosticsStatusLabel={diagnosticsStatus.label}
                        diagnosticsReady={providerReady && modelReady}
                        showDiagnosticsPanel={showDiagnosticsPanel}
                        onToggleDiagnosticsPanel={handleToggleDiagnosticsPanel}
                        diagnosticsPopover={diagnosticsPopover}
                    />

                    <HeaderConnectionStatus
                        localStatus={connectionStatus.local}
                        remoteStatus={connectionStatus.remote}
                    />
                </div>
            )}
            searchPanel={(
                <ChatSearchPanel
                    showSearch={showSearch}
                    searchQuery={searchQuery}
                    onSearchQueryChange={handleSearchQueryChange}
                    hasResults={searchResults.length > 0}
                    currentSearchIndex={currentSearchIndex}
                    searchResultsCount={searchResults.length}
                    showSearchResultsList={showSearchResultsList}
                    onToggleSearchResultsList={handleToggleSearchResultsList}
                    onPreviousSearchResult={handlePreviousSearchResult}
                    onNextSearchResult={handleNextSearchResult}
                    onCloseSearch={handleCloseSearchPanel}
                    virtuosoComponent={VirtuosoComponent}
                    renderSearchResultItem={renderSearchResultItem}
                />
            )}
            summaryPanel={history.length >= 5 ? (
                <div className="px-6 py-2">
                    <React.Suspense fallback={<div className="text-xs text-slate-500">Loading summary...</div>}>
                        <ConversationSummaryPanel
                            sessionId={sessionId}
                            messages={history}
                            modelId={currentModel}
                        />
                    </React.Suspense>
                </div>
            ) : null}
            contextWindowPanel={history.length > 0 ? (
                <div className="px-6 pb-2">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-[11px] mb-2">
                            <span className="text-slate-400 uppercase tracking-wider font-semibold">Context Window</span>
                            <span className={`${contextUsage.warning ? 'text-amber-300' : 'text-slate-500'}`}>
                                {Math.min(100, Math.round(contextUsage.fillRatio * 100))}% • {contextUsage.totalTokens.toLocaleString()} / {contextUsage.maxContextTokens.toLocaleString()} tokens
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${contextUsage.fillRatio >= 0.9 ? 'bg-red-500' : contextUsage.fillRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, contextUsage.fillRatio * 100)}%` }}
                            />
                        </div>
                        {contextUsage.warning && (
                            <div className="mt-2 text-[11px] text-amber-300">
                                Context is above 80%. Open Controls and use Context Optimizer to trim or auto-summarize.
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
            messagesArea={(
                <>
                    <div ref={messageListRef} className="flex-1 overflow-hidden bg-background relative min-w-0 max-w-full">
                        {swipeSessionIndicator && (
                            <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-semibold">
                                {swipeSessionIndicator === 'next' ? 'Swiped to next chat' : 'Swiped to previous chat'}
                            </div>
                        )}
                        {history.length === 0 ? (
                            <React.Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-500">Loading starter workspace...</div>}>
                                <ChatEmptyState
                                    showBottomControls={showBottomControls}
                                    isReady={launchChecklistComplete || hasCompletedLaunchChecklist}
                                    showLaunchChecklist={shouldShowLaunchChecklist}
                                    readinessCompletedCount={readinessCompletedCount}
                                    readinessSteps={readinessSteps}
                                    onSelectPrompt={setInput}
                                />
                            </React.Suspense>
                        ) : VirtuosoComponent ? (
                            <VirtuosoComponent
                                ref={virtuosoRef}
                                style={{ height: '100%', width: '100%' }}
                                data={isLoadingMessages ? Array(6).fill(null) : history}
                                followOutput={(isAtBottom: boolean) => {
                                    const lastMsg = history[history.length - 1];
                                    if (lastMsg?.isLoading) return 'smooth';
                                    return isAtBottom ? 'auto' : false;
                                }}
                                overscan={{
                                    main: 300,
                                    reverse: 300
                                }}
                                increaseViewportBy={{
                                    top: 200,
                                    bottom: Math.max(220, messageListFooterHeight)
                                }}
                                defaultItemHeight={150}
                                atBottomThreshold={Math.max(100, Math.floor(messageListFooterHeight * 0.45))}
                                alignToBottom
                                className="custom-scrollbar px-6"
                                totalCount={isLoadingMessages ? 6 : history.length}
                                initialTopMostItemIndex={isLoadingMessages ? 0 : history.length - 1}
                                computeItemKey={(index: number, item: any) => isLoadingMessages ? `skeleton-${index}` : `${index}-${item.role}`}
                                itemContent={renderItemContent}
                                components={{
                                    Footer: () => <div style={{ height: `${messageListFooterHeight}px` }} />
                                }}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-slate-500">
                                Loading conversation...
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {longPressMenu && longPressMessage && (
                            <LongPressActionMenu
                                menuRef={longPressMenuRef}
                                menuPosition={longPressMenu}
                                messageIndex={longPressMenu.messageIndex}
                                isBookmarked={isLongPressMessageBookmarked}
                                capabilities={longPressMessageCapabilities}
                                onAction={handleLongPressAction}
                            />
                        )}
                    </AnimatePresence>
                </>
            )}
            composer={(
                <ChatComposerShell
                    composerContainerRef={composerContainerRef}
                    isCompactViewport={isCompactViewport}
                    isDragging={isDragging}
                    onDragOver={handleComposerDragOver}
                    onDragLeave={handleComposerDragLeave}
                    onDrop={handleComposerDrop}
                    attachmentsPanel={(
                        <ComposerAttachmentsPanel
                            attachments={attachments}
                            imageAttachments={imageAttachments}
                            onRemoveAttachment={removeAttachment}
                            onRemoveImageAttachment={removeImageAttachment}
                        />
                    )}
                    auxPanels={(
                        <ComposerAuxPanels
                            showSuggestions={showSuggestions}
                            history={history}
                            onSelectSuggestion={handleSelectSuggestion}
                            onCloseSuggestions={handleCloseSuggestionsPanel}
                            prefill={prefill}
                            onPrefillChange={handlePrefillChange}
                            showUrlInput={showUrlInput}
                            urlInput={urlInput}
                            onUrlInputChange={handleUrlInputChange}
                            onUrlInputKeyDown={handleUrlInputKeyDown}
                            onExecuteWebFetch={executeWebFetch}
                            isFetchingWeb={isFetchingWeb}
                            showGithubInput={showGithubInput}
                            githubUrl={githubUrl}
                            onGithubUrlChange={handleGithubUrlChange}
                            onGithubInputKeyDown={handleGithubInputKeyDown}
                            onExecuteGithubFetch={executeGithubFetch}
                            isFetchingGithub={isFetchingGithub}
                            githubConfigured={githubConfigured}
                            projectContext={projectContext}
                            includeContextInMessages={includeContextInMessages}
                            onToggleIncludeContextInMessages={handleToggleIncludeContextInMessages}
                            onClearProjectContext={handleClearProjectContext}
                            onStartWatchingProjectContext={handleStartWatchingProjectContext}
                            slashMatch={slashMatch}
                            filteredPrompts={filteredPrompts}
                            activePromptIndex={activePromptIndex}
                            onInsertPrompt={insertPrompt}
                        />
                    )}
                    textareaRef={textareaRef}
                    input={input}
                    slashMatchActive={Boolean(slashMatch)}
                    onInputChange={handleComposerInputChange}
                    onInputPaste={handleComposerInputPaste}
                    onInputKeyDown={handleComposerInputKeyDown}
                    showBottomControls={showBottomControls}
                    actionButtons={(
                        <ComposerActionButtons
                            showBottomControls={showBottomControls}
                            showSuggestions={showSuggestions}
                            canToggleSuggestions={history.length > 0}
                            canSend={Boolean(input.trim())}
                            onToggleBottomControls={handleToggleBottomControls}
                            onToggleSuggestions={handleToggleSuggestions}
                            onSend={handleSendComposerMessage}
                        />
                    )}
                    bottomControls={(
                        <ComposerControlPills
                            actions={composerControlPillActions}
                            mcpAvailable={mcpAvailable}
                            mcpConnectedCount={mcpConnectedCount}
                            mcpToolCount={mcpTools.length}
                            showExpertMenu={showExpertMenu}
                            onSelectExpert={handleExpertSelect}
                            showVariableMenu={showVariableMenu}
                            onCloseVariableMenu={handleCloseVariableMenu}
                            onInsertVariable={handleInsertVariable}
                            variableContext={composerVariableContext}
                        />
                    )}
                />
            )}
            sidebar={(
                <ChatSidebar
                    sidebarOpen={sidebarOpen}
                    isCompactViewport={isCompactViewport}
                    activeTab={activeTab}
                    onCloseSidebar={handleCloseSidebar}
                    tabsHeader={(
                        <SidebarTabsHeader
                            activeTab={activeTab}
                            onSelectInspectorTab={handleSelectInspectorTab}
                            onSelectControlsTab={handleSelectControlsTab}
                            onSelectPromptsTab={handleSelectPromptsTab}
                            onSelectDocumentsTab={handleSelectDocumentsTab}
                            onCloseSidebar={handleCloseSidebar}
                        />
                    )}
                    panels={{
                        controls: (
                            <ChatControlsTabPanel
                                systemPrompt={systemPrompt}
                                isEditingSystemPrompt={isEditingSystemPrompt}
                                onStartEditingSystemPrompt={handleStartEditingSystemPrompt}
                                onStopEditingSystemPrompt={handleStopEditingSystemPrompt}
                                onSystemPromptChange={handleSystemPromptChange}
                                battleMode={battleMode}
                                onToggleBattleMode={handleToggleBattleModeWithSecondaryFallback}
                                secondaryModel={secondaryModel}
                                secondaryModelDisplayName={secondaryModelDisplayName}
                                nonCurrentModelOptionElements={nonCurrentModelOptionElements}
                                onSecondaryModelChange={handleSecondaryModelChange}
                                thinkingEnabled={thinkingEnabled}
                                onToggleThinkingEnabled={handleToggleThinking}
                                autoRouting={autoRouting}
                                onToggleAutoRouting={handleToggleAutoRouting}
                                enabledTools={enabledTools}
                                onToggleTool={handleToggleToolByName}
                                jsonModeEnabled={responseFormat === 'json_object'}
                                onToggleJsonMode={handleToggleResponseFormat}
                                contextUsage={contextUsage}
                                autoSummarizeContext={autoSummarizeContext}
                                onToggleAutoSummarizeContext={handleToggleAutoSummarizeContext}
                                onApplySuggestedTrim={handleApplySuggestedTrim}
                                onIncludeAllContext={handleIncludeAllContext}
                                trimSuggestionRows={trimSuggestionRows}
                                onExcludeTrimSuggestion={handleExcludeTrimSuggestion}
                                recentContextRows={recentContextRows}
                                onToggleContextMessage={toggleMessageContextInclusion}
                                batchSize={batchSize}
                                onBatchSizeChange={handleBatchSizeChange}
                                temperature={temperature}
                                onTemperatureChange={handleTemperatureChange}
                                topP={topP}
                                onTopPChange={handleTopPChange}
                                maxTokens={maxTokens}
                                onMaxTokensChange={handleMaxTokensChange}
                                maxTokenSliderMax={maxTokensSliderConfig.sliderMax}
                                maxTokenSliderStep={maxTokensSliderConfig.sliderStep}
                                modelContextLength={currentModelObj?.contextLength}
                            />
                        ),
                        prompts: (
                            <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Library...</div>}>
                                <PromptManager />
                            </React.Suspense>
                        ),
                        documents: (
                            <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Documents...</div>}>
                                <DocumentChatPanel />
                            </React.Suspense>
                        ),
                        inspector: (
                            <ChatInspectorTabPanel
                                selectedToken={selectedToken}
                                onUpdateToken={updateMessageToken}
                            />
                        ),
                    } satisfies ChatSidebarPanels}
                />
            )}
            overlays={(
                <ChatOverlays
                    slots={{
                        keyboardShortcutsModal: showShortcutsModal ? (
                            <React.Suspense fallback={null}>
                                <KeyboardShortcutsModal
                                    isOpen={showShortcutsModal}
                                    onClose={() => setShowShortcutsModal(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        requestResponseLog: showRequestLog ? (
                            <React.Suspense fallback={null}>
                                <RequestResponseLog
                                    isOpen={showRequestLog}
                                    onClose={() => setShowRequestLog(false)}
                                    logs={apiLogs}
                                    onClear={() => {
                                        void loadActivityLogService()
                                            .then((service) => {
                                                service.clear();
                                            })
                                            .catch(() => {
                                                // Keep UI state cleared even if persistent store clear fails.
                                            });
                                        setApiLogs([]);
                                        setApiLogCount(0);
                                        setHasHydratedApiLogs(true);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        analyticsDashboard: showAnalytics ? (
                            <React.Suspense fallback={null}>
                                <AnalyticsDashboard
                                    isOpen={showAnalytics}
                                    onClose={() => setShowAnalytics(false)}
                                    usageHistory={usageStats}
                                />
                            </React.Suspense>
                        ) : null,
                        conversationTreeView: branchingEnabled && showTreeView && treeHook.treeManager ? (
                            <React.Suspense fallback={null}>
                                <ConversationTreeView
                                    isOpen={showTreeView}
                                    onClose={() => setShowTreeView(false)}
                                    treeManager={treeHook.treeManager}
                                    currentPath={treeHook.currentPath}
                                    onNavigateToNode={() => {
                                        setShowTreeView(false);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        exportDialog: showExportDialog ? (
                            <React.Suspense fallback={null}>
                                <ExportDialog
                                    isOpen={showExportDialog}
                                    onClose={() => setShowExportDialog(false)}
                                    messages={history}
                                    sessionTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
                                />
                            </React.Suspense>
                        ) : null,
                        globalSearchDialog: showGlobalSearch ? (
                            <React.Suspense fallback={null}>
                                <GlobalSearchDialog
                                    isOpen={showGlobalSearch}
                                    onClose={() => setShowGlobalSearch(false)}
                                    currentSessionId={sessionId}
                                    currentSessionTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Current Conversation'}
                                    onNavigateToMessage={(targetSessionId, messageIndex) => {
                                        if (targetSessionId !== sessionId) {
                                            handleLoadSession(targetSessionId);
                                        }
                                        setTimeout(() => {
                                            if (virtuosoRef.current && messageIndex >= 0) {
                                                virtuosoRef.current.scrollToIndex({
                                                    index: messageIndex,
                                                    align: 'center',
                                                    behavior: 'smooth'
                                                });
                                                toast.success(`Jumped to message #${messageIndex + 1}`);
                                            }
                                        }, 300);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        templateLibraryDialog: showTemplateLibrary ? (
                            <React.Suspense fallback={null}>
                                <TemplateLibraryDialog
                                    isOpen={showTemplateLibrary}
                                    onClose={() => setShowTemplateLibrary(false)}
                                    onUseTemplate={(template: ConversationTemplate) => {
                                        createNewSession();

                                        if (template.systemPrompt) {
                                            setSystemPrompt(template.systemPrompt);
                                        }
                                        if (template.settings) {
                                            if (template.settings.temperature !== undefined) setTemperature(template.settings.temperature);
                                            if (template.settings.topP !== undefined) setTopP(template.settings.topP);
                                            if (template.settings.maxTokens !== undefined) setMaxTokens(template.settings.maxTokens);
                                            if (template.settings.expertMode !== undefined) setExpertMode(template.settings.expertMode);
                                            if (template.settings.thinkingEnabled !== undefined) setThinkingEnabled(template.settings.thinkingEnabled);
                                        }

                                        if (template.initialMessages.length > 0) {
                                            replaceHistory(template.initialMessages.map(m => ({
                                                ...m,
                                                isLoading: false
                                            })));
                                        }
                                    }}
                                    currentMessages={history}
                                    currentSystemPrompt={systemPrompt}
                                    currentSettings={{
                                        temperature,
                                        topP,
                                        maxTokens,
                                        expertMode,
                                        thinkingEnabled
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        abTestingPanel: showABTesting ? (
                            <React.Suspense fallback={null}>
                                <ABTestingPanel
                                    isOpen={showABTesting}
                                    onClose={() => setShowABTesting(false)}
                                    onExecutePrompt={async (prompt, dialogSystemPrompt, modelId, dialogTemperature, dialogTopP, dialogMaxTokens) => {
                                        return executeChatCompletion({
                                            prompt,
                                            systemPrompt: dialogSystemPrompt,
                                            modelId,
                                            temperature: dialogTemperature,
                                            topP: dialogTopP,
                                            maxTokens: dialogMaxTokens,
                                        });
                                    }}
                                    currentInput={input}
                                    currentContext={history}
                                />
                            </React.Suspense>
                        ) : null,
                        promptOptimizationPanel: showPromptOptimization ? (
                            <React.Suspense fallback={null}>
                                <PromptOptimizationPanel
                                    isOpen={showPromptOptimization}
                                    onClose={() => setShowPromptOptimization(false)}
                                    initialPrompt={input}
                                    initialSystemPrompt={systemPrompt}
                                    onApplyOptimized={(optimizedPrompt, optimizedSystemPrompt) => {
                                        setInput(optimizedPrompt);
                                        if (optimizedSystemPrompt) {
                                            setSystemPrompt(optimizedSystemPrompt);
                                        }
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        calendarScheduleDialog: showCalendarSchedule ? (
                            <React.Suspense fallback={null}>
                                <CalendarScheduleDialog
                                    isOpen={showCalendarSchedule}
                                    onClose={() => setShowCalendarSchedule(false)}
                                    conversationTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
                                    conversationSummary={history.length > 0 ? `Review conversation with ${history.length} messages` : undefined}
                                />
                            </React.Suspense>
                        ) : null,
                        recommendationsPanel: showRecommendations ? (
                            <React.Suspense fallback={null}>
                                <ConversationRecommendationsPanel
                                    isOpen={showRecommendations}
                                    onClose={() => setShowRecommendations(false)}
                                    currentSessionId={sessionId}
                                    currentMessage={input}
                                    conversationHistory={history}
                                    onSelectConversation={(nextSessionId) => {
                                        handleLoadSession(nextSessionId);
                                        setShowRecommendations(false);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        workflowsManager: showWorkflows ? (
                            <React.Suspense fallback={null}>
                                <WorkflowsManager
                                    isOpen={showWorkflows}
                                    onClose={() => setShowWorkflows(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        apiPlayground: showAPIPlayground ? (
                            <React.Suspense fallback={null}>
                                <APIPlayground
                                    isOpen={showAPIPlayground}
                                    onClose={() => setShowAPIPlayground(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        developerDocs: showDeveloperDocs ? (
                            <React.Suspense fallback={null}>
                                <DeveloperDocumentationPanel
                                    isOpen={showDeveloperDocs}
                                    onClose={() => setShowDeveloperDocs(false)}
                                    onOpenAPIPlayground={() => {
                                        setShowDeveloperDocs(false);
                                        setShowAPIPlayground(true);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        pluginManager: showPluginManager ? (
                            <React.Suspense fallback={null}>
                                <PluginManager
                                    isOpen={showPluginManager}
                                    onClose={() => setShowPluginManager(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        codeIntegrationPanel: showCodeIntegration ? (
                            <React.Suspense fallback={null}>
                                <CodeIntegrationPanel
                                    isOpen={showCodeIntegration}
                                    onClose={() => {
                                        setShowCodeIntegration(false);
                                        setSelectedCode(null);
                                    }}
                                    code={selectedCode?.code}
                                    language={selectedCode?.language || 'javascript'}
                                    conversationHistory={history}
                                    onExecutePrompt={async (prompt, promptSystem) => {
                                        const result = await executeChatCompletion({
                                            prompt,
                                            systemPrompt: promptSystem,
                                        });
                                        return { content: result.content };
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        workspaceViews: showWorkspaceViews ? (
                            <React.Suspense fallback={null}>
                                <WorkspaceViewsPanel
                                    isOpen={showWorkspaceViews}
                                    onClose={() => setShowWorkspaceViews(false)}
                                    conversations={savedSessions.map(s => ({
                                        id: s.id,
                                        title: s.title,
                                        messageCount: s.messageCount || 0,
                                        lastActivity: s.lastMessageTime || s.createdAt,
                                        pinned: s.pinned,
                                        archived: false,
                                        category: undefined,
                                        tags: [],
                                        model: undefined,
                                    }))}
                                    onSelectConversation={(id) => {
                                        handleLoadSession(id);
                                        setShowWorkspaceViews(false);
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        interactiveTutorial: showTutorial && currentTutorial ? (
                            <React.Suspense fallback={null}>
                                <InteractiveTutorial
                                    tutorial={currentTutorial}
                                    onComplete={handleCompleteTutorial}
                                    onSkip={handleSkipTutorial}
                                />
                            </React.Suspense>
                        ) : null,
                        bciPanel: showBCI ? (
                            <React.Suspense fallback={null}>
                                <BCIPanel
                                    isOpen={showBCI}
                                    onClose={() => setShowBCI(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        multiModalPanel: showMultiModal ? (
                            <React.Suspense fallback={null}>
                                <MultiModalAIPanel
                                    isOpen={showMultiModal}
                                    onClose={() => setShowMultiModal(false)}
                                    onSend={async (media, text) => {
                                        const multiModalAIService = await loadMultiModalAIService();
                                        const response = await multiModalAIService.sendMultiModalRequest(
                                            { text, media },
                                            async (prompt, promptSystem) => {
                                                const result = await executeChatCompletion({
                                                    prompt,
                                                    systemPrompt: promptSystem,
                                                });
                                                return { content: result.content };
                                            }
                                        );
                                        appendMessage({
                                            role: 'assistant',
                                            content: response.content,
                                            isLoading: false,
                                        });
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        collaborationPanel: showCollaboration ? (
                            <React.Suspense fallback={null}>
                                <RealTimeCollaborationPanel
                                    isOpen={showCollaboration}
                                    onClose={() => setShowCollaboration(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        cloudSyncPanel: showCloudSync ? (
                            <React.Suspense fallback={null}>
                                <CloudSyncPanel
                                    isOpen={showCloudSync}
                                    onClose={() => setShowCloudSync(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        teamWorkspacesPanel: showTeamWorkspaces ? (
                            <React.Suspense fallback={null}>
                                <TeamWorkspacesPanel
                                    isOpen={showTeamWorkspaces}
                                    onClose={() => setShowTeamWorkspaces(false)}
                                    availableModels={availableModels}
                                    conversations={savedSessions}
                                />
                            </React.Suspense>
                        ) : null,
                        enterpriseCompliancePanel: showEnterpriseCompliance ? (
                            <React.Suspense fallback={null}>
                                <EnterpriseCompliancePanel
                                    isOpen={showEnterpriseCompliance}
                                    onClose={() => setShowEnterpriseCompliance(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        blockchainPanel: showBlockchain ? (
                            <React.Suspense fallback={null}>
                                <BlockchainPanel
                                    isOpen={showBlockchain}
                                    onClose={() => setShowBlockchain(false)}
                                    sessionId={sessionId}
                                    conversationData={history}
                                />
                            </React.Suspense>
                        ) : null,
                        aiAgentsPanel: showAIAgents ? (
                            <React.Suspense fallback={null}>
                                <AIAgentsPanel
                                    isOpen={showAIAgents}
                                    onClose={() => setShowAIAgents(false)}
                                    onExecutePrompt={async (prompt, promptSystem) => {
                                        const result = await executeChatCompletion({
                                            prompt,
                                            systemPrompt: promptSystem,
                                        });
                                        return { content: result.content };
                                    }}
                                />
                            </React.Suspense>
                        ) : null,
                        federatedLearningPanel: showFederatedLearning ? (
                            <React.Suspense fallback={null}>
                                <FederatedLearningPanel
                                    isOpen={showFederatedLearning}
                                    onClose={() => setShowFederatedLearning(false)}
                                />
                            </React.Suspense>
                        ) : null,
                        performanceMonitor: devMonitorsEnabled ? (
                            <React.Suspense fallback={null}>
                                <PerformanceMonitorOverlay messageCount={history.length} />
                            </React.Suspense>
                        ) : null,
                        recoveryDialog: showRecoveryDialog ? (
                            <React.Suspense fallback={null}>
                                <RecoveryDialog
                                    isOpen={showRecoveryDialog}
                                    onClose={() => setShowRecoveryDialog(false)}
                                    onRestore={handleRestoreSession}
                                    onDismiss={handleDismissRecovery}
                                    recoveryState={recoveryState}
                                />
                            </React.Suspense>
                        ) : null,
                    }}
                />
            )}
        />
    );
};

export default Chat;
