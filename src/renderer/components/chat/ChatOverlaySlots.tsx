import React from 'react';
import type { ChatMessage, ChatSession } from '../../../shared/types';
import type { ConversationTemplate } from '../../services/templates';
import { ChatOverlays } from './ChatOverlays';
import {
    ABTestingPanel,
    AIAgentsPanel,
    AnalyticsDashboard,
    APIPlayground,
    BCIPanel,
    BlockchainPanel,
    CalendarScheduleDialog,
    CloudSyncPanel,
    CodeIntegrationPanel,
    ConversationRecommendationsPanel,
    ConversationTreeView,
    DeveloperDocumentationPanel,
    EnterpriseCompliancePanel,
    ExportDialog,
    FederatedLearningPanel,
    GlobalSearchDialog,
    InteractiveTutorial,
    KeyboardShortcutsModal,
    MultiModalAIPanel,
    PerformanceMonitorOverlay,
    PluginManager,
    PromptOptimizationPanel,
    RecoveryDialog,
    RequestResponseLog,
    RealTimeCollaborationPanel,
    TeamWorkspacesPanel,
    TemplateLibraryDialog,
    WorkflowsManager,
    WorkspaceViewsPanel,
} from './chatLazyPanels';
import type { LogEntry } from '../RequestResponseLog';

interface ChatOverlaySlotsProps {
    showShortcutsModal: boolean;
    setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
    showRequestLog: boolean;
    setShowRequestLog: React.Dispatch<React.SetStateAction<boolean>>;
    apiLogs: LogEntry[];
    clearApiLogs: () => void;
    showAnalytics: boolean;
    setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
    usageStats: any[];
    branchingEnabled: boolean;
    showTreeView: boolean;
    setShowTreeView: React.Dispatch<React.SetStateAction<boolean>>;
    treeManager: any;
    currentPath: any;
    showExportDialog: boolean;
    setShowExportDialog: React.Dispatch<React.SetStateAction<boolean>>;
    history: ChatMessage[];
    savedSessions: ChatSession[];
    sessionId: string;
    showGlobalSearch: boolean;
    setShowGlobalSearch: React.Dispatch<React.SetStateAction<boolean>>;
    handleLoadSession: (id: string) => void;
    onJumpToSearchMessage: (targetSessionId: string, messageIndex: number) => void;
    showTemplateLibrary: boolean;
    setShowTemplateLibrary: React.Dispatch<React.SetStateAction<boolean>>;
    createNewSession: () => void;
    setSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
    setTemperature: React.Dispatch<React.SetStateAction<number>>;
    setTopP: React.Dispatch<React.SetStateAction<number>>;
    setMaxTokens: React.Dispatch<React.SetStateAction<number>>;
    setExpertMode: React.Dispatch<React.SetStateAction<string | null>>;
    setThinkingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    replaceHistory: (messages: ChatMessage[]) => void;
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    expertMode: string | null;
    thinkingEnabled: boolean;
    showABTesting: boolean;
    setShowABTesting: React.Dispatch<React.SetStateAction<boolean>>;
    executeChatCompletion: (params: {
        prompt: string;
        systemPrompt?: string;
        modelId?: string;
        temperature?: number;
        topP?: number;
        maxTokens?: number;
    }) => Promise<{ content: string }>;
    input: string;
    showPromptOptimization: boolean;
    setShowPromptOptimization: React.Dispatch<React.SetStateAction<boolean>>;
    showCalendarSchedule: boolean;
    setShowCalendarSchedule: React.Dispatch<React.SetStateAction<boolean>>;
    showRecommendations: boolean;
    setShowRecommendations: React.Dispatch<React.SetStateAction<boolean>>;
    showWorkflows: boolean;
    setShowWorkflows: React.Dispatch<React.SetStateAction<boolean>>;
    showAPIPlayground: boolean;
    setShowAPIPlayground: React.Dispatch<React.SetStateAction<boolean>>;
    showDeveloperDocs: boolean;
    setShowDeveloperDocs: React.Dispatch<React.SetStateAction<boolean>>;
    showPluginManager: boolean;
    setShowPluginManager: React.Dispatch<React.SetStateAction<boolean>>;
    showCodeIntegration: boolean;
    setShowCodeIntegration: React.Dispatch<React.SetStateAction<boolean>>;
    selectedCode: { code: string; language?: string } | null;
    setSelectedCode: React.Dispatch<React.SetStateAction<{ code: string; language?: string } | null>>;
    showWorkspaceViews: boolean;
    setShowWorkspaceViews: React.Dispatch<React.SetStateAction<boolean>>;
    showTutorial: boolean;
    currentTutorial: any;
    handleCompleteTutorial: () => void;
    handleSkipTutorial: () => void;
    showBCI: boolean;
    setShowBCI: React.Dispatch<React.SetStateAction<boolean>>;
    showMultiModal: boolean;
    setShowMultiModal: React.Dispatch<React.SetStateAction<boolean>>;
    onSendMultiModal: (media: unknown, text: string) => Promise<void>;
    showCollaboration: boolean;
    setShowCollaboration: React.Dispatch<React.SetStateAction<boolean>>;
    showCloudSync: boolean;
    setShowCloudSync: React.Dispatch<React.SetStateAction<boolean>>;
    showTeamWorkspaces: boolean;
    setShowTeamWorkspaces: React.Dispatch<React.SetStateAction<boolean>>;
    availableModels: any[];
    showEnterpriseCompliance: boolean;
    setShowEnterpriseCompliance: React.Dispatch<React.SetStateAction<boolean>>;
    showBlockchain: boolean;
    setShowBlockchain: React.Dispatch<React.SetStateAction<boolean>>;
    showAIAgents: boolean;
    setShowAIAgents: React.Dispatch<React.SetStateAction<boolean>>;
    showFederatedLearning: boolean;
    setShowFederatedLearning: React.Dispatch<React.SetStateAction<boolean>>;
    devMonitorsEnabled: boolean;
    showRecoveryDialog: boolean;
    setShowRecoveryDialog: React.Dispatch<React.SetStateAction<boolean>>;
    handleRestoreSession: () => void;
    handleDismissRecovery: () => void;
    recoveryState: any;
    onApplyOptimizedPrompt: (optimizedPrompt: string, optimizedSystemPrompt?: string) => void;
}

