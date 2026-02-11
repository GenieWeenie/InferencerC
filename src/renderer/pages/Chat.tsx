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
    type IntegrationAvailability,
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
    type ComposerControlPillActionConfig,
    type ComposerVariableContext,
    type SidebarTab,
} from '../components/chat/ChatInlinePanels';
import { ChatMessageRow } from '../components/chat/ChatMessageRow';
import { ChatOverlays } from '../components/chat/ChatOverlays';
import { ChatSearchPanel, SearchResultRow } from '../components/chat/ChatSearchPanel';
import { ChatSidebar, type ChatSidebarPanels } from '../components/chat/ChatSidebar';
import { ChatWorkspaceShell } from '../components/chat/ChatWorkspaceShell';
import type { LaunchReadinessStep } from '../components/ChatEmptyState';
import type { LogEntry } from '../components/RequestResponseLog';
import type { Tutorial } from '../services/onboarding';
import { crashRecoveryService } from '../services/crashRecovery';
import type { CloudSyncStatus } from '../services/cloudSync';
const PromptManager = React.lazy(() => import('../components/PromptManager'));
import { useChat } from '../hooks/useChat';
import { usePrompts } from '../hooks/usePrompts';
import { useConversationTree } from '../hooks/useConversationTree';
import { useChatComposerInteractions } from '../hooks/useChatComposerInteractions';
import { useChatContextOptimizer } from '../hooks/useChatContextOptimizer';
import { useChatDiagnosticsPanel } from '../hooks/useChatDiagnosticsPanel';
import { useChatHeaderActions } from '../hooks/useChatHeaderActions';
import { useChatKeyboardController } from '../hooks/useChatKeyboardController';
import { useLongPress, usePinchZoom, useSwipeNavigation } from '../hooks/useGestures';
import { useChatMessageListSearch } from '../hooks/useChatMessageListSearch';
import { formatPerfMs, useChatPerfBenchmarks } from '../hooks/useChatPerfBenchmarks';
import { useChatSessionIntegrations } from '../hooks/useChatSessionIntegrations';
import { useChatSlashPrompts } from '../hooks/useChatSlashPrompts';
import { buildReadinessSteps, getDiagnosticsStatus } from '../lib/chatDiagnosticsModels';
import { readIntegrationAvailability } from '../lib/chatIntegrations';
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
    isLongPressActionAllowed,
    type ChatMessageAction,
} from '../lib/chatMessageActions';
import {
    buildComposerControlPillDescriptors,
    type ComposerControlPillDescriptor,
    type ComposerControlPillKey,
    getMaxTokensSliderConfig,
    toggleToolNameInSet,
} from '../lib/chatUiModels';
import { useMCP } from '../hooks/useMCP';
import type { UsageStatsRecord } from '../services/analyticsStore';
import type { ProjectContext } from '../services/projectContext';
import { HistoryService } from '../services/history';
import type { ConversationTemplate } from '../services/templates';
import { RecoveryState } from '../../shared/types';
import SkeletonLoader from '../components/SkeletonLoader';

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

const RECOVERY_CLEAN_EXIT_KEY = 'app_recovery_clean_exit';
const CHAT_PERF_HISTORY_KEY = 'chat_message_perf_benchmarks_v1';
const CHAT_DEV_MONITORS_ENABLED_KEY = 'chat_dev_monitors_enabled_v1';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ACTIVITY_LOG_COUNT_KEY = 'api_activity_log_count';
const PROJECT_CONTEXT_FEATURE_ENABLED_KEY = 'project_context_feature_enabled_v1';
const CLOUD_SYNC_CONFIG_KEY = 'cloud_sync_config_v1';
const MCP_SERVERS_CONFIG_KEY = 'mcp_servers';
const GITHUB_CREDENTIAL_MARKER_KEY = 'secure_marker_github_api_key';
const GITHUB_CREDENTIAL_LEGACY_KEY = 'github_api_key';
const MAX_ACTIVITY_LOG_ENTRIES = 200;

type OnboardingServiceModule = typeof import('../services/onboarding');
type CloudSyncService = typeof import('../services/cloudSync')['cloudSyncService'];
type MultiModalAIService = typeof import('../services/multiModalAI')['multiModalAIService'];
type AutoCategorizationService = typeof import('../services/autoCategorization')['autoCategorizationService'];
type AutoTaggingService = typeof import('../services/autoTagging')['autoTaggingService'];
type WorkflowsService = typeof import('../services/workflows')['workflowsService'];
type ApiClientService = typeof import('../services/apiClient')['apiClientService'];
type ProjectContextService = typeof import('../services/projectContext')['projectContextService'];
type PromptVariableServiceType = typeof import('../services/promptVariables')['PromptVariableService'];
type ContextManagementServiceType = typeof import('../services/contextManagement')['ContextManagementService'];
type AnalyticsStoreModule = typeof import('../services/analyticsStore');
type ActivityLogServiceType = typeof import('../services/activityLog')['activityLogService'];

let cloudSyncServicePromise: Promise<CloudSyncService> | null = null;
let multiModalAIServicePromise: Promise<MultiModalAIService> | null = null;
let autoCategorizationServicePromise: Promise<AutoCategorizationService> | null = null;
let autoTaggingServicePromise: Promise<AutoTaggingService> | null = null;
let workflowsServicePromise: Promise<WorkflowsService> | null = null;
let apiClientServicePromise: Promise<ApiClientService> | null = null;
let projectContextServicePromise: Promise<ProjectContextService> | null = null;
let promptVariableServicePromise: Promise<PromptVariableServiceType> | null = null;
let contextManagementServicePromise: Promise<ContextManagementServiceType> | null = null;
let analyticsStorePromise: Promise<AnalyticsStoreModule> | null = null;
let activityLogServicePromise: Promise<ActivityLogServiceType> | null = null;

const loadOnboardingService = async () => {
    const onboardingModule: OnboardingServiceModule = await import('../services/onboarding');
    return onboardingModule.onboardingService;
};

const loadCloudSyncService = async (): Promise<CloudSyncService> => {
    if (!cloudSyncServicePromise) {
        cloudSyncServicePromise = import('../services/cloudSync').then((mod) => mod.cloudSyncService);
    }
    return cloudSyncServicePromise;
};

const loadMultiModalAIService = async (): Promise<MultiModalAIService> => {
    if (!multiModalAIServicePromise) {
        multiModalAIServicePromise = import('../services/multiModalAI').then((mod) => mod.multiModalAIService);
    }
    return multiModalAIServicePromise;
};

