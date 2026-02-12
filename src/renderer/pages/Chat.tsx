import React from 'react';
import { Plus, Globe, Settings, Activity, AlertTriangle, ChevronRight, Check, AlertCircle, Brain, Users, Wrench, Eraser, Download, Search, ChevronUp, ChevronDown, FileText, ThumbsUp, ThumbsDown, Code2, BarChart3, FolderOpen, Eye, EyeOff, Github, Network, HelpCircle, Zap, LayoutGrid, FileJson, TestTube, Sparkles, MessageSquare, Mail, Calendar, Package, Video, Link, Bot, Shield, Menu, Cloud, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '../../shared/types';
import type { MediaAttachment } from '../services/multiModalAI';
import { ChatComposerArea } from '../components/chat/ChatComposerArea';
import { ChatContextWindowPanel, ChatSummaryPanel } from '../components/chat/ChatContextPanels';
import { ChatHeaderBar } from '../components/chat/ChatHeaderBar';
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar';
import { ChatMessagesViewport } from '../components/chat/ChatMessagesViewport';
import { ChatOverlaySlots } from '../components/chat/ChatOverlaySlots';
import { ChatSearchPanel } from '../components/chat/ChatSearchPanel';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWorkspaceShell } from '../components/chat/ChatWorkspaceShell';
import type { LogEntry } from '../components/RequestResponseLog';
import { useChat } from '../hooks/useChat';
import { usePrompts } from '../hooks/usePrompts';
import { useConversationTree } from '../hooks/useConversationTree';
import { useChatComposerInteractions } from '../hooks/useChatComposerInteractions';
import { useChatContextOptimizer } from '../hooks/useChatContextOptimizer';
import { useChatComposerControlBar } from '../hooks/useChatComposerControlBar';
import { useChatDevMonitors } from '../hooks/useChatDevMonitors';
import { useChatDiagnosticsPanel } from '../hooks/useChatDiagnosticsPanel';
import { useChatDiagnosticsPopover } from '../hooks/useChatDiagnosticsPopover';
import { useChatExternalActions } from '../hooks/useChatExternalActions';
import { useChatGestureInteractions } from '../hooks/useChatGestureInteractions';
import { useChatHeaderActions } from '../hooks/useChatHeaderActions';
import { useChatLifecycleState } from '../hooks/useChatLifecycleState';
import { useChatKeyboardController } from '../hooks/useChatKeyboardController';
import { useChatMessageActionsController } from '../hooks/useChatMessageActionsController';
import { useChatHeaderUtilityControls } from '../hooks/useChatHeaderUtilityControls';
import { useChatMessageListSearch } from '../hooks/useChatMessageListSearch';
import { useChatLaunchReadiness } from '../hooks/useChatLaunchReadiness';
import { useChatPageEffects } from '../hooks/useChatPageEffects';
import { useChatPanelsState } from '../hooks/useChatPanelsState';
import { formatPerfMs, useChatPerfBenchmarks } from '../hooks/useChatPerfBenchmarks';
import { useChatRuntimeServices } from '../hooks/useChatRuntimeServices';
import { useChatSearchState } from '../hooks/useChatSearchState';
import { useChatViewState } from '../hooks/useChatViewState';
import { useChatSendPipeline } from '../hooks/useChatSendPipeline';
import { useChatSessionIntegrations } from '../hooks/useChatSessionIntegrations';
import { useChatSlashPrompts } from '../hooks/useChatSlashPrompts';
import { useChatStartupRecovery } from '../hooks/useChatStartupRecovery';
import { useChatOverlaySlotsProps } from '../hooks/useChatOverlaySlotsProps';
import { useChatSidebarPanels } from '../hooks/useChatSidebarPanels';
import { useChatUiActionBundle } from '../hooks/useChatUiActionBundle';
import { useComposerOverlayLayout } from '../hooks/useComposerOverlayLayout';
import { useChatDerivedViewModels } from '../hooks/useChatDerivedViewModels';
import { getDiagnosticsStatus } from '../lib/chatDiagnosticsModels';
import {
    loadActivityLogService,
    loadAutoCategorizationService,
    loadAutoTaggingService,
    loadContextManagementService,
    loadMultiModalAIService,
    loadProjectContextService,
    loadPromptVariableService,
    loadWorkflowsService,
} from '../lib/chatLazyServices';
import {
    createChatRowMetadataCacheState,
    type SearchResultPreviewCacheEntry,
} from '../lib/chatRenderModels';
import { isLongMessageContent } from '../lib/chatMessageCollapse';
import type { ChatVirtuosoHandle } from '../lib/chatVirtuosoTypes';
import {
    type ChatMessageActionCapabilities,
    getMessageActionCapabilities,
} from '../lib/chatMessageActions';
import { useMCP } from '../hooks/useMCP';
import type { MCPToolCall } from '../services/mcp';