export const ChatOverlaySlots: React.FC<ChatOverlaySlotsProps> = ({
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
    treeManager,
    currentPath,
    showExportDialog,
    setShowExportDialog,
    history,
    savedSessions,
    sessionId,
    showGlobalSearch,
    setShowGlobalSearch,
    handleLoadSession,
    onJumpToSearchMessage,
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
    onSendMultiModal,
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
    onApplyOptimizedPrompt,
}) => {
    const currentSessionTitle = savedSessions.find((session) => session.id === sessionId)?.title || 'Conversation';

    return (
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
                            onClear={clearApiLogs}
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
                conversationTreeView: branchingEnabled && showTreeView && treeManager ? (
                    <React.Suspense fallback={null}>
                        <ConversationTreeView
                            isOpen={showTreeView}
                            onClose={() => setShowTreeView(false)}
                            treeManager={treeManager}
                            currentPath={currentPath}
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
                            sessionTitle={currentSessionTitle}
                        />
                    </React.Suspense>
                ) : null,
                globalSearchDialog: showGlobalSearch ? (
                    <React.Suspense fallback={null}>
                        <GlobalSearchDialog
                            isOpen={showGlobalSearch}
                            onClose={() => setShowGlobalSearch(false)}
                            currentSessionId={sessionId}
                            currentSessionTitle={currentSessionTitle}
                            onNavigateToMessage={onJumpToSearchMessage}
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
                                    replaceHistory(template.initialMessages.map((message) => ({
                                        ...message,
                                        isLoading: false,
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
                                thinkingEnabled,
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
                            onApplyOptimized={onApplyOptimizedPrompt}
                        />
                    </React.Suspense>
                ) : null,
                calendarScheduleDialog: showCalendarSchedule ? (
                    <React.Suspense fallback={null}>
                        <CalendarScheduleDialog
                            isOpen={showCalendarSchedule}
                            onClose={() => setShowCalendarSchedule(false)}
                            conversationTitle={currentSessionTitle}
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
                            conversations={savedSessions.map((session) => ({
                                id: session.id,
                                title: session.title,
                                messageCount: session.messageCount || 0,
                                lastActivity: session.lastMessageTime || session.createdAt,
                                pinned: session.pinned,
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
                            onSend={onSendMultiModal}
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
    );
};