const loadAutoCategorizationService = async (): Promise<AutoCategorizationService> => {
    if (!autoCategorizationServicePromise) {
        autoCategorizationServicePromise = import('../services/autoCategorization').then((mod) => mod.autoCategorizationService);
    }
    return autoCategorizationServicePromise;
};

const loadAutoTaggingService = async (): Promise<AutoTaggingService> => {
    if (!autoTaggingServicePromise) {
        autoTaggingServicePromise = import('../services/autoTagging').then((mod) => mod.autoTaggingService);
    }
    return autoTaggingServicePromise;
};

const loadWorkflowsService = async (): Promise<WorkflowsService> => {
    if (!workflowsServicePromise) {
        workflowsServicePromise = import('../services/workflows').then((mod) => mod.workflowsService);
    }
    return workflowsServicePromise;
};

const loadApiClientService = async (): Promise<ApiClientService> => {
    if (!apiClientServicePromise) {
        apiClientServicePromise = import('../services/apiClient').then((mod) => mod.apiClientService);
    }
    return apiClientServicePromise;
};

const loadProjectContextService = async (): Promise<ProjectContextService> => {
    if (!projectContextServicePromise) {
        projectContextServicePromise = import('../services/projectContext').then((mod) => mod.projectContextService);
    }
    return projectContextServicePromise;
};

const loadPromptVariableService = async (): Promise<PromptVariableServiceType> => {
    if (!promptVariableServicePromise) {
        promptVariableServicePromise = import('../services/promptVariables').then((mod) => mod.PromptVariableService);
    }
    return promptVariableServicePromise;
};

const loadContextManagementService = async (): Promise<ContextManagementServiceType> => {
    if (!contextManagementServicePromise) {
        contextManagementServicePromise = import('../services/contextManagement').then((mod) => mod.ContextManagementService);
    }
    return contextManagementServicePromise;
};

const loadAnalyticsStore = async (): Promise<AnalyticsStoreModule> => {
    if (!analyticsStorePromise) {
        analyticsStorePromise = import('../services/analyticsStore');
    }
    return analyticsStorePromise;
};

const loadActivityLogService = async (): Promise<ActivityLogServiceType> => {
    if (!activityLogServicePromise) {
        activityLogServicePromise = import('../services/activityLog').then((mod) => mod.activityLogService);
    }
    return activityLogServicePromise;
};

const mightContainPromptVariables = (text: string): boolean => /{{[^{}]+}}/.test(text);

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

const readCloudSyncAuthSnapshot = (): boolean => {
    try {
        const raw = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as Partial<{
            token?: string;
            accountId?: string;
            encryptionSalt?: string;
        }>;
        return Boolean(parsed.token && parsed.accountId && parsed.encryptionSalt);
    } catch {
        return false;
    }
};

const readHasConfiguredMcpServers = (): boolean => {
    try {
        const raw = localStorage.getItem(MCP_SERVERS_CONFIG_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) && parsed.length > 0;
    } catch {
        return false;
    }
};

const readHasGithubCredentialSnapshot = (): boolean => {
    try {
        return Boolean(
            localStorage.getItem(GITHUB_CREDENTIAL_MARKER_KEY) ||
            localStorage.getItem(GITHUB_CREDENTIAL_LEGACY_KEY)
        );
    } catch {
        return false;
    }
};

type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface ResponsiveConfig {
    breakpoint: ResponsiveBreakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWide: boolean;
    width: number;
    height: number;
}

const applyResponsiveClasses = (config: ResponsiveConfig): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-breakpoint', config.breakpoint);
    document.documentElement.classList.toggle('is-mobile', config.isMobile);
    document.documentElement.classList.toggle('is-tablet', config.isTablet);
    document.documentElement.classList.toggle('is-desktop', config.isDesktop);
    document.documentElement.classList.toggle('is-wide', config.isWide);
};

const getFallbackResponsiveConfig = (): ResponsiveConfig => {
    const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const height = typeof window === 'undefined' ? 720 : window.innerHeight;
    const breakpoint = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : width < 1920 ? 'desktop' : 'wide';
    return {
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
        isWide: breakpoint === 'wide',
        width,
        height,
    };
};