const CHAT_PERF_HISTORY_KEY = 'chat_message_perf_benchmarks_v1';
const ACTIVITY_LOG_COUNT_KEY = 'api_activity_log_count';
const MAX_ACTIVITY_LOG_ENTRIES = 200;

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

    const { prompts } = usePrompts();
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        currentSearchIndex,
        setCurrentSearchIndex,
    } = useChatSearchState({ history });
    const {
        showSearch,
        setShowSearch,
        showSearchResultsList,
        setShowSearchResultsList,
        showInspector,
        setShowInspector,
        showShortcutsModal,
        setShowShortcutsModal,
        showAnalytics,
        setShowAnalytics,
        showGithubInput,
        setShowGithubInput,
        showTreeView,
        setShowTreeView,
        branchingEnabled,
        setBranchingEnabled,
        showExportDialog,
        setShowExportDialog,
        showGlobalSearch,
        setShowGlobalSearch,
        showABTesting,
        setShowABTesting,
        showPromptOptimization,
        setShowPromptOptimization,
        showCalendarSchedule,
        setShowCalendarSchedule,
        showSuggestions,
        setShowSuggestions,
        showRecommendations,
        setShowRecommendations,
        showWorkflows,
        setShowWorkflows,
        showAPIPlayground,
        setShowAPIPlayground,
        showDeveloperDocs,
        setShowDeveloperDocs,
        sidebarOpen,
        setSidebarOpen,
        showPluginManager,
        setShowPluginManager,
        showCodeIntegration,
        setShowCodeIntegration,
        selectedCode,
        setSelectedCode,
        showWorkspaceViews,
        setShowWorkspaceViews,
        showBCI,
        setShowBCI,
        showMultiModal,
        setShowMultiModal,
        showCollaboration,
        setShowCollaboration,
        showCloudSync,
        setShowCloudSync,
        showTeamWorkspaces,
        setShowTeamWorkspaces,
        showEnterpriseCompliance,
        setShowEnterpriseCompliance,
        showBlockchain,
        setShowBlockchain,
        showAIAgents,
        setShowAIAgents,
        showFederatedLearning,
        setShowFederatedLearning,
        showTemplateLibrary,
        setShowTemplateLibrary,
        showVariableMenu,
        setShowVariableMenu,
        handleToggleTreeView,
        handleToggleBranching,
        handleOpenExportDialogShortcut,
    } = useChatPanelsState({ historyLength: history.length });
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
    const {
        isDragging,
        setIsDragging,
        activeTab,
        setActiveTab,
        isEditingSystemPrompt,
        setIsEditingSystemPrompt,
        editingMessageIndex,
        setEditingMessageIndex,
        editedMessageContent,
        setEditedMessageContent,
        devMonitorsEnabled,
        setDevMonitorsEnabled,
        messageRatings,
        jsonMode,
        setJsonMode,
        usageStats,
        setUsageStats,
        comparisonIndex,
        setComparisonIndex,
        projectContext,
        setProjectContext,
        projectContextFeatureEnabled,
        includeContextInMessages,
        setIncludeContextInMessages,
        githubUrl,
        setGithubUrl,
        contextManagementService,
        setContextManagementService,
        handleRateMessage,
        enableProjectContextFeature,
    } = useChatViewState();
    const virtuosoRef = React.useRef<ChatVirtuosoHandle | null>(null);
    const searchResultPreviewCacheRef = React.useRef<Map<number, SearchResultPreviewCacheEntry>>(new Map());
    const rowMetadataCacheRef = React.useRef(createChatRowMetadataCacheState());
    const messageListRef = React.useRef<HTMLDivElement | null>(null);
    const composerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const longPressMenuRef = React.useRef<HTMLDivElement | null>(null);
    const [collapsedMessageRows, setCollapsedMessageRows] = React.useState<Record<number, boolean>>({});
    const [collapseLongCodeBlocksSignal, setCollapseLongCodeBlocksSignal] = React.useState(0);
    const [expandLongCodeBlocksSignal, setExpandLongCodeBlocksSignal] = React.useState(0);

    const handleBottomControlsHidden = React.useCallback(() => {
        setShowExpertMenu(false);
        setShowVariableMenu(false);
    }, [setShowExpertMenu, setShowVariableMenu]);
    const {
        showBottomControls,
        setShowBottomControls,
        composerOverlayHeight,
    } = useComposerOverlayLayout({
        composerContainerRef,
        isCompactViewport,
        onBottomControlsHidden: handleBottomControlsHidden,
    });

    // Initialize conversation tree only when branching is enabled.
    const treeHook = useConversationTree(history, { enabled: branchingEnabled });
    useChatPageEffects({
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
        syncTreeWithHistory: treeHook.replaceMessages,
        loadAutoCategorizationService,
        loadAutoTaggingService,
        loadWorkflowsService,
    });

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
    const { cloudSyncBadge, clearApiLogs } = useChatRuntimeServices({
        showRequestLog,
        hasHydratedApiLogs,
        setApiLogs,
        setApiLogCount,
        setHasHydratedApiLogs,
        showAnalytics,
        setUsageStats,
        shouldLoadCloudSyncService,
        isCloudSyncAuthenticated,
        setIsCloudSyncAuthenticated,
    });

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
        appendMessage: (message) => appendMessage(message as ChatMessage),
        githubUrl,
        setGithubUrl,
        mcpAvailable,
        mcpTools,
        executeMcpTool: async (payload) => {
            const result = await executeMcpTool({
                ...payload,
                serverId: payload.serverId ?? '',
            } as MCPToolCall);
            return {
                isError: Boolean(result.isError),
                content: result.content,
            };
        },
    });

    const {
        currentModelObj,
        currentModelName,
        currentSessionTitle,
        contextWindowTokens,
        messageListFooterHeight,
    } = useChatDerivedViewModels({
        availableModels,
        currentModel,
        savedSessions,
        sessionId,
        isCompactViewport,
        composerOverlayHeight,
    });
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
    const {
        hasCompletedLaunchChecklist,
        providerReady,
        modelReady,
        promptReady,
        readinessSteps,
        readinessCompletedCount,
        launchChecklistComplete,
        shouldShowLaunchChecklist,
    } = useChatLaunchReadiness({
        connectionStatus,
        currentModel,
        currentModelLabel: currentModelName,
        input,
    });
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

    const diagnosticsPopover = useChatDiagnosticsPopover({
        showDiagnosticsPanel,
        diagnosticsPopoverRef,
        diagnosticsPanelPosition,
        diagnosticsStatus,
        activePerfBenchmark,
        recentPerfBenchmarksCount: recentPerfBenchmarks.length,
        latestPerfBenchmark,
        perfSummary,
        formatPerfMs,
        devMonitorsEnabled,
        providerReady,
        modelReady,
        historyLength: history.length,
        promptReady,
        onClose: handleCloseDiagnosticsPanel,
        onClearPerfHistory: clearPerfHistory,
        onToggleDevMonitors: handleToggleDevMonitors,
        onRequestConnectionRefresh: requestConnectionRefresh,
        onAutoSelectFirstModel: selectFirstModel,
        onOpenSettings: handleDiagnosticsOpenSettings,
        onOpenModels: handleDiagnosticsOpenModels,
        onInsertStarterPrompt: handleDiagnosticsInsertStarterPrompt,
    });

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
    const handleJumpToSearchMessage = React.useCallback((targetSessionId: string, messageIndex: number) => {
        if (targetSessionId !== sessionId) {
            handleLoadSession(targetSessionId);
        }
        setTimeout(() => {
            if (virtuosoRef.current && messageIndex >= 0) {
                virtuosoRef.current.scrollToIndex({
                    index: messageIndex,
                    align: 'center',
                    behavior: 'smooth',
                });
                toast.success(`Jumped to message #${messageIndex + 1}`);
            }
        }, 300);
    }, [handleLoadSession, sessionId]);
    const handleApplyOptimizedPrompt = React.useCallback((optimizedPrompt: string, optimizedSystemPrompt?: string) => {
        setInput(optimizedPrompt);
        if (optimizedSystemPrompt) {
            setSystemPrompt(optimizedSystemPrompt);
        }
    }, [setInput, setSystemPrompt]);
    const handleSendMultiModal = React.useCallback(async (media: MediaAttachment[], text?: string) => {
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
    }, [appendMessage, executeChatCompletion]);
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

    const handleToggleHistoryPanel = React.useCallback(() => {
        setShowHistory((prev) => !prev);
    }, [setShowHistory]);
    const handleCloseHistoryPanel = React.useCallback(() => {
        setShowHistory(false);
    }, [setShowHistory]);

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

    const handleNavigateBranch = React.useCallback((direction: -1 | 1) => {
        const currentIndex = treeHook.getCurrentSiblingIndex();
        treeHook.switchToSibling(currentIndex + direction);
    }, [treeHook]);

    React.useEffect(() => {
        setCollapsedMessageRows({});
        setCollapseLongCodeBlocksSignal(0);
        setExpandLongCodeBlocksSignal(0);
    }, [sessionId]);

    React.useEffect(() => {
        setCollapsedMessageRows((prev) => {
            const next: Record<number, boolean> = {};
            let changed = false;
            Object.entries(prev).forEach(([key, value]) => {
                const index = Number(key);
                if (!Number.isInteger(index) || index < 0 || index >= history.length) {
                    changed = true;
                    return;
                }
                next[index] = value;
            });
            return changed ? next : prev;
        });
    }, [history.length]);

    const longAssistantMessageIndices = React.useMemo(() => {
        const indices: number[] = [];
        history.forEach((message, index) => {
            if (message.role !== 'assistant' || message.isLoading) {
                return;
            }
            if (isLongMessageContent(message.content || '')) {
                indices.push(index);
            }
        });
        return indices;
    }, [history]);

    const collapsedLongMessageCount = React.useMemo(
        () => longAssistantMessageIndices.reduce((count, index) => (
            collapsedMessageRows[index] ? count + 1 : count
        ), 0),
        [collapsedMessageRows, longAssistantMessageIndices]
    );
    const hasCollapsibleContent = longAssistantMessageIndices.length > 0;
    const allCollapsibleContentCollapsed = hasCollapsibleContent
        && collapsedLongMessageCount === longAssistantMessageIndices.length;

    const handleToggleMessageCollapsed = React.useCallback((messageIndex: number) => {
        setCollapsedMessageRows((prev) => ({
            ...prev,
            [messageIndex]: !prev[messageIndex],
        }));
    }, []);

    const handleCollapseAllLongContent = React.useCallback(() => {
        if (longAssistantMessageIndices.length === 0) {
            return;
        }
        setCollapsedMessageRows((prev) => {
            const next = { ...prev };
            longAssistantMessageIndices.forEach((index) => {
                next[index] = true;
            });
            return next;
        });
        setCollapseLongCodeBlocksSignal((prev) => prev + 1);
    }, [longAssistantMessageIndices]);

    const handleExpandAllLongContent = React.useCallback(() => {
        if (longAssistantMessageIndices.length === 0) {
            return;
        }
        setCollapsedMessageRows((prev) => {
            let changed = false;
            const next = { ...prev };
            longAssistantMessageIndices.forEach((index) => {
                if (next[index]) {
                    changed = true;
                }
                delete next[index];
            });
            return changed ? next : prev;
        });
        setExpandLongCodeBlocksSignal((prev) => prev + 1);
    }, [longAssistantMessageIndices]);

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
        setCurrentSearchIndex: setCurrentSearchIndex as React.Dispatch<React.SetStateAction<number>>,
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
        collapsedMessageRows,
        onToggleMessageCollapsed: handleToggleMessageCollapsed,
        collapseLongCodeBlocksSignal,
        expandLongCodeBlocksSignal,
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
        modelName: currentModelName,
        sessionId,
        sessionTitle: currentSessionTitle,
        handleTogglePrefill,
        handleToggleUrlInput,
        handleToggleGithubInput,
        handleProjectContextControlClick,
    });
    const uiActionBundle = useChatUiActionBundle({
        onToggleHistory: handleToggleHistoryPanel,
        onCloseHistory: handleCloseHistoryPanel,
        onOpenCodeIntegration: handleOpenCodeIntegration,
        onOpenExportDialog: handleOpenExportDialog,
        onExportSessionToObsidian: handleExportSessionToObsidian,
        onSaveSessionToNotion: handleSaveSessionToNotion,
        onSendSessionToSlack: handleSendSessionToSlack,
        onSendSessionToDiscord: handleSendSessionToDiscord,
        onSendSessionByEmail: handleSendSessionByEmail,
        onOpenCalendarSchedule: handleOpenCalendarSchedule,
        onToggleBottomControls: handleToggleBottomControls,
        onToggleSuggestions: handleToggleSuggestions,
        onSendComposerMessage: handleSendComposerMessage,
    });
    const controlsTabPanelProps = React.useMemo(
        () => ({
            systemPrompt,
            isEditingSystemPrompt,
            onStartEditingSystemPrompt: handleStartEditingSystemPrompt,
            onStopEditingSystemPrompt: handleStopEditingSystemPrompt,
            onSystemPromptChange: handleSystemPromptChange,
            battleMode,
            onToggleBattleMode: handleToggleBattleModeWithSecondaryFallback,
            secondaryModel,
            secondaryModelDisplayName,
            nonCurrentModelOptionElements,
            onSecondaryModelChange: handleSecondaryModelChange,
            thinkingEnabled,
            onToggleThinkingEnabled: handleToggleThinking,
            autoRouting,
            onToggleAutoRouting: handleToggleAutoRouting,
            enabledTools,
            onToggleTool: handleToggleToolByName,
            jsonModeEnabled: responseFormat === 'json_object',
            onToggleJsonMode: handleToggleResponseFormat,
            contextUsage,
            autoSummarizeContext,
            onToggleAutoSummarizeContext: handleToggleAutoSummarizeContext,
            onApplySuggestedTrim: handleApplySuggestedTrim,
            onIncludeAllContext: handleIncludeAllContext,
            trimSuggestionRows,
            onExcludeTrimSuggestion: handleExcludeTrimSuggestion,
            recentContextRows,
            onToggleContextMessage: toggleMessageContextInclusion,
            batchSize,
            onBatchSizeChange: handleBatchSizeChange,
            temperature,
            onTemperatureChange: handleTemperatureChange,
            topP,
            onTopPChange: handleTopPChange,
            maxTokens,
            onMaxTokensChange: handleMaxTokensChange,
            maxTokenSliderMax: maxTokensSliderConfig.sliderMax,
            maxTokenSliderStep: maxTokensSliderConfig.sliderStep,
            modelContextLength: currentModelObj?.contextLength,
        }),
        [
            systemPrompt,
            isEditingSystemPrompt,
            handleStartEditingSystemPrompt,
            handleStopEditingSystemPrompt,
            handleSystemPromptChange,
            battleMode,
            handleToggleBattleModeWithSecondaryFallback,
            secondaryModel,
            secondaryModelDisplayName,
            nonCurrentModelOptionElements,
            handleSecondaryModelChange,
            thinkingEnabled,
            handleToggleThinking,
            autoRouting,
            handleToggleAutoRouting,
            enabledTools,
            handleToggleToolByName,
            responseFormat,
            handleToggleResponseFormat,
            contextUsage,
            autoSummarizeContext,
            handleToggleAutoSummarizeContext,
            handleApplySuggestedTrim,
            handleIncludeAllContext,
            trimSuggestionRows,
            handleExcludeTrimSuggestion,
            recentContextRows,
            toggleMessageContextInclusion,
            batchSize,
            handleBatchSizeChange,
            temperature,
            handleTemperatureChange,
            topP,
            handleTopPChange,
            maxTokens,
            handleMaxTokensChange,
            maxTokensSliderConfig.sliderMax,
            maxTokensSliderConfig.sliderStep,
            currentModelObj?.contextLength,
        ]
    );
    const { sidebarTabsHeader, sidebarPanels } = useChatSidebarPanels({
        activeTab,
        onSelectInspectorTab: handleSelectInspectorTab,
        onSelectControlsTab: handleSelectControlsTab,
        onSelectPromptsTab: handleSelectPromptsTab,
        onSelectDocumentsTab: handleSelectDocumentsTab,
        onCloseSidebar: handleCloseSidebar,
        controlsTabPanelProps,
        selectedToken,
        onUpdateToken: updateMessageToken,
    });
    const overlaySlotsProps = useChatOverlaySlotsProps({
        showShortcutsModal,
        setShowShortcutsModal,
        showRequestLog,
        setShowRequestLog,
        apiLogs,
        clearApiLogs,
        showAnalytics,
        setShowAnalytics,
        usageStats,
        branchingEnabled,
        showTreeView,
        setShowTreeView,
        treeState: {
            treeManager: treeHook.treeManager,
            currentPath: treeHook.currentPath,
        },
        showExportDialog,
        setShowExportDialog,
        history,
        savedSessions,
        sessionId,
        showGlobalSearch,
        setShowGlobalSearch,
        handleLoadSession,
        onJumpToSearchMessage: handleJumpToSearchMessage,
        showTemplateLibrary,
        setShowTemplateLibrary,
        createNewSession,
        setSystemPrompt,
        setTemperature,
        setTopP,
        setMaxTokens,
        setExpertMode,
        setThinkingEnabled,
        replaceHistory,
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        expertMode,
        thinkingEnabled,
        showABTesting,
        setShowABTesting,
        executeChatCompletion,
        input,
        showPromptOptimization,
        setShowPromptOptimization,
        showCalendarSchedule,
        setShowCalendarSchedule,
        showRecommendations,
        setShowRecommendations,
        showWorkflows,
        setShowWorkflows,
        showAPIPlayground,
        setShowAPIPlayground,
        showDeveloperDocs,
        setShowDeveloperDocs,
        showPluginManager,
        setShowPluginManager,
        showCodeIntegration,
        setShowCodeIntegration,
        selectedCode,
        setSelectedCode,
        showWorkspaceViews,
        setShowWorkspaceViews,
        showTutorial,
        currentTutorial,
        handleCompleteTutorial,
        handleSkipTutorial,
        showBCI,
        setShowBCI,
        showMultiModal,
        setShowMultiModal,
        onSendMultiModal: handleSendMultiModal,
        showCollaboration,
        setShowCollaboration,
        showCloudSync,
        setShowCloudSync,
        showTeamWorkspaces,
        setShowTeamWorkspaces,
        availableModels,
        showEnterpriseCompliance,
        setShowEnterpriseCompliance,
        showBlockchain,
        setShowBlockchain,
        showAIAgents,
        setShowAIAgents,
        showFederatedLearning,
        setShowFederatedLearning,
        devMonitorsEnabled,
        showRecoveryDialog,
        setShowRecoveryDialog,
        handleRestoreSession,
        handleDismissRecovery,
        recoveryState,
        onApplyOptimizedPrompt: handleApplyOptimizedPrompt,
    });

    return (
        <ChatWorkspaceShell
            showHistory={showHistory}
            isCompactViewport={isCompactViewport}
            historySidebar={(
                <ChatHistorySidebar
                    sessions={savedSessions}
                    currentSessionId={sessionId}
                    onClose={uiActionBundle.history.close}
                    onLoadSession={handleLoadSession}
                    onDeleteSession={deleteSession}
                    onRenameSession={renameSession}
                    onTogglePinSession={togglePinSession}
                    isLoading={isLoadingSessions}
                />
            )}
            header={(
                <ChatHeaderBar
                    isCompactViewport={isCompactViewport}
                    showHistory={showHistory}
                    onToggleHistory={uiActionBundle.history.toggle}
                    topHeaderPrimaryActions={topHeaderPrimaryActions}
                    experimentalFeatureActions={experimentalFeatureActions}
                    onOpenCloudSyncPanel={handleOpenCloudSyncPanel}
                    cloudSyncBadge={cloudSyncBadge}
                    hasHistory={history.length > 0}
                    showTreeView={showTreeView}
                    integrationAvailability={integrationAvailability}
                    onOpenCodeIntegration={uiActionBundle.integrations.openCodeIntegration}
                    onClearChat={handleClearChat}
                    onOpenExportDialog={uiActionBundle.integrations.openExportDialog}
                    onToggleTreeView={handleToggleTreeView}
                    onExportSessionToObsidian={uiActionBundle.integrations.exportSessionToObsidian}
                    onSaveToNotion={uiActionBundle.integrations.saveSessionToNotion}
                    onSendToSlack={uiActionBundle.integrations.sendSessionToSlack}
                    onSendToDiscord={uiActionBundle.integrations.sendSessionToDiscord}
                    onSendToEmail={uiActionBundle.integrations.sendSessionByEmail}
                    onOpenCalendarSchedule={uiActionBundle.integrations.openCalendarSchedule}
                    battleMode={battleMode}
                    currentModel={currentModel}
                    secondaryModel={secondaryModel}
                    allModelOptionElements={allModelOptionElements}
                    onCurrentModelChange={handleCurrentModelChange}
                    onSecondaryModelChange={handleSecondaryModelChange}
                    showRequestLog={showRequestLog}
                    onToggleRequestLog={handleToggleRequestLog}
                    apiLogCount={apiLogCount}
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
                    connectionStatus={connectionStatus}
                />
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
            summaryPanel={(
                <ChatSummaryPanel
                    history={history}
                    sessionId={sessionId}
                    modelId={currentModel}
                />
            )}
            contextWindowPanel={(
                <ChatContextWindowPanel
                    hasHistory={history.length > 0}
                    contextUsage={contextUsage}
                />
            )}
            messagesArea={(
                <ChatMessagesViewport
                    messageListRef={messageListRef}
                    longPressMenuRef={longPressMenuRef}
                    swipeSessionIndicator={swipeSessionIndicator}
                    history={history}
                    isLoadingMessages={isLoadingMessages}
                    VirtuosoComponent={VirtuosoComponent}
                    virtuosoRef={virtuosoRef}
                    messageListFooterHeight={messageListFooterHeight}
                    renderItemContent={renderItemContent}
                    showBottomControls={showBottomControls}
                    emptyStateReady={launchChecklistComplete || hasCompletedLaunchChecklist}
                    showLaunchChecklist={shouldShowLaunchChecklist}
                    readinessCompletedCount={readinessCompletedCount}
                    readinessSteps={readinessSteps}
                    onSelectPrompt={setInput}
                    longPressMenu={longPressMenu}
                    longPressMessage={longPressMessage}
                    isLongPressMessageBookmarked={isLongPressMessageBookmarked}
                    longPressMessageCapabilities={longPressMessageCapabilities}
                    onLongPressAction={handleLongPressAction}
                    hasCollapsibleContent={hasCollapsibleContent}
                    allCollapsibleContentCollapsed={allCollapsibleContentCollapsed}
                    onCollapseAllLongContent={handleCollapseAllLongContent}
                    onExpandAllLongContent={handleExpandAllLongContent}
                />
            )}
            composer={(
                <ChatComposerArea
                    composerContainerRef={composerContainerRef}
                    isCompactViewport={isCompactViewport}
                    isDragging={isDragging}
                    onDragOver={handleComposerDragOver}
                    onDragLeave={handleComposerDragLeave}
                    onDrop={handleComposerDrop}
                    attachments={attachments}
                    imageAttachments={imageAttachments}
                    onRemoveAttachment={(index) => {
                        const attachment = attachments[index];
                        if (attachment?.id) {
                            removeAttachment(attachment.id);
                        }
                    }}
                    onRemoveImageAttachment={(index) => {
                        const attachment = imageAttachments[index];
                        if (attachment?.id) {
                            removeImageAttachment(attachment.id);
                        }
                    }}
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
                    textareaRef={textareaRef}
                    input={input}
                    onInputChange={handleComposerInputChange}
                    onInputPaste={handleComposerInputPaste}
                    onInputKeyDown={handleComposerInputKeyDown}
                    showBottomControls={showBottomControls}
                    onToggleBottomControls={uiActionBundle.composer.toggleBottomControls}
                    onToggleSuggestions={uiActionBundle.composer.toggleSuggestions}
                    onSendComposerMessage={uiActionBundle.composer.sendMessage}
                    composerControlPillActions={composerControlPillActions}
                    mcpAvailable={mcpAvailable}
                    mcpConnectedCount={mcpConnectedCount}
                    mcpToolCount={mcpTools.length}
                    showExpertMenu={showExpertMenu}
                    onSelectExpert={handleExpertSelect}
                    showVariableMenu={showVariableMenu}
                    onCloseVariableMenu={handleCloseVariableMenu}
                    onInsertVariable={handleInsertVariable}
                    composerVariableContext={composerVariableContext}
                />
            )}
            sidebar={(
                <ChatSidebar
                    sidebarOpen={sidebarOpen}
                    isCompactViewport={isCompactViewport}
                    activeTab={activeTab}
                    onCloseSidebar={handleCloseSidebar}
                    tabsHeader={sidebarTabsHeader}
                    panels={sidebarPanels}
                />
            )}
            overlays={(
                <ChatOverlaySlots {...overlaySlotsProps} />
            )}
        />
    );
};

export default Chat;
