import React from 'react';
import { Send, Clock, Plus, Trash2, X, Globe, Settings, Activity, AlertTriangle, ChevronRight, Check, AlertCircle, Brain, Users, ImageIcon, Plug, Wrench, Copy, Eraser, Download, Edit2, Search, ChevronUp, ChevronDown, Star, FileText, ThumbsUp, ThumbsDown, Code2, BarChart3, FolderOpen, Eye, EyeOff, Github, GitBranch, Network, HelpCircle, Maximize2, Minimize2, RefreshCw, Zap, LayoutGrid, FileJson, TestTube, Sparkles, MessageSquare, Mail, Calendar, Package, Video, Link, Bot, Shield, Menu, Cloud, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { LaunchReadinessStep } from '../components/ChatEmptyState';
import type { LogEntry } from '../components/RequestResponseLog';
import type { Tutorial } from '../services/onboarding';
import { crashRecoveryService } from '../services/crashRecovery';
import type { CloudSyncStatus } from '../services/cloudSync';
const PromptManager = React.lazy(() => import('../components/PromptManager'));
import { useChat } from '../hooks/useChat';
import { usePrompts, PromptSnippet } from '../hooks/usePrompts';
import { useConversationTree } from '../hooks/useConversationTree';
import { useLongPress, usePinchZoom, useSwipeNavigation } from '../hooks/useGestures';
import { calculateEntropy, compressImage } from '../lib/chatDisplayUtils';
import { useMCP } from '../hooks/useMCP';
import type { UsageStatsRecord } from '../services/analyticsStore';
import type { ProjectContext } from '../services/projectContext';
import { HistoryService } from '../services/history';
import type { ConversationTemplate } from '../services/templates';
import type { ContextTrimSuggestion, ContextUsage } from '../services/contextManagement';
import { AVAILABLE_TOOLS } from '../lib/tools';
import { RecoveryState } from '../../shared/types';
import SkeletonLoader from '../components/SkeletonLoader';

const MessageContent = React.lazy(() => import('../components/MessageContent'));
const MessageActionsMenu = React.lazy(() => import('../components/MessageActionsMenu'));
const QuickReplyTemplates = React.lazy(() => import('../components/QuickReplyTemplates'));
const ComparisonGrid = React.lazy(() => import('../components/ComparisonGrid'));
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
const VariableInsertMenu = React.lazy(() => import('../components/VariableInsertMenu'));
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
const SmartSuggestionsPanel = React.lazy(() =>
    import('../components/SmartSuggestionsPanel').then((mod) => ({ default: mod.SmartSuggestionsPanel }))
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

const estimateTokensFallback = (text: string): number => {
    const normalized = text.trim();
    if (!normalized) return 0;
    return Math.max(1, Math.ceil(normalized.length / 4));
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

type ChatPerfMode = 'single' | 'battle';

interface ChatPerfSample {
    timestamp: number;
    modelId: string;
    mode: ChatPerfMode;
    inputChars: number;
    inputToRenderMs: number;
    inputToFirstTokenMs: number | null;
}

interface PendingChatPerfBenchmark {
    startedAt: number;
    baselineHistoryLength: number;
    assistantTargets: number[];
    initialContentLengthByTarget: Record<number, number>;
    modelId: string;
    mode: ChatPerfMode;
    inputChars: number;
    inputToRenderMs?: number;
    inputToFirstTokenMs?: number;
}

interface IntegrationAvailability {
    notion: boolean;
    slack: boolean;
    discord: boolean;
    email: boolean;
    calendar: boolean;
}

const EMPTY_INTEGRATION_AVAILABILITY: IntegrationAvailability = {
    notion: false,
    slack: false,
    discord: false,
    email: false,
    calendar: false,
};

const parseStorageConfig = (key: string): Record<string, any> | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : null;
    } catch {
        return null;
    }
};

const readIntegrationAvailability = (): IntegrationAvailability => {
    const notionDatabaseConfigured = Boolean(localStorage.getItem('notion_database_id'));
    const slackConfig = parseStorageConfig('slack_config');
    const discordConfig = parseStorageConfig('discord_config');
    const emailConfig = parseStorageConfig('email_config');
    const calendarConfig = parseStorageConfig('calendar_config');

    return {
        notion: notionDatabaseConfigured,
        slack: Boolean(slackConfig?.webhookUrl || slackConfig?.apiToken),
        discord: Boolean(discordConfig?.webhookUrl),
        email: Boolean(emailConfig?.defaultRecipient),
        calendar: Boolean(calendarConfig?.provider),
    };
};

// Message skeleton component for loading states
const MessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} py-3`}>
            <div className={`p-4 rounded-2xl max-w-[85%] ${isUser ? 'bg-primary/20 rounded-tr-sm' : 'bg-slate-800/80 rounded-tl-sm'}`}>
                <div className="space-y-2">
                    <SkeletonLoader variant="text" width="w-64" />
                    <SkeletonLoader variant="text" width="w-48" />
                    <SkeletonLoader variant="text" width="w-56" />
                </div>
            </div>
        </div>
    );
};

interface ToolCallEntry {
    id?: string;
    function: {
        name?: string;
        arguments?: string;
    };
}

const EMPTY_TOOL_CALLS: ToolCallEntry[] = [];

interface ToolCallsListProps {
    toolCalls: ToolCallEntry[];
    animated?: boolean;
}

const ToolCallsList: React.FC<ToolCallsListProps> = React.memo(({
    toolCalls,
    animated = false,
}) => (
    <div className={`mb-2 space-y-2 ${animated ? 'animate-in slide-in-from-top-1 fade-in duration-300' : ''}`}>
        {toolCalls.map((tc, idx) => (
            <div key={tc.id || idx} className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2 mb-1 text-primary">
                    <Wrench size={12} />
                    <span className="font-bold">{tc.function.name}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {tc.function.arguments}
                </div>
            </div>
        ))}
    </div>
), (prev, next) => prev.toolCalls === next.toolCalls && prev.animated === next.animated);

const resolveBattleModelName = (
    content: string | undefined,
    pattern: RegExp,
    fallbackModelId: string,
    availableModels: any[],
    fallbackLabel: string
): string => {
    const match = content?.match(pattern);
    if (match?.[1]) {
        return match[1];
    }
    return availableModels.find((m: any) => m.id === fallbackModelId)?.name || fallbackLabel;
};

interface LogprobTokenListProps {
    currentLogprobs: any[];
    messageIndex: number;
    selectedTokenForMessage: any;
    setSelectedToken: (value: any) => void;
    setActiveTab: (value: 'inspector' | 'controls' | 'prompts' | 'documents') => void;
}

const LogprobTokenList: React.FC<LogprobTokenListProps> = React.memo(({
    currentLogprobs,
    messageIndex,
    selectedTokenForMessage,
    setSelectedToken,
    setActiveTab,
}) => (
    <div className="leading-relaxed font-mono text-[15px] animate-in fade-in duration-300">
        {currentLogprobs.map((lp: any, i: number) => {
            if (!lp || typeof lp !== 'object') return null;
            const entropy = calculateEntropy(lp.top_logprobs);
            const isSelected = selectedTokenForMessage?.logprob === lp;
            const redIntensity = Math.min(255, entropy * 100);
            const bgAlpha = entropy > 0.5 ? 0.3 : 0.05;

            const style = {
                backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.9)' : `rgba(${redIntensity}, 50, 50, ${bgAlpha})`,
                color: isSelected ? '#000' : 'inherit',
                borderBottom: entropy > 1.0 ? '1px dotted #ef4444' : 'none',
            };

            return (
                <span
                    key={i}
                    onClick={() => {
                        setSelectedToken({ logprob: lp, messageIndex, tokenIndex: i });
                        setActiveTab('inspector');
                    }}
                    title={`Token: "${lp.token}"\nLogprob: ${lp.logprob}`}
                    className={`cursor-pointer rounded-[2px] px-[1px] transition-colors ${isSelected ? 'font-bold ring-2 ring-yellow-400 z-10 relative' : 'hover:bg-slate-700'}`}
                    style={style}
                >
                    {lp.token}
                </span>
            );
        })}
    </div>
), (prev, next) => {
    return (
        prev.currentLogprobs === next.currentLogprobs &&
        prev.messageIndex === next.messageIndex &&
        prev.selectedTokenForMessage === next.selectedTokenForMessage
    );
});

interface ChatMessageRowProps {
    index: number;
    msg: any;
    isLoadingMessages: boolean;
    isSearchResult: boolean;
    isCurrentSearchResult: boolean;
    isLastMessage: boolean;
    previousMessage: any | null;
    nextMessage: any | null;
    isShowingComparison: boolean;
    isComparisonPartnerHidden: boolean;
    isBookmarked: boolean;
    deleteMessage: (index: number) => void;
    handleEditMessage: (index: number) => void;
    handleRegenerateResponse: (index: number) => void;
    handleBranchConversation: (index: number) => void;
    mcpAvailable: boolean;
    handleInsertToFile: (code: string, language: string, filePath: string) => void;
    selectedTokenForMessage: any;
    setSelectedToken: (value: any) => void;
    setActiveTab: (value: 'inspector' | 'controls' | 'prompts' | 'documents') => void;
    setComparisonIndex: React.Dispatch<React.SetStateAction<number | null>>;
    availableModels: any[];
    currentModel: string;
    secondaryModel: string;
    handleRateMessage: (index: number, rating: 'up' | 'down') => void;
    messageRating?: 'up' | 'down';
    showInspector: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isEditingRow: boolean;
    editingContentForRow: string;
    onEditingContentChange: (value: string) => void;
    handleCancelEdit: () => void;
    handleSaveEdit: (index: number) => void;
    selectChoice: (messageIndex: number, choiceIndex: number) => void;
    toggleBookmark: (index: number) => void;
    conversationFontSize: number;
    isCompactViewport: boolean;
    isLazyLoaded: boolean;
    loadMessageAtIndex: (messageIndex: number) => void;
}

const ChatMessageRow: React.FC<ChatMessageRowProps> = React.memo(({
    index,
    msg,
    isLoadingMessages,
    isSearchResult,
    isCurrentSearchResult,
    isLastMessage,
    previousMessage,
    nextMessage,
    isShowingComparison,
    isComparisonPartnerHidden,
    isBookmarked,
    deleteMessage,
    handleEditMessage,
    handleRegenerateResponse,
    handleBranchConversation,
    mcpAvailable,
    handleInsertToFile,
    selectedTokenForMessage,
    setSelectedToken,
    setActiveTab,
    setComparisonIndex,
    availableModels,
    currentModel,
    secondaryModel,
    handleRateMessage,
    messageRating,
    showInspector,
    textareaRef,
    setInput,
    isEditingRow,
    editingContentForRow,
    onEditingContentChange,
    handleCancelEdit,
    handleSaveEdit,
    selectChoice,
    toggleBookmark,
    conversationFontSize,
    isCompactViewport,
    isLazyLoaded,
    loadMessageAtIndex,
}) => {
    const activeChoice = msg.choices?.[msg.selectedChoiceIndex || 0];
    const currentLogprobs = activeChoice?.logprobs?.content || [];
    const hasLogprobs = Array.isArray(currentLogprobs) && currentLogprobs.length > 0;
    const showMissingLogprobsWarning = msg.role === 'assistant' && !hasLogprobs && isLastMessage;

    const isBattleModePair = msg.role === 'assistant' &&
        Boolean(nextMessage) &&
        nextMessage?.role === 'assistant' &&
        msg.content?.includes('Model A:') &&
        nextMessage?.content?.includes('Model B:');

    const isSecondInBattlePair = msg.role === 'assistant' &&
        Boolean(previousMessage) &&
        previousMessage?.role === 'assistant' &&
        previousMessage?.content?.includes('Model A:') &&
        msg.content?.includes('Model B:') &&
        isComparisonPartnerHidden;

    const toolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0
        ? msg.tool_calls as ToolCallEntry[]
        : EMPTY_TOOL_CALLS;
    const hasToolCalls = toolCalls.length > 0;

    const comparisonDetails = React.useMemo(() => {
        if (!nextMessage) {
            return null;
        }

        return {
            messageB: nextMessage,
            modelAName: resolveBattleModelName(
                msg.content,
                /\*\*Model A:\s*(.+?)\*\*/,
                currentModel,
                availableModels,
                'Model A'
            ),
            modelBName: resolveBattleModelName(
                nextMessage.content,
                /\*\*Model B:\s*(.+?)\*\*/,
                secondaryModel,
                availableModels,
                'Model B'
            ),
        };
    }, [nextMessage, msg.content, currentModel, secondaryModel, availableModels]);

    const handleToggleBookmark = React.useCallback(() => {
        toggleBookmark(index);
    }, [toggleBookmark, index]);

    const handleCopyMessage = React.useCallback(() => {
        navigator.clipboard.writeText(msg.content || '');
        toast.success('Copied to clipboard');
    }, [msg.content]);

    const handleDeleteMessage = React.useCallback(() => {
        deleteMessage(index);
    }, [deleteMessage, index]);

    const handleEditMessageAction = React.useCallback(() => {
        handleEditMessage(index);
    }, [handleEditMessage, index]);

    const handleRegenerateMessageAction = React.useCallback(() => {
        handleRegenerateResponse(index);
    }, [handleRegenerateResponse, index]);

    const handleBranchConversationAction = React.useCallback(() => {
        handleBranchConversation(index);
    }, [handleBranchConversation, index]);

    const handleRateUp = React.useCallback(() => {
        handleRateMessage(index, 'up');
    }, [handleRateMessage, index]);

    const handleRateDown = React.useCallback(() => {
        handleRateMessage(index, 'down');
    }, [handleRateMessage, index]);

    const handleEditContentChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onEditingContentChange(e.target.value);
    }, [onEditingContentChange]);

    if (isLoadingMessages) {
        return <MessageSkeleton isUser={index % 2 === 0} />;
    }

    if (isSecondInBattlePair) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group py-3 min-w-0 w-full`}
        >
            <div className={`relative p-4 pr-24 rounded-2xl max-w-[85%] min-w-0 shadow-md transition-all break-words overflow-visible ${isCurrentSearchResult
                ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background'
                : isSearchResult
                    ? 'ring-1 ring-yellow-500/50'
                    : ''
                } ${msg.role === 'user' ? 'bg-primary/20 text-white rounded-tr-sm border border-primary/20' : 'bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/50 backdrop-blur-sm'}`}
            data-message-bubble-index={index}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${conversationFontSize}px`, maxWidth: isCompactViewport ? '95%' : '85%' }}>
                <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/85 px-1 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-20 backdrop-blur-sm">
                    <button
                        onClick={handleToggleBookmark}
                        className={`h-8 w-8 rounded-lg text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors ${isBookmarked
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-slate-700/90 hover:bg-slate-600'
                            }`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
                    >
                        <Star size={12} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <React.Suspense fallback={null}>
                        <MessageActionsMenu
                            messageContent={msg.content || ''}
                            messageIndex={index}
                            messageRole={msg.role}
                            onCopy={handleCopyMessage}
                            onDelete={handleDeleteMessage}
                            onEdit={msg.role === 'user' ? handleEditMessageAction : undefined}
                            onRegenerate={msg.role === 'assistant' && !msg.isLoading ? handleRegenerateMessageAction : undefined}
                            onBranch={handleBranchConversationAction}
                        />
                    </React.Suspense>
                </div>
                {msg.role === 'assistant' ? (
                    <div>
                        {msg.isLoading ? (
                            <div className="flex flex-col gap-2">
                                {hasToolCalls && (
                                    <ToolCallsList toolCalls={toolCalls} animated={true} />
                                )}
                                {msg.content && (
                                    <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering response...</div>}>
                                        <MessageContent
                                            content={msg.content}
                                            isUser={false}
                                            mcpAvailable={mcpAvailable}
                                            onInsertToFile={handleInsertToFile}
                                            isStreaming={true}
                                            isLazyLoaded={isLazyLoaded}
                                            onLoadContent={loadMessageAtIndex}
                                            messageIndex={index}
                                        />
                                    </React.Suspense>
                                )}
                                <div className="flex items-center gap-2 text-slate-400 italic text-sm animate-pulse">
                                    <Brain size={16} className="text-primary" /> Thinking...
                                </div>
                            </div>
                        ) : (
                            <>
                                {(!showInspector || !hasLogprobs) && (
                                    <>
                                        {hasToolCalls && (
                                            <ToolCallsList toolCalls={toolCalls} />
                                        )}
                                        <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering response...</div>}>
                                        <MessageContent
                                                content={msg.content || ""}
                                            isUser={false}
                                            mcpAvailable={mcpAvailable}
                                            onInsertToFile={handleInsertToFile}
                                            isLazyLoaded={isLazyLoaded}
                                            onLoadContent={loadMessageAtIndex}
                                            messageIndex={index}
                                        />
                                        </React.Suspense>
                                    </>
                                )}

                                {showInspector && hasLogprobs && (
                                    <LogprobTokenList
                                        currentLogprobs={currentLogprobs}
                                        messageIndex={index}
                                        selectedTokenForMessage={selectedTokenForMessage}
                                        setSelectedToken={setSelectedToken}
                                        setActiveTab={setActiveTab}
                                    />
                                )}
                            </>
                        )}
                        {isBattleModePair && !msg.isLoading && !nextMessage?.isLoading && (
                            <div className="mt-2 mb-2">
                                <button
                                    onClick={() => setComparisonIndex(isShowingComparison ? null : index)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-primary/50 text-slate-300 hover:text-primary"
                                >
                                    <Code2 size={14} />
                                    {isShowingComparison ? 'Hide Comparison' : 'Show Comparison Grid'}
                                </button>
                            </div>
                        )}

                        {isShowingComparison && isBattleModePair && !msg.isLoading && !nextMessage?.isLoading && (
                            <div className="mt-4 mb-4">
                                {comparisonDetails && (
                                    <React.Suspense fallback={<div className="text-xs text-slate-500">Loading comparison...</div>}>
                                        <ComparisonGrid
                                            messageA={msg}
                                            messageB={comparisonDetails.messageB}
                                            modelAName={comparisonDetails.modelAName}
                                            modelBName={comparisonDetails.modelBName}
                                            onClose={() => setComparisonIndex(null)}
                                            mcpAvailable={mcpAvailable}
                                            onInsertToFile={handleInsertToFile}
                                        />
                                    </React.Suspense>
                                )}
                            </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                            {!msg.isLoading && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleRateUp}
                                        className={`p-1 rounded transition-colors ${messageRating === 'up'
                                            ? 'text-green-500 bg-green-500/20'
                                            : 'text-slate-500 hover:text-green-400 hover:bg-slate-800'
                                            }`}
                                        title="Good response"
                                    >
                                        <ThumbsUp size={12} fill={messageRating === 'up' ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                        onClick={handleRateDown}
                                        className={`p-1 rounded transition-colors ${messageRating === 'down'
                                            ? 'text-red-500 bg-red-500/20'
                                            : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                                            }`}
                                        title="Poor response"
                                    >
                                        <ThumbsDown size={12} fill={messageRating === 'down' ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            )}
                            {msg.generationTime && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                    <Clock size={10} />
                                    {(msg.generationTime / 1000).toFixed(2)}s
                                </div>
                            )}
                        </div>
                        {!msg.isLoading && isLastMessage && msg.content && (
                            <React.Suspense fallback={null}>
                                <QuickReplyTemplates
                                    lastAssistantMessage={msg.content}
                                    onSelectTemplate={(template: string) => {
                                        setInput(template);
                                        if (textareaRef.current) {
                                            textareaRef.current.focus();
                                        }
                                    }}
                                />
                            </React.Suspense>
                        )}
                    </div>
                ) : (
                    <>
                        {isEditingRow ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    value={editingContentForRow}
                                    onChange={handleEditContentChange}
                                    className="w-full min-h-[100px] p-2 bg-slate-900/50 border border-primary/30 rounded-lg text-white resize-y focus:outline-none focus:border-primary/60"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSaveEdit(index)}
                                        className="px-3 py-1 text-sm bg-primary hover:bg-primary/80 rounded-lg transition-colors"
                                    >
                                        Save & Resend
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering message...</div>}>
                                    <MessageContent
                                        content={msg.content}
                                        isUser={true}
                                        mcpAvailable={mcpAvailable}
                                        onInsertToFile={handleInsertToFile}
                                        isLazyLoaded={isLazyLoaded}
                                        onLoadContent={loadMessageAtIndex}
                                        messageIndex={index}
                                    />
                                </React.Suspense>
                                {msg.images && msg.images.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {msg.images.map((img: any, imgIdx: number) => (
                                            <a
                                                key={imgIdx}
                                                href={img.thumbnailUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                            >
                                                <img
                                                    src={img.thumbnailUrl}
                                                    alt={img.name}
                                                    className="max-w-[200px] max-h-[150px] object-cover rounded-lg border border-slate-600 hover:border-primary/50 transition-colors cursor-pointer"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
            {showMissingLogprobsWarning && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 p-3 bg-amber-900/20 text-amber-200 rounded-lg text-sm border border-amber-900/50 flex flex-col gap-2 max-w-[85%]"
                >
                    <div className="flex items-center gap-2 font-bold"><AlertTriangle size={14} /> Token Data Missing</div>
                    <p className="opacity-80">The LM Studio server refused to send token data. (Note: Remote models like OpenRouter may not support logprobs yet)</p>
                </motion.div>
            )}
            {msg.role === 'assistant' && msg.choices && Array.isArray(msg.choices) && msg.choices.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto max-w-full pb-1">
                    {msg.choices.map((_: any, cIdx: number) => (
                        <button key={cIdx} onClick={() => selectChoice(index, cIdx)} className={`px-2 py-1 text-xs border rounded-md transition-colors whitespace-nowrap ${(msg.selectedChoiceIndex || 0) === cIdx ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'}`}>Option {cIdx + 1}</button>
                    ))}
                </div>
            )}
        </motion.div>
    );
}, (prev, next) => {
    return (
        prev.index === next.index &&
        prev.msg === next.msg &&
        prev.isLoadingMessages === next.isLoadingMessages &&
        prev.isSearchResult === next.isSearchResult &&
        prev.isCurrentSearchResult === next.isCurrentSearchResult &&
        prev.isLastMessage === next.isLastMessage &&
        prev.previousMessage === next.previousMessage &&
        prev.nextMessage === next.nextMessage &&
        prev.isShowingComparison === next.isShowingComparison &&
        prev.isComparisonPartnerHidden === next.isComparisonPartnerHidden &&
        prev.isBookmarked === next.isBookmarked &&
        prev.selectedTokenForMessage === next.selectedTokenForMessage &&
        prev.messageRating === next.messageRating &&
        prev.showInspector === next.showInspector &&
        prev.isEditingRow === next.isEditingRow &&
        prev.editingContentForRow === next.editingContentForRow &&
        prev.conversationFontSize === next.conversationFontSize &&
        prev.isCompactViewport === next.isCompactViewport &&
        prev.isLazyLoaded === next.isLazyLoaded
    );
});

