import React from 'react';

export const PromptManager = React.lazy(() => import('../PromptManager'));
export const KeyboardShortcutsModal = React.lazy(() => import('../KeyboardShortcutsModal'));
export const RequestResponseLog = React.lazy(() => import('../RequestResponseLog'));
export const AnalyticsDashboard = React.lazy(() => import('../AnalyticsDashboard'));
export const SidebarHistory = React.lazy(() => import('../SidebarHistory'));
export const ConversationTreeView = React.lazy(() => import('../ConversationTreeView'));
export const ExportDialog = React.lazy(() => import('../ExportDialog'));
export const GlobalSearchDialog = React.lazy(() => import('../GlobalSearchDialog'));
export const ConversationSummaryPanel = React.lazy(() => import('../ConversationSummaryPanel'));
export const TemplateLibraryDialog = React.lazy(() => import('../TemplateLibraryDialog'));
export const RecoveryDialog = React.lazy(() => import('../RecoveryDialog'));
export const ChatEmptyState = React.lazy(() => import('../ChatEmptyState'));
export const ChatDiagnosticsPopover = React.lazy(() => import('../ChatDiagnosticsPopover'));
export const PerformanceMonitorOverlay = React.lazy(() =>
    import('../PerformanceMonitorOverlay').then((mod) => ({ default: mod.PerformanceMonitorOverlay }))
);
export const DocumentChatPanel = React.lazy(() =>
    import('../DocumentChatPanel').then((mod) => ({ default: mod.DocumentChatPanel }))
);
export const ABTestingPanel = React.lazy(() =>
    import('../ABTestingPanel').then((mod) => ({ default: mod.ABTestingPanel }))
);
export const PromptOptimizationPanel = React.lazy(() =>
    import('../PromptOptimizationPanel').then((mod) => ({ default: mod.PromptOptimizationPanel }))
);
export const CalendarScheduleDialog = React.lazy(() =>
    import('../CalendarScheduleDialog').then((mod) => ({ default: mod.CalendarScheduleDialog }))
);
export const ConversationRecommendationsPanel = React.lazy(() =>
    import('../ConversationRecommendationsPanel').then((mod) => ({ default: mod.ConversationRecommendationsPanel }))
);
export const WorkflowsManager = React.lazy(() =>
    import('../WorkflowsManager').then((mod) => ({ default: mod.WorkflowsManager }))
);
export const APIPlayground = React.lazy(() =>
    import('../APIPlayground').then((mod) => ({ default: mod.APIPlayground }))
);
export const DeveloperDocumentationPanel = React.lazy(() =>
    import('../DeveloperDocumentationPanel').then((mod) => ({ default: mod.DeveloperDocumentationPanel }))
);
export const PluginManager = React.lazy(() =>
    import('../PluginManager').then((mod) => ({ default: mod.PluginManager }))
);
export const CodeIntegrationPanel = React.lazy(() =>
    import('../CodeIntegrationPanel').then((mod) => ({ default: mod.CodeIntegrationPanel }))
);
export const WorkspaceViewsPanel = React.lazy(() =>
    import('../WorkspaceViewsPanel').then((mod) => ({ default: mod.WorkspaceViewsPanel }))
);
export const InteractiveTutorial = React.lazy(() =>
    import('../InteractiveTutorial').then((mod) => ({ default: mod.InteractiveTutorial }))
);
export const BCIPanel = React.lazy(() =>
    import('../BCIPanel').then((mod) => ({ default: mod.BCIPanel }))
);
export const MultiModalAIPanel = React.lazy(() =>
    import('../MultiModalAIPanel').then((mod) => ({ default: mod.MultiModalAIPanel }))
);
export const RealTimeCollaborationPanel = React.lazy(() =>
    import('../RealTimeCollaborationPanel').then((mod) => ({ default: mod.RealTimeCollaborationPanel }))
);
export const CloudSyncPanel = React.lazy(() =>
    import('../CloudSyncPanel').then((mod) => ({ default: mod.CloudSyncPanel }))
);
export const TeamWorkspacesPanel = React.lazy(() =>
    import('../TeamWorkspacesPanel').then((mod) => ({ default: mod.TeamWorkspacesPanel }))
);
export const EnterpriseCompliancePanel = React.lazy(() =>
    import('../EnterpriseCompliancePanel').then((mod) => ({ default: mod.EnterpriseCompliancePanel }))
);
export const BlockchainPanel = React.lazy(() =>
    import('../BlockchainPanel').then((mod) => ({ default: mod.BlockchainPanel }))
);
export const AIAgentsPanel = React.lazy(() =>
    import('../AIAgentsPanel').then((mod) => ({ default: mod.AIAgentsPanel }))
);
export const FederatedLearningPanel = React.lazy(() =>
    import('../FederatedLearningPanel').then((mod) => ({ default: mod.FederatedLearningPanel }))
);
