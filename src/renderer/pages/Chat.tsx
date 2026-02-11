import React from 'react';
import { Send, Clock, Plus, Trash2, X, Globe, Settings, Activity, AlertTriangle, ChevronRight, Check, AlertCircle, Brain, Users, Plug, Wrench, Copy, Eraser, Download, Edit2, Search, ChevronUp, ChevronDown, Star, FileText, ThumbsUp, ThumbsDown, Code2, BarChart3, FolderOpen, Eye, EyeOff, Github, GitBranch, Network, HelpCircle, Maximize2, Minimize2, RefreshCw, Zap, LayoutGrid, FileJson, TestTube, Sparkles, MessageSquare, Mail, Calendar, Package, Video, Link, Bot, Shield, Menu, Cloud, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatComposerShell } from '../components/chat/ChatComposerShell';
import { ChatOverlays } from '../components/chat/ChatOverlays';
import { ChatSidebar, type ChatSidebarPanels } from '../components/chat/ChatSidebar';
import { ChatWorkspaceShell } from '../components/chat/ChatWorkspaceShell';
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
import {
    areSearchResultIndicesEqual,
    findChatSearchMatches,
    normalizeChatSearchQuery,
} from '../lib/chatSearch';
import {
    buildSearchResultRows,
    createChatRowMetadataCacheState,
    EXPERIMENTAL_FEATURE_MENU_ITEMS,
    getCachedChatRowMetadata,
    type ExperimentalFeatureMenuItem,
    type SearchResultPreviewCacheEntry,
} from '../lib/chatRenderModels';
import {
    type ChatMessageActionCapabilities,
    getMessageActionCapabilities,
    isLongPressActionAllowed,
    type ChatMessageAction,
} from '../lib/chatMessageActions';
import {
    applyPromptSnippetAtSlash,
    buildInspectorAlternativeRows,
    buildContextTrimSuggestionRows,
    buildComposerControlPillDescriptors,
    buildLongPressMenuActionItems,
    buildRecentContextMessageRows,
    type ComposerControlPillDescriptor,
    type ComposerControlPillKey,
    getMaxTokensSliderConfig,
    getWrappedSearchResultIndex,
    type RecentContextMessageRow,
    toggleToolNameInSet,
} from '../lib/chatUiModels';
import {
    analyzeComposerInput,
    collectPastedImageFiles,
    describeDroppedFiles,
    resolveComposerKeyAction,
} from '../lib/chatComposerHandlers';
import {
    dispatchChatShortcutAction,
    isTypingShortcutTarget,
    resolveChatShortcutAction,
} from '../lib/chatKeyboardShortcuts';
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
const NOOP = () => {};

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

const EXPERIMENTAL_FEATURE_ICON_MAP: Record<ExperimentalFeatureMenuItem['icon'], React.ComponentType<{ size?: number }>> = {
    brain: Brain,
    multimodal: Video,
    collaboration: Users,
    cloud: Cloud,
    workspaces: Shield,
    compliance: ClipboardList,
    blockchain: Link,
    agents: Bot,
    federated: Shield,
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

interface MessageHoverActionsProps {
    isBookmarked: boolean;
    messageContent: string;
    messageIndex: number;
    messageRole: string;
    isLoading: boolean;
    onToggleBookmark: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onEdit?: () => void;
    onRegenerate?: () => void;
    onBranch: () => void;
}

const MessageHoverActions: React.FC<MessageHoverActionsProps> = React.memo(({
    isBookmarked,
    messageContent,
    messageIndex,
    messageRole,
    isLoading,
    onToggleBookmark,
    onCopy,
    onDelete,
    onEdit,
    onRegenerate,
    onBranch,
}) => (
    <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/85 px-1 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-20 backdrop-blur-sm">
        <button
            onClick={onToggleBookmark}
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
                messageContent={messageContent}
                messageIndex={messageIndex}
                messageRole={messageRole}
                onCopy={onCopy}
                onDelete={onDelete}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
                onBranch={onBranch}
            />
        </React.Suspense>
    </div>
), (prev, next) => (
    prev.isBookmarked === next.isBookmarked &&
    prev.messageContent === next.messageContent &&
    prev.messageIndex === next.messageIndex &&
    prev.messageRole === next.messageRole &&
    prev.isLoading === next.isLoading &&
    prev.onToggleBookmark === next.onToggleBookmark &&
    prev.onCopy === next.onCopy &&
    prev.onDelete === next.onDelete &&
    prev.onEdit === next.onEdit &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onBranch === next.onBranch
));

const resolveBattleModelName = (
    content: string | undefined,
    pattern: RegExp,
    fallbackModelId: string,
    modelNameById: Map<string, string>,
    fallbackLabel: string
): string => {
    const match = content?.match(pattern);
    if (match?.[1]) {
        return match[1];
    }
    return modelNameById.get(fallbackModelId) || fallbackLabel;
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
    modelNameById: Map<string, string>;
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
    modelNameById,
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
    const messageActionCapabilities = React.useMemo(
        () => getMessageActionCapabilities(msg),
        [msg.role, msg.isLoading]
    );

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
                modelNameById,
                'Model A'
            ),
            modelBName: resolveBattleModelName(
                nextMessage.content,
                /\*\*Model B:\s*(.+?)\*\*/,
                secondaryModel,
                modelNameById,
                'Model B'
            ),
        };
    }, [nextMessage, msg.content, currentModel, secondaryModel, modelNameById]);

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
                <MessageHoverActions
                    isBookmarked={isBookmarked}
                    messageContent={msg.content || ''}
                    messageIndex={index}
                    messageRole={msg.role}
                    isLoading={Boolean(msg.isLoading)}
                    onToggleBookmark={handleToggleBookmark}
                    onCopy={handleCopyMessage}
                    onDelete={handleDeleteMessage}
                    onEdit={messageActionCapabilities.canEdit ? handleEditMessageAction : undefined}
                    onRegenerate={messageActionCapabilities.canRegenerate ? handleRegenerateMessageAction : undefined}
                    onBranch={handleBranchConversationAction}
                />
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
        prev.isLazyLoaded === next.isLazyLoaded &&
        prev.modelNameById === next.modelNameById &&
        prev.currentModel === next.currentModel &&
        prev.secondaryModel === next.secondaryModel
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

interface HeaderPrimaryActionConfig {
    key: string;
    title: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
    variant?: 'default' | 'primary';
}

interface TopHeaderPrimaryActionsProps {
    isCompactViewport: boolean;
    showHistory: boolean;
    onToggleHistory: () => void;
    actions: HeaderPrimaryActionConfig[];
}

const TopHeaderPrimaryActions: React.FC<TopHeaderPrimaryActionsProps> = React.memo(({
    isCompactViewport,
    showHistory,
    onToggleHistory,
    actions,
}) => (
    <>
        <button
            onClick={onToggleHistory}
            title="View History"
            className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showHistory ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
            {isCompactViewport ? <Menu size={16} /> : <Clock size={16} />}
        </button>
        {actions.map((action) => {
            const Icon = action.icon;
            const buttonClassName = action.variant === 'primary'
                ? 'flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-md hover:brightness-110 transition-all shadow-md shadow-emerald-900/20 font-medium text-xs flex-shrink-0'
                : 'flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap';

            return (
                <button
                    key={action.key}
                    onClick={action.onClick}
                    title={action.title}
                    className={buttonClassName}
                >
                    <Icon size={14} />
                    <span>{action.label}</span>
                </button>
            );
        })}
    </>
), (prev, next) => (
    prev.isCompactViewport === next.isCompactViewport &&
    prev.showHistory === next.showHistory &&
    prev.onToggleHistory === next.onToggleHistory &&
    prev.actions === next.actions
));

interface TopHeaderSecondaryActionsProps {
    hasHistory: boolean;
    showTreeView: boolean;
    integrationAvailability: IntegrationAvailability;
    onOpenCodeIntegration: () => void;
    onClearChat: () => void;
    onOpenExportDialog: () => void;
    onToggleTreeView: () => void;
    onExportSessionToObsidian: () => void;
    onSaveToNotion: () => void;
    onSendToSlack: () => void;
    onSendToDiscord: () => void;
    onSendToEmail: () => void;
    onOpenCalendarSchedule: () => void;
}