interface SearchResultRowProps {
    resultIndex: number;
    messageIndex: number;
    preview: string;
    roleLabel: string;
    roleClass: string;
    isActive: boolean;
    onNavigate: (resultIndex: number) => void;
}

const SearchResultRow: React.FC<SearchResultRowProps> = React.memo(({
    resultIndex,
    messageIndex,
    preview,
    roleLabel,
    roleClass,
    isActive,
    onNavigate,
}) => {
    return (
        <button
            onClick={() => onNavigate(resultIndex)}
            className={`w-full text-left px-6 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 ${
                isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    {resultIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${roleClass}`}>{roleLabel}</span>
                        <span className="text-xs text-slate-500">Message #{messageIndex + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">{preview}</p>
                </div>
                {isActive && (
                    <Check size={16} className="text-primary flex-shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}, (prev, next) => {
    return (
        prev.resultIndex === next.resultIndex &&
        prev.messageIndex === next.messageIndex &&
        prev.preview === next.preview &&
        prev.roleLabel === next.roleLabel &&
        prev.roleClass === next.roleClass &&
        prev.isActive === next.isActive
    );
});

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
    const [activeTab, setActiveTab] = React.useState<'inspector' | 'controls' | 'prompts' | 'documents'>('controls');
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

    // FPS monitoring refs
    const fpsFrameCount = React.useRef(0);
    const fpsLastTime = React.useRef(performance.now());
    const fpsAnimationFrameId = React.useRef<number | null>(null);

    // Memory monitoring refs
    const memoryMonitorInterval = React.useRef<NodeJS.Timeout | null>(null);
    const lastMemoryWarning = React.useRef<number>(0);

    const [bookmarkedMessages, setBookmarkedMessages] = React.useState<Set<number>>(new Set());
    const [showDiagnosticsPanel, setShowDiagnosticsPanel] = React.useState(false);
    const [hasCompletedLaunchChecklist, setHasCompletedLaunchChecklist] = React.useState<boolean>(() => {
        return localStorage.getItem('chat_launch_checklist_completed') === '1';
    });
    const [recentPerfBenchmarks, setRecentPerfBenchmarks] = React.useState<ChatPerfSample[]>(() => {
        try {
            const raw = localStorage.getItem(CHAT_PERF_HISTORY_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as ChatPerfSample[];
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((item) =>
                    item &&
                    Number.isFinite(item.timestamp) &&
                    typeof item.modelId === 'string' &&
                    (item.mode === 'single' || item.mode === 'battle') &&
                    Number.isFinite(item.inputChars) &&
                    Number.isFinite(item.inputToRenderMs)
                )
                .slice(0, 5);
        } catch {
            return [];
        }
    });
    const [activePerfBenchmark, setActivePerfBenchmark] = React.useState<PendingChatPerfBenchmark | null>(null);
    const [showBottomControls, setShowBottomControls] = React.useState<boolean>(() => {
        const stored = localStorage.getItem('chat_show_bottom_controls');
        return stored !== '0';
    });
    const [devMonitorsEnabled, setDevMonitorsEnabled] = React.useState<boolean>(() => {
        return localStorage.getItem(CHAT_DEV_MONITORS_ENABLED_KEY) === '1';
    });
    const [diagnosticsPanelPosition, setDiagnosticsPanelPosition] = React.useState<{ left: number; top: number }>({ left: 12, top: 12 });
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
    const [excludedContextIndices, setExcludedContextIndices] = React.useState<Set<number>>(new Set());
    const [autoSummarizeContext, setAutoSummarizeContext] = React.useState(true);
    const contextWarningTriggered = React.useRef(false);

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
    const diagnosticsPanelRef = React.useRef<HTMLDivElement | null>(null);
    const diagnosticsButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const diagnosticsPopoverRef = React.useRef<HTMLDivElement | null>(null);
    const pendingPerfBenchmarkRef = React.useRef<PendingChatPerfBenchmark | null>(null);

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
        if (!showDiagnosticsPanel) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (diagnosticsPanelRef.current && target && !diagnosticsPanelRef.current.contains(target)) {
                setShowDiagnosticsPanel(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowDiagnosticsPanel(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showDiagnosticsPanel]);

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
        try {
            localStorage.setItem(CHAT_PERF_HISTORY_KEY, JSON.stringify(recentPerfBenchmarks.slice(0, 5)));
        } catch {
            // Ignore persistence failures for perf diagnostics.
        }
    }, [recentPerfBenchmarks]);

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

    // Context management state persistence (per session)
    React.useEffect(() => {
        if (!sessionId) {
            setExcludedContextIndices(new Set());
            return;
        }

        try {
            const raw = localStorage.getItem(`context-exclusions-${sessionId}`);
            if (!raw) {
                setExcludedContextIndices(new Set());
                return;
            }
            const parsed = JSON.parse(raw) as number[];
            setExcludedContextIndices(new Set(parsed.filter(n => Number.isInteger(n) && n >= 0)));
        } catch {
            setExcludedContextIndices(new Set());
        }
    }, [sessionId]);

    React.useEffect(() => {
        if (!sessionId) return;
        const safe = Array.from(excludedContextIndices).filter(index => index < history.length);
        localStorage.setItem(`context-exclusions-${sessionId}`, JSON.stringify(safe));
    }, [sessionId, excludedContextIndices, history.length]);

    React.useEffect(() => {
        setExcludedContextIndices(prev => {
            const next = new Set(Array.from(prev).filter(index => index < history.length));
            return next.size === prev.size ? prev : next;
        });
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
                setHistory(prev => [...prev, { role: 'user', content }]);
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
    const readinessSteps = React.useMemo<LaunchReadinessStep[]>(() => ([
        {
            id: 'provider',
            title: 'Provider Reachable',
            description: providerReady
                ? (connectionStatus.local === 'online' ? 'Local provider online.' : 'Remote provider online.')
                : (connectionStatus.local === 'checking' || connectionStatus.remote === 'checking'
                    ? 'Checking provider status...'
                    : 'No reachable provider yet. Start local backend or configure OpenRouter API key.'),
            complete: providerReady,
        },
        {
            id: 'model',
            title: 'Model Selected',
            description: modelReady
                ? `Selected: ${currentModelObj?.name || currentModel}`
                : 'Pick a model from the top model selector.',
            complete: modelReady,
        },
        {
            id: 'prompt',
            title: 'Prompt Drafted',
            description: promptReady
                ? 'Prompt ready. Press Send to get your first response.'
                : 'Use a starter prompt below or type your own.',
            complete: promptReady,
        },
    ]), [providerReady, connectionStatus.local, connectionStatus.remote, modelReady, currentModelObj, currentModel, promptReady]);
    const readinessCompletedCount = readinessSteps.filter(step => step.complete).length;
    const launchChecklistComplete = readinessCompletedCount === readinessSteps.length;
    const shouldShowLaunchChecklist = !hasCompletedLaunchChecklist && !launchChecklistComplete;
    const diagnosticsStatus = React.useMemo(() => {
        if (!providerReady) {
            return {
                label: 'Provider Issue',
                detail: 'No online provider detected.',
                className: 'text-red-300 border-red-700/70 bg-red-900/20',
            };
        }
        if (!modelReady) {
            return {
                label: 'Model Needed',
                detail: 'Provider is online, but no model is selected.',
                className: 'text-amber-300 border-amber-700/70 bg-amber-900/20',
            };
        }
        if (history.length === 0 && !promptReady) {
            return {
                label: 'Ready for Prompt',
                detail: 'Setup is healthy. Draft your first prompt.',
                className: 'text-cyan-300 border-cyan-700/70 bg-cyan-900/20',
            };
        }
        return {
            label: 'Healthy',
            detail: 'Provider and model checks look good.',
            className: 'text-emerald-300 border-emerald-700/70 bg-emerald-900/20',
        };
    }, [providerReady, modelReady, history.length, promptReady]);
    React.useEffect(() => {
        if (!launchChecklistComplete || hasCompletedLaunchChecklist) return;
        setHasCompletedLaunchChecklist(true);
        localStorage.setItem('chat_launch_checklist_completed', '1');
    }, [launchChecklistComplete, hasCompletedLaunchChecklist]);

    const updateDiagnosticsPanelPosition = React.useCallback(() => {
        const trigger = diagnosticsButtonRef.current;
        if (!trigger) return;

        const triggerRect = trigger.getBoundingClientRect();
        const panelWidth = 288;
        const panelHeight = diagnosticsPopoverRef.current?.offsetHeight || 320;
        const margin = 12;
        const left = Math.min(
            Math.max(margin, triggerRect.right - panelWidth),
            window.innerWidth - panelWidth - margin
        );
        const topBelow = triggerRect.bottom + 8;
        const topAbove = triggerRect.top - panelHeight - 8;
        const top = topBelow + panelHeight + margin <= window.innerHeight
            ? topBelow
            : Math.max(margin, topAbove);

        setDiagnosticsPanelPosition({ left, top });
    }, []);

    React.useEffect(() => {
        if (!showDiagnosticsPanel) return;

        const raf = window.requestAnimationFrame(updateDiagnosticsPanelPosition);
        window.addEventListener('resize', updateDiagnosticsPanelPosition);
        window.addEventListener('scroll', updateDiagnosticsPanelPosition, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateDiagnosticsPanelPosition);
            window.removeEventListener('scroll', updateDiagnosticsPanelPosition, true);
        };
    }, [showDiagnosticsPanel, updateDiagnosticsPanelPosition]);

    const finalizePerfBenchmark = React.useCallback((pending: PendingChatPerfBenchmark) => {
        if (pendingPerfBenchmarkRef.current !== pending || pending.inputToRenderMs === undefined) return;

        const sample: ChatPerfSample = {
            timestamp: Date.now(),
            modelId: pending.modelId,
            mode: pending.mode,
            inputChars: pending.inputChars,
            inputToRenderMs: pending.inputToRenderMs,
            inputToFirstTokenMs: pending.inputToFirstTokenMs ?? null,
        };

        setRecentPerfBenchmarks(prev => [sample, ...prev].slice(0, 5));
        pendingPerfBenchmarkRef.current = null;
        setActivePerfBenchmark(null);
    }, []);

    const beginPerfBenchmark = React.useCallback((pendingInput: string) => {
        if (!pendingInput.trim() && attachments.length === 0 && imageAttachments.length === 0) {
            return;
        }

        const baselineHistoryLength = history.length;
        const isBattleRequest = battleMode && Boolean(secondaryModel);
        const assistantTargets = isBattleRequest
            ? [baselineHistoryLength + 1, baselineHistoryLength + 2]
            : [baselineHistoryLength + 1];
        const initialContentLengthByTarget: Record<number, number> = {};
        assistantTargets.forEach((targetIndex, targetOrder) => {
            initialContentLengthByTarget[targetIndex] = !isBattleRequest && targetOrder === 0 ? (prefill?.length || 0) : 0;
        });

        const pending: PendingChatPerfBenchmark = {
            startedAt: performance.now(),
            baselineHistoryLength,
            assistantTargets,
            initialContentLengthByTarget,
            modelId: currentModel || 'unknown',
            mode: isBattleRequest ? 'battle' : 'single',
            inputChars: pendingInput.trim().length,
        };

        pendingPerfBenchmarkRef.current = pending;
        setActivePerfBenchmark(pending);
    }, [attachments.length, imageAttachments.length, history.length, battleMode, secondaryModel, prefill, currentModel]);

    React.useEffect(() => {
        const pending = pendingPerfBenchmarkRef.current;
        if (!pending) return;

        const targetsInRange = pending.assistantTargets.filter(index => index < history.length);
        if (targetsInRange.length === 0) return;

        if (pending.inputToRenderMs === undefined) {
            window.requestAnimationFrame(() => {
                const current = pendingPerfBenchmarkRef.current;
                if (!current || current !== pending || current.inputToRenderMs !== undefined) return;
                current.inputToRenderMs = performance.now() - current.startedAt;
                setActivePerfBenchmark({ ...current });
            });
        }

        if (pending.inputToFirstTokenMs === undefined) {
            for (const targetIndex of targetsInRange) {
                const targetMessage = history[targetIndex];
                if (!targetMessage) continue;
                const initialLength = pending.initialContentLengthByTarget[targetIndex] || 0;
                if ((targetMessage.content || '').length > initialLength) {
                    pending.inputToFirstTokenMs = performance.now() - pending.startedAt;
                    setActivePerfBenchmark({ ...pending });
                    break;
                }
            }
        }

        const allTargetsDone = pending.assistantTargets.every((targetIndex) => {
            const targetMessage = history[targetIndex];
            return Boolean(targetMessage) && !targetMessage.isLoading;
        });

        if (pending.inputToRenderMs !== undefined && (pending.inputToFirstTokenMs !== undefined || allTargetsDone)) {
            finalizePerfBenchmark(pending);
        }
    }, [history, finalizePerfBenchmark]);

    const latestPerfBenchmark = recentPerfBenchmarks[0] || null;
    const formatPerfMs = React.useCallback((value?: number | null) => {
        if (value === null) return 'n/a';
        if (value === undefined) return '...';
        return `${Math.round(value)}ms`;
    }, []);
    const computePerfStat = React.useCallback((values: number[], kind: 'avg' | 'p95'): number | null => {
        if (values.length === 0) return null;
        if (kind === 'avg') {
            return values.reduce((sum, value) => sum + value, 0) / values.length;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1));
        return sorted[index];
    }, []);
    const perfSummary = React.useMemo(() => {
        const renderValues = recentPerfBenchmarks.map(sample => sample.inputToRenderMs);
        const firstTokenValues = recentPerfBenchmarks
            .map(sample => sample.inputToFirstTokenMs)
            .filter((value): value is number => value !== null);
        return {
            sampleCount: recentPerfBenchmarks.length,
            firstTokenSampleCount: firstTokenValues.length,
            renderAvg: computePerfStat(renderValues, 'avg'),
            renderP95: computePerfStat(renderValues, 'p95'),
            firstTokenAvg: computePerfStat(firstTokenValues, 'avg'),
            firstTokenP95: computePerfStat(firstTokenValues, 'p95'),
        };
    }, [recentPerfBenchmarks, computePerfStat]);
    const clearPerfHistory = React.useCallback(() => {
        pendingPerfBenchmarkRef.current = null;
        setActivePerfBenchmark(null);
        setRecentPerfBenchmarks([]);
        try {
            localStorage.removeItem(CHAT_PERF_HISTORY_KEY);
        } catch {
            // Ignore storage failures for perf diagnostics.
        }
    }, []);

    const contextWindowTokens = currentModelObj?.contextLength || 32768;
    const excludedContextKey = React.useMemo(
        () => Array.from(excludedContextIndices).sort((a, b) => a - b).join(','),
        [excludedContextIndices]
    );

    const estimateTokens = React.useCallback((text: string) => {
        if (contextManagementService) {
            return contextManagementService.estimateTokens(text);
        }
        return estimateTokensFallback(text);
    }, [contextManagementService]);

    const contextUsage = React.useMemo<ContextUsage>(() => {
        if (contextManagementService) {
            return contextManagementService.estimateUsage({
                messages: history,
                excludedIndices: excludedContextIndices,
                systemPrompt,
                currentInput: input,
                reservedOutputTokens: maxTokens,
                maxContextTokens: contextWindowTokens,
            });
        }

        let inputTokens = estimateTokensFallback(systemPrompt || '') + estimateTokensFallback(input || '');
        history.forEach((message, index) => {
            if (excludedContextIndices.has(index)) return;
            inputTokens += estimateTokensFallback(message.content || '') + 4;
        });
        const totalTokens = inputTokens + Math.max(0, maxTokens);
        const fillRatio = contextWindowTokens > 0 ? totalTokens / contextWindowTokens : 1;
        return {
            inputTokens,
            reservedOutputTokens: maxTokens,
            totalTokens,
            maxContextTokens: contextWindowTokens,
            fillRatio,
            warning: fillRatio >= 0.8,
        };
    }, [history, excludedContextIndices, systemPrompt, input, maxTokens, contextWindowTokens, excludedContextKey, contextManagementService]);

    const trimSuggestions = React.useMemo<ContextTrimSuggestion[]>(() => {
        if (!contextManagementService) return [];
        return contextManagementService.suggestMessagesToTrim({
            messages: history,
            excludedIndices: excludedContextIndices,
            targetFillRatio: 0.75,
            usage: contextUsage,
        });
    }, [history, excludedContextIndices, contextUsage, excludedContextKey, contextManagementService]);

    const recentContextMessages = React.useMemo(() => {
        const start = Math.max(0, history.length - 20);
        return history.slice(start).map((message, offset) => ({
            message,
            index: start + offset,
            included: !excludedContextIndices.has(start + offset),
            estimatedTokens: estimateTokens(message.content || ''),
        }));
    }, [history, excludedContextIndices, excludedContextKey, estimateTokens]);

    React.useEffect(() => {
        if (contextUsage.fillRatio >= 0.8 && !contextWarningTriggered.current) {
            toast.warning(`Context window is ${(contextUsage.fillRatio * 100).toFixed(0)}% full. Consider trimming older messages.`);
            contextWarningTriggered.current = true;
        } else if (contextUsage.fillRatio < 0.75) {
            contextWarningTriggered.current = false;
        }
    }, [contextUsage.fillRatio]);

    const toggleMessageContextInclusion = React.useCallback((messageIndex: number) => {
        setExcludedContextIndices(prev => {
            const next = new Set(prev);
            if (next.has(messageIndex)) {
                next.delete(messageIndex);
            } else {
                next.add(messageIndex);
            }
            return next;
        });
    }, []);

    const applyTrimSuggestions = React.useCallback((count: number = 3) => {
        if (trimSuggestions.length === 0) return;
        setExcludedContextIndices(prev => {
            const next = new Set(prev);
            trimSuggestions.slice(0, count).forEach(suggestion => next.add(suggestion.messageIndex));
            return next;
        });
    }, [trimSuggestions]);

    const buildContextSendOptions = React.useCallback((pendingInput: string) => {
        let effectiveExcluded = new Set(excludedContextIndices);
        let contextSummary: string | undefined;

        const usageAtSend: ContextUsage = contextManagementService
            ? contextManagementService.estimateUsage({
                messages: history,
                excludedIndices: effectiveExcluded,
                systemPrompt,
                currentInput: pendingInput,
                reservedOutputTokens: maxTokens,
                maxContextTokens: contextWindowTokens,
            })
            : (() => {
                let inputTokens = estimateTokensFallback(systemPrompt || '') + estimateTokensFallback(pendingInput || '');
                history.forEach((message, index) => {
                    if (effectiveExcluded.has(index)) return;
                    inputTokens += estimateTokensFallback(message.content || '') + 4;
                });
                const totalTokens = inputTokens + Math.max(0, maxTokens);
                const fillRatio = contextWindowTokens > 0 ? totalTokens / contextWindowTokens : 1;
                return {
                    inputTokens,
                    reservedOutputTokens: maxTokens,
                    totalTokens,
                    maxContextTokens: contextWindowTokens,
                    fillRatio,
                    warning: fillRatio >= 0.8,
                };
            })();

        if (autoSummarizeContext && usageAtSend.fillRatio >= 0.8) {
            const plan = contextManagementService?.buildAutoSummaryPlan({
                messages: history,
                excludedIndices: effectiveExcluded,
                keepRecentCount: 8,
            });

            if (plan && plan.indicesToExclude.length > 0) {
                plan.indicesToExclude.forEach(index => effectiveExcluded.add(index));
                contextSummary = plan.summary;
                setExcludedContextIndices(new Set(effectiveExcluded));
                toast.info(`Auto-summarized ${plan.indicesToExclude.length} older messages to fit context limits.`);
            }
        }

        return {
            excludedMessageIndices: Array.from(effectiveExcluded),
            contextSummary,
        };
    }, [excludedContextIndices, history, systemPrompt, maxTokens, contextWindowTokens, autoSummarizeContext, contextManagementService]);

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
        if (debouncedSearchQuery.trim() === '') {
            setSearchResults([]);
            setCurrentSearchIndex(0);
            return;
        }

        const query = debouncedSearchQuery.toLowerCase();
        const matches: number[] = [];

        searchableMessageContent.forEach((content, index) => {
            if (content.includes(query)) {
                matches.push(index);
            }
        });

        setSearchResults(matches);
        setCurrentSearchIndex(0);
    }, [debouncedSearchQuery, searchableMessageContent]);

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

    // Slash Command State
    const [slashMatch, setSlashMatch] = React.useState<{ query: string; index: number } | null>(null);
    const [activePromptIndex, setActivePromptIndex] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const filteredPrompts = React.useMemo(() => {
        if (!slashMatch) return [];
        return prompts.filter(p => p.alias.toLowerCase().startsWith(slashMatch.query.toLowerCase()));
    }, [slashMatch, prompts]);

    const insertPrompt = (p: PromptSnippet) => {
        if (!slashMatch || !textareaRef.current) return;

        const cursorEnd = textareaRef.current.selectionEnd;
        // The slash is at slashMatch.index - 1
        const prefix = input.substring(0, slashMatch.index - 1);
        const suffix = input.substring(cursorEnd);

        setInput(prefix + p.content + suffix);
        setSlashMatch(null);

        // Wait for render to re-focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // move cursor to end of inserted content
                // const newCursorPos = prefix.length + p.content.length;
                // textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

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
        };
    }, [
        history,
        sessionId,
        currentModel,
        expertMode,
        thinkingEnabled,
        editedMessageContent,
        sendMessageWithContext,
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
        const editContent = latestMessageActionsRef.current.editedMessageContent;
        if (editContent.trim() === '') {
            toast.error('Message cannot be empty');
            return;
        }

        let updated = false;
        setHistory((prev) => {
            if (!prev[index]) return prev;
            const newHistory = [...prev];
            newHistory[index] = {
                ...newHistory[index],
                content: editContent,
            };
            updated = true;
            return newHistory.slice(0, index + 1);
        });

        if (!updated) {
            return;
        }

        setEditingMessageIndex(null);
        setEditedMessageContent('');
        toast.success('Message updated. Regenerating response...');

        setTimeout(() => {
            void latestMessageActionsRef.current.sendMessageWithContext();
        }, 100);
    }, [setHistory, setEditedMessageContent]);

    const handleCancelEdit = React.useCallback(() => {
        setEditingMessageIndex(null);
        setEditedMessageContent('');
    }, [setEditedMessageContent]);

    const handleRegenerateResponse = React.useCallback((index: number) => {
        let updated = false;
        setHistory((prev) => {
            if (index < 0 || index > prev.length) return prev;
            updated = true;
            return prev.slice(0, index);
        });

        if (!updated) {
            return;
        }

        toast.info('Regenerating response...');
        setTimeout(() => {
            void latestMessageActionsRef.current.sendMessageWithContext();
        }, 100);
    }, [setHistory]);

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

    const handleLongPressAction = React.useCallback((action: 'copy' | 'bookmark' | 'edit' | 'regenerate' | 'branch' | 'delete') => {
        if (!longPressMenu) return;

        const index = longPressMenu.messageIndex;
        const message = history[index];
        if (!message) return;

        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(message.content || '');
                toast.success('Copied to clipboard');
                break;
            case 'bookmark':
                toggleBookmark(index);
                break;
            case 'edit':
                if (message.role === 'user') {
                    handleEditMessage(index);
                }
                break;
            case 'regenerate':
                if (message.role === 'assistant' && !message.isLoading) {
                    handleRegenerateResponse(index);
                }
                break;
            case 'branch':
                handleBranchConversation(index);
                break;
            case 'delete':
                deleteMessage(index);
                break;
            default:
                break;
        }

        closeLongPressMenu();
    }, [
        closeLongPressMenu,
        deleteMessage,
        handleBranchConversation,
        handleEditMessage,
        handleRegenerateResponse,
        history,
        longPressMenu,
        toggleBookmark,
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

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts when typing in input fields
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

            // Ctrl+?: Show keyboard shortcuts modal
            if ((e.metaKey || e.ctrlKey) && (e.key === '?' || e.key === '/') && e.shiftKey) {
                e.preventDefault();
                setShowShortcutsModal(true);
                return;
            }

            // Ctrl+N: New Chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !isTyping) {
                e.preventDefault();
                createNewSession();
                return;
            }

            // Ctrl+K: Focus on model selector (or new chat as fallback)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isTyping) {
                e.preventDefault();
                createNewSession();
                return;
            }

            // Ctrl+/: Toggle History
            if ((e.metaKey || e.ctrlKey) && e.key === '/' && !e.shiftKey) {
                e.preventDefault();
                setShowHistory(prev => !prev);
                return;
            }

            // Ctrl+L: Clear Chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'l' && !isTyping) {
                e.preventDefault();
                if (history.length > 0 && confirm('Clear all messages in this chat?')) {
                    setHistory([]);
                }
                return;
            }

            // Ctrl+F: Toggle Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setShowSearch(prev => !prev);
                return;
            }

            // Ctrl+Shift+C: Copy last response
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C' && !isTyping) {
                e.preventDefault();
                const lastAssistantMessage = [...history].reverse().find(m => m.role === 'assistant');
                if (lastAssistantMessage?.content) {
                    navigator.clipboard.writeText(lastAssistantMessage.content);
                    toast.success('Last response copied to clipboard');
                }
                return;
            }

            // Ctrl+Shift+E: Open Export Dialog
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E' && !isTyping) {
                e.preventDefault();
                if (history.length > 0) {
                    setShowExportDialog(true);
                } else {
                    toast.info('No messages to export');
                }
                return;
            }

            // Ctrl+Shift+F: Open Global Search
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setShowGlobalSearch(true);
                return;
            }

            // Ctrl+Shift+R: Open Recommendations
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
                e.preventDefault();
                setShowRecommendations(true);
                return;
            }

            // Ctrl+T: Toggle Tree View
            if ((e.metaKey || e.ctrlKey) && e.key === 't' && !isTyping) {
                e.preventDefault();
                setShowTreeView(prev => !prev);
                if (!branchingEnabled) {
                    setBranchingEnabled(true);
                    toast.info('Conversation branching enabled');
                }
                return;
            }

            // Ctrl+B: Create Branch (enable branching first if needed)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !isTyping) {
                e.preventDefault();
                if (!branchingEnabled) {
                    setBranchingEnabled(true);
                    toast.success('Conversation branching enabled! Create branches by sending different messages.');
                } else {
                    toast.info('Branching is ready - send a different message to create a branch');
                }
                return;
            }

            // Alt+Left/Right: Navigate branches
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && branchingEnabled) {
                e.preventDefault();
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const currentIndex = treeHook.getCurrentSiblingIndex();
                treeHook.switchToSibling(currentIndex + direction);
                return;
            }

            // Esc: Stop Generation or Close Modals
            if (e.key === 'Escape') {
                if (showShortcutsModal) {
                    setShowShortcutsModal(false);
                } else if (editingMessageIndex !== null) {
                    handleCancelEdit();
                } else {
                    stopGeneration();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createNewSession, setShowHistory, stopGeneration, showShortcutsModal, editingMessageIndex, history, handleCancelEdit, setHistory]);

    const searchResultSet = React.useMemo(() => new Set(searchResults), [searchResults]);
    const activeSearchMessageIndex = React.useMemo(
        () => (currentSearchIndex >= 0 ? searchResults[currentSearchIndex] : undefined),
        [searchResults, currentSearchIndex]
    );
    const searchResultRows = React.useMemo(() => (
        searchResults.map((messageIndex, resultIndex) => {
            const message = history[messageIndex];
            if (!message) {
                return null;
            }
            const content = message.content || '';
            const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
            const isUser = message.role === 'user';
            return {
                resultIndex,
                messageIndex,
                preview,
                roleLabel: isUser ? 'You' : 'Assistant',
                roleClass: isUser ? 'text-blue-400' : 'text-emerald-400',
            };
        })
    ), [searchResults, history]);
    const loadMessageAtIndex = React.useCallback((messageIndex: number) => {
        loadMessageRange(messageIndex, messageIndex);
    }, [loadMessageRange]);
    const onEditingContentChange = React.useCallback((value: string) => {
        setEditedMessageContent(value);
    }, []);

    // Memoized itemContent callback to prevent recreation on every render
    const renderItemContent = React.useCallback((index: number, msg: any) => {
        const nextMessage = index < history.length - 1 ? history[index + 1] : null;
        const previousMessage = index > 0 ? history[index - 1] : null;
        const isEditingRow = editingMessageIndex === index;
        return (
            <ChatMessageRow
                index={index}
                msg={msg}
                isLoadingMessages={isLoadingMessages}
                isSearchResult={searchResultSet.has(index)}
                isCurrentSearchResult={activeSearchMessageIndex === index}
                isLastMessage={index === history.length - 1}
                previousMessage={previousMessage}
                nextMessage={nextMessage}
                isShowingComparison={comparisonIndex === index}
                isComparisonPartnerHidden={comparisonIndex === index - 1}
                isBookmarked={bookmarkedMessages.has(index)}
                deleteMessage={deleteMessage}
                handleEditMessage={handleEditMessage}
                handleRegenerateResponse={handleRegenerateResponse}
                handleBranchConversation={handleBranchConversation}
                mcpAvailable={mcpAvailable}
                handleInsertToFile={handleInsertToFile}
                selectedTokenForMessage={selectedToken?.messageIndex === index ? selectedToken : null}
                setSelectedToken={setSelectedToken}
                setActiveTab={setActiveTab}
                setComparisonIndex={setComparisonIndex}
                availableModels={availableModels}
                currentModel={currentModel}
                secondaryModel={secondaryModel}
                handleRateMessage={handleRateMessage}
                messageRating={messageRatings[index]}
                showInspector={showInspector}
                textareaRef={textareaRef}
                setInput={setInput}
                isEditingRow={isEditingRow}
                editingContentForRow={isEditingRow ? editedMessageContent : ''}
                onEditingContentChange={onEditingContentChange}
                handleCancelEdit={handleCancelEdit}
                handleSaveEdit={handleSaveEdit}
                selectChoice={selectChoice}
                toggleBookmark={toggleBookmark}
                conversationFontSize={conversationFontSize}
                isCompactViewport={isCompactViewport}
                isLazyLoaded={!loadedMessageIndices.has(index)}
                loadMessageAtIndex={loadMessageAtIndex}
            />
        );
    }, [
        history,
        isLoadingMessages,
        searchResultSet,
        activeSearchMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        deleteMessage,
        handleEditMessage,
        handleRegenerateResponse,
        handleBranchConversation,
        mcpAvailable,
        handleInsertToFile,
        selectedToken,
        setSelectedToken,
        setActiveTab,
        setComparisonIndex,
        availableModels,
        currentModel,
        secondaryModel,
        handleRateMessage,
        messageRatings,
        showInspector,
        textareaRef,
        setInput,
        editingMessageIndex,
        editedMessageContent,
        onEditingContentChange,
        handleCancelEdit,
        handleSaveEdit,
        selectChoice,
        toggleBookmark,
        conversationFontSize,
        isCompactViewport,
        loadedMessageIndices,
        loadMessageAtIndex,
    ]);

    const renderSearchResultItem = React.useCallback((resultIndex: number) => {
        const row = searchResultRows[resultIndex];
        if (!row) {
            return null;
        }
        return (
            <SearchResultRow
                resultIndex={row.resultIndex}
                messageIndex={row.messageIndex}
                preview={row.preview}
                roleLabel={row.roleLabel}
                roleClass={row.roleClass}
                isActive={resultIndex === currentSearchIndex}
                onNavigate={navigateToSearchResult}
            />
        );
    }, [searchResultRows, currentSearchIndex, navigateToSearchResult]);

    const longPressMessage = longPressMenu ? history[longPressMenu.messageIndex] : null;
    const composerBottomInset = isCompactViewport ? 16 : 24;
    const messageListFooterHeight = Math.max(132, composerOverlayHeight + composerBottomInset + 16);

    return (
        <div className="flex h-full flex-row relative bg-background text-text font-body overflow-hidden min-w-0 max-w-full">
            {/* History Sidebar */}
            {showHistory && (
                <div className={`${isCompactViewport ? 'w-[min(88vw,320px)]' : 'w-64'} border-r border-slate-800 bg-slate-900/95 flex flex-col h-full absolute left-0 z-20 backdrop-blur-md shadow-2xl transition-all duration-300`}>
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
                </div>
            )}

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col h-full relative transition-[margin] duration-300 min-w-0 overflow-hidden ${showHistory && !isCompactViewport ? 'ml-64' : 'ml-0'}`}>
                {/* Top Header */}
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 backdrop-blur-sm shadow-sm z-10 flex-wrap">
                    <button onClick={() => setShowHistory(!showHistory)} title="View History" className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showHistory ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                        {isCompactViewport ? <Menu size={16} /> : <Clock size={16} />}
                    </button>
                    <button onClick={createNewSession} title="New Chat" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-md hover:brightness-110 transition-all shadow-md shadow-emerald-900/20 font-medium text-xs flex-shrink-0">
                        <Plus size={14} /> <span>New</span>
                    </button>
                    <button
                        onClick={() => setShowTemplateLibrary(true)}
                        title="Templates"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <FileText size={14} /> <span>Templates</span>
                    </button>
                    <button
                        onClick={() => setShowABTesting(true)}
                        title="A/B Testing (Test different prompts)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <TestTube size={14} /> <span>A/B Test</span>
                    </button>
                    <button
                        onClick={() => setShowPromptOptimization(true)}
                        title="Prompt Optimization (AI-powered suggestions)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Sparkles size={14} /> <span>Optimize</span>
                    </button>
                    <button
                        onClick={() => setShowWorkflows(true)}
                        title="Workflows (Automation)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Zap size={14} /> <span>Workflows</span>
                    </button>
                    <button
                        onClick={() => setShowAPIPlayground(true)}
                        title="API Playground (Developer Tools)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Code2 size={14} /> <span>API</span>
                    </button>
                    <button
                        onClick={() => setShowDeveloperDocs(true)}
                        title="Developer Documentation"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <HelpCircle size={14} /> <span>Docs</span>
                    </button>
                    <button
                        onClick={() => setShowPluginManager(true)}
                        title="Plugin Manager"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Package size={14} /> <span>Plugins</span>
                    </button>
                    <button
                        onClick={() => setShowWorkspaceViews(true)}
                        title="Workspace Views"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <LayoutGrid size={14} /> <span>Views</span>
                    </button>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                // Extract code from last assistant message
                                const lastMessage = history[history.length - 1];
                                if (lastMessage?.content) {
                                    // Try to extract code block
                                    const codeBlockMatch = lastMessage.content.match(/```(\w+)?\n([\s\S]*?)```/);
                                    if (codeBlockMatch) {
                                        setSelectedCode({
                                            code: codeBlockMatch[2],
                                            language: codeBlockMatch[1] || 'javascript',
                                        });
                                    } else {
                                        setSelectedCode({
                                            code: lastMessage.content,
                                            language: 'javascript',
                                        });
                                    }
                                    setShowCodeIntegration(true);
                                }
                            }}
                            title="Code Integration (Review, Refactor, Docs, Tests, Git)"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                        >
                            <Code2 size={14} /> <span>Code</span>
                        </button>
                    )}
                    {/* Experimental Features Dropdown */}
                    <div className="relative group flex-shrink-0">
                        <button
                            title="Experimental Features"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs whitespace-nowrap"
                        >
                            <Sparkles size={14} /> <span>Experimental</span> <ChevronDown size={12} />
                        </button>
                        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setShowBCI(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Brain size={14} /> <span>Brain-Computer Interface</span>
                                </button>
                                <button
                                    onClick={() => setShowMultiModal(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Video size={14} /> <span>Multi-Modal AI</span>
                                </button>
                                <button
                                    onClick={() => setShowCollaboration(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Users size={14} /> <span>Real-Time Collaboration</span>
                                </button>
                                <button
                                    onClick={() => setShowCloudSync(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Cloud size={14} /> <span>Cloud Sync</span>
                                </button>
                                <button
                                    onClick={() => setShowTeamWorkspaces(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Shield size={14} /> <span>Team Workspaces</span>
                                </button>
                                <button
                                    onClick={() => setShowEnterpriseCompliance(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <ClipboardList size={14} /> <span>Enterprise SSO & Audit</span>
                                </button>
                                <button
                                    onClick={() => setShowBlockchain(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Link size={14} /> <span>Blockchain Integration</span>
                                </button>
                                <button
                                    onClick={() => setShowAIAgents(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Bot size={14} /> <span>AI Agents</span>
                                </button>
                                <button
                                    onClick={() => setShowFederatedLearning(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Shield size={14} /> <span>Federated Learning</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCloudSync(true)}
                        title={cloudSyncBadge.title}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${cloudSyncBadge.className}`}
                    >
                        <Cloud size={14} /> <span>{cloudSyncBadge.label}</span>
                    </button>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm('Clear all messages in this chat?')) {
                                    setHistory([]);
                                    toast.success('Chat cleared');
                                }
                            }}
                            title="Clear Chat"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                        >
                            <Eraser size={14} /> <span>Clear</span>
                        </button>
                    )}
                    {history.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowExportDialog(true)}
                                title="Export Chat (Ctrl+Shift+E)"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <Download size={14} /> <span>Export</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowTreeView(!showTreeView);
                                    if (!branchingEnabled) {
                                        setBranchingEnabled(true);
                                        toast.info('Conversation branching enabled');
                                    }
                                }}
                                title="Conversation Tree (Ctrl+T)"
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${showTreeView
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                            >
                                <Network size={14} /> <span>Tree</span>
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        HistoryService.exportSessionToObsidian(sessionId);
                                        toast.success('Chat exported as Obsidian markdown');
                                    } catch (error: any) {
                                        toast.error(error.message || 'Failed to export');
                                    }
                                }}
                                title="Export to Obsidian"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <FileText size={14} /> <span>Obsidian</span>
                            </button>
                            {integrationAvailability.notion && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const { notionService } = await import('../services/notion');
                                            const result = await notionService.saveConversation(
                                                session.title,
                                                session.messages,
                                                {
                                                    model: session.modelId,
                                                    date: new Date(session.lastModified).toLocaleString(),
                                                }
                                            );

                                            if (result.success && result.page) {
                                                toast.success('Saved to Notion!', {
                                                    action: {
                                                        label: 'Open',
                                                        onClick: () => window.open(result.page!.url, '_blank')
                                                    }
                                                });
                                            } else {
                                                toast.error(result.error || 'Failed to save to Notion');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to save to Notion');
                                    }
                                }}
                                title="Save to Notion"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <FileText size={14} /> <span>Notion</span>
                            </button>
                            )}
                            {integrationAvailability.slack && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const { slackService } = await import('../services/slack');
                                            const result = await slackService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Sent to Slack!');
                                            } else {
                                                toast.error(result.error || 'Failed to send to Slack');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send to Slack');
                                        }
                                    }}
                                    title="Send to Slack"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <MessageSquare size={14} /> <span>Slack</span>
                                </button>
                            )}
                            {integrationAvailability.discord && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const { discordService } = await import('../services/discord');
                                            const result = await discordService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Sent to Discord!');
                                            } else {
                                                toast.error(result.error || 'Failed to send to Discord');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send to Discord');
                                        }
                                    }}
                                    title="Send to Discord"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <MessageSquare size={14} /> <span>Discord</span>
                                </button>
                            )}
                            {integrationAvailability.email && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const { emailService } = await import('../services/email');
                                            const result = await emailService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Email client opened!');
                                            } else {
                                                toast.error(result.error || 'Failed to open email');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send email');
                                        }
                                    }}
                                    title="Email Conversation"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <Mail size={14} /> <span>Email</span>
                                </button>
                            )}
                            {integrationAvailability.calendar && (
                                <button
                                    onClick={() => setShowCalendarSchedule(true)}
                                    title="Schedule Reminder"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <Calendar size={14} /> <span>Schedule</span>
                                </button>
                            )}
                        </>
                    )}
                    <div className="h-6 w-px bg-slate-700 mx-1 flex-shrink-0"></div>
                    <div className="flex items-center gap-2 min-w-0 max-w-[200px] flex-shrink-0">
                        {!battleMode ? (
                            <>
                                <span className="font-medium text-slate-400 text-xs whitespace-nowrap flex-shrink-0">Model:</span>
                                <div className="relative min-w-0 flex-1">
                                    <select value={currentModel} onChange={e => setCurrentModel(e.target.value)} className="w-full bg-slate-800 border-none text-white text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-slate-700 transition-colors truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={10} />
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 w-full animate-in fade-in slide-in-from-top-1">
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-xs flex items-center gap-1 flex-shrink-0"><Users size={12} /> VS</span>
                                <div className="relative flex-1 min-w-0">
                                    <select value={currentModel} onChange={e => setCurrentModel(e.target.value)} className="w-full bg-slate-800 border-l-2 border-l-blue-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative flex-1 min-w-0">
                                    <select value={secondaryModel} onChange={e => setSecondaryModel(e.target.value)} className="w-full bg-slate-800 border-l-2 border-l-orange-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Request Log Button */}
                    <button
                        onClick={() => setShowRequestLog(!showRequestLog)}
                        title="View Request/Response Log"
                        className={`p-1.5 rounded-md transition-colors border border-slate-700 relative flex-shrink-0 ${showRequestLog ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <FileText size={14} />
                        {apiLogCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {apiLogCount > 9 ? '9+' : apiLogCount}
                            </span>
                        )}
                    </button>

                    {/* Search Button */}
                    {history.length > 0 && (
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            title="Search in chat (Ctrl+F)"
                            className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showSearch ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                        >
                            <Search size={14} />
                        </button>
                    )}
                    <div ref={diagnosticsPanelRef} className="relative flex-shrink-0">
                        <button
                            ref={diagnosticsButtonRef}
                            onClick={() => setShowDiagnosticsPanel(prev => !prev)}
                            title="Startup diagnostics and quick fixes"
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors border text-xs ${diagnosticsStatus.className}`}
                        >
                            {!providerReady || !modelReady ? <AlertTriangle size={12} /> : <Check size={12} />}
                            <span>{diagnosticsStatus.label}</span>
                        </button>
                        {showDiagnosticsPanel && (
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
                                    onClose={() => setShowDiagnosticsPanel(false)}
                                    onClearPerfHistory={clearPerfHistory}
                                    onToggleDevMonitors={() => setDevMonitorsEnabled((prev) => !prev)}
                                    onRequestConnectionRefresh={requestConnectionRefresh}
                                    onAutoSelectFirstModel={selectFirstModel}
                                    onOpenSettings={() => {
                                        setShowDiagnosticsPanel(false);
                                        navigateToTab('settings');
                                    }}
                                    onOpenModels={() => {
                                        setShowDiagnosticsPanel(false);
                                        navigateToTab('models');
                                    }}
                                    onInsertStarterPrompt={() => {
                                        insertStarterPrompt();
                                        setShowDiagnosticsPanel(false);
                                    }}
                                />
                            </React.Suspense>
                        )}
                    </div>

                    {/* Connection Status Indicator */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-800 h-6 self-center flex-shrink-0">
                        <div className="flex flex-col items-center" title={`LM Studio: ${connectionStatus.local}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.local === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : connectionStatus.local === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                            <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Local</span>
                        </div>
                        {connectionStatus.remote !== 'none' && (
                            <div className="flex flex-col items-center" title={`OpenRouter: ${connectionStatus.remote}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.remote === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : connectionStatus.remote === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                                <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">OR</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-slate-800 bg-slate-900/50 overflow-hidden min-w-0"
                        >
                            <div className="relative">
                                <div className="px-6 py-3 flex items-center gap-3 min-w-0 overflow-hidden">
                                    <div className="flex-1 relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search in this conversation..."
                                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowSearchResultsList(!showSearchResultsList)}
                                                className="px-2 py-1.5 hover:bg-slate-700 rounded transition-colors text-sm text-slate-400 hover:text-white flex items-center gap-1"
                                                title="Show all results"
                                            >
                                                <span>{currentSearchIndex + 1} / {searchResults.length}</span>
                                                {showSearchResultsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setCurrentSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1))}
                                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                title="Previous result"
                                            >
                                                <ChevronUp size={16} className="text-slate-400" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0))}
                                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                title="Next result"
                                            >
                                                <ChevronDown size={16} className="text-slate-400" />
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                            setShowSearchResultsList(false);
                                        }}
                                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                        title="Close search"
                                    >
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>

                                {/* Virtualized search results list */}
                                <AnimatePresence>
                                    {showSearchResultsList && searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-slate-800 bg-slate-900 overflow-hidden"
                                        >
                                            <div className="max-h-80 overflow-y-auto">
                                                {VirtuosoComponent ? (
                                                    <VirtuosoComponent
                                                        style={{ height: Math.min(searchResults.length * 60, 320) }}
                                                        totalCount={searchResults.length}
                                                        itemContent={renderSearchResultItem}
                                                    />
                                                ) : (
                                                    <div className="h-24 flex items-center justify-center text-xs text-slate-500">
                                                        Loading search results...
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Summary Panel */}
                {history.length >= 5 && (
                    <div className="px-6 py-2">
                        <React.Suspense fallback={<div className="text-xs text-slate-500">Loading summary...</div>}>
                            <ConversationSummaryPanel
                                sessionId={sessionId}
                                messages={history}
                                modelId={currentModel}
                            />
                        </React.Suspense>
                    </div>
                )}

                {/* Context Window Usage */}
                {history.length > 0 && (
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
                )}

                {/* Messages List */}
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
                                // If we are streaming (last message is loading), force scroll to bottom
                                const lastMsg = history[history.length - 1];
                                if (lastMsg?.isLoading) return 'smooth';
                                // Otherwise maintain stickiness if already at bottom
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
                        <motion.div
                            ref={longPressMenuRef}
                            initial={{ opacity: 0, scale: 0.95, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="fixed z-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl min-w-[220px] overflow-hidden"
                            style={{ left: longPressMenu.x, top: longPressMenu.y }}
                        >
                            <button
                                onClick={() => handleLongPressAction('copy')}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                            >
                                <Copy size={14} className="text-blue-400" />
                                <span>Copy message</span>
                            </button>
                            <button
                                onClick={() => handleLongPressAction('bookmark')}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                            >
                                <Star size={14} className="text-yellow-400" />
                                <span>{bookmarkedMessages.has(longPressMenu.messageIndex) ? 'Remove bookmark' : 'Bookmark message'}</span>
                            </button>
                            {longPressMessage.role === 'user' && (
                                <button
                                    onClick={() => handleLongPressAction('edit')}
                                    className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                                >
                                    <Edit2 size={14} className="text-green-400" />
                                    <span>Edit message</span>
                                </button>
                            )}
                            {longPressMessage.role === 'assistant' && !longPressMessage.isLoading && (
                                <button
                                    onClick={() => handleLongPressAction('regenerate')}
                                    className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                                >
                                    <RefreshCw size={14} className="text-purple-400" />
                                    <span>Regenerate</span>
                                </button>
                            )}
                            <button
                                onClick={() => handleLongPressAction('branch')}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                            >
                                <GitBranch size={14} className="text-yellow-400" />
                                <span>Branch from here</span>
                            </button>
                            <div className="border-t border-slate-700/50" />
                            <button
                                onClick={() => handleLongPressAction('delete')}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                            >
                                <Trash2 size={14} />
                                <span>Delete from here</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Input Area with Control Bar */}
                <div ref={composerContainerRef} className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-full ${isCompactViewport ? 'max-w-full' : 'max-w-4xl'} px-4 z-20 min-w-0 overflow-x-hidden`}>
                    <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                        onDrop={async (e) => {
                            e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                            const files = Array.from(e.dataTransfer.files);
                            if (files.length === 0) return;

                            for (const file of files) {
                                // Handle image files
                                if (file.type.startsWith('image/')) {
                                    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                                    if (validTypes.includes(file.type)) {
                                        try {
                                            const { base64, thumbnailUrl } = await compressImage(file);
                                            addImageAttachment({
                                                name: file.name,
                                                mimeType: 'image/webp', // compressImage outputs webp
                                                base64: base64,
                                                thumbnailUrl: thumbnailUrl
                                            });
                                        } catch (err) {
                                            console.error("Failed to read/compress image", file.name, err);
                                            toast.error(`Failed to process image: ${file.name}`);
                                        }
                                    }
                                }
                                // Handle text files
                                else if (file.type.startsWith('text/') || file.name.match(/\.(md|txt|js|ts|tsx|jsx|json|py|html|css|c|cpp|h|rs|go|java|yaml|xml)$/)) {
                                    try {
                                        const text = await file.text();
                                        addAttachment({ name: file.name, content: text });
                                    } catch (err) {
                                        console.error("Failed to read file", file.name);
                                    }
                                }
                            }
                        }}
                        className={`bg-slate-900/90 border backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col transition-all duration-300 min-w-0 max-w-full overflow-x-hidden ${isDragging ? 'border-primary ring-2 ring-primary/50 bg-slate-800/90' : 'border-slate-700/50'}`}
                    >
                        {/* 0. Attachment List */}
                        {(attachments.length > 0 || imageAttachments.length > 0) && (
                            <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1 animate-in slide-in-from-bottom-2 duration-200">
                                {/* Image Thumbnails */}
                                {imageAttachments.map(img => (
                                    <div key={img.id} className="relative group">
                                        <img
                                            src={img.thumbnailUrl}
                                            alt={img.name}
                                            className="w-16 h-16 object-cover rounded-lg border border-slate-700/50 group-hover:border-primary/50 transition-colors"
                                        />
                                        <button
                                            onClick={() => removeImageAttachment(img.id)}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <X size={10} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm rounded-b-lg px-1 py-0.5">
                                            <span className="text-[8px] text-white truncate block">{img.name.slice(0, 10)}</span>
                                        </div>
                                    </div>
                                ))}
                                {/* Text File Attachments */}
                                {attachments.map(a => (
                                    <div key={a.id} className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-lg pl-3 pr-2 py-1.5 text-xs text-slate-200 group hover:border-slate-600 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-bold truncate max-w-[150px]">{a.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{(a.content.length / 1024).toFixed(1)} KB</span>
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(a.id)}
                                            className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Smart Suggestions Panel */}
                        {showSuggestions && history.length > 0 && (
                            <div className="px-4">
                                <React.Suspense fallback={<div className="text-xs text-slate-500 px-2 py-1">Loading suggestions...</div>}>
                                    <SmartSuggestionsPanel
                                        conversationHistory={history}
                                        lastMessage={history[history.length - 1]?.content}
                                        onSelectSuggestion={(suggestion) => {
                                            setInput(suggestion);
                                            setShowSuggestions(false);
                                            textareaRef.current?.focus();
                                        }}
                                        isOpen={showSuggestions}
                                        onClose={() => setShowSuggestions(false)}
                                    />
                                </React.Suspense>
                            </div>
                        )}

                        {/* 1. Main User Input */}
                        <div className={`flex items-start p-4 gap-3 bg-slate-950/30 relative min-w-0 max-w-full overflow-x-hidden ${showBottomControls ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                            {isDragging && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 rounded-t-2xl backdrop-blur-sm pointer-events-none">
                                    <div className="text-primary font-bold text-lg animate-bounce flex items-center gap-2">
                                        <ImageIcon size={24} /> Drop files or images
                                    </div>
                                </div>
                            )}
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => {
                                    const newValue = e.target.value;
                                    const cursor = e.target.selectionEnd || newValue.length;
                                    const upToCursor = newValue.slice(0, cursor);

                                    // Detect Slash Command: word boundary followed by slash and optional chars
                                    const match = /(?:^|\s)\/([a-zA-Z0-9-]*)$/.exec(upToCursor);

                                    if (match) {
                                        const query = match[1];
                                        // match[0] includes the space before slash if any, so we find the slash pos
                                        const slashIndex = match.index + match[0].lastIndexOf('/') + 1;
                                        setSlashMatch({ query, index: slashIndex });
                                        setActivePromptIndex(0);
                                    } else {
                                        setSlashMatch(null);
                                    }

                                    setInput(newValue);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                                }}
                                onPaste={async (e) => {
                                    const items = Array.from(e.clipboardData.items);
                                    for (const item of items) {
                                        if (item.type.startsWith('image/')) {
                                            e.preventDefault();
                                            const file = item.getAsFile();
                                            if (file) {
                                                try {
                                                    const { base64, thumbnailUrl } = await compressImage(file);
                                                    addImageAttachment({
                                                        name: file.name || `pasted-${Date.now()}.png`,
                                                        mimeType: 'image/webp',
                                                        base64,
                                                        thumbnailUrl
                                                    });
                                                    toast.success('Image pasted');
                                                } catch (err) {
                                                    console.error("Paste failed", err);
                                                    toast.error("Failed to paste image");
                                                }
                                            }
                                        }
                                    }
                                }}
                                onKeyDown={e => {
                                    // Handle Slash Menu Navigation
                                    if (slashMatch && filteredPrompts.length > 0) {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActivePromptIndex(prev => Math.max(0, prev - 1));
                                            return;
                                        }
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActivePromptIndex(prev => Math.min(filteredPrompts.length - 1, prev + 1));
                                            return;
                                        }
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            insertPrompt(filteredPrompts[activePromptIndex]);
                                            return;
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setSlashMatch(null);
                                            return;
                                        }
                                    }

                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessageWithContext();
                                    }
                                }}
                                className={`flex-1 bg-transparent text-white placeholder-slate-400 border-none outline-none resize-none max-h-64 py-2 font-sans text-base leading-relaxed custom-scrollbar min-w-0 overflow-x-hidden break-words ${slashMatch ? 'text-primary' : ''}`}
                                placeholder="Type your prompt here... (Try '/')"
                                rows={1}
                            />
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setShowBottomControls(prev => !prev)}
                                    title={showBottomControls ? 'Hide bottom controls' : 'Show bottom controls'}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700"
                                >
                                    {showBottomControls ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    disabled={history.length === 0}
                                    title="Smart Suggestions"
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <button
                                    onClick={sendMessageWithContext}
                                    disabled={!input.trim()}
                                    className="p-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
                                >
                                    <Send size={18} fill="currentColor" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Prefill / Steering Input (Controlled by Toggle) */}
                        {prefill !== null && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <ChevronRight size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={prefill}
                                        onChange={e => setPrefill(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="Type the response here... (Steer the model)"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                    This seeds the model's response, forcing it to continue from your text.
                                </p>
                            </div>
                        )}

                        {/* 2b. Web Fetch Input (Tools Toggle) */}
                        {showUrlInput && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative flex gap-2 items-center">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <Globe size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') executeWebFetch();
                                        }}
                                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="Enter URL to fetch context from..."
                                    />
                                    <button
                                        onClick={executeWebFetch}
                                        disabled={isFetchingWeb || !urlInput}
                                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {isFetchingWeb ? <span className="animate-spin inline-block mr-1">⌛</span> : "Fetch"}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                    Fetches the text content of the URL and adds it to the chat context.
                                </p>
                            </div>
                        )}

                        {/* 2d. GitHub Fetch Input */}
                        {showGithubInput && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative flex gap-2 items-center">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <Github size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={githubUrl}
                                        onChange={e => setGithubUrl(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') executeGithubFetch();
                                        }}
                                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="owner/repo/path or full GitHub URL..."
                                    />
                                    <button
                                        onClick={executeGithubFetch}
                                        disabled={isFetchingGithub || !githubUrl || !githubConfigured}
                                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {isFetchingGithub ? <span className="animate-spin inline-block mr-1">⌛</span> : "Fetch"}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                                    {githubConfigured
                                        ? "Fetches file contents from GitHub repositories. Format: owner/repo/path/to/file"
                                        : "Configure GitHub API key in Settings → API Keys to use this feature."
                                    }
                                </p>
                            </div>
                        )}

                        {/* 2c. Project Context Display */}
                        {projectContext && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-slate-950 border-2 border-blue-500/30 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen size={16} className="text-blue-400" />
                                            <span className="text-xs font-bold text-blue-400">Project Context</span>
                                            {projectContext.isWatching && (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Watching</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setIncludeContextInMessages(!includeContextInMessages)}
                                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                title={includeContextInMessages ? "Context is included" : "Context is excluded"}
                                            >
                                                {includeContextInMessages ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} className="text-slate-500" />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    void loadProjectContextService()
                                                        .then((projectContextService) => {
                                                            projectContextService.clearContext();
                                                            toast.success('Project context cleared');
                                                        })
                                                        .catch(() => {
                                                            toast.error('Failed to clear project context');
                                                        });
                                                }}
                                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                title="Clear context"
                                            >
                                                <X size={14} className="text-slate-500 hover:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono truncate mb-2" title={projectContext.folderPath}>
                                        {projectContext.folderPath}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">
                                            {projectContext.files.length} file{projectContext.files.length !== 1 ? 's' : ''} loaded
                                        </span>
                                        {!projectContext.isWatching && (
                                            <button
                                                onClick={async () => {
                                                    enableProjectContextFeature();
                                                    const projectContextService = await loadProjectContextService();
                                                    const success = await projectContextService.startWatching();
                                                    if (success) {
                                                        toast.success('Started watching folder for changes');
                                                    } else {
                                                        toast.error('Failed to start watching');
                                                    }
                                                }}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                                            >
                                                Start watching
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slash Command Menu */}
                        {slashMatch && (
                            <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                                    <span>Prompt Library</span>
                                    <span className="bg-slate-800 px-1 rounded text-slate-400">/</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredPrompts.length === 0 ? (
                                        <div className="p-3 text-xs text-slate-500 italic text-center">No matching prompts</div>
                                    ) : (
                                        filteredPrompts.map((p, i) => (
                                            <button
                                                key={p.id}
                                                onClick={() => insertPrompt(p)}
                                                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800/50 last:border-0 transition-colors flex flex-col gap-0.5 ${i === activePromptIndex ? 'bg-primary/20 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                            >
                                                <span className="font-bold flex items-center gap-2">/{p.alias} <span className="font-normal opacity-50 text-[10px] ml-auto">↵</span></span>
                                                <span className="opacity-70 truncate w-full block">{p.title}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Control Pills Bar */}
                        {showBottomControls && (
                        <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/50 flex flex-wrap gap-2 items-center relative rounded-b-2xl">
                            {/* Toggle 1: Control Response */}
                            <button
                                onClick={() => setPrefill(prefill === null ? '' : null)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${prefill !== null
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                {prefill !== null ? <Check size={12} strokeWidth={3} /> : <Settings size={12} strokeWidth={2.5} />} Control Response
                            </button>

                            {/* Toggle 2: Tools */}
                            <button
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showUrlInput
                                    ? 'bg-primary text-white border-primary animate-pulse'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Globe size={12} strokeWidth={2.5} /> Tools
                            </button>

                            {/* Toggle 2c: GitHub */}
                            {githubConfigured && (
                                <button
                                    onClick={() => setShowGithubInput(!showGithubInput)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showGithubInput
                                        ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                >
                                    <Github size={12} strokeWidth={2.5} /> GitHub
                                </button>
                            )}

                            {/* Toggle 2b: Project Context */}
                            <button
                                onClick={async () => {
                                    enableProjectContextFeature();
                                    const projectContextService = await loadProjectContextService();
                                    if (projectContext) {
                                        projectContextService.clearContext();
                                        toast.success('Project context cleared');
                                    } else {
                                        const success = await projectContextService.selectFolder();
                                        if (success) {
                                            toast.success('Project folder loaded');
                                            // Auto-start watching
                                            setTimeout(async () => {
                                                await projectContextService.startWatching();
                                            }, 500);
                                        } else {
                                            toast.error('Failed to select folder');
                                        }
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${projectContext
                                    ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <FolderOpen size={12} strokeWidth={2.5} /> {projectContext ? 'Context' : 'Project'}
                            </button>

                            {/* Toggle 3: Thinking */}
                            <button
                                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${thinkingEnabled
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Brain size={12} strokeWidth={2.5} /> Thinking
                            </button>

                            {/* Toggle 3b: Battle Mode */}
                            <button
                                onClick={() => setBattleMode(!battleMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${battleMode
                                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Users size={12} strokeWidth={2.5} /> Battle
                            </button>

                            {/* Toggle 5: Token Inspector */}
                            <button
                                onClick={() => setShowInspector(!showInspector)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showInspector
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Activity size={12} strokeWidth={2.5} /> Inspector
                            </button>

                            {/* Toggle 4: Mixture of Experts / Config */}
                            <button
                                onClick={() => setShowExpertMenu(!showExpertMenu)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${expertMode
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Users size={12} strokeWidth={2.5} /> {expertMode ? `Expert: ${expertMode}` : "Expert Config"}
                            </button>

                            {/* Toggle 4b: Variables */}
                            <button
                                onClick={() => setShowVariableMenu(!showVariableMenu)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showVariableMenu
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Insert variables like {{date}}, {{time}}, {{user_name}}"
                            >
                                <Code2 size={12} strokeWidth={2.5} /> Variables
                            </button>



                            {/* JSON Mode Toggle */}
                            <button
                                onClick={() => {
                                    setJsonMode(!jsonMode);
                                    toast.success(jsonMode ? 'JSON mode disabled' : 'JSON mode enabled');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${jsonMode
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Enable JSON output format"
                            >
                                <Code2 size={12} strokeWidth={2.5} /> JSON
                            </button>

                            {/* Streaming Toggle */}
                            <button
                                onClick={() => {
                                    setStreamingEnabled(!streamingEnabled);
                                    toast.success(streamingEnabled ? 'Streaming disabled' : 'Streaming enabled');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${streamingEnabled
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title={streamingEnabled ? "Disable streaming (get full response at once)" : "Enable streaming (real-time token display)"}
                            >
                                <Activity size={12} strokeWidth={2.5} /> Stream
                            </button>

                            {/* Analytics Dashboard */}
                            <button
                                onClick={() => {
                                    setShowAnalytics(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                title="View usage analytics and statistics"
                            >
                                <BarChart3 size={12} strokeWidth={2.5} /> Analytics
                            </button>

                            {/* Conversation Recommendations */}
                            {history.length > 0 && (
                                <button
                                    onClick={() => setShowRecommendations(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                    title="Find relevant conversations (Ctrl+Shift+R)"
                                >
                                    <Sparkles size={12} strokeWidth={2.5} /> Recommendations
                                </button>
                            )}

                            {/* Controls Toggle */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${sidebarOpen
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Toggle Controls Panel"
                            >
                                <Settings size={12} strokeWidth={2.5} /> Controls
                            </button>

                            {/* MCP Status Indicator */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${mcpAvailable
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                                }`}
                                title={mcpAvailable ? `${mcpConnectedCount} server(s), ${mcpTools.length} tools` : 'No MCP servers connected'}
                            >
                                <Plug size={12} strokeWidth={2.5} />
                                {mcpAvailable ? (
                                    <span className="flex items-center gap-1">
                                        MCP
                                        <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1 rounded">{mcpTools.length}</span>
                                    </span>
                                ) : (
                                    <span className="opacity-50">MCP</span>
                                )}
                            </div>

                            {/* Expert Dropdown Menu */}
                            {showExpertMenu && (
                                <div className="absolute bottom-12 right-4 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                                    <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Expert Persona</div>
                                    <button onClick={() => handleExpertSelect(null)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">None (Default)</button>
                                    <button onClick={() => handleExpertSelect('coding')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">👨‍💻 Coding Expert</button>
                                    <button onClick={() => handleExpertSelect('reasoning')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🧠 Logic & Reasoning</button>
                                    <button onClick={() => handleExpertSelect('creative')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🎨 Creative Writer</button>
                                    <button onClick={() => handleExpertSelect('math')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">📐 Mathematician</button>
                                </div>
                            )}

                            {/* Variable Insert Menu */}
                            {showVariableMenu && (
                                <React.Suspense fallback={null}>
                                    <VariableInsertMenu
                                        isOpen={showVariableMenu}
                                        onClose={() => setShowVariableMenu(false)}
                                        onInsert={(variable) => {
                                            setInput(prev => prev + variable);
                                            setShowVariableMenu(false);
                                        }}
                                        context={{
                                            modelId: currentModel,
                                            modelName: availableModels.find(m => m.id === currentModel)?.name || currentModel,
                                            sessionId: sessionId,
                                            sessionTitle: savedSessions.find(s => s.id === sessionId)?.title || 'New Chat',
                                            messageCount: history.length
                                        }}
                                    />
                                </React.Suspense>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inspector / Sidebar */}
            {sidebarOpen && (
                <>
                {isCompactViewport && (
                    <div
                        className="absolute inset-0 bg-black/40 z-20"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
                <div className={`${isCompactViewport ? 'absolute inset-y-0 right-0 z-30 w-[92vw] max-w-[420px]' : 'w-[420px] min-w-[420px]'} bg-slate-950/50 border-1 border-slate-800 flex flex-col h-full border-l backdrop-blur-xl relative`}>
                <div className="flex border-b border-slate-800 relative">
                    <button onClick={() => setActiveTab('inspector')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'inspector' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Inspector</button>
                    <button onClick={() => setActiveTab('controls')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'controls' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Controls</button>
                    <button onClick={() => setActiveTab('prompts')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'prompts' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Prompts</button>
                    <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'documents' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Docs</button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-2 right-2 p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        title="Close Sidebar"
                    >
                        <X size={14} />
                    </button>
                </div>

                {activeTab === 'controls' && (
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block">System Prompt</label>
                                {!isEditingSystemPrompt && (
                                    <span className="text-[10px] text-slate-500 italic">Double-click to edit</span>
                                )}
                            </div>
                            {isEditingSystemPrompt ? (
                                <textarea
                                    value={systemPrompt}
                                    autoFocus
                                    onBlur={() => setIsEditingSystemPrompt(false)}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                    className="w-full h-32 bg-white text-slate-900 border-2 border-primary rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none transition-all shadow-xl"
                                />
                            ) : (
                                <div
                                    onDoubleClick={() => setIsEditingSystemPrompt(true)}
                                    className="w-full min-h-32 bg-slate-900 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-400 overflow-y-auto custom-scrollbar cursor-pointer hover:border-primary/50 hover:bg-slate-900/80 transition-all select-none group relative break-words"
                                    title="Double-click to edit"
                                >
                                    <div className="whitespace-pre-wrap break-words">{systemPrompt || "No system prompt set."}</div>
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Edit2 size={24} className="text-primary/30" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            {/* Battle Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className={battleMode ? "text-primary" : "text-slate-400"} />
                                        <label className="text-sm font-medium text-slate-300">Battle Mode</label>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newVal = !battleMode;
                                            setBattleMode(newVal);
                                            if (newVal && !secondaryModel && availableModels.length > 1) {
                                                setSecondaryModel(availableModels.find(m => m.id !== currentModel)?.id || '');
                                            }
                                        }}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${battleMode ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${battleMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {battleMode && (
                                    <div className="space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            <span>Opponent Model</span>
                                            <span className="text-primary font-mono">{availableModels.find(m => m.id === secondaryModel)?.name || 'Select...'}</span>
                                        </label>
                                        <select
                                            value={secondaryModel}
                                            onChange={(e) => setSecondaryModel(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="">Select Model...</option>
                                            {availableModels.filter(m => m.id !== currentModel).map(m => (
                                                <option key={m.id} value={m.id}>{m.name || m.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Reasoning Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain size={16} className={thinkingEnabled ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">Reasoning Mode</label>
                                            <span className="text-[10px] text-slate-500">Injects &lt;thinking&gt; tags logic</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setThinkingEnabled(!thinkingEnabled)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${thinkingEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${thinkingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Auto Model Routing Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Network size={16} className={autoRouting ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">Auto Model Routing</label>
                                            <span className="text-[10px] text-slate-500">Selects best model for query intent</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAutoRouting(!autoRouting)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${autoRouting ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoRouting ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Tools Section */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={16} className="text-slate-400" />
                                    <label className="text-sm font-medium text-slate-300">Tools</label>
                                </div>
                                <div className="space-y-2">
                                    {AVAILABLE_TOOLS.map(tool => {
                                        const isEnabled = enabledTools.has(tool.name);
                                        return (
                                            <div key={tool.name} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-200 font-medium">{tool.name}</span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{tool.description}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newSet = new Set(enabledTools);
                                                        if (isEnabled) newSet.delete(tool.name);
                                                        else newSet.add(tool.name);
                                                        setEnabledTools(newSet);
                                                    }}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${isEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* JSON Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileJson size={16} className={responseFormat === 'json_object' ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">JSON Mode</label>
                                            <span className="text-[10px] text-slate-500">Force model to output valid JSON</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setResponseFormat(responseFormat === 'text' ? 'json_object' : 'text')}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${responseFormat === 'json_object' ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${responseFormat === 'json_object' ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Context Management */}
                            <div className="pb-4 border-b border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className={contextUsage.warning ? "text-amber-400" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">Context Optimizer</label>
                                            <span className="text-[10px] text-slate-500">
                                                {Math.round(contextUsage.fillRatio * 100)}% of {contextUsage.maxContextTokens.toLocaleString()} tokens used
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAutoSummarizeContext(prev => !prev)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${autoSummarizeContext ? 'bg-primary' : 'bg-slate-700'}`}
                                        title="Auto-summarize old messages when context is near full"
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoSummarizeContext ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${contextUsage.fillRatio >= 0.9 ? 'bg-red-500' : contextUsage.fillRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(100, contextUsage.fillRatio * 100)}%` }}
                                    />
                                </div>

                                <div className="text-[10px] text-slate-500">
                                    Input: {contextUsage.inputTokens.toLocaleString()} • Reserved output: {contextUsage.reservedOutputTokens.toLocaleString()}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => applyTrimSuggestions(3)}
                                        disabled={trimSuggestions.length === 0}
                                        className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
                                    >
                                        Apply Suggested Trim
                                    </button>
                                    <button
                                        onClick={() => setExcludedContextIndices(new Set())}
                                        className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300"
                                    >
                                        Include All
                                    </button>
                                </div>

                                {trimSuggestions.length > 0 && (
                                    <div className="space-y-1">
                                        {trimSuggestions.slice(0, 3).map(suggestion => (
                                            <div key={`trim-${suggestion.messageIndex}`} className="flex items-start justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-700/50">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-slate-300">
                                                        #{suggestion.messageIndex + 1} ({suggestion.role}) • save ~{suggestion.estimatedTokenSavings} tokens
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate">{suggestion.preview}</div>
                                                </div>
                                                <button
                                                    onClick={() => setExcludedContextIndices(prev => new Set(prev).add(suggestion.messageIndex))}
                                                    className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                                                >
                                                    Exclude
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {recentContextMessages.length > 0 && (
                                    <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                                        {recentContextMessages.map(item => (
                                            <label key={`ctx-${item.index}`} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-900/60">
                                                <span className="text-[10px] text-slate-400 truncate">
                                                    #{item.index + 1} {item.message.role} • ~{item.estimatedTokens}t
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={item.included}
                                                    onChange={() => toggleMessageContextInclusion(item.index)}
                                                    className="rounded border-slate-600 bg-slate-800"
                                                    title="Include this message in model context"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Batch Size</label><span className="font-mono text-primary">{batchSize}</span></div><input type="range" min="1" max="5" value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Temperature</label><span className="font-mono text-primary">{temperature}</span></div><input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Top P</label><span className="font-mono text-primary">{topP}</span></div><input type="range" min="0" max="1" step="0.05" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            {(() => {
                                const currentModelObj = availableModels.find(m => m.id === currentModel);
                                // Use model's contextLength if available, otherwise use sensible defaults
                                // For modern models: 8K, 32K, 128K, 200K are common
                                const maxContextLength = currentModelObj?.contextLength || 32768;
                                // Allow up to 95% of context length for output tokens (leave room for input)
                                const maxAllowedTokens = Math.floor(maxContextLength * 0.95);
                                const sliderMax = Math.max(4096, maxAllowedTokens); // At least 4K, but can go higher

                                return (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <label className="text-slate-400">Max Tokens</label>
                                            <span className="font-mono text-primary">{maxTokens.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max={sliderMax}
                                            step={sliderMax > 10000 ? 100 : 10}
                                            value={maxTokens}
                                            onChange={e => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                        {currentModelObj?.contextLength && (
                                            <div className="text-[10px] text-slate-500 text-right">
                                                Model context: {currentModelObj.contextLength.toLocaleString()} tokens
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'prompts' && (
                    <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Library...</div>}>
                        <PromptManager />
                    </React.Suspense>
                )}

                {activeTab === 'documents' && (
                    <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Documents...</div>}>
                        <DocumentChatPanel />
                    </React.Suspense>
                )}

                {activeTab === 'inspector' && (
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
                        {selectedToken ? (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-white text-slate-900 rounded-xl p-6 text-center shadow-lg mb-6 border-4 border-slate-800 relative">
                                    <div className="text-3xl font-heading font-bold mb-1">"{selectedToken.logprob.token}"</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Selected Token</div>

                                    {/* Token Editor */}
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-sm font-mono"
                                                defaultValue={selectedToken.logprob.token}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const newVal = e.currentTarget.value;
                                                        updateMessageToken(selectedToken.messageIndex, selectedToken.tokenIndex, newVal);
                                                        toast.success("Token updated");
                                                    }
                                                }}
                                            />
                                            <button className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-700">Update</button>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">Press Enter to apply changes</div>
                                    </div>
                                </div>
                                <div className="space-y-4 mb-6">
                                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                                        <div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-sm">Logprob</span><span className="font-mono text-emerald-400">{selectedToken.logprob.logprob?.toFixed(4) ?? "N/A"}</span></div>
                                        <div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-sm">Probability</span><span className="font-mono text-emerald-400">{(Math.exp(selectedToken.logprob.logprob || 0) * 100).toFixed(2)}%</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Entropy</span><span className="font-mono text-amber-400">{calculateEntropy(selectedToken.logprob.top_logprobs).toFixed(3)}</span></div>
                                    </div>
                                </div>
                                <details className="mb-6 group"><summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1"><ChevronRight size={12} className="group-open:rotate-90 transition-transform" /> Debug Data</summary><pre className="mt-2 text-[10px] bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto border border-slate-800 font-mono">{JSON.stringify(selectedToken.logprob, null, 2)}</pre></details>
                                <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2"><Activity size={14} className="text-primary" /> Top Alternatives</h4>
                                {(!selectedToken.logprob.top_logprobs || selectedToken.logprob.top_logprobs.length === 0) ? (
                                    <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg text-amber-200 text-sm flex items-start gap-3"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><div><p className="font-bold">No alternatives found.</p><p className="opacity-80 text-xs mt-1">If you just updated the server, please restart the application.</p></div></div>
                                ) : (
                                    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                        {selectedToken.logprob.top_logprobs.map((topLp, idx) => {
                                            if (!topLp) return null;
                                            const prob = Math.exp(topLp.logprob);
                                            const width = Math.min(100, Math.max(1, prob * 100));
                                            return (
                                                <div key={`${idx}-${topLp.token}`} className="p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors group">
                                                    <div className="flex justify-between items-center mb-1.5"><span className="font-mono font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-xs">"{topLp.token}"</span><span className="text-xs text-slate-400 group-hover:text-white font-mono">{(prob * 100).toFixed(1)}%</span></div>
                                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${width}%` }}></div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4 p-8">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2 animate-pulse"><Activity size={32} className="text-slate-700" /></div>
                                <p className="font-medium">Inspect Token Details</p>
                                <p className="text-sm opacity-70">Select any token in the chat message to view its probabilities and entropy.</p>
                                <div className="text-xs bg-slate-900/50 p-3 rounded border border-slate-800"><span className="text-amber-500">Note:</span> If tokens are not clickable, logprobs might be disabled on the server.</div>
                            </div>
                        )}
                    </div>
                )}
                </div>
                </>
            )}

            {/* Sidebar Toggle Button (when closed) */}

            {/* Keyboard Shortcuts Modal */}
            {showShortcutsModal && (
                <React.Suspense fallback={null}>
                    <KeyboardShortcutsModal
                        isOpen={showShortcutsModal}
                        onClose={() => setShowShortcutsModal(false)}
                    />
                </React.Suspense>
            )}

            {/* Request/Response Log */}
            {showRequestLog && (
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
            )}

            {/* Analytics Dashboard */}
            {showAnalytics && (
                <React.Suspense fallback={null}>
                    <AnalyticsDashboard
                        isOpen={showAnalytics}
                        onClose={() => setShowAnalytics(false)}
                        usageHistory={usageStats}
                    />
                </React.Suspense>
            )}

            {/* Conversation Tree View */}
            {branchingEnabled && showTreeView && treeHook.treeManager && (
                <React.Suspense fallback={null}>
                    <ConversationTreeView
                        isOpen={showTreeView}
                        onClose={() => setShowTreeView(false)}
                        treeManager={treeHook.treeManager}
                        currentPath={treeHook.currentPath}
                        onNavigateToNode={(nodeId) => {
                            // Close tree view
                            // Note: We don't navigate here to prevent truncating the conversation
                            // Navigation is only useful when switching between actual branches,
                            // which is handled by Alt+Left/Right keyboard shortcuts
                            setShowTreeView(false);
                        }}
                    />
                </React.Suspense>
            )}

            {/* Export Dialog */}
            {showExportDialog && (
                <React.Suspense fallback={null}>
                    <ExportDialog
                        isOpen={showExportDialog}
                        onClose={() => setShowExportDialog(false)}
                        messages={history}
                        sessionTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
                    />
                </React.Suspense>
            )}

            {/* Global Search Dialog */}
            {showGlobalSearch && (
                <React.Suspense fallback={null}>
                    <GlobalSearchDialog
                        isOpen={showGlobalSearch}
                        onClose={() => setShowGlobalSearch(false)}
                        currentSessionId={sessionId}
                        currentSessionTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Current Conversation'}
                        onNavigateToMessage={(targetSessionId, messageIndex) => {
                            // If different session, load it first
                            if (targetSessionId !== sessionId) {
                                handleLoadSession(targetSessionId);
                            }
                            // Scroll to the message after a short delay to allow session loading
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
            )}

            {/* Template Library Dialog */}
            {showTemplateLibrary && (
                <React.Suspense fallback={null}>
                    <TemplateLibraryDialog
                        isOpen={showTemplateLibrary}
                        onClose={() => setShowTemplateLibrary(false)}
                        onUseTemplate={(template: ConversationTemplate) => {
                            // Create new session with template
                            createNewSession();

                            // Apply template settings
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

                            // Apply initial messages
                            if (template.initialMessages.length > 0) {
                                setHistory(template.initialMessages.map(m => ({
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
            )}

            {/* A/B Testing Panel */}
            {showABTesting && (
                <React.Suspense fallback={null}>
                    <ABTestingPanel
                        isOpen={showABTesting}
                        onClose={() => setShowABTesting(false)}
                        onExecutePrompt={async (prompt, systemPrompt, modelId, temperature, topP, maxTokens) => {
                            return executeChatCompletion({
                                prompt,
                                systemPrompt,
                                modelId,
                                temperature,
                                topP,
                                maxTokens,
                            });
                        }}
                        currentInput={input}
                        currentContext={history}
                    />
                </React.Suspense>
            )}

            {/* Prompt Optimization Panel */}
            {showPromptOptimization && (
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
            )}

            {/* Calendar Schedule Dialog */}
            {showCalendarSchedule && (
                <React.Suspense fallback={null}>
                    <CalendarScheduleDialog
                        isOpen={showCalendarSchedule}
                        onClose={() => setShowCalendarSchedule(false)}
                        conversationTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
                        conversationSummary={history.length > 0 ? `Review conversation with ${history.length} messages` : undefined}
                    />
                </React.Suspense>
            )}

            {/* Conversation Recommendations Panel */}
            {showRecommendations && (
                <React.Suspense fallback={null}>
                    <ConversationRecommendationsPanel
                        isOpen={showRecommendations}
                        onClose={() => setShowRecommendations(false)}
                        currentSessionId={sessionId}
                        currentMessage={input}
                        conversationHistory={history}
                        onSelectConversation={(sessionId) => {
                            handleLoadSession(sessionId);
                            setShowRecommendations(false);
                        }}
                    />
                </React.Suspense>
            )}

            {/* Workflows Manager */}
            {showWorkflows && (
                <React.Suspense fallback={null}>
                    <WorkflowsManager
                        isOpen={showWorkflows}
                        onClose={() => setShowWorkflows(false)}
                    />
                </React.Suspense>
            )}

            {/* API Playground */}
            {showAPIPlayground && (
                <React.Suspense fallback={null}>
                    <APIPlayground
                        isOpen={showAPIPlayground}
                        onClose={() => setShowAPIPlayground(false)}
                    />
                </React.Suspense>
            )}

            {/* Developer Documentation */}
            {showDeveloperDocs && (
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
            )}

            {/* Plugin Manager */}
            {showPluginManager && (
                <React.Suspense fallback={null}>
                    <PluginManager
                        isOpen={showPluginManager}
                        onClose={() => setShowPluginManager(false)}
                    />
                </React.Suspense>
            )}

            {/* Code Integration Panel */}
            {showCodeIntegration && (
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
                        onExecutePrompt={async (prompt, systemPrompt) => {
                            const result = await executeChatCompletion({
                                prompt,
                                systemPrompt,
                            });
                            return { content: result.content };
                        }}
                    />
                </React.Suspense>
            )}

            {/* Workspace Views */}
            {showWorkspaceViews && (
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
            )}

            {/* Interactive Tutorial */}
            {showTutorial && currentTutorial && (
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
            )}

            {/* Brain-Computer Interface */}
            {showBCI && (
                <React.Suspense fallback={null}>
                    <BCIPanel
                        isOpen={showBCI}
                        onClose={() => setShowBCI(false)}
                    />
                </React.Suspense>
            )}

            {/* Multi-Modal AI */}
            {showMultiModal && (
                <React.Suspense fallback={null}>
                    <MultiModalAIPanel
                        isOpen={showMultiModal}
                        onClose={() => setShowMultiModal(false)}
                        onSend={async (media, text) => {
                            // Process multi-modal request
                            const multiModalAIService = await loadMultiModalAIService();
                            const response = await multiModalAIService.sendMultiModalRequest(
                                { text, media },
                                async (prompt, systemPrompt) => {
                                    const result = await executeChatCompletion({
                                        prompt,
                                        systemPrompt,
                                    });
                                    return { content: result.content };
                                }
                            );
                            // Add response to conversation
                            setHistory(prev => [...prev, {
                                role: 'assistant',
                                content: response.content,
                                isLoading: false,
                            }]);
                        }}
                    />
                </React.Suspense>
            )}

            {/* Real-Time Collaboration */}
            {showCollaboration && (
                <React.Suspense fallback={null}>
                    <RealTimeCollaborationPanel
                        isOpen={showCollaboration}
                        onClose={() => setShowCollaboration(false)}
                    />
                </React.Suspense>
            )}

            {showCloudSync && (
                <React.Suspense fallback={null}>
                    <CloudSyncPanel
                        isOpen={showCloudSync}
                        onClose={() => setShowCloudSync(false)}
                    />
                </React.Suspense>
            )}

            {showTeamWorkspaces && (
                <React.Suspense fallback={null}>
                    <TeamWorkspacesPanel
                        isOpen={showTeamWorkspaces}
                        onClose={() => setShowTeamWorkspaces(false)}
                        availableModels={availableModels}
                        conversations={savedSessions}
                    />
                </React.Suspense>
            )}

            {showEnterpriseCompliance && (
                <React.Suspense fallback={null}>
                    <EnterpriseCompliancePanel
                        isOpen={showEnterpriseCompliance}
                        onClose={() => setShowEnterpriseCompliance(false)}
                    />
                </React.Suspense>
            )}

            {/* Blockchain Integration */}
            {showBlockchain && (
                <React.Suspense fallback={null}>
                    <BlockchainPanel
                        isOpen={showBlockchain}
                        onClose={() => setShowBlockchain(false)}
                        sessionId={sessionId}
                        conversationData={history}
                    />
                </React.Suspense>
            )}

            {/* AI Agents */}
            {showAIAgents && (
                <React.Suspense fallback={null}>
                    <AIAgentsPanel
                        isOpen={showAIAgents}
                        onClose={() => setShowAIAgents(false)}
                        onExecutePrompt={async (prompt, systemPrompt) => {
                            const result = await executeChatCompletion({
                                prompt,
                                systemPrompt,
                            });
                            return { content: result.content };
                        }}
                    />
                </React.Suspense>
            )}

            {/* Federated Learning */}
            {showFederatedLearning && (
                <React.Suspense fallback={null}>
                    <FederatedLearningPanel
                        isOpen={showFederatedLearning}
                        onClose={() => setShowFederatedLearning(false)}
                    />
                </React.Suspense>
            )}

            {/* Performance Monitor Overlay (dev-only, on demand) */}
            {devMonitorsEnabled && (
                <React.Suspense fallback={null}>
                    <PerformanceMonitorOverlay messageCount={history.length} />
                </React.Suspense>
            )}

            {/* Recovery Dialog */}
            {showRecoveryDialog && (
                <React.Suspense fallback={null}>
                    <RecoveryDialog
                        isOpen={showRecoveryDialog}
                        onClose={() => setShowRecoveryDialog(false)}
                        onRestore={handleRestoreSession}
                        onDismiss={handleDismissRecovery}
                        recoveryState={recoveryState}
                    />
                </React.Suspense>
            )}
        </div>
    );
};

export default Chat;
