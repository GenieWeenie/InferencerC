import React from 'react';
import { toast } from 'sonner';

interface UseChatPanelsStateParams {
    historyLength: number;
}

export const useChatPanelsState = ({ historyLength }: UseChatPanelsStateParams) => {
    const [showSearch, setShowSearch] = React.useState(false);
    const [showSearchResultsList, setShowSearchResultsList] = React.useState(false);
    const [showInspector, setShowInspector] = React.useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = React.useState(false);
    const [showAnalytics, setShowAnalytics] = React.useState(false);
    const [showGithubInput, setShowGithubInput] = React.useState(false);
    const [showTreeView, setShowTreeView] = React.useState(false);
    const [branchingEnabled, setBranchingEnabled] = React.useState(false);
    const [showExportDialog, setShowExportDialog] = React.useState(false);
    const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);
    const [showABTesting, setShowABTesting] = React.useState(false);
    const [showPromptOptimization, setShowPromptOptimization] = React.useState(false);
    const [showCalendarSchedule, setShowCalendarSchedule] = React.useState(false);
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
    const [showBCI, setShowBCI] = React.useState(false);
    const [showMultiModal, setShowMultiModal] = React.useState(false);
    const [showCollaboration, setShowCollaboration] = React.useState(false);
    const [showCloudSync, setShowCloudSync] = React.useState(false);
    const [showTeamWorkspaces, setShowTeamWorkspaces] = React.useState(false);
    const [showEnterpriseCompliance, setShowEnterpriseCompliance] = React.useState(false);
    const [showBlockchain, setShowBlockchain] = React.useState(false);
    const [showAIAgents, setShowAIAgents] = React.useState(false);
    const [showFederatedLearning, setShowFederatedLearning] = React.useState(false);
    const [showTemplateLibrary, setShowTemplateLibrary] = React.useState(false);
    const [showVariableMenu, setShowVariableMenu] = React.useState(false);

    const handleToggleTreeView = React.useCallback(() => {
        setShowTreeView((previous) => !previous);
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

    const handleOpenExportDialogShortcut = React.useCallback(() => {
        if (historyLength > 0) {
            setShowExportDialog(true);
            return;
        }
        toast.info('No messages to export');
    }, [historyLength]);

    return {
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
    };
};
