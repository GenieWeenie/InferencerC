import React from 'react';
import type { ChatOverlaySlots } from './ChatOverlays';
import type { ChatOverlaySlotsProps } from './chatOverlayTypes';
import {
    ABTestingPanel,
    AIAgentsPanel,
    APIPlayground,
    BCIPanel,
    BlockchainPanel,
    CalendarScheduleDialog,
    CloudSyncPanel,
    CodeIntegrationPanel,
    ConversationRecommendationsPanel,
    DeveloperDocumentationPanel,
    EnterpriseCompliancePanel,
    FederatedLearningPanel,
    InteractiveTutorial,
    MultiModalAIPanel,
    PluginManager,
    PromptOptimizationPanel,
    RealTimeCollaborationPanel,
    TeamWorkspacesPanel,
    WorkflowsManager,
    WorkspaceViewsPanel,
} from './chatLazyPanels';

interface BuildChatFeatureOverlaySlotsParams extends Pick<
    ChatOverlaySlotsProps,
    | 'showABTesting'
    | 'setShowABTesting'
    | 'executeChatCompletion'
    | 'input'
    | 'history'
    | 'showPromptOptimization'
    | 'setShowPromptOptimization'
    | 'systemPrompt'
    | 'onApplyOptimizedPrompt'
    | 'showCalendarSchedule'
    | 'setShowCalendarSchedule'
    | 'showRecommendations'
    | 'setShowRecommendations'
    | 'sessionId'
    | 'handleLoadSession'
    | 'showWorkflows'
    | 'setShowWorkflows'
    | 'showAPIPlayground'
    | 'setShowAPIPlayground'
    | 'showDeveloperDocs'
    | 'setShowDeveloperDocs'
    | 'showPluginManager'
    | 'setShowPluginManager'
    | 'showCodeIntegration'
    | 'setShowCodeIntegration'
    | 'selectedCode'
    | 'setSelectedCode'
    | 'showWorkspaceViews'
    | 'setShowWorkspaceViews'
    | 'savedSessions'
    | 'showTutorial'
    | 'currentTutorial'
    | 'handleCompleteTutorial'
    | 'handleSkipTutorial'
    | 'showBCI'
    | 'setShowBCI'
    | 'showMultiModal'
    | 'setShowMultiModal'
    | 'onSendMultiModal'
    | 'showCollaboration'
    | 'setShowCollaboration'
    | 'showCloudSync'
    | 'setShowCloudSync'
    | 'showTeamWorkspaces'
    | 'setShowTeamWorkspaces'
    | 'availableModels'
    | 'showEnterpriseCompliance'
    | 'setShowEnterpriseCompliance'
    | 'showBlockchain'
    | 'setShowBlockchain'
    | 'showAIAgents'
    | 'setShowAIAgents'
    | 'showFederatedLearning'
    | 'setShowFederatedLearning'
> {
    currentSessionTitle: string;
}

export const buildChatFeatureOverlaySlots = ({
    showABTesting,
    setShowABTesting,
    executeChatCompletion,
    input,
    history,
    showPromptOptimization,
    setShowPromptOptimization,
    systemPrompt,
    onApplyOptimizedPrompt,
    showCalendarSchedule,
    setShowCalendarSchedule,
    showRecommendations,
    setShowRecommendations,
    sessionId,
    handleLoadSession,
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
    savedSessions,
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
    currentSessionTitle,
}: BuildChatFeatureOverlaySlotsParams): Omit<
    ChatOverlaySlots,
    | 'keyboardShortcutsModal'
    | 'requestResponseLog'
    | 'analyticsDashboard'
    | 'conversationTreeView'
    | 'exportDialog'
    | 'globalSearchDialog'
    | 'templateLibraryDialog'
    | 'performanceMonitor'
    | 'recoveryDialog'
> => ({
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
});