const TopHeaderSecondaryActions: React.FC<TopHeaderSecondaryActionsProps> = React.memo(({
    hasHistory,
    showTreeView,
    integrationAvailability,
    onOpenCodeIntegration,
    onClearChat,
    onOpenExportDialog,
    onToggleTreeView,
    onExportSessionToObsidian,
    onSaveToNotion,
    onSendToSlack,
    onSendToDiscord,
    onSendToEmail,
    onOpenCalendarSchedule,
}) => {
    if (!hasHistory) {
        return null;
    }

    return (
        <>
            <button
                onClick={onOpenCodeIntegration}
                title="Code Integration (Review, Refactor, Docs, Tests, Git)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Code2 size={14} /> <span>Code</span>
            </button>
            <button
                onClick={onClearChat}
                title="Clear Chat"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Eraser size={14} /> <span>Clear</span>
            </button>
            <button
                onClick={onOpenExportDialog}
                title="Export Chat (Ctrl+Shift+E)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Download size={14} /> <span>Export</span>
            </button>
            <button
                onClick={onToggleTreeView}
                title="Conversation Tree (Ctrl+T)"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${showTreeView
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
            >
                <Network size={14} /> <span>Tree</span>
            </button>
            <button
                onClick={onExportSessionToObsidian}
                title="Export to Obsidian"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <FileText size={14} /> <span>Obsidian</span>
            </button>
            {integrationAvailability.notion && (
                <button
                    onClick={onSaveToNotion}
                    title="Save to Notion"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <FileText size={14} /> <span>Notion</span>
                </button>
            )}
            {integrationAvailability.slack && (
                <button
                    onClick={onSendToSlack}
                    title="Send to Slack"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <MessageSquare size={14} /> <span>Slack</span>
                </button>
            )}
            {integrationAvailability.discord && (
                <button
                    onClick={onSendToDiscord}
                    title="Send to Discord"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <MessageSquare size={14} /> <span>Discord</span>
                </button>
            )}
            {integrationAvailability.email && (
                <button
                    onClick={onSendToEmail}
                    title="Email Conversation"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <Mail size={14} /> <span>Email</span>
                </button>
            )}
            {integrationAvailability.calendar && (
                <button
                    onClick={onOpenCalendarSchedule}
                    title="Schedule Reminder"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <Calendar size={14} /> <span>Schedule</span>
                </button>
            )}
        </>
    );
}, (prev, next) => (
    prev.hasHistory === next.hasHistory &&
    prev.showTreeView === next.showTreeView &&
    prev.integrationAvailability.notion === next.integrationAvailability.notion &&
    prev.integrationAvailability.slack === next.integrationAvailability.slack &&
    prev.integrationAvailability.discord === next.integrationAvailability.discord &&
    prev.integrationAvailability.email === next.integrationAvailability.email &&
    prev.integrationAvailability.calendar === next.integrationAvailability.calendar &&
    prev.onOpenCodeIntegration === next.onOpenCodeIntegration &&
    prev.onClearChat === next.onClearChat &&
    prev.onOpenExportDialog === next.onOpenExportDialog &&
    prev.onToggleTreeView === next.onToggleTreeView &&
    prev.onExportSessionToObsidian === next.onExportSessionToObsidian &&
    prev.onSaveToNotion === next.onSaveToNotion &&
    prev.onSendToSlack === next.onSendToSlack &&
    prev.onSendToDiscord === next.onSendToDiscord &&
    prev.onSendToEmail === next.onSendToEmail &&
    prev.onOpenCalendarSchedule === next.onOpenCalendarSchedule
));

interface ExperimentalFeatureAction {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
}

interface ExperimentalFeaturesDropdownProps {
    actions: ExperimentalFeatureAction[];
}

const ExperimentalFeaturesDropdown: React.FC<ExperimentalFeaturesDropdownProps> = React.memo(({
    actions,
}) => (
    <div className="relative group flex-shrink-0">
        <button
            title="Experimental Features"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs whitespace-nowrap"
        >
            <Sparkles size={14} /> <span>Experimental</span> <ChevronDown size={12} />
        </button>
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2 space-y-1">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.key}
                            onClick={action.onClick}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                        >
                            <Icon size={14} /> <span>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
), (prev, next) => prev.actions === next.actions);

interface TopHeaderModelUtilityControlsProps {
    battleMode: boolean;
    currentModel: string;
    secondaryModel: string;
    allModelOptionElements: React.ReactNode;
    onCurrentModelChange: (value: string) => void;
    onSecondaryModelChange: (value: string) => void;
    showRequestLog: boolean;
    onToggleRequestLog: () => void;
    apiLogCount: number;
    hasHistory: boolean;
    showSearch: boolean;
    onToggleSearch: () => void;
    diagnosticsPanelRef: React.RefObject<HTMLDivElement | null>;
    diagnosticsButtonRef: React.RefObject<HTMLButtonElement | null>;
    diagnosticsStatusClassName: string;
    diagnosticsStatusLabel: string;
    diagnosticsReady: boolean;
    showDiagnosticsPanel: boolean;
    onToggleDiagnosticsPanel: () => void;
    diagnosticsPopover: React.ReactNode;
}

const TopHeaderModelUtilityControls: React.FC<TopHeaderModelUtilityControlsProps> = React.memo(({
    battleMode,
    currentModel,
    secondaryModel,
    allModelOptionElements,
    onCurrentModelChange,
    onSecondaryModelChange,
    showRequestLog,
    onToggleRequestLog,
    apiLogCount,
    hasHistory,
    showSearch,
    onToggleSearch,
    diagnosticsPanelRef,
    diagnosticsButtonRef,
    diagnosticsStatusClassName,
    diagnosticsStatusLabel,
    diagnosticsReady,
    showDiagnosticsPanel,
    onToggleDiagnosticsPanel,
    diagnosticsPopover,
}) => {
    const handleCurrentModelSelect = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        onCurrentModelChange(event.target.value);
    }, [onCurrentModelChange]);

    const handleSecondaryModelSelect = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        onSecondaryModelChange(event.target.value);
    }, [onSecondaryModelChange]);

    return (
        <>
            <div className="h-6 w-px bg-slate-700 mx-1 flex-shrink-0"></div>
            <div className="flex items-center gap-2 min-w-0 max-w-[200px] flex-shrink-0">
                {!battleMode ? (
                    <>
                        <span className="font-medium text-slate-400 text-xs whitespace-nowrap flex-shrink-0">Model:</span>
                        <div className="relative min-w-0 flex-1">
                            <select value={currentModel} onChange={handleCurrentModelSelect} className="w-full bg-slate-800 border-none text-white text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-slate-700 transition-colors truncate">
                                {allModelOptionElements}
                            </select>
                            <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={10} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 w-full animate-in fade-in slide-in-from-top-1">
                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-xs flex items-center gap-1 flex-shrink-0"><Users size={12} /> VS</span>
                        <div className="relative flex-1 min-w-0">
                            <select value={currentModel} onChange={handleCurrentModelSelect} className="w-full bg-slate-800 border-l-2 border-l-blue-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                {allModelOptionElements}
                            </select>
                        </div>
                        <div className="relative flex-1 min-w-0">
                            <select value={secondaryModel} onChange={handleSecondaryModelSelect} className="w-full bg-slate-800 border-l-2 border-l-orange-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                {allModelOptionElements}
                            </select>
                        </div>
                    </div>
                )}
            </div>
            <button
                onClick={onToggleRequestLog}
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
            {hasHistory && (
                <button
                    onClick={onToggleSearch}
                    title="Search in chat (Ctrl+F)"
                    className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showSearch ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                    <Search size={14} />
                </button>
            )}
            <div ref={diagnosticsPanelRef} className="relative flex-shrink-0">
                <button
                    ref={diagnosticsButtonRef}
                    onClick={onToggleDiagnosticsPanel}
                    title="Startup diagnostics and quick fixes"
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors border text-xs ${diagnosticsStatusClassName}`}
                >
                    {diagnosticsReady ? <Check size={12} /> : <AlertTriangle size={12} />}
                    <span>{diagnosticsStatusLabel}</span>
                </button>
                {showDiagnosticsPanel && diagnosticsPopover}
            </div>
        </>
    );
}, (prev, next) => (
    prev.battleMode === next.battleMode &&
    prev.currentModel === next.currentModel &&
    prev.secondaryModel === next.secondaryModel &&
    prev.allModelOptionElements === next.allModelOptionElements &&
    prev.onCurrentModelChange === next.onCurrentModelChange &&
    prev.onSecondaryModelChange === next.onSecondaryModelChange &&
    prev.showRequestLog === next.showRequestLog &&
    prev.onToggleRequestLog === next.onToggleRequestLog &&
    prev.apiLogCount === next.apiLogCount &&
    prev.hasHistory === next.hasHistory &&
    prev.showSearch === next.showSearch &&
    prev.onToggleSearch === next.onToggleSearch &&
    prev.diagnosticsPanelRef === next.diagnosticsPanelRef &&
    prev.diagnosticsButtonRef === next.diagnosticsButtonRef &&
    prev.diagnosticsStatusClassName === next.diagnosticsStatusClassName &&
    prev.diagnosticsStatusLabel === next.diagnosticsStatusLabel &&
    prev.diagnosticsReady === next.diagnosticsReady &&
    prev.showDiagnosticsPanel === next.showDiagnosticsPanel &&
    prev.onToggleDiagnosticsPanel === next.onToggleDiagnosticsPanel &&
    prev.diagnosticsPopover === next.diagnosticsPopover
));

interface HeaderConnectionStatusProps {
    localStatus: 'online' | 'offline' | 'checking' | 'none';
    remoteStatus: 'online' | 'offline' | 'checking' | 'none';
}

const getConnectionStatusDotClassName = (status: HeaderConnectionStatusProps['localStatus']): string => {
    if (status === 'online') {
        return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]';
    }
    if (status === 'checking') {
        return 'bg-amber-500 animate-pulse';
    }
    return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
};

const HeaderConnectionStatus: React.FC<HeaderConnectionStatusProps> = React.memo(({
    localStatus,
    remoteStatus,
}) => (
    <div className="flex items-center gap-2 pl-2 border-l border-slate-800 h-6 self-center flex-shrink-0">
        <div className="flex flex-col items-center" title={`LM Studio: ${localStatus}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusDotClassName(localStatus)}`} />
            <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Local</span>
        </div>
        {remoteStatus !== 'none' && (
            <div className="flex flex-col items-center" title={`OpenRouter: ${remoteStatus}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusDotClassName(remoteStatus)}`} />
                <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">OR</span>
            </div>
        )}
    </div>
), (prev, next) => (
    prev.localStatus === next.localStatus &&
    prev.remoteStatus === next.remoteStatus
));

interface SearchToolbarControlsProps {
    hasResults: boolean;
    currentSearchIndex: number;
    searchResultsCount: number;
    showSearchResultsList: boolean;
    onToggleSearchResultsList: () => void;
    onPreviousSearchResult: () => void;
    onNextSearchResult: () => void;
    onCloseSearch: () => void;
}

const SearchToolbarControls: React.FC<SearchToolbarControlsProps> = React.memo(({
    hasResults,
    currentSearchIndex,
    searchResultsCount,
    showSearchResultsList,
    onToggleSearchResultsList,
    onPreviousSearchResult,
    onNextSearchResult,
    onCloseSearch,
}) => (
    <>
        {hasResults && (
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleSearchResultsList}
                    className="px-2 py-1.5 hover:bg-slate-700 rounded transition-colors text-sm text-slate-400 hover:text-white flex items-center gap-1"
                    title="Show all results"
                >
                    <span>{currentSearchIndex + 1} / {searchResultsCount}</span>
                    {showSearchResultsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                    onClick={onPreviousSearchResult}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Previous result"
                >
                    <ChevronUp size={16} className="text-slate-400" />
                </button>
                <button
                    onClick={onNextSearchResult}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Next result"
                >
                    <ChevronDown size={16} className="text-slate-400" />
                </button>
            </div>
        )}
        <button
            onClick={onCloseSearch}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Close search"
        >
            <X size={16} className="text-slate-400" />
        </button>
    </>
), (prev, next) => (
    prev.hasResults === next.hasResults &&
    prev.currentSearchIndex === next.currentSearchIndex &&
    prev.searchResultsCount === next.searchResultsCount &&
    prev.showSearchResultsList === next.showSearchResultsList &&
    prev.onToggleSearchResultsList === next.onToggleSearchResultsList &&
    prev.onPreviousSearchResult === next.onPreviousSearchResult &&
    prev.onNextSearchResult === next.onNextSearchResult &&
    prev.onCloseSearch === next.onCloseSearch
));

interface ChatSearchPanelProps {
    showSearch: boolean;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    hasResults: boolean;
    currentSearchIndex: number;
    searchResultsCount: number;
    showSearchResultsList: boolean;
    onToggleSearchResultsList: () => void;
    onPreviousSearchResult: () => void;
    onNextSearchResult: () => void;
    onCloseSearch: () => void;
    virtuosoComponent: React.ComponentType<any> | null;
    renderSearchResultItem: (resultIndex: number) => React.ReactNode;
}

const ChatSearchPanel: React.FC<ChatSearchPanelProps> = React.memo(({
    showSearch,
    searchQuery,
    onSearchQueryChange,
    hasResults,
    currentSearchIndex,
    searchResultsCount,
    showSearchResultsList,
    onToggleSearchResultsList,
    onPreviousSearchResult,
    onNextSearchResult,
    onCloseSearch,
    virtuosoComponent: VirtuosoComponent,
    renderSearchResultItem,
}) => {
    const handleSearchInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchQueryChange(event.target.value);
    }, [onSearchQueryChange]);

    return (
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
                                    onChange={handleSearchInputChange}
                                    placeholder="Search in this conversation..."
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                                    autoFocus
                                />
                            </div>
                            <SearchToolbarControls
                                hasResults={hasResults}
                                currentSearchIndex={currentSearchIndex}
                                searchResultsCount={searchResultsCount}
                                showSearchResultsList={showSearchResultsList}
                                onToggleSearchResultsList={onToggleSearchResultsList}
                                onPreviousSearchResult={onPreviousSearchResult}
                                onNextSearchResult={onNextSearchResult}
                                onCloseSearch={onCloseSearch}
                            />
                        </div>

                        <AnimatePresence>
                            {showSearchResultsList && searchResultsCount > 0 && (
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
                                                style={{ height: Math.min(searchResultsCount * 60, 320) }}
                                                totalCount={searchResultsCount}
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
    );
}, (prev, next) => (
    prev.showSearch === next.showSearch &&
    prev.searchQuery === next.searchQuery &&
    prev.onSearchQueryChange === next.onSearchQueryChange &&
    prev.hasResults === next.hasResults &&
    prev.currentSearchIndex === next.currentSearchIndex &&
    prev.searchResultsCount === next.searchResultsCount &&
    prev.showSearchResultsList === next.showSearchResultsList &&
    prev.onToggleSearchResultsList === next.onToggleSearchResultsList &&
    prev.onPreviousSearchResult === next.onPreviousSearchResult &&
    prev.onNextSearchResult === next.onNextSearchResult &&
    prev.onCloseSearch === next.onCloseSearch &&
    prev.virtuosoComponent === next.virtuosoComponent &&
    prev.renderSearchResultItem === next.renderSearchResultItem
));

interface LongPressActionMenuProps {
    menuRef: React.RefObject<HTMLDivElement | null>;
    menuPosition: { x: number; y: number } | null;
    messageIndex: number;
    isBookmarked: boolean;
    capabilities: ChatMessageActionCapabilities;
    onAction: (action: ChatMessageAction) => void;
}

const LONG_PRESS_ACTION_ICON_MAP: Record<ChatMessageAction, React.ComponentType<{ size?: number; className?: string }>> = {
    copy: Copy,
    bookmark: Star,
    edit: Edit2,
    regenerate: RefreshCw,
    branch: GitBranch,
    delete: Trash2,
};

const LONG_PRESS_ACTION_ICON_CLASS_MAP: Record<ChatMessageAction, string> = {
    copy: 'text-blue-400',
    bookmark: 'text-yellow-400',
    edit: 'text-green-400',
    regenerate: 'text-purple-400',
    branch: 'text-yellow-400',
    delete: '',
};

const LongPressActionMenu: React.FC<LongPressActionMenuProps> = React.memo(({
    menuRef,
    menuPosition,
    messageIndex,
    isBookmarked,
    capabilities,
    onAction,
}) => {
    const visibleItems = React.useMemo(
        () => buildLongPressMenuActionItems(capabilities, isBookmarked).filter((item) => item.visible),
        [capabilities, isBookmarked]
    );
    const regularItems = React.useMemo(
        () => visibleItems.filter((item) => !item.destructive),
        [visibleItems]
    );
    const destructiveItems = React.useMemo(
        () => visibleItems.filter((item) => item.destructive),
        [visibleItems]
    );

    if (!menuPosition) {
        return null;
    }

    return (
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl min-w-[220px] overflow-hidden"
            style={{ left: menuPosition.x, top: menuPosition.y }}
            data-long-press-message-index={messageIndex}
        >
            {regularItems.map((item) => {
                const Icon = LONG_PRESS_ACTION_ICON_MAP[item.action];
                return (
                    <button
                        key={item.action}
                        onClick={() => onAction(item.action)}
                        className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                    >
                        <Icon size={14} className={LONG_PRESS_ACTION_ICON_CLASS_MAP[item.action]} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
            {destructiveItems.length > 0 && regularItems.length > 0 && (
                <div className="border-t border-slate-700/50" />
            )}
            {destructiveItems.map((item) => {
                const Icon = LONG_PRESS_ACTION_ICON_MAP[item.action];
                return (
                    <button
                        key={item.action}
                        onClick={() => onAction(item.action)}
                        className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                    >
                        <Icon size={14} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </motion.div>
    );
}, (prev, next) => (
    prev.menuRef === next.menuRef &&
    prev.menuPosition === next.menuPosition &&
    prev.messageIndex === next.messageIndex &&
    prev.isBookmarked === next.isBookmarked &&
    prev.capabilities.canCopy === next.capabilities.canCopy &&
    prev.capabilities.canBookmark === next.capabilities.canBookmark &&
    prev.capabilities.canEdit === next.capabilities.canEdit &&
    prev.capabilities.canRegenerate === next.capabilities.canRegenerate &&
    prev.capabilities.canBranch === next.capabilities.canBranch &&
    prev.capabilities.canDelete === next.capabilities.canDelete &&
    prev.onAction === next.onAction
));

interface ComposerActionButtonsProps {
    showBottomControls: boolean;
    showSuggestions: boolean;
    canToggleSuggestions: boolean;
    canSend: boolean;
    onToggleBottomControls: () => void;
    onToggleSuggestions: () => void;
    onSend: () => void;
}

const ComposerActionButtons: React.FC<ComposerActionButtonsProps> = React.memo(({
    showBottomControls,
    showSuggestions,
    canToggleSuggestions,
    canSend,
    onToggleBottomControls,
    onToggleSuggestions,
    onSend,
}) => (
    <div className="flex flex-col gap-2">
        <button
            onClick={onToggleBottomControls}
            title={showBottomControls ? 'Hide bottom controls' : 'Show bottom controls'}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700"
        >
            {showBottomControls ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
            onClick={onToggleSuggestions}
            disabled={!canToggleSuggestions}
            title={showSuggestions ? 'Hide smart suggestions' : 'Smart Suggestions'}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
        >
            <Sparkles size={16} />
        </button>
        <button
            onClick={onSend}
            disabled={!canSend}
            className="p-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
        >
            <Send size={18} fill="currentColor" />
        </button>
    </div>
), (prev, next) => (
    prev.showBottomControls === next.showBottomControls &&
    prev.showSuggestions === next.showSuggestions &&
    prev.canToggleSuggestions === next.canToggleSuggestions &&
    prev.canSend === next.canSend &&
    prev.onToggleBottomControls === next.onToggleBottomControls &&
    prev.onToggleSuggestions === next.onToggleSuggestions &&
    prev.onSend === next.onSend
));

type SidebarTab = 'inspector' | 'controls' | 'prompts' | 'documents';

interface ComposerControlPillActionConfig {
    key: ComposerControlPillKey;
    label: string;
    icon: React.ReactNode;
    className: string;
    title?: string;
    onClick: () => void;
}

interface ComposerVariableContext {
    modelId: string;
    modelName: string;
    sessionId: string;
    sessionTitle: string;
    messageCount: number;
}

interface ComposerControlPillsProps {
    actions: ComposerControlPillActionConfig[];
    mcpAvailable: boolean;
    mcpConnectedCount: number;
    mcpToolCount: number;
    showExpertMenu: boolean;
    onSelectExpert: (mode: string | null) => void;
    showVariableMenu: boolean;
    onCloseVariableMenu: () => void;
    onInsertVariable: (variable: string) => void;
    variableContext: ComposerVariableContext;
}

const ComposerControlPills: React.FC<ComposerControlPillsProps> = React.memo(({
    actions,
    mcpAvailable,
    mcpConnectedCount,
    mcpToolCount,
    showExpertMenu,
    onSelectExpert,
    showVariableMenu,
    onCloseVariableMenu,
    onInsertVariable,
    variableContext,
}) => (
    <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/50 flex flex-wrap gap-2 items-center relative rounded-b-2xl">
        {actions.map((action) => (
            <button
                key={action.key}
                onClick={action.onClick}
                className={action.className}
                title={action.title}
            >
                {action.icon} {action.label}
            </button>
        ))}
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${mcpAvailable
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                }`}
            title={mcpAvailable ? `${mcpConnectedCount} server(s), ${mcpToolCount} tools` : 'No MCP servers connected'}
        >
            <Plug size={12} strokeWidth={2.5} />
            {mcpAvailable ? (
                <span className="flex items-center gap-1">
                    MCP
                    <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1 rounded">{mcpToolCount}</span>
                </span>
            ) : (
                <span className="opacity-50">MCP</span>
            )}
        </div>

        {showExpertMenu && (
            <div className="absolute bottom-12 right-4 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Expert Persona</div>
                <button onClick={() => onSelectExpert(null)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">None (Default)</button>
                <button onClick={() => onSelectExpert('coding')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">👨‍💻 Coding Expert</button>
                <button onClick={() => onSelectExpert('reasoning')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🧠 Logic & Reasoning</button>
                <button onClick={() => onSelectExpert('creative')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🎨 Creative Writer</button>
                <button onClick={() => onSelectExpert('math')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">📐 Mathematician</button>
            </div>
        )}

        {showVariableMenu && (
            <React.Suspense fallback={null}>
                <VariableInsertMenu
                    isOpen={showVariableMenu}
                    onClose={onCloseVariableMenu}
                    onInsert={onInsertVariable}
                    context={variableContext}
                />
            </React.Suspense>
        )}
    </div>
), (prev, next) => (
    prev.actions === next.actions &&
    prev.mcpAvailable === next.mcpAvailable &&
    prev.mcpConnectedCount === next.mcpConnectedCount &&
    prev.mcpToolCount === next.mcpToolCount &&
    prev.showExpertMenu === next.showExpertMenu &&
    prev.onSelectExpert === next.onSelectExpert &&
    prev.showVariableMenu === next.showVariableMenu &&
    prev.onCloseVariableMenu === next.onCloseVariableMenu &&
    prev.onInsertVariable === next.onInsertVariable &&
    prev.variableContext === next.variableContext
));

interface SidebarTabsHeaderProps {
    activeTab: SidebarTab;
    onSelectInspectorTab: () => void;
    onSelectControlsTab: () => void;
    onSelectPromptsTab: () => void;
    onSelectDocumentsTab: () => void;
    onCloseSidebar: () => void;
}

const SidebarTabsHeader: React.FC<SidebarTabsHeaderProps> = React.memo(({
    activeTab,
    onSelectInspectorTab,
    onSelectControlsTab,
    onSelectPromptsTab,
    onSelectDocumentsTab,
    onCloseSidebar,
}) => (
    <div className="flex border-b border-slate-800 relative">
        <button onClick={onSelectInspectorTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'inspector' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Inspector</button>
        <button onClick={onSelectControlsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'controls' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Controls</button>
        <button onClick={onSelectPromptsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'prompts' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Prompts</button>
        <button onClick={onSelectDocumentsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'documents' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Docs</button>
        <button
            onClick={onCloseSidebar}
            className="absolute top-2 right-2 p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Close Sidebar"
        >
            <X size={14} />
        </button>
    </div>
), (prev, next) => (
    prev.activeTab === next.activeTab &&
    prev.onSelectInspectorTab === next.onSelectInspectorTab &&
    prev.onSelectControlsTab === next.onSelectControlsTab &&
    prev.onSelectPromptsTab === next.onSelectPromptsTab &&
    prev.onSelectDocumentsTab === next.onSelectDocumentsTab &&
    prev.onCloseSidebar === next.onCloseSidebar
));

interface ControlToggleRowProps {
    icon: React.ReactNode;
    label: string;
    description?: string;
    enabled: boolean;
    onToggle: () => void;
    borderClassName?: string;
    children?: React.ReactNode;
    title?: string;
}

const ControlToggleRow: React.FC<ControlToggleRowProps> = React.memo(({
    icon,
    label,
    description,
    enabled,
    onToggle,
    borderClassName = 'pb-4 border-b border-slate-800',
    children,
    title,
}) => (
    <div className={borderClassName}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-300">{label}</label>
                    {description && (
                        <span className="text-[10px] text-slate-500">{description}</span>
                    )}
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-slate-700'}`}
                title={title}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
        {children}
    </div>
), (prev, next) => (
    prev.icon === next.icon &&
    prev.label === next.label &&
    prev.description === next.description &&
    prev.enabled === next.enabled &&
    prev.onToggle === next.onToggle &&
    prev.borderClassName === next.borderClassName &&
    prev.children === next.children &&
    prev.title === next.title
));

interface ToolsToggleListProps {
    enabledTools: Set<string>;
    onToggleTool: (toolName: string) => void;
}

const ToolsToggleList: React.FC<ToolsToggleListProps> = React.memo(({
    enabledTools,
    onToggleTool,
}) => (
    <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-slate-400" />
            <label className="text-sm font-medium text-slate-300">Tools</label>
        </div>
        <div className="space-y-2">
            {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = enabledTools.has(tool.name);
                return (
                    <div key={tool.name} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-200 font-medium">{tool.name}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{tool.description}</span>
                        </div>
                        <button
                            onClick={() => onToggleTool(tool.name)}
                            className={`w-8 h-4 rounded-full transition-colors relative ${isEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
), (prev, next) => (
    prev.enabledTools === next.enabledTools &&
    prev.onToggleTool === next.onToggleTool
));

interface ContextOptimizerPanelProps {
    contextUsage: ContextUsage;
    autoSummarizeContext: boolean;
    onToggleAutoSummarizeContext: () => void;
    onApplySuggestedTrim: () => void;
    onIncludeAll: () => void;
    trimSuggestionRows: Array<{
        key: string;
        messageIndex: number;
        label: string;
        preview: string;
    }>;
    onExcludeTrimSuggestion: (messageIndex: number) => void;
    recentContextRows: RecentContextMessageRow[];
    onToggleContextMessage: (messageIndex: number) => void;
}

const ContextOptimizerPanel: React.FC<ContextOptimizerPanelProps> = React.memo(({
    contextUsage,
    autoSummarizeContext,
    onToggleAutoSummarizeContext,
    onApplySuggestedTrim,
    onIncludeAll,
    trimSuggestionRows,
    onExcludeTrimSuggestion,
    recentContextRows,
    onToggleContextMessage,
}) => (
    <div className="pb-4 border-b border-slate-800 space-y-3">
        <ControlToggleRow
            icon={<Clock size={16} className={contextUsage.warning ? 'text-amber-400' : 'text-slate-400'} />}
            label="Context Optimizer"
            description={`${Math.round(contextUsage.fillRatio * 100)}% of ${contextUsage.maxContextTokens.toLocaleString()} tokens used`}
            enabled={autoSummarizeContext}
            onToggle={onToggleAutoSummarizeContext}
            borderClassName="space-y-0"
            title="Auto-summarize old messages when context is near full"
        />

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
                onClick={onApplySuggestedTrim}
                disabled={trimSuggestionRows.length === 0}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
            >
                Apply Suggested Trim
            </button>
            <button
                onClick={onIncludeAll}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300"
            >
                Include All
            </button>
        </div>

        {trimSuggestionRows.length > 0 && (
            <div className="space-y-1">
                {trimSuggestionRows.map((suggestion) => (
                    <div key={suggestion.key} className="flex items-start justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-700/50">
                        <div className="min-w-0">
                            <div className="text-[10px] text-slate-300">{suggestion.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{suggestion.preview}</div>
                        </div>
                        <button
                            onClick={() => onExcludeTrimSuggestion(suggestion.messageIndex)}
                            className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                            Exclude
                        </button>
                    </div>
                ))}
            </div>
        )}

        {recentContextRows.length > 0 && (
            <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {recentContextRows.map((item) => (
                    <label key={item.key} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-900/60">
                        <span className="text-[10px] text-slate-400 truncate">
                            #{item.index + 1} {item.role} • ~{item.estimatedTokens}t
                        </span>
                        <input
                            type="checkbox"
                            checked={item.included}
                            onChange={() => onToggleContextMessage(item.index)}
                            className="rounded border-slate-600 bg-slate-800"
                            title="Include this message in model context"
                        />
                    </label>
                ))}
            </div>
        )}
    </div>
), (prev, next) => (
    prev.contextUsage === next.contextUsage &&
    prev.autoSummarizeContext === next.autoSummarizeContext &&
    prev.onToggleAutoSummarizeContext === next.onToggleAutoSummarizeContext &&
    prev.onApplySuggestedTrim === next.onApplySuggestedTrim &&
    prev.onIncludeAll === next.onIncludeAll &&
    prev.trimSuggestionRows === next.trimSuggestionRows &&
    prev.onExcludeTrimSuggestion === next.onExcludeTrimSuggestion &&
    prev.recentContextRows === next.recentContextRows &&
    prev.onToggleContextMessage === next.onToggleContextMessage
));

interface SamplingControlsPanelProps {
    batchSize: number;
    onBatchSizeChange: (value: number) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    topP: number;
    onTopPChange: (value: number) => void;
    maxTokens: number;
    onMaxTokensChange: (value: number) => void;
    sliderMax: number;
    sliderStep: number;
    modelContextLength?: number;
}

const SamplingControlsPanel: React.FC<SamplingControlsPanelProps> = React.memo(({
    batchSize,
    onBatchSizeChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
    sliderMax,
    sliderStep,
    modelContextLength,
}) => (
    <>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Batch Size</label>
                <span className="font-mono text-primary">{batchSize}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                value={batchSize}
                onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Temperature</label>
                <span className="font-mono text-primary">{temperature}</span>
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Top P</label>
                <span className="font-mono text-primary">{topP}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Max Tokens</label>
                <span className="font-mono text-primary">{maxTokens.toLocaleString()}</span>
            </div>
            <input
                type="range"
                min="1"
                max={sliderMax}
                step={sliderStep}
                value={maxTokens}
                onChange={(e) => onMaxTokensChange(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            {modelContextLength && (
                <div className="text-[10px] text-slate-500 text-right">
                    Model context: {modelContextLength.toLocaleString()} tokens
                </div>
            )}
        </div>
    </>
), (prev, next) => (
    prev.batchSize === next.batchSize &&
    prev.onBatchSizeChange === next.onBatchSizeChange &&
    prev.temperature === next.temperature &&
    prev.onTemperatureChange === next.onTemperatureChange &&
    prev.topP === next.topP &&
    prev.onTopPChange === next.onTopPChange &&
    prev.maxTokens === next.maxTokens &&
    prev.onMaxTokensChange === next.onMaxTokensChange &&
    prev.sliderMax === next.sliderMax &&
    prev.sliderStep === next.sliderStep &&
    prev.modelContextLength === next.modelContextLength
));

interface ChatControlsTabPanelProps {
    systemPrompt: string;
    isEditingSystemPrompt: boolean;
    onStartEditingSystemPrompt: () => void;
    onStopEditingSystemPrompt: () => void;
    onSystemPromptChange: (value: string) => void;
    battleMode: boolean;
    onToggleBattleMode: () => void;
    secondaryModel: string;
    secondaryModelDisplayName: string;
    nonCurrentModelOptionElements: React.ReactNode;
    onSecondaryModelChange: (value: string) => void;
    thinkingEnabled: boolean;
    onToggleThinkingEnabled: () => void;
    autoRouting: boolean;
    onToggleAutoRouting: () => void;
    enabledTools: Set<string>;
    onToggleTool: (toolName: string) => void;
    jsonModeEnabled: boolean;
    onToggleJsonMode: () => void;
    contextUsage: ContextUsage;
    autoSummarizeContext: boolean;
    onToggleAutoSummarizeContext: () => void;
    onApplySuggestedTrim: () => void;
    onIncludeAllContext: () => void;
    trimSuggestionRows: Array<{
        key: string;
        messageIndex: number;
        label: string;
        preview: string;
    }>;
    onExcludeTrimSuggestion: (messageIndex: number) => void;
    recentContextRows: RecentContextMessageRow[];
    onToggleContextMessage: (messageIndex: number) => void;
    batchSize: number;
    onBatchSizeChange: (value: number) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    topP: number;
    onTopPChange: (value: number) => void;
    maxTokens: number;
    onMaxTokensChange: (value: number) => void;
    maxTokenSliderMax: number;
    maxTokenSliderStep: number;
    modelContextLength?: number;
}

const ChatControlsTabPanel: React.FC<ChatControlsTabPanelProps> = React.memo(({
    systemPrompt,
    isEditingSystemPrompt,
    onStartEditingSystemPrompt,
    onStopEditingSystemPrompt,
    onSystemPromptChange,
    battleMode,
    onToggleBattleMode,
    secondaryModel,
    secondaryModelDisplayName,
    nonCurrentModelOptionElements,
    onSecondaryModelChange,
    thinkingEnabled,
    onToggleThinkingEnabled,
    autoRouting,
    onToggleAutoRouting,
    enabledTools,
    onToggleTool,
    jsonModeEnabled,
    onToggleJsonMode,
    contextUsage,
    autoSummarizeContext,
    onToggleAutoSummarizeContext,
    onApplySuggestedTrim,
    onIncludeAllContext,
    trimSuggestionRows,
    onExcludeTrimSuggestion,
    recentContextRows,
    onToggleContextMessage,
    batchSize,
    onBatchSizeChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
    maxTokenSliderMax,
    maxTokenSliderStep,
    modelContextLength,
}) => (
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
                    onBlur={onStopEditingSystemPrompt}
                    onChange={(event) => onSystemPromptChange(event.target.value)}
                    className="w-full h-32 bg-white text-slate-900 border-2 border-primary rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none transition-all shadow-xl"
                />
            ) : (
                <div
                    onDoubleClick={onStartEditingSystemPrompt}
                    className="w-full min-h-32 bg-slate-900 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-400 overflow-y-auto custom-scrollbar cursor-pointer hover:border-primary/50 hover:bg-slate-900/80 transition-all select-none group relative break-words"
                    title="Double-click to edit"
                >
                    <div className="whitespace-pre-wrap break-words">{systemPrompt || 'No system prompt set.'}</div>
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit2 size={24} className="text-primary/30" />
                    </div>
                </div>
            )}
        </div>
        <div className="space-y-6">
            <ControlToggleRow
                icon={<Users size={16} className={battleMode ? 'text-primary' : 'text-slate-400'} />}
                label="Battle Mode"
                enabled={battleMode}
                onToggle={onToggleBattleMode}
            >
                {battleMode && (
                    <div className="space-y-2 animate-in slide-in-from-top-1 fade-in duration-200 mt-3">
                        <label className="text-xs text-slate-400 flex justify-between">
                            <span>Opponent Model</span>
                            <span className="text-primary font-mono">{secondaryModelDisplayName}</span>
                        </label>
                        <select
                            value={secondaryModel}
                            onChange={(event) => onSecondaryModelChange(event.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                        >
                            <option value="">Select Model...</option>
                            {nonCurrentModelOptionElements}
                        </select>
                    </div>
                )}
            </ControlToggleRow>

            <ControlToggleRow
                icon={<Brain size={16} className={thinkingEnabled ? 'text-primary' : 'text-slate-400'} />}
                label="Reasoning Mode"
                description="Injects <thinking> tags logic"
                enabled={thinkingEnabled}
                onToggle={onToggleThinkingEnabled}
            />

            <ControlToggleRow
                icon={<Network size={16} className={autoRouting ? 'text-primary' : 'text-slate-400'} />}
                label="Auto Model Routing"
                description="Selects best model for query intent"
                enabled={autoRouting}
                onToggle={onToggleAutoRouting}
            />

            <ToolsToggleList enabledTools={enabledTools} onToggleTool={onToggleTool} />

            <ControlToggleRow
                icon={<FileJson size={16} className={jsonModeEnabled ? 'text-primary' : 'text-slate-400'} />}
                label="JSON Mode"
                description="Force model to output valid JSON"
                enabled={jsonModeEnabled}
                onToggle={onToggleJsonMode}
            />

            <ContextOptimizerPanel
                contextUsage={contextUsage}
                autoSummarizeContext={autoSummarizeContext}
                onToggleAutoSummarizeContext={onToggleAutoSummarizeContext}
                onApplySuggestedTrim={onApplySuggestedTrim}
                onIncludeAll={onIncludeAllContext}
                trimSuggestionRows={trimSuggestionRows}
                onExcludeTrimSuggestion={onExcludeTrimSuggestion}
                recentContextRows={recentContextRows}
                onToggleContextMessage={onToggleContextMessage}
            />

            <SamplingControlsPanel
                batchSize={batchSize}
                onBatchSizeChange={onBatchSizeChange}
                temperature={temperature}
                onTemperatureChange={onTemperatureChange}
                topP={topP}
                onTopPChange={onTopPChange}
                maxTokens={maxTokens}
                onMaxTokensChange={onMaxTokensChange}
                sliderMax={maxTokenSliderMax}
                sliderStep={maxTokenSliderStep}
                modelContextLength={modelContextLength}
            />
        </div>
    </div>
), (prev, next) => (
    prev.systemPrompt === next.systemPrompt &&
    prev.isEditingSystemPrompt === next.isEditingSystemPrompt &&
    prev.onStartEditingSystemPrompt === next.onStartEditingSystemPrompt &&
    prev.onStopEditingSystemPrompt === next.onStopEditingSystemPrompt &&
    prev.onSystemPromptChange === next.onSystemPromptChange &&
    prev.battleMode === next.battleMode &&
    prev.onToggleBattleMode === next.onToggleBattleMode &&
    prev.secondaryModel === next.secondaryModel &&
    prev.secondaryModelDisplayName === next.secondaryModelDisplayName &&
    prev.nonCurrentModelOptionElements === next.nonCurrentModelOptionElements &&
    prev.onSecondaryModelChange === next.onSecondaryModelChange &&
    prev.thinkingEnabled === next.thinkingEnabled &&
    prev.onToggleThinkingEnabled === next.onToggleThinkingEnabled &&
    prev.autoRouting === next.autoRouting &&
    prev.onToggleAutoRouting === next.onToggleAutoRouting &&
    prev.enabledTools === next.enabledTools &&
    prev.onToggleTool === next.onToggleTool &&
    prev.jsonModeEnabled === next.jsonModeEnabled &&
    prev.onToggleJsonMode === next.onToggleJsonMode &&
    prev.contextUsage === next.contextUsage &&
    prev.autoSummarizeContext === next.autoSummarizeContext &&
    prev.onToggleAutoSummarizeContext === next.onToggleAutoSummarizeContext &&
    prev.onApplySuggestedTrim === next.onApplySuggestedTrim &&
    prev.onIncludeAllContext === next.onIncludeAllContext &&
    prev.trimSuggestionRows === next.trimSuggestionRows &&
    prev.onExcludeTrimSuggestion === next.onExcludeTrimSuggestion &&
    prev.recentContextRows === next.recentContextRows &&
    prev.onToggleContextMessage === next.onToggleContextMessage &&
    prev.batchSize === next.batchSize &&
    prev.onBatchSizeChange === next.onBatchSizeChange &&
    prev.temperature === next.temperature &&
    prev.onTemperatureChange === next.onTemperatureChange &&
    prev.topP === next.topP &&
    prev.onTopPChange === next.onTopPChange &&
    prev.maxTokens === next.maxTokens &&
    prev.onMaxTokensChange === next.onMaxTokensChange &&
    prev.maxTokenSliderMax === next.maxTokenSliderMax &&
    prev.maxTokenSliderStep === next.maxTokenSliderStep &&
    prev.modelContextLength === next.modelContextLength
));

interface InspectorTokenSummaryCardProps {
    selectedToken: any;
    entropyValue: number;
    onUpdateToken: (value: string) => void;
}

const InspectorTokenSummaryCard: React.FC<InspectorTokenSummaryCardProps> = React.memo(({
    selectedToken,
    entropyValue,
    onUpdateToken,
}) => (
    <div className="animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white text-slate-900 rounded-xl p-6 text-center shadow-lg mb-6 border-4 border-slate-800 relative">
            <div className="text-3xl font-heading font-bold mb-1">"{selectedToken.logprob.token}"</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Selected Token</div>

            <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-sm font-mono"
                        defaultValue={selectedToken.logprob.token}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                onUpdateToken(event.currentTarget.value);
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
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Logprob</span>
                    <span className="font-mono text-emerald-400">{selectedToken.logprob.logprob?.toFixed(4) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Probability</span>
                    <span className="font-mono text-emerald-400">{(Math.exp(selectedToken.logprob.logprob || 0) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Entropy</span>
                    <span className="font-mono text-amber-400">{entropyValue.toFixed(3)}</span>
                </div>
            </div>
        </div>
        <details className="mb-6 group">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
                <ChevronRight size={12} className="group-open:rotate-90 transition-transform" /> Debug Data
            </summary>
            <pre className="mt-2 text-[10px] bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto border border-slate-800 font-mono">
                {JSON.stringify(selectedToken.logprob, null, 2)}
            </pre>
        </details>
    </div>
), (prev, next) => (
    prev.selectedToken === next.selectedToken &&
    prev.entropyValue === next.entropyValue &&
    prev.onUpdateToken === next.onUpdateToken
));

interface InspectorAlternativeListProps {
    rows: Array<{
        key: string;
        token: string;
        probabilityPercent: number;
        widthPercent: number;
    }>;
}

const InspectorAlternativeList: React.FC<InspectorAlternativeListProps> = React.memo(({
    rows,
}) => {
    if (rows.length === 0) {
        return (
            <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg text-amber-200 text-sm flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-bold">No alternatives found.</p>
                    <p className="opacity-80 text-xs mt-1">If you just updated the server, please restart the application.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            {rows.map((row) => (
                <div key={row.key} className="p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-xs">"{row.token}"</span>
                        <span className="text-xs text-slate-400 group-hover:text-white font-mono">{row.probabilityPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${row.widthPercent}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}, (prev, next) => prev.rows === next.rows);

interface ChatInspectorTabPanelProps {
    selectedToken: any;
    onUpdateToken: (messageIndex: number, tokenIndex: number, value: string) => void;
}

const ChatInspectorTabPanel: React.FC<ChatInspectorTabPanelProps> = React.memo(({
    selectedToken,
    onUpdateToken,
}) => {
    const alternativeRows = React.useMemo(
        () => buildInspectorAlternativeRows(selectedToken?.logprob?.top_logprobs),
        [selectedToken?.logprob?.top_logprobs]
    );
    const entropyValue = React.useMemo(
        () => calculateEntropy(selectedToken?.logprob?.top_logprobs),
        [selectedToken?.logprob?.top_logprobs]
    );
    const handleUpdateToken = React.useCallback((value: string) => {
        onUpdateToken(selectedToken.messageIndex, selectedToken.tokenIndex, value);
        toast.success('Token updated');
    }, [onUpdateToken, selectedToken]);

    return (
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
            {selectedToken ? (
                <>
                    <InspectorTokenSummaryCard
                        selectedToken={selectedToken}
                        entropyValue={entropyValue}
                        onUpdateToken={handleUpdateToken}
                    />
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <Activity size={14} className="text-primary" /> Top Alternatives
                    </h4>
                    <InspectorAlternativeList rows={alternativeRows} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4 p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2 animate-pulse">
                        <Activity size={32} className="text-slate-700" />
                    </div>
                    <p className="font-medium">Inspect Token Details</p>
                    <p className="text-sm opacity-70">Select any token in the chat message to view its probabilities and entropy.</p>
                    <div className="text-xs bg-slate-900/50 p-3 rounded border border-slate-800">
                        <span className="text-amber-500">Note:</span> If tokens are not clickable, logprobs might be disabled on the server.
                    </div>
                </div>
            )}
        </div>
    );
}, (prev, next) => (
    prev.selectedToken === next.selectedToken &&
    prev.onUpdateToken === next.onUpdateToken
));

interface ComposerAttachmentsPanelProps {
    attachments: Array<{ id: string; name: string; content: string }>;
    imageAttachments: Array<{ id: string; name: string; thumbnailUrl: string }>;
    onRemoveImageAttachment: (id: string) => void;
    onRemoveAttachment: (id: string) => void;
}

const ComposerAttachmentsPanel: React.FC<ComposerAttachmentsPanelProps> = React.memo(({
    attachments,
    imageAttachments,
    onRemoveImageAttachment,
    onRemoveAttachment,
}) => {
    if (attachments.length === 0 && imageAttachments.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1 animate-in slide-in-from-bottom-2 duration-200">
            {imageAttachments.map((img) => (
                <div key={img.id} className="relative group">
                    <img
                        src={img.thumbnailUrl}
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-700/50 group-hover:border-primary/50 transition-colors"
                    />
                    <button
                        onClick={() => onRemoveImageAttachment(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                        <X size={10} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm rounded-b-lg px-1 py-0.5">
                        <span className="text-[8px] text-white truncate block">{img.name.slice(0, 10)}</span>
                    </div>
                </div>
            ))}
            {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-lg pl-3 pr-2 py-1.5 text-xs text-slate-200 group hover:border-slate-600 transition-colors">
                    <div className="flex flex-col">
                        <span className="font-bold truncate max-w-[150px]">{attachment.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{(attachment.content.length / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}, (prev, next) => (
    prev.attachments === next.attachments &&
    prev.imageAttachments === next.imageAttachments &&
    prev.onRemoveImageAttachment === next.onRemoveImageAttachment &&
    prev.onRemoveAttachment === next.onRemoveAttachment
));

interface ComposerAuxPanelsProps {
    showSuggestions: boolean;
    history: any[];
    onSelectSuggestion: (suggestion: string) => void;
    onCloseSuggestions: () => void;
    prefill: string | null;
    onPrefillChange: (value: string) => void;
    showUrlInput: boolean;
    urlInput: string;
    onUrlInputChange: (value: string) => void;
    onUrlInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onExecuteWebFetch: () => void;
    isFetchingWeb: boolean;
    showGithubInput: boolean;
    githubUrl: string;
    onGithubUrlChange: (value: string) => void;
    onGithubInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onExecuteGithubFetch: () => void;
    isFetchingGithub: boolean;
    githubConfigured: boolean;
    projectContext: ProjectContext | null;
    includeContextInMessages: boolean;
    onToggleIncludeContextInMessages: () => void;
    onClearProjectContext: () => void;
    onStartWatchingProjectContext: () => void;
    slashMatch: { query: string; index: number } | null;
    filteredPrompts: PromptSnippet[];
    activePromptIndex: number;
    onInsertPrompt: (prompt: PromptSnippet) => void;
}

const ComposerAuxPanels: React.FC<ComposerAuxPanelsProps> = React.memo(({
    showSuggestions,
    history,
    onSelectSuggestion,
    onCloseSuggestions,
    prefill,
    onPrefillChange,
    showUrlInput,
    urlInput,
    onUrlInputChange,
    onUrlInputKeyDown,
    onExecuteWebFetch,
    isFetchingWeb,
    showGithubInput,
    githubUrl,
    onGithubUrlChange,
    onGithubInputKeyDown,
    onExecuteGithubFetch,
    isFetchingGithub,
    githubConfigured,
    projectContext,
    includeContextInMessages,
    onToggleIncludeContextInMessages,
    onClearProjectContext,
    onStartWatchingProjectContext,
    slashMatch,
    filteredPrompts,
    activePromptIndex,
    onInsertPrompt,
}) => (
    <>
        {showSuggestions && history.length > 0 && (
            <div className="px-4">
                <React.Suspense fallback={<div className="text-xs text-slate-500 px-2 py-1">Loading suggestions...</div>}>
                    <SmartSuggestionsPanel
                        conversationHistory={history}
                        lastMessage={history[history.length - 1]?.content}
                        onSelectSuggestion={onSelectSuggestion}
                        isOpen={showSuggestions}
                        onClose={onCloseSuggestions}
                    />
                </React.Suspense>
            </div>
        )}

        {prefill !== null && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                    <div className="absolute left-3 top-3 text-primary">
                        <ChevronRight size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={prefill}
                        onChange={(event) => onPrefillChange(event.target.value)}
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

        {showUrlInput && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative flex gap-2 items-center">
                    <div className="absolute left-3 top-3 text-primary">
                        <Globe size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(event) => onUrlInputChange(event.target.value)}
                        onKeyDown={onUrlInputKeyDown}
                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                        placeholder="Enter URL to fetch context from..."
                    />
                    <button
                        onClick={onExecuteWebFetch}
                        disabled={isFetchingWeb || !urlInput}
                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isFetchingWeb ? <span className="animate-spin inline-block mr-1">⌛</span> : 'Fetch'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Fetches the text content of the URL and adds it to the chat context.
                </p>
            </div>
        )}

        {showGithubInput && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative flex gap-2 items-center">
                    <div className="absolute left-3 top-3 text-primary">
                        <Github size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={githubUrl}
                        onChange={(event) => onGithubUrlChange(event.target.value)}
                        onKeyDown={onGithubInputKeyDown}
                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                        placeholder="owner/repo/path or full GitHub URL..."
                    />
                    <button
                        onClick={onExecuteGithubFetch}
                        disabled={isFetchingGithub || !githubUrl || !githubConfigured}
                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isFetchingGithub ? <span className="animate-spin inline-block mr-1">⌛</span> : 'Fetch'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    {githubConfigured
                        ? 'Fetches file contents from GitHub repositories. Format: owner/repo/path/to/file'
                        : 'Configure GitHub API key in Settings → API Keys to use this feature.'}
                </p>
            </div>
        )}

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
                                onClick={onToggleIncludeContextInMessages}
                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                title={includeContextInMessages ? 'Context is included' : 'Context is excluded'}
                            >
                                {includeContextInMessages ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} className="text-slate-500" />}
                            </button>
                            <button
                                onClick={onClearProjectContext}
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
                                onClick={onStartWatchingProjectContext}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                            >
                                Start watching
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

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
                        filteredPrompts.map((prompt, index) => (
                            <button
                                key={prompt.id}
                                onClick={() => onInsertPrompt(prompt)}
                                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800/50 last:border-0 transition-colors flex flex-col gap-0.5 ${index === activePromptIndex ? 'bg-primary/20 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span className="font-bold flex items-center gap-2">/{prompt.alias} <span className="font-normal opacity-50 text-[10px] ml-auto">↵</span></span>
                                <span className="opacity-70 truncate w-full block">{prompt.title}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        )}
    </>
), (prev, next) => (
    prev.showSuggestions === next.showSuggestions &&
    prev.history === next.history &&
    prev.onSelectSuggestion === next.onSelectSuggestion &&
    prev.onCloseSuggestions === next.onCloseSuggestions &&
    prev.prefill === next.prefill &&
    prev.onPrefillChange === next.onPrefillChange &&
    prev.showUrlInput === next.showUrlInput &&
    prev.urlInput === next.urlInput &&
    prev.onUrlInputChange === next.onUrlInputChange &&
    prev.onUrlInputKeyDown === next.onUrlInputKeyDown &&
    prev.onExecuteWebFetch === next.onExecuteWebFetch &&
    prev.isFetchingWeb === next.isFetchingWeb &&
    prev.showGithubInput === next.showGithubInput &&
    prev.githubUrl === next.githubUrl &&
    prev.onGithubUrlChange === next.onGithubUrlChange &&
    prev.onGithubInputKeyDown === next.onGithubInputKeyDown &&
    prev.onExecuteGithubFetch === next.onExecuteGithubFetch &&
    prev.isFetchingGithub === next.isFetchingGithub &&
    prev.githubConfigured === next.githubConfigured &&
    prev.projectContext === next.projectContext &&
    prev.includeContextInMessages === next.includeContextInMessages &&
    prev.onToggleIncludeContextInMessages === next.onToggleIncludeContextInMessages &&
    prev.onClearProjectContext === next.onClearProjectContext &&
    prev.onStartWatchingProjectContext === next.onStartWatchingProjectContext &&
    prev.slashMatch === next.slashMatch &&
    prev.filteredPrompts === next.filteredPrompts &&
    prev.activePromptIndex === next.activePromptIndex &&
    prev.onInsertPrompt === next.onInsertPrompt
));

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

    const handleToggleDevMonitors = React.useCallback(() => {
        setDevMonitorsEnabled((prev) => !prev);
    }, []);

    const handleCloseDiagnosticsPanel = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
    }, []);

    const handleDiagnosticsOpenSettings = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
        navigateToTab('settings');
    }, [navigateToTab]);

    const handleDiagnosticsOpenModels = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
        navigateToTab('models');
    }, [navigateToTab]);

    const handleDiagnosticsInsertStarterPrompt = React.useCallback(() => {
        insertStarterPrompt();
        setShowDiagnosticsPanel(false);
    }, [insertStarterPrompt]);

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
    const trimSuggestionRows = React.useMemo(
        () => buildContextTrimSuggestionRows(trimSuggestions, 3),
        [trimSuggestions]
    );
    const recentContextRows = React.useMemo(
        () => buildRecentContextMessageRows(history, excludedContextIndices, estimateTokens, 20),
        [history, excludedContextIndices, excludedContextKey, estimateTokens]
    );

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

    // Slash Command State
    const [slashMatch, setSlashMatch] = React.useState<{ query: string; index: number } | null>(null);
    const [activePromptIndex, setActivePromptIndex] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const filteredPrompts = React.useMemo(() => {
        if (!slashMatch) return [];
        return prompts.filter(p => p.alias.toLowerCase().startsWith(slashMatch.query.toLowerCase()));
    }, [slashMatch, prompts]);

    const insertPrompt = React.useCallback((prompt: PromptSnippet) => {
        if (!slashMatch || !textareaRef.current) return;

        const cursorEnd = textareaRef.current.selectionEnd ?? input.length;
        const nextInput = applyPromptSnippetAtSlash(input, cursorEnd, slashMatch.index, prompt.content);
        setInput(nextInput);
        setSlashMatch(null);

        // Wait for render to re-focus.
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 10);
    }, [input, setInput, slashMatch]);

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

    const handleOpenTemplateLibrary = React.useCallback(() => {
        setShowTemplateLibrary(true);
    }, []);

    const handleOpenABTesting = React.useCallback(() => {
        setShowABTesting(true);
    }, []);

    const handleOpenPromptOptimization = React.useCallback(() => {
        setShowPromptOptimization(true);
    }, []);

    const handleOpenWorkflows = React.useCallback(() => {
        setShowWorkflows(true);
    }, []);

    const handleOpenAPIPlayground = React.useCallback(() => {
        setShowAPIPlayground(true);
    }, []);

    const handleOpenDeveloperDocs = React.useCallback(() => {
        setShowDeveloperDocs(true);
    }, []);

    const handleOpenPluginManager = React.useCallback(() => {
        setShowPluginManager(true);
    }, []);

    const handleOpenWorkspaceViews = React.useCallback(() => {
        setShowWorkspaceViews(true);
    }, []);

    const handleOpenCloudSyncPanel = React.useCallback(() => {
        setShowCloudSync(true);
    }, []);

    const handleOpenCodeIntegration = React.useCallback(() => {
        const lastMessage = history[history.length - 1];
        if (!lastMessage?.content) {
            return;
        }

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
    }, [history]);

    const handleOpenExportDialog = React.useCallback(() => {
        setShowExportDialog(true);
    }, []);

    const handleExportSessionToObsidian = React.useCallback(() => {
        try {
            HistoryService.exportSessionToObsidian(sessionId);
            toast.success('Chat exported as Obsidian markdown');
        } catch (error: any) {
            toast.error(error.message || 'Failed to export');
        }
    }, [sessionId]);

    const getCurrentSessionForIntegration = React.useCallback(() => {
        const session = HistoryService.getSession(sessionId);
        if (!session) {
            toast.error('Session not found');
            return null;
        }
        return session;
    }, [sessionId]);

    const mapSessionMessagesForExternalShare = React.useCallback((sessionMessages: Array<{ role: string; content?: string }>) => {
        return sessionMessages.map((message) => ({
            role: message.role,
            content: message.content || '',
        }));
    }, []);

    const handleSaveSessionToNotion = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

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
                        onClick: () => window.open(result.page!.url, '_blank'),
                    },
                });
                return;
            }

            toast.error(result.error || 'Failed to save to Notion');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save to Notion');
        }
    }, [getCurrentSessionForIntegration]);

    const handleSendSessionToSlack = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { slackService } = await import('../services/slack');
            const result = await slackService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Sent to Slack!');
            } else {
                toast.error(result.error || 'Failed to send to Slack');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to send to Slack');
        }
    }, [getCurrentSessionForIntegration, mapSessionMessagesForExternalShare]);

    const handleSendSessionToDiscord = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { discordService } = await import('../services/discord');
            const result = await discordService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Sent to Discord!');
            } else {
                toast.error(result.error || 'Failed to send to Discord');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to send to Discord');
        }
    }, [getCurrentSessionForIntegration, mapSessionMessagesForExternalShare]);

    const handleSendSessionByEmail = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { emailService } = await import('../services/email');
            const result = await emailService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Email client opened!');
            } else {
                toast.error(result.error || 'Failed to open email');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to send email');
        }
    }, [getCurrentSessionForIntegration, mapSessionMessagesForExternalShare]);

    const handleOpenCalendarSchedule = React.useCallback(() => {
        setShowCalendarSchedule(true);
    }, []);

    const topHeaderPrimaryActions = React.useMemo<HeaderPrimaryActionConfig[]>(() => ([
        {
            key: 'new-chat',
            title: 'New Chat',
            label: 'New',
            icon: Plus,
            onClick: createNewSession,
            variant: 'primary',
        },
        {
            key: 'templates',
            title: 'Templates',
            label: 'Templates',
            icon: FileText,
            onClick: handleOpenTemplateLibrary,
        },
        {
            key: 'ab-test',
            title: 'A/B Testing (Test different prompts)',
            label: 'A/B Test',
            icon: TestTube,
            onClick: handleOpenABTesting,
        },
        {
            key: 'optimize',
            title: 'Prompt Optimization (AI-powered suggestions)',
            label: 'Optimize',
            icon: Sparkles,
            onClick: handleOpenPromptOptimization,
        },
        {
            key: 'workflows',
            title: 'Workflows (Automation)',
            label: 'Workflows',
            icon: Zap,
            onClick: handleOpenWorkflows,
        },
        {
            key: 'api',
            title: 'API Playground (Developer Tools)',
            label: 'API',
            icon: Code2,
            onClick: handleOpenAPIPlayground,
        },
        {
            key: 'docs',
            title: 'Developer Documentation',
            label: 'Docs',
            icon: HelpCircle,
            onClick: handleOpenDeveloperDocs,
        },
        {
            key: 'plugins',
            title: 'Plugin Manager',
            label: 'Plugins',
            icon: Package,
            onClick: handleOpenPluginManager,
        },
        {
            key: 'views',
            title: 'Workspace Views',
            label: 'Views',
            icon: LayoutGrid,
            onClick: handleOpenWorkspaceViews,
        },
    ]), [
        createNewSession,
        handleOpenABTesting,
        handleOpenAPIPlayground,
        handleOpenDeveloperDocs,
        handleOpenPluginManager,
        handleOpenPromptOptimization,
        handleOpenTemplateLibrary,
        handleOpenWorkflows,
        handleOpenWorkspaceViews,
    ]);

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

    const handleToggleDiagnosticsPanel = React.useCallback(() => {
        setShowDiagnosticsPanel((prev) => !prev);
    }, []);

    const handleOpenBCI = React.useCallback(() => {
        setShowBCI(true);
    }, []);

    const handleOpenMultiModal = React.useCallback(() => {
        setShowMultiModal(true);
    }, []);

    const handleOpenCollaboration = React.useCallback(() => {
        setShowCollaboration(true);
    }, []);

    const handleOpenTeamWorkspaces = React.useCallback(() => {
        setShowTeamWorkspaces(true);
    }, []);

    const handleOpenEnterpriseCompliance = React.useCallback(() => {
        setShowEnterpriseCompliance(true);
    }, []);

    const handleOpenBlockchain = React.useCallback(() => {
        setShowBlockchain(true);
    }, []);

    const handleOpenAIAgents = React.useCallback(() => {
        setShowAIAgents(true);
    }, []);

    const handleOpenFederatedLearning = React.useCallback(() => {
        setShowFederatedLearning(true);
    }, []);

    const experimentalFeatureOpeners = React.useMemo<Record<string, () => void>>(() => ({
        bci: handleOpenBCI,
        multimodal: handleOpenMultiModal,
        collaboration: handleOpenCollaboration,
        cloudSync: handleOpenCloudSyncPanel,
        teamWorkspaces: handleOpenTeamWorkspaces,
        enterpriseCompliance: handleOpenEnterpriseCompliance,
        blockchain: handleOpenBlockchain,
        aiAgents: handleOpenAIAgents,
        federatedLearning: handleOpenFederatedLearning,
    }), [
        handleOpenAIAgents,
        handleOpenBCI,
        handleOpenBlockchain,
        handleOpenCloudSyncPanel,
        handleOpenCollaboration,
        handleOpenEnterpriseCompliance,
        handleOpenFederatedLearning,
        handleOpenMultiModal,
        handleOpenTeamWorkspaces,
    ]);

    const experimentalFeatureActions = React.useMemo<ExperimentalFeatureAction[]>(
        () =>
            EXPERIMENTAL_FEATURE_MENU_ITEMS.map((item) => ({
                key: item.key,
                label: item.label,
                icon: EXPERIMENTAL_FEATURE_ICON_MAP[item.icon],
                onClick: experimentalFeatureOpeners[item.key] || NOOP,
            })),
        [experimentalFeatureOpeners]
    );

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

    const handleShortcutEscape = React.useCallback(() => {
        if (showShortcutsModal) {
            setShowShortcutsModal(false);
        } else if (editingMessageIndex !== null) {
            handleCancelEdit();
        } else {
            stopGeneration();
        }
    }, [showShortcutsModal, editingMessageIndex, handleCancelEdit, stopGeneration]);

    const shortcutStateRef = React.useRef({
        historyLength: history.length,
        branchingEnabled,
    });
    const shortcutDispatcherRef = React.useRef<(action: ReturnType<typeof resolveChatShortcutAction>) => void>(() => {});

    React.useEffect(() => {
        shortcutStateRef.current = {
            historyLength: history.length,
            branchingEnabled,
        };
    }, [history.length, branchingEnabled]);

    React.useEffect(() => {
        shortcutDispatcherRef.current = (action) => {
            if (!action) {
                return;
            }

            dispatchChatShortcutAction(action, {
                openShortcutsModal: () => setShowShortcutsModal(true),
                newChat: createNewSession,
                toggleHistory: handleToggleHistoryPanel,
                clearChat: handleClearChat,
                toggleSearch: handleToggleSearch,
                copyLastResponse: handleCopyLastResponse,
                openExportDialog: handleOpenExportDialogShortcut,
                openGlobalSearch: () => setShowGlobalSearch(true),
                openRecommendations: () => setShowRecommendations(true),
                toggleTreeView: handleToggleTreeView,
                toggleBranching: handleToggleBranching,
                navigateBranch: handleNavigateBranch,
                escape: handleShortcutEscape,
            });
        };
    }, [
        createNewSession,
        handleClearChat,
        handleCopyLastResponse,
        handleNavigateBranch,
        handleOpenExportDialogShortcut,
        handleShortcutEscape,
        handleToggleSearch,
        handleToggleBranching,
        handleToggleHistoryPanel,
        handleToggleTreeView,
    ]);

    // Keyboard shortcuts listener attaches once and delegates via refs.
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const action = resolveChatShortcutAction(event, {
                isTyping: isTypingShortcutTarget(event.target),
                branchingEnabled: shortcutStateRef.current.branchingEnabled,
                allowClearChat: shortcutStateRef.current.historyLength > 0,
                allowExportDialog: shortcutStateRef.current.historyLength > 0,
            });

            if (!action) {
                return;
            }

            event.preventDefault();
            shortcutDispatcherRef.current(action);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const searchResultSet = React.useMemo(() => new Set(searchResults), [searchResults]);
    const activeSearchMessageIndex = React.useMemo(
        () => (currentSearchIndex >= 0 ? searchResults[currentSearchIndex] : undefined),
        [searchResults, currentSearchIndex]
    );
    const searchResultRows = React.useMemo(() => {
        const { rows, nextPreviewCache } = buildSearchResultRows({
            searchResults,
            history,
            previewCache: searchResultPreviewCacheRef.current,
        });
        searchResultPreviewCacheRef.current = nextPreviewCache;
        return rows;
    }, [searchResults, history]);
    const loadMessageAtIndex = React.useCallback((messageIndex: number) => {
        loadMessageRange(messageIndex, messageIndex);
    }, [loadMessageRange]);
    const onEditingContentChange = React.useCallback((value: string) => {
        setEditedMessageContent(value);
    }, []);
    const handleToggleSearchResultsList = React.useCallback(() => {
        setShowSearchResultsList((prev) => !prev);
    }, []);
    const handleSearchQueryChange = React.useCallback((value: string) => {
        setSearchQuery(value);
    }, []);
    const handlePreviousSearchResult = React.useCallback(() => {
        setCurrentSearchIndex((prev) => getWrappedSearchResultIndex(prev, searchResults.length, 'previous'));
    }, [searchResults.length]);
    const handleNextSearchResult = React.useCallback(() => {
        setCurrentSearchIndex((prev) => getWrappedSearchResultIndex(prev, searchResults.length, 'next'));
    }, [searchResults.length]);
    const handleCloseSearchPanel = React.useCallback(() => {
        setShowSearch(false);
        setSearchQuery('');
        setShowSearchResultsList(false);
    }, []);
    const rowMetadataByIndex = React.useMemo(() => getCachedChatRowMetadata({
        history,
        editingMessageIndex,
        searchResultSet,
        activeSearchMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        selectedToken,
        messageRatings,
        editedMessageContent,
        loadedMessageIndices,
    }, rowMetadataCacheRef.current), [
        history,
        editingMessageIndex,
        searchResultSet,
        activeSearchMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        selectedToken,
        messageRatings,
        editedMessageContent,
        loadedMessageIndices,
    ]);

    // Memoized itemContent callback to prevent recreation on every render
    const renderItemContent = React.useCallback((index: number, msg: any) => {
        const rowMetadata = rowMetadataByIndex[index];
        if (!rowMetadata) {
            return null;
        }

        return (
            <ChatMessageRow
                index={index}
                msg={msg}
                isLoadingMessages={isLoadingMessages}
                isSearchResult={rowMetadata.isSearchResult}
                isCurrentSearchResult={rowMetadata.isCurrentSearchResult}
                isLastMessage={rowMetadata.isLastMessage}
                previousMessage={rowMetadata.previousMessage}
                nextMessage={rowMetadata.nextMessage}
                isShowingComparison={rowMetadata.isShowingComparison}
                isComparisonPartnerHidden={rowMetadata.isComparisonPartnerHidden}
                isBookmarked={rowMetadata.isBookmarked}
                deleteMessage={deleteMessage}
                handleEditMessage={handleEditMessage}
                handleRegenerateResponse={handleRegenerateResponse}
                handleBranchConversation={handleBranchConversation}
                mcpAvailable={mcpAvailable}
                handleInsertToFile={handleInsertToFile}
                selectedTokenForMessage={rowMetadata.selectedTokenForMessage}
                setSelectedToken={setSelectedToken}
                setActiveTab={setActiveTab}
                setComparisonIndex={setComparisonIndex}
                modelNameById={modelNameById}
                currentModel={currentModel}
                secondaryModel={secondaryModel}
                handleRateMessage={handleRateMessage}
                messageRating={rowMetadata.messageRating}
                showInspector={showInspector}
                textareaRef={textareaRef}
                setInput={setInput}
                isEditingRow={rowMetadata.isEditingRow}
                editingContentForRow={rowMetadata.editingContentForRow}
                onEditingContentChange={onEditingContentChange}
                handleCancelEdit={handleCancelEdit}
                handleSaveEdit={handleSaveEdit}
                selectChoice={selectChoice}
                toggleBookmark={toggleBookmark}
                conversationFontSize={conversationFontSize}
                isCompactViewport={isCompactViewport}
                isLazyLoaded={rowMetadata.isLazyLoaded}
                loadMessageAtIndex={loadMessageAtIndex}
            />
        );
    }, [
        isLoadingMessages,
        rowMetadataByIndex,
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
        onEditingContentChange,
        handleCancelEdit,
        handleSaveEdit,
        selectChoice,
        toggleBookmark,
        conversationFontSize,
        isCompactViewport,
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
    const longPressMessageCapabilities = React.useMemo(
        () => getMessageActionCapabilities(longPressMessage),
        [longPressMessage?.role, longPressMessage?.isLoading]
    );
    const isLongPressMessageBookmarked = React.useMemo(
        () => Boolean(longPressMenu && bookmarkedMessages.has(longPressMenu.messageIndex)),
        [bookmarkedMessages, longPressMenu]
    );
    const handleToggleBottomControls = React.useCallback(() => {
        setShowBottomControls((prev) => !prev);
    }, []);
    const handleToggleSuggestions = React.useCallback(() => {
        setShowSuggestions((prev) => !prev);
    }, []);
    const handleSendComposerMessage = React.useCallback(() => {
        sendMessageWithContext();
    }, [sendMessageWithContext]);
    const handleComposerDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);
    const handleComposerDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);
    const handleComposerDrop = React.useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;

        for (const { file, kind } of describeDroppedFiles(files)) {
            if (kind === 'image') {
                try {
                    const { base64, thumbnailUrl } = await compressImage(file);
                    addImageAttachment({
                        name: file.name,
                        mimeType: 'image/webp',
                        base64,
                        thumbnailUrl,
                    });
                } catch (error) {
                    console.error('Failed to read/compress image', file.name, error);
                    toast.error(`Failed to process image: ${file.name}`);
                }
                continue;
            }

            if (kind === 'text') {
                try {
                    const text = await file.text();
                    addAttachment({ name: file.name, content: text });
                } catch (error) {
                    console.error('Failed to read file', file.name, error);
                }
            }
        }
    }, [addAttachment, addImageAttachment]);
    const handleComposerInputChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        const analysis = analyzeComposerInput(
            newValue,
            event.target.selectionEnd ?? newValue.length,
            event.target.scrollHeight
        );

        if (analysis.slashMatch) {
            setSlashMatch(analysis.slashMatch);
            setActivePromptIndex(0);
        } else {
            setSlashMatch(null);
        }

        setInput(newValue);
        event.target.style.height = 'auto';
        event.target.style.height = `${analysis.autoHeightPx}px`;
    }, [setInput]);
    const handleComposerInputPaste = React.useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageFiles = collectPastedImageFiles(Array.from(event.clipboardData.items));
        for (const file of imageFiles) {
            event.preventDefault();
            try {
                const { base64, thumbnailUrl } = await compressImage(file);
                addImageAttachment({
                    name: file.name || `pasted-${Date.now()}.png`,
                    mimeType: 'image/webp',
                    base64,
                    thumbnailUrl,
                });
                toast.success('Image pasted');
            } catch (error) {
                console.error('Paste failed', error);
                toast.error('Failed to paste image');
            }
        }
    }, [addImageAttachment]);
    const handleComposerInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const action = resolveComposerKeyAction({
            key: event.key,
            shiftKey: event.shiftKey,
            slashMenuOpen: Boolean(slashMatch),
            filteredPromptCount: filteredPrompts.length,
        });

        switch (action) {
            case 'navigate-up':
                event.preventDefault();
                setActivePromptIndex((prev) => Math.max(0, prev - 1));
                return;
            case 'navigate-down':
                event.preventDefault();
                setActivePromptIndex((prev) => Math.min(filteredPrompts.length - 1, prev + 1));
                return;
            case 'insert-prompt':
                event.preventDefault();
                insertPrompt(filteredPrompts[activePromptIndex]);
                return;
            case 'dismiss-slash':
                event.preventDefault();
                setSlashMatch(null);
                return;
            case 'send-message':
                event.preventDefault();
                sendMessageWithContext();
                return;
            default:
                return;
        }
    }, [activePromptIndex, filteredPrompts, insertPrompt, sendMessageWithContext, slashMatch]);
    const handleSelectSuggestion = React.useCallback((suggestion: string) => {
        setInput(suggestion);
        setShowSuggestions(false);
        textareaRef.current?.focus();
    }, [setInput]);
    const handleCloseSuggestionsPanel = React.useCallback(() => {
        setShowSuggestions(false);
    }, []);
    const handlePrefillChange = React.useCallback((value: string) => {
        setPrefill(value);
    }, [setPrefill]);
    const handleUrlInputChange = React.useCallback((value: string) => {
        setUrlInput(value);
    }, [setUrlInput]);
    const handleUrlInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            executeWebFetch();
        }
    }, [executeWebFetch]);
    const handleGithubUrlChange = React.useCallback((value: string) => {
        setGithubUrl(value);
    }, []);
    const handleGithubInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            executeGithubFetch();
        }
    }, [executeGithubFetch]);
    const handleToggleIncludeContextInMessages = React.useCallback(() => {
        setIncludeContextInMessages((prev) => !prev);
    }, []);
    const handleClearProjectContext = React.useCallback(() => {
        void loadProjectContextService()
            .then((projectContextService) => {
                projectContextService.clearContext();
                toast.success('Project context cleared');
            })
            .catch(() => {
                toast.error('Failed to clear project context');
            });
    }, []);
    const handleStartWatchingProjectContext = React.useCallback(() => {
        void (async () => {
            enableProjectContextFeature();
            const projectContextService = await loadProjectContextService();
            const success = await projectContextService.startWatching();
            if (success) {
                toast.success('Started watching folder for changes');
            } else {
                toast.error('Failed to start watching');
            }
        })();
    }, [enableProjectContextFeature]);
    const handleTogglePrefill = React.useCallback(() => {
        setPrefill((prev) => (prev === null ? '' : null));
    }, []);
    const handleToggleUrlInput = React.useCallback(() => {
        setShowUrlInput((prev) => !prev);
    }, []);
    const handleToggleGithubInput = React.useCallback(() => {
        setShowGithubInput((prev) => !prev);
    }, []);
    const handleProjectContextControlClick = React.useCallback(async () => {
        enableProjectContextFeature();
        const projectContextService = await loadProjectContextService();
        if (projectContext) {
            projectContextService.clearContext();
            toast.success('Project context cleared');
            return;
        }

        const success = await projectContextService.selectFolder();
        if (success) {
            toast.success('Project folder loaded');
            setTimeout(async () => {
                await projectContextService.startWatching();
            }, 500);
        } else {
            toast.error('Failed to select folder');
        }
    }, [projectContext]);
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
        setExcludedContextIndices(new Set());
    }, []);
    const handleExcludeTrimSuggestion = React.useCallback((messageIndex: number) => {
        setExcludedContextIndices((prev) => {
            const next = new Set(prev);
            next.add(messageIndex);
            return next;
        });
    }, []);
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