const EMPTY_INTEGRATION_AVAILABILITY: IntegrationAvailability = {
    notion: false,
    slack: false,
    discord: false,
    email: false,
    calendar: false,
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

    // Simulate initial session loading for skeleton UI
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingSessions(false);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        const refreshConfiguredMcpServers = () => {
            setHasConfiguredMcpServers(readHasConfiguredMcpServers());
        };

        window.addEventListener('focus', refreshConfiguredMcpServers);
        window.addEventListener('storage', refreshConfiguredMcpServers);
        return () => {
            window.removeEventListener('focus', refreshConfiguredMcpServers);
            window.removeEventListener('storage', refreshConfiguredMcpServers);
        };
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
    const [hasConfiguredMcpServers, setHasConfiguredMcpServers] = React.useState(readHasConfiguredMcpServers);
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
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<number[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = React.useState(0);
    const [showSearchResultsList, setShowSearchResultsList] = React.useState(false);
    const virtuosoRef = React.useRef<any>(null);
    const [VirtuosoComponent, setVirtuosoComponent] = React.useState<any>(null);
    const searchResultPreviewCacheRef = React.useRef<Map<number, SearchResultPreviewCacheEntry>>(new Map());
    const rowMetadataCacheRef = React.useRef(createChatRowMetadataCacheState());

    // FPS monitoring refs
    const fpsFrameCount = React.useRef(0);
    const fpsLastTime = React.useRef(performance.now());
    const fpsAnimationFrameId = React.useRef<number | null>(null);

    // Memory monitoring refs
    const memoryMonitorInterval = React.useRef<NodeJS.Timeout | null>(null);
    const lastMemoryWarning = React.useRef<number>(0);

    const [bookmarkedMessages, setBookmarkedMessages] = React.useState<Set<number>>(new Set());
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
    const [isFetchingGithub, setIsFetchingGithub] = React.useState(false);
    const [githubConfigured, setGithubConfigured] = React.useState<boolean>(readHasGithubCredentialSnapshot);

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
    const [responsiveConfig, setResponsiveConfig] = React.useState<ResponsiveConfig>(() => getFallbackResponsiveConfig());
    const [contextManagementService, setContextManagementService] = React.useState<ContextManagementServiceType | null>(null);
    const isCompactViewport = responsiveConfig.isMobile || responsiveConfig.isTablet;
    const [showTutorial, setShowTutorial] = React.useState(false);
    const [currentTutorial, setCurrentTutorial] = React.useState<Tutorial | null>(null);
    const [showBCI, setShowBCI] = React.useState(false);
    const [showMultiModal, setShowMultiModal] = React.useState(false);
    const [showCollaboration, setShowCollaboration] = React.useState(false);
    const [showCloudSync, setShowCloudSync] = React.useState(false);
    const [showTeamWorkspaces, setShowTeamWorkspaces] = React.useState(false);
    const [showEnterpriseCompliance, setShowEnterpriseCompliance] = React.useState(false);
    const [cloudSyncStatus, setCloudSyncStatus] = React.useState<CloudSyncStatus | null>(null);
    const [isCloudSyncAuthenticated, setIsCloudSyncAuthenticated] = React.useState<boolean>(readCloudSyncAuthSnapshot);
    const [showBlockchain, setShowBlockchain] = React.useState(false);
    const [showAIAgents, setShowAIAgents] = React.useState(false);
    const [showFederatedLearning, setShowFederatedLearning] = React.useState(false);
    const [integrationAvailability, setIntegrationAvailability] = React.useState<IntegrationAvailability>(EMPTY_INTEGRATION_AVAILABILITY);

    // Recovery dialog state
    const [showRecoveryDialog, setShowRecoveryDialog] = React.useState(false);
    const [recoveryState, setRecoveryState] = React.useState<RecoveryState | null>(null);

    // Template library dialog state
    const [showTemplateLibrary, setShowTemplateLibrary] = React.useState(false);

    // Variable insert menu state
    const [showVariableMenu, setShowVariableMenu] = React.useState(false);
    const messageListRef = React.useRef<HTMLDivElement | null>(null);
    const composerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const longPressMenuRef = React.useRef<HTMLDivElement | null>(null);

    const [conversationFontSize, setConversationFontSize] = React.useState<number>(() => {
        const stored = Number(localStorage.getItem('chat_font_size'));
        return Number.isFinite(stored) && stored > 0 ? stored : 16;
    });
    const [longPressMenu, setLongPressMenu] = React.useState<{ messageIndex: number; x: number; y: number } | null>(null);
    const [swipeSessionIndicator, setSwipeSessionIndicator] = React.useState<'previous' | 'next' | null>(null);
    const swipeSessionTimerRef = React.useRef<number | null>(null);
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

    React.useEffect(() => {
        const updateResponsiveConfig = () => {
            const nextConfig = getFallbackResponsiveConfig();
            setResponsiveConfig(nextConfig);
            applyResponsiveClasses(nextConfig);
        };

        updateResponsiveConfig();
        window.addEventListener('resize', updateResponsiveConfig);
        return () => {
            window.removeEventListener('resize', updateResponsiveConfig);
        };
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

    React.useEffect(() => {
        const refreshAuthSnapshot = () => {
            setIsCloudSyncAuthenticated(readCloudSyncAuthSnapshot());
        };

        window.addEventListener('focus', refreshAuthSnapshot);
        window.addEventListener('storage', refreshAuthSnapshot);
        return () => {
            window.removeEventListener('focus', refreshAuthSnapshot);
            window.removeEventListener('storage', refreshAuthSnapshot);
        };
    }, []);

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

    React.useEffect(() => {
        const shouldLoadVirtuoso =
            history.length > 0 || (showSearchResultsList && searchResults.length > 0);
        if (!shouldLoadVirtuoso || VirtuosoComponent) return;

        let cancelled = false;
        import('react-virtuoso')
            .then((mod) => {
                if (cancelled) return;
                setVirtuosoComponent(() => mod.Virtuoso);
            })
            .catch(() => {
                // Keep fallback UI if loading fails; app remains usable.
            });

        return () => {
            cancelled = true;
        };
    }, [history.length, showSearchResultsList, searchResults.length, VirtuosoComponent]);

    React.useEffect(() => {
        if (history.length === 0) {
            setIntegrationAvailability(EMPTY_INTEGRATION_AVAILABILITY);
            return;
        }

        const refresh = () => {
            setIntegrationAvailability(readIntegrationAvailability());
        };
        refresh();
        const handleStorage = () => refresh();
        const handleFocus = () => refresh();
        const handleCredentialsUpdated = () => refresh();

        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('credentials-updated', handleCredentialsUpdated as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('credentials-updated', handleCredentialsUpdated as EventListener);
        };
    }, [history.length]);

    // Check for onboarding on mount
    React.useEffect(() => {
        if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
            return;
        }

        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let idleId: number | null = null;
        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const checkOnboarding = async () => {
            try {
                if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
                    return;
                }

                const onboardingService = await loadOnboardingService();
                if (cancelled || onboardingService.hasCompletedOnboarding()) {
                    return;
                }

                const tutorials = onboardingService.getTutorials();
                const welcomeTutorial = tutorials.find(t => t.id === 'welcome');
                if (!cancelled && welcomeTutorial && !welcomeTutorial.completed) {
                    setCurrentTutorial(welcomeTutorial);
                    setShowTutorial(true);
                }
            } catch {
                // Ignore onboarding initialization failures to avoid blocking chat startup.
            }
        };

        if (idleWindow.requestIdleCallback) {
            idleId = idleWindow.requestIdleCallback(() => {
                void checkOnboarding();
            }, { timeout: 2500 });
        } else {
            timeoutId = setTimeout(() => {
                void checkOnboarding();
            }, 800);
        }

        return () => {
            cancelled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (idleId !== null && idleWindow.cancelIdleCallback) {
                idleWindow.cancelIdleCallback(idleId);
            }
        };
    }, []);

    const markRecoveryExitClean = React.useCallback(() => {
        try {
            localStorage.setItem(RECOVERY_CLEAN_EXIT_KEY, 'true');
        } catch {
            // Ignore storage failures; recovery still works best-effort.
        }
    }, []);

    // Check for crash recovery state on mount
    React.useEffect(() => {
        let hadUncleanExit = false;
        try {
            hadUncleanExit = localStorage.getItem(RECOVERY_CLEAN_EXIT_KEY) === 'false';
        } catch {
            hadUncleanExit = false;
        }

        const savedRecoveryState = crashRecoveryService.getRecoveryState();
        if (savedRecoveryState && hadUncleanExit) {
            setRecoveryState(savedRecoveryState);
            setShowRecoveryDialog(true);
        }

        // Mark current app run as active; if it crashes before clean shutdown,
        // this flag remains false and recovery will be offered next launch.
        try {
            localStorage.setItem(RECOVERY_CLEAN_EXIT_KEY, 'false');
        } catch {
            // Ignore storage failures; recovery still works best-effort.
        }
    }, []);

    // Mark intentional navigation/unload as clean so tab switches don't trigger recovery.
    React.useEffect(() => {
        window.addEventListener('beforeunload', markRecoveryExitClean);
        return () => {
            markRecoveryExitClean();
            window.removeEventListener('beforeunload', markRecoveryExitClean);
        };
    }, [markRecoveryExitClean]);

    // Recovery dialog handlers
    const handleRestoreSession = () => {
        if (!recoveryState) return;

        // Restore the session
        loadSession(recoveryState.sessionId);

        // Restore draft message if exists
        if (recoveryState.draftMessage) {
            setInput(recoveryState.draftMessage);
        }

        // Clear recovery state
        HistoryService.clearRecoveryState();
        markRecoveryExitClean();
        setShowRecoveryDialog(false);
        setRecoveryState(null);
    };

    const handleDismissRecovery = () => {
        HistoryService.clearRecoveryState();
        markRecoveryExitClean();
        setShowRecoveryDialog(false);
        setRecoveryState(null);
    };

    // Sync tree with history when branching is enabled or when history changes
    React.useEffect(() => {
        if (branchingEnabled && history.length > 0) {
            // Replace messages in tree with current history
            console.log('[TreeSync] Syncing tree with history:', history.length, 'messages');
            treeHook.replaceMessages(history);
        }
    }, [branchingEnabled, history.length]); // Run when branching is enabled OR history length changes

    // FPS monitoring for Virtuoso scroll performance
    React.useEffect(() => {
        if (!devMonitorsEnabled) return;

        let isScrolling = false;
        let scrollTimeout: NodeJS.Timeout;

        const measureFPS = () => {
            fpsFrameCount.current++;
            const now = performance.now();
            const delta = now - fpsLastTime.current;

            // Log FPS every second during scrolling
            if (delta >= 1000 && isScrolling) {
                const fps = Math.round((fpsFrameCount.current * 1000) / delta);
                console.log(`[FPS Monitor] Virtuoso Scroll: ${fps} FPS`);

                fpsFrameCount.current = 0;
                fpsLastTime.current = now;
            }

            if (isScrolling) {
                fpsAnimationFrameId.current = requestAnimationFrame(measureFPS);
            }
        };

        const handleScroll = () => {
            if (!isScrolling) {
                isScrolling = true;
                fpsFrameCount.current = 0;
                fpsLastTime.current = performance.now();
                fpsAnimationFrameId.current = requestAnimationFrame(measureFPS);
            }

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                if (fpsAnimationFrameId.current !== null) {
                    cancelAnimationFrame(fpsAnimationFrameId.current);
                    fpsAnimationFrameId.current = null;
                }
            }, 150);
        };

        // Get the Virtuoso scroller element
        const virtuosoElement = virtuosoRef.current?.getScrollerElement?.();
        if (virtuosoElement) {
            virtuosoElement.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            if (virtuosoElement) {
                virtuosoElement.removeEventListener('scroll', handleScroll);
            }
            clearTimeout(scrollTimeout);
            if (fpsAnimationFrameId.current !== null) {
                cancelAnimationFrame(fpsAnimationFrameId.current);
            }
        };
    }, [devMonitorsEnabled, VirtuosoComponent, history.length]);

    // Memory usage monitoring for long conversations
    React.useEffect(() => {
        if (!devMonitorsEnabled) return;

        const monitorMemory = () => {
            // Check if performance.memory API is available (Chrome/Chromium)
            if ((performance as any).memory) {
                const memory = (performance as any).memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);

                // Log memory usage every 30 seconds
                console.log(`[Memory Monitor] Used: ${usedMB}MB / ${limitMB}MB (${usagePercent}%) | Total Allocated: ${totalMB}MB | Messages: ${history.length}`);

                // Warn if memory usage is high (> 75% of limit)
                if (usagePercent > 75) {
                    const now = Date.now();
                    // Only show warning once per minute to avoid spam
                    if (now - lastMemoryWarning.current > 60000) {
                        console.warn(`[Memory Monitor] HIGH MEMORY USAGE: ${usedMB}MB / ${limitMB}MB (${usagePercent}%) - Consider closing some conversations`);
                        lastMemoryWarning.current = now;
                    }
                }

                // Critical warning if approaching 2GB limit
                if (usedMB > 1800) {
                    console.error(`[Memory Monitor] CRITICAL: Memory usage exceeds 1.8GB (${usedMB}MB) - Performance may degrade`);
                }
            }
        };

        // Start monitoring - check every 30 seconds
        memoryMonitorInterval.current = setInterval(monitorMemory, 30000);

        // Initial check
        monitorMemory();

        return () => {
            if (memoryMonitorInterval.current) {
                clearInterval(memoryMonitorInterval.current);
            }
        };
    }, [devMonitorsEnabled, history.length]); // Re-run when history length changes to log message count

    React.useEffect(() => {
        const refreshGithubConfiguredSnapshot = () => {
            setGithubConfigured(readHasGithubCredentialSnapshot());
        };

        refreshGithubConfiguredSnapshot();
        window.addEventListener('credentials-updated', refreshGithubConfiguredSnapshot as EventListener);
        window.addEventListener('focus', refreshGithubConfiguredSnapshot);
        window.addEventListener('storage', refreshGithubConfiguredSnapshot);

        return () => {
            window.removeEventListener('credentials-updated', refreshGithubConfiguredSnapshot as EventListener);
            window.removeEventListener('focus', refreshGithubConfiguredSnapshot);
            window.removeEventListener('storage', refreshGithubConfiguredSnapshot);
        };
    }, []);

    // GitHub file fetching
    const executeGithubFetch = async () => {
        if (!githubUrl.trim()) return;

        setIsFetchingGithub(true);
        try {
            const { githubService } = await import('../services/github');
            const parsed = githubService.parseGitHubUrl(githubUrl.trim());
            if (!parsed) {
                toast.error('Invalid GitHub URL. Use format: owner/repo/path or full GitHub URL');
                return;
            }

            const result = await githubService.fetchFileContent(
                parsed.owner,
                parsed.repo,
                parsed.path,
                parsed.ref
            );

            if (result.success && result.content) {
                const content = `[CONTEXT FROM GITHUB: ${parsed.owner} /${parsed.repo}/${parsed.path}]\n\n\`\`\`${parsed.path.split('.').pop() || 'text'}\n${result.content}\n\`\`\``;
                appendMessage({ role: 'user', content });
                toast.success("GitHub file added to conversation context.");
                setGithubUrl('');
            } else {
                toast.error(result.error || 'Failed to fetch file');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch from GitHub');
        } finally {
            setIsFetchingGithub(false);
        }
    };

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

    // Wrapper for sendMessage that processes variables and includes project context
    const sendMessageWithContext = React.useCallback(async () => {
        let textToSend = input;
        let hasChanges = false;

        // 1. Process Prompt Variables
        if (mightContainPromptVariables(textToSend)) {
            const promptVariableService = await loadPromptVariableService();
            if (promptVariableService.hasVariables(textToSend)) {
                try {
                    const processed = await promptVariableService.processText(textToSend, {
                        modelId: currentModel,
                        modelName: availableModels.find(m => m.id === currentModel)?.name,
                        sessionId: sessionId,
                        sessionTitle: savedSessions.find(s => s.id === sessionId)?.title,
                        messageCount: history.length,
                        userName: promptVariableService.getUserName()
                    });
                    if (processed !== textToSend) {
                        textToSend = processed;
                        hasChanges = true;
                    }
                } catch (e) {
                    console.error("Failed to process variables", e);
                }
            }
        }

        // 2. Add Project Context
        if (projectContext && includeContextInMessages) {
            const projectContextService = await loadProjectContextService();
            const contextSummary = projectContextService.getContextSummary(10);
            if (contextSummary) {
                textToSend += contextSummary;
                hasChanges = true;
            }
        }

        const sendOptions = buildContextSendOptions(textToSend);

        if (hasChanges) {
            setInput(textToSend);
            // Allow state to update before sending
            setTimeout(() => {
                beginPerfBenchmark(textToSend);
                sendMessage(sendOptions);
            }, 100);
        } else {
            beginPerfBenchmark(textToSend);
            sendMessage(sendOptions);
        }
    }, [input, projectContext, includeContextInMessages, sendMessage, currentModel, availableModels, sessionId, savedSessions, history, buildContextSendOptions, beginPerfBenchmark]);

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

    // Message Actions Handlers
    const handleEditMessage = React.useCallback((index: number) => {
        const message = latestMessageActionsRef.current.history[index];
        if (message && message.role === 'user') {
            setEditingMessageIndex(index);
            setEditedMessageContent(message.content || '');
        }
    }, []);

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
    }, [setEditedMessageContent]);

    const handleCancelEdit = React.useCallback(() => {
        setEditingMessageIndex(null);
        setEditedMessageContent('');
    }, [setEditedMessageContent]);

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

        // Create a new session with history up to this point
        const branchHistory = currentHistory.slice(0, index + 1);

        // Create new session ID
        const newSessionId = `session-${Date.now()}`;

        // Save current session first
        const currentSession = {
            id: currentSessionId,
            title: `Chat ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModelId,
            messages: currentHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled
        };

        // Create branched session
        const branchedSession = {
            id: newSessionId,
            title: `Branch from ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModelId,
            messages: branchHistory,
            expertMode: currentExpertMode,
            thinkingEnabled: currentThinkingEnabled
        };

        // Save both sessions to localStorage
        try {
            const sessions = JSON.parse(localStorage.getItem('app_chat_sessions') || '[]');
            const updatedSessions = sessions.map((s: any) =>
                s.id === currentSessionId ? currentSession : s
            );
            updatedSessions.push(branchedSession);
            localStorage.setItem('app_chat_sessions', JSON.stringify(updatedSessions));

            // Load the new branched session
            handleLoadSession(newSessionId);
            toast.success('Conversation branched!');
        } catch (err) {
            toast.error('Failed to branch conversation');
        }
    }, [handleLoadSession]);

    const executeChatCompletion = React.useCallback(async (params: {
        prompt: string;
        systemPrompt?: string;
        modelId?: string;
        temperature?: number;
        topP?: number;
        maxTokens?: number;
    }): Promise<{ content: string; tokensUsed?: number }> => {
        const testMessages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (params.systemPrompt) {
            testMessages.push({ role: 'system', content: params.systemPrompt });
        }
        testMessages.push({ role: 'user', content: params.prompt });

        const selectedModelId = params.modelId || currentModel || availableModels[0]?.id;
        if (!selectedModelId) {
            throw new Error('No model selected');
        }

        const selectedTemperature = params.temperature ?? temperature;
        const selectedTopP = params.topP ?? topP;
        const selectedMaxTokens = params.maxTokens ?? maxTokens;
        const apiClientService = await loadApiClientService();

        const request = await apiClientService.buildChatCompletionRequest(
            selectedModelId,
            testMessages,
            {
                temperature: selectedTemperature,
                topP: selectedTopP,
                maxTokens: selectedMaxTokens,
                stream: false,
            }
        );
        const response = await apiClientService.makeRequest(request);

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`API error (${response.status}): ${response.statusText}`);
        }

        const data = response.body as any;
        const content = data?.choices?.[0]?.message?.content || '';
        const tokensUsed = data?.usage?.total_tokens;

        return { content, tokensUsed };
    }, [availableModels, currentModel, maxTokens, temperature, topP]);

    const handleInsertToFile = React.useCallback(async (code: string, language: string, filePath: string) => {
        if (!mcpAvailable || mcpTools.length === 0) {
            toast.error('No connected MCP tools available for file writing');
            return;
        }

        const writeTool = mcpTools.find(tool => {
            const name = tool.name.toLowerCase();
            if (!name.includes('write')) return false;
            if (!name.includes('file') && !name.includes('document')) return false;

            const props = tool.inputSchema?.properties || {};
            return (
                Object.prototype.hasOwnProperty.call(props, 'path') ||
                Object.prototype.hasOwnProperty.call(props, 'filePath') ||
                Object.prototype.hasOwnProperty.call(props, 'filepath') ||
                Object.prototype.hasOwnProperty.call(props, 'uri')
            );
        });

        if (!writeTool) {
            toast.error('No MCP write_file-compatible tool found');
            return;
        }

        const props = writeTool.inputSchema?.properties || {};
        const hasProp = (key: string) => Object.prototype.hasOwnProperty.call(props, key);
        const args: Record<string, unknown> = {};

        if (hasProp('path')) args.path = filePath;
        else if (hasProp('filePath')) args.filePath = filePath;
        else if (hasProp('filepath')) args.filepath = filePath;
        else if (hasProp('uri')) args.uri = filePath;

        if (hasProp('content')) args.content = code;
        else if (hasProp('text')) args.text = code;
        else args.content = code;

        if (hasProp('language')) args.language = language;
        if (hasProp('append')) args.append = false;

        const result = await executeMcpTool({
            id: crypto.randomUUID(),
            name: writeTool.name,
            arguments: args,
            serverId: writeTool.serverId,
        });

        if (result.isError) {
            toast.error(`MCP write failed: ${result.content}`);
            return;
        }

        toast.success(`Inserted code into ${filePath}`);
    }, [executeMcpTool, mcpAvailable, mcpTools]);

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

    const toggleBookmark = (index: number) => {
        setBookmarkedMessages(prev => {
            const newBookmarks = new Set(prev);
            if (newBookmarks.has(index)) {
                newBookmarks.delete(index);
                toast.success('Bookmark removed');
            } else {
                newBookmarks.add(index);
                toast.success('Message bookmarked');
            }

            // Save to localStorage
            try {
                const bookmarkKey = `bookmarks_${sessionId}`;
                localStorage.setItem(bookmarkKey, JSON.stringify(Array.from(newBookmarks)));
            } catch (err) {
                console.error('Failed to save bookmarks:', err);
            }

            return newBookmarks;
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

    const modelOptionItems = React.useMemo(
        () => availableModels.map((model) => ({
            id: model.id,
            label: model.name || model.id,
        })),
        [availableModels]
    );

    const allModelOptionElements = React.useMemo(
        () => modelOptionItems.map((model) => (
            <option key={model.id} value={model.id}>{model.label}</option>
        )),
        [modelOptionItems]
    );

    const nonCurrentModelOptionElements = React.useMemo(
        () => modelOptionItems
            .filter((model) => model.id !== currentModel)
            .map((model) => (
                <option key={model.id} value={model.id}>{model.label}</option>
            )),
        [modelOptionItems, currentModel]
    );

    const modelNameById = React.useMemo(() => {
        const next = new Map<string, string>();
        for (let i = 0; i < modelOptionItems.length; i += 1) {
            const model = modelOptionItems[i];
            next.set(model.id, model.label);
        }
        return next;
    }, [modelOptionItems]);

    const handleCurrentModelChange = React.useCallback((nextModelId: string) => {
        setCurrentModel(nextModelId);
    }, [setCurrentModel]);

    const handleSecondaryModelChange = React.useCallback((nextModelId: string) => {
        setSecondaryModel(nextModelId);
    }, [setSecondaryModel]);

    const handleToggleRequestLog = React.useCallback(() => {
        setShowRequestLog((prev) => !prev);
    }, []);

    const handleToggleSearch = React.useCallback(() => {
        setShowSearch((prev) => !prev);
    }, []);

    const clampLongPressMenuPosition = React.useCallback((x: number, y: number) => {
        const margin = 8;
        const menuWidth = 240;
        const menuHeight = 240;

        return {
            x: Math.max(margin, Math.min(x, window.innerWidth - menuWidth - margin)),
            y: Math.max(margin, Math.min(y, window.innerHeight - menuHeight - margin)),
        };
    }, []);

    const closeLongPressMenu = React.useCallback(() => {
        setLongPressMenu(null);
    }, []);

    const longPressActionHandlers = React.useMemo<Record<ChatMessageAction, (index: number, message: any) => void>>(() => ({
        copy: (_index, message) => {
            navigator.clipboard.writeText(message.content || '');
            toast.success('Copied to clipboard');
        },
        bookmark: (index) => {
            toggleBookmark(index);
        },
        edit: (index) => {
            handleEditMessage(index);
        },
        regenerate: (index) => {
            handleRegenerateResponse(index);
        },
        branch: (index) => {
            handleBranchConversation(index);
        },
        delete: (index) => {
            deleteMessage(index);
        },
    }), [
        deleteMessage,
        handleBranchConversation,
        handleEditMessage,
        handleRegenerateResponse,
        toggleBookmark,
    ]);

    const handleLongPressAction = React.useCallback((action: ChatMessageAction) => {
        if (!longPressMenu) return;

        const index = longPressMenu.messageIndex;
        const message = history[index];
        if (!message) return;

        if (isLongPressActionAllowed(action, message)) {
            longPressActionHandlers[action](index, message);
        }

        closeLongPressMenu();
    }, [
        closeLongPressMenu,
        history,
        longPressActionHandlers,
        longPressMenu,
    ]);

    usePinchZoom((event) => {
        const targetNode = event.target as Node | null;
        if (!targetNode || !messageListRef.current?.contains(targetNode)) {
            return;
        }

        setConversationFontSize(prev => {
            const next = Math.max(12, Math.min(28, prev + (event.delta * 8)));
            return Number(next.toFixed(2));
        });
    }, history.length > 0);

    useLongPress((event) => {
        const targetElement = event.target instanceof Element ? event.target : null;
        if (!targetElement) return;

        const bubble = targetElement.closest('[data-message-bubble-index]') as HTMLElement | null;
        if (!bubble || !messageListRef.current?.contains(bubble)) {
            return;
        }

        const messageIndex = Number(bubble.dataset.messageBubbleIndex);
        if (!Number.isInteger(messageIndex)) {
            return;
        }

        const position = clampLongPressMenuPosition(event.x, event.y);
        setLongPressMenu({
            messageIndex,
            x: position.x,
            y: position.y,
        });
    }, history.length > 0);

    React.useEffect(() => {
        localStorage.setItem('chat_font_size', String(conversationFontSize));
    }, [conversationFontSize]);

    React.useEffect(() => {
        if (!longPressMenu) {
            return;
        }

        const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            if (longPressMenuRef.current && longPressMenuRef.current.contains(target)) {
                return;
            }

            closeLongPressMenu();
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeLongPressMenu();
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('touchstart', handleDocumentClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('touchstart', handleDocumentClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [closeLongPressMenu, longPressMenu]);

    React.useEffect(() => {
        return () => {
            if (swipeSessionTimerRef.current !== null) {
                window.clearTimeout(swipeSessionTimerRef.current);
            }
        };
    }, []);

    useSwipeNavigation((event) => {
        const targetNode = event.target as Node | null;
        if (!targetNode || !messageListRef.current?.contains(targetNode)) {
            return;
        }

        if (event.direction !== 'left' && event.direction !== 'right') {
            return;
        }

        if (savedSessions.length <= 1) {
            return;
        }

        const currentIndex = savedSessions.findIndex(session => session.id === sessionId);
        if (currentIndex === -1) {
            return;
        }

        const nextIndex = event.direction === 'left'
            ? Math.min(currentIndex + 1, savedSessions.length - 1)
            : Math.max(currentIndex - 1, 0);

        if (nextIndex === currentIndex) {
            return;
        }

        loadSession(savedSessions[nextIndex].id);
        setSwipeSessionIndicator(event.direction === 'left' ? 'next' : 'previous');

        if (swipeSessionTimerRef.current !== null) {
            window.clearTimeout(swipeSessionTimerRef.current);
        }

        swipeSessionTimerRef.current = window.setTimeout(() => {
            setSwipeSessionIndicator(null);
        }, 700);
    }, history.length > 0 && savedSessions.length > 1);

    // Load bookmarks when session changes
    React.useEffect(() => {
        try {
            const bookmarkKey = `bookmarks_${sessionId}`;
            const saved = localStorage.getItem(bookmarkKey);
            if (saved) {
                setBookmarkedMessages(new Set(JSON.parse(saved)));
            } else {
                setBookmarkedMessages(new Set());
            }
        } catch (err) {
            console.error('Failed to load bookmarks:', err);
            setBookmarkedMessages(new Set());
        }
    }, [sessionId]);

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
    const handleToggleThinking = React.useCallback(() => {
        setThinkingEnabled((prev) => !prev);
    }, [setThinkingEnabled]);
    const handleToggleBattleMode = React.useCallback(() => {
        setBattleMode((prev) => !prev);
    }, [setBattleMode]);
    const handleToggleInspector = React.useCallback(() => {
        setShowInspector((prev) => !prev);
    }, []);
    const handleToggleExpertMenu = React.useCallback(() => {
        setShowExpertMenu((prev) => !prev);
    }, [setShowExpertMenu]);
    const handleToggleVariableMenu = React.useCallback(() => {
        setShowVariableMenu((prev) => !prev);
    }, []);
    const handleToggleJsonMode = React.useCallback(() => {
        setJsonMode((prev) => {
            const next = !prev;
            toast.success(next ? 'JSON mode enabled' : 'JSON mode disabled');
            return next;
        });
    }, []);
    const handleToggleStreamingMode = React.useCallback(() => {
        setStreamingEnabled((prev) => {
            const next = !prev;
            toast.success(next ? 'Streaming enabled' : 'Streaming disabled');
            return next;
        });
    }, []);
    const handleOpenAnalyticsPanel = React.useCallback(() => {
        setShowAnalytics(true);
    }, []);
    const handleOpenRecommendationsPanel = React.useCallback(() => {
        setShowRecommendations(true);
    }, []);
    const handleToggleSidebar = React.useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);
    const handleCloseVariableMenu = React.useCallback(() => {
        setShowVariableMenu(false);
    }, []);
    const handleInsertVariable = React.useCallback((variable: string) => {
        setInput((prev) => prev + variable);
        setShowVariableMenu(false);
    }, [setInput]);
    const handleCloseSidebar = React.useCallback(() => {
        setSidebarOpen(false);
    }, []);
    const handleSelectInspectorTab = React.useCallback(() => {
        setActiveTab('inspector');
    }, []);
    const handleSelectControlsTab = React.useCallback(() => {
        setActiveTab('controls');
    }, []);
    const handleSelectPromptsTab = React.useCallback(() => {
        setActiveTab('prompts');
    }, []);
    const handleSelectDocumentsTab = React.useCallback(() => {
        setActiveTab('documents');
    }, []);
    const handleStartEditingSystemPrompt = React.useCallback(() => {
        setIsEditingSystemPrompt(true);
    }, []);
    const handleStopEditingSystemPrompt = React.useCallback(() => {
        setIsEditingSystemPrompt(false);
    }, []);
    const handleSystemPromptChange = React.useCallback((value: string) => {
        setSystemPrompt(value);
    }, [setSystemPrompt]);
    const handleToggleBattleModeWithSecondaryFallback = React.useCallback(() => {
        const next = !battleMode;
        setBattleMode(next);
        if (next && !secondaryModel && modelOptionItems.length > 1) {
            setSecondaryModel(modelOptionItems.find((model) => model.id !== currentModel)?.id || '');
        }
    }, [
        battleMode,
        currentModel,
        modelOptionItems,
        secondaryModel,
        setBattleMode,
        setSecondaryModel,
    ]);
    const handleToggleAutoRouting = React.useCallback(() => {
        setAutoRouting((prev) => !prev);
    }, [setAutoRouting]);
    const handleToggleToolByName = React.useCallback((toolName: string) => {
        setEnabledTools((prev) => toggleToolNameInSet(prev, toolName));
    }, [setEnabledTools]);
    const handleToggleResponseFormat = React.useCallback(() => {
        setResponseFormat((prev) => (prev === 'text' ? 'json_object' : 'text'));
    }, [setResponseFormat]);
    const handleToggleAutoSummarizeContext = React.useCallback(() => {
        setAutoSummarizeContext((prev) => !prev);
    }, []);
    const handleApplySuggestedTrim = React.useCallback(() => {
        applyTrimSuggestions(3);
    }, [applyTrimSuggestions]);
    const handleIncludeAllContext = React.useCallback(() => {
        includeAllContext();
    }, [includeAllContext]);
    const handleExcludeTrimSuggestion = React.useCallback((messageIndex: number) => {
        excludeTrimSuggestion(messageIndex);
    }, [excludeTrimSuggestion]);
    const handleBatchSizeChange = React.useCallback((value: number) => {
        setBatchSize(value);
    }, [setBatchSize]);
    const handleTemperatureChange = React.useCallback((value: number) => {
        setTemperature(value);
    }, [setTemperature]);
    const handleTopPChange = React.useCallback((value: number) => {
        setTopP(value);
    }, [setTopP]);
    const handleMaxTokensChange = React.useCallback((value: number) => {
        setMaxTokens(value);
    }, [setMaxTokens]);
    const secondaryModelDisplayName = React.useMemo(
        () => modelNameById.get(secondaryModel) || 'Select...',
        [modelNameById, secondaryModel]
    );
    const maxTokensSliderConfig = React.useMemo(
        () => getMaxTokensSliderConfig(currentModelObj?.contextLength),
        [currentModelObj?.contextLength]
    );
    const composerControlDescriptors = React.useMemo<ComposerControlPillDescriptor[]>(() => buildComposerControlPillDescriptors({
        prefillEnabled: prefill !== null,
        showUrlInput,
        githubConfigured,
        showGithubInput,
        hasProjectContext: Boolean(projectContext),
        thinkingEnabled,
        battleMode,
        showInspector,
        expertMode,
        showVariableMenu,
        jsonMode,
        streamingEnabled,
        hasHistory: history.length > 0,
        sidebarOpen,
    }), [
        prefill,
        showUrlInput,
        githubConfigured,
        showGithubInput,
        projectContext,
        thinkingEnabled,
        battleMode,
        showInspector,
        expertMode,
        showVariableMenu,
        jsonMode,
        streamingEnabled,
        history.length,
        sidebarOpen,
    ]);
    const controlPillActionHandlers = React.useMemo<Record<ComposerControlPillKey, () => void>>(() => ({
        'control-response': handleTogglePrefill,
        tools: handleToggleUrlInput,
        github: handleToggleGithubInput,
        project: handleProjectContextControlClick,
        thinking: handleToggleThinking,
        battle: handleToggleBattleMode,
        inspector: handleToggleInspector,
        'expert-config': handleToggleExpertMenu,
        variables: handleToggleVariableMenu,
        json: handleToggleJsonMode,
        stream: handleToggleStreamingMode,
        analytics: handleOpenAnalyticsPanel,
        recommendations: handleOpenRecommendationsPanel,
        controls: handleToggleSidebar,
    }), [
        handleTogglePrefill,
        handleToggleUrlInput,
        handleToggleGithubInput,
        handleProjectContextControlClick,
        handleToggleThinking,
        handleToggleBattleMode,
        handleToggleInspector,
        handleToggleExpertMenu,
        handleToggleVariableMenu,
        handleToggleJsonMode,
        handleToggleStreamingMode,
        handleOpenAnalyticsPanel,
        handleOpenRecommendationsPanel,
        handleToggleSidebar,
    ]);
    const composerControlPillActions = React.useMemo<ComposerControlPillActionConfig[]>(() => {
        const inactiveClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200';
        const activePrimaryClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]';
        const activeBlueClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
        const activeBattleClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-gradient-to-r from-orange-500 to-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
        const activeToolsClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-primary text-white border-primary animate-pulse';

        return composerControlDescriptors
            .filter((descriptor) => descriptor.visible)
            .map((descriptor) => {
                const baseAction = {
                    key: descriptor.key,
                    label: descriptor.label,
                    onClick: controlPillActionHandlers[descriptor.key],
                    title: undefined as string | undefined,
                };

                switch (descriptor.key) {
                    case 'control-response':
                        return {
                            ...baseAction,
                            icon: descriptor.active
                                ? <Check size={12} strokeWidth={3} />
                                : <Settings size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                        };
                    case 'tools':
                        return {
                            ...baseAction,
                            icon: <Globe size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activeToolsClassName : inactiveClassName,
                        };
                    case 'github':
                        return {
                            ...baseAction,
                            icon: <Github size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activeBlueClassName : inactiveClassName,
                        };
                    case 'project':
                        return {
                            ...baseAction,
                            icon: <FolderOpen size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activeBlueClassName : inactiveClassName,
                        };
                    case 'thinking':
                        return {
                            ...baseAction,
                            icon: <Brain size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                        };
                    case 'battle':
                        return {
                            ...baseAction,
                            icon: <Users size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activeBattleClassName : inactiveClassName,
                        };
                    case 'inspector':
                        return {
                            ...baseAction,
                            icon: <Activity size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                        };
                    case 'expert-config':
                        return {
                            ...baseAction,
                            icon: <Users size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                        };
                    case 'variables':
                        return {
                            ...baseAction,
                            icon: <Code2 size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                            title: 'Insert variables like {{date}}, {{time}}, {{user_name}}',
                        };
                    case 'json':
                        return {
                            ...baseAction,
                            icon: <Code2 size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                            title: 'Enable JSON output format',
                        };
                    case 'stream':
                        return {
                            ...baseAction,
                            icon: <Activity size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                            title: descriptor.active ? 'Disable streaming (get full response at once)' : 'Enable streaming (real-time token display)',
                        };
                    case 'analytics':
                        return {
                            ...baseAction,
                            icon: <BarChart3 size={12} strokeWidth={2.5} />,
                            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white',
                            title: 'View usage analytics and statistics',
                        };
                    case 'recommendations':
                        return {
                            ...baseAction,
                            icon: <Sparkles size={12} strokeWidth={2.5} />,
                            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white',
                            title: 'Find relevant conversations (Ctrl+Shift+R)',
                        };
                    case 'controls':
                        return {
                            ...baseAction,
                            icon: <Settings size={12} strokeWidth={2.5} />,
                            className: descriptor.active ? activePrimaryClassName : inactiveClassName,
                            title: 'Toggle Controls Panel',
                        };
                    default:
                        return {
                            ...baseAction,
                            icon: null,
                            className: inactiveClassName,
                        };
                }
            });
    }, [composerControlDescriptors, controlPillActionHandlers]);
    const composerVariableContext = React.useMemo<ComposerVariableContext>(() => ({
        modelId: currentModel,
        modelName: availableModels.find((model) => model.id === currentModel)?.name || currentModel,
        sessionId,
        sessionTitle: savedSessions.find((session) => session.id === sessionId)?.title || 'New Chat',
        messageCount: history.length,
    }), [
        currentModel,
        availableModels,
        sessionId,
        savedSessions,
        history.length,
    ]);
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
                                    onComplete={() => {
                                        setShowTutorial(false);
                                        setCurrentTutorial(null);
                                        void loadOnboardingService()
                                            .then((onboardingService) => onboardingService.completeOnboarding())
                                            .catch(() => {
                                                // Ignore onboarding persistence failures.
                                            });
                                    }}
                                    onSkip={() => {
                                        setShowTutorial(false);
                                        setCurrentTutorial(null);
                                    }}
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
