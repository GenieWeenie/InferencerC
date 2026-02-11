import React from 'react';

export interface ChatOverlaySlots {
    keyboardShortcutsModal?: React.ReactNode;
    requestResponseLog?: React.ReactNode;
    analyticsDashboard?: React.ReactNode;
    conversationTreeView?: React.ReactNode;
    exportDialog?: React.ReactNode;
    globalSearchDialog?: React.ReactNode;
    templateLibraryDialog?: React.ReactNode;
    abTestingPanel?: React.ReactNode;
    promptOptimizationPanel?: React.ReactNode;
    calendarScheduleDialog?: React.ReactNode;
    recommendationsPanel?: React.ReactNode;
    workflowsManager?: React.ReactNode;
    apiPlayground?: React.ReactNode;
    developerDocs?: React.ReactNode;
    pluginManager?: React.ReactNode;
    codeIntegrationPanel?: React.ReactNode;
    workspaceViews?: React.ReactNode;
    interactiveTutorial?: React.ReactNode;
    bciPanel?: React.ReactNode;
    multiModalPanel?: React.ReactNode;
    collaborationPanel?: React.ReactNode;
    cloudSyncPanel?: React.ReactNode;
    teamWorkspacesPanel?: React.ReactNode;
    enterpriseCompliancePanel?: React.ReactNode;
    blockchainPanel?: React.ReactNode;
    aiAgentsPanel?: React.ReactNode;
    federatedLearningPanel?: React.ReactNode;
    performanceMonitor?: React.ReactNode;
    recoveryDialog?: React.ReactNode;
}

export const getOrderedChatOverlayNodes = (slots: ChatOverlaySlots): React.ReactNode[] => ([
    slots.keyboardShortcutsModal,
    slots.requestResponseLog,
    slots.analyticsDashboard,
    slots.conversationTreeView,
    slots.exportDialog,
    slots.globalSearchDialog,
    slots.templateLibraryDialog,
    slots.abTestingPanel,
    slots.promptOptimizationPanel,
    slots.calendarScheduleDialog,
    slots.recommendationsPanel,
    slots.workflowsManager,
    slots.apiPlayground,
    slots.developerDocs,
    slots.pluginManager,
    slots.codeIntegrationPanel,
    slots.workspaceViews,
    slots.interactiveTutorial,
    slots.bciPanel,
    slots.multiModalPanel,
    slots.collaborationPanel,
    slots.cloudSyncPanel,
    slots.teamWorkspacesPanel,
    slots.enterpriseCompliancePanel,
    slots.blockchainPanel,
    slots.aiAgentsPanel,
    slots.federatedLearningPanel,
    slots.performanceMonitor,
    slots.recoveryDialog,
]);

interface ChatOverlaysProps {
    slots: ChatOverlaySlots;
}

export const ChatOverlays: React.FC<ChatOverlaysProps> = React.memo(({ slots }) => (
    <>
        {getOrderedChatOverlayNodes(slots)}
    </>
), (prev, next) => prev.slots === next.slots);
