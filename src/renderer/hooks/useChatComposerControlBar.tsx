import React from 'react';
import { toast } from 'sonner';
import type {
    ComposerControlPillActionConfig,
    ComposerVariableContext,
    SidebarTab,
} from '../components/chat/ChatInlinePanels';
import {
    buildComposerControlPillDescriptors,
    getMaxTokensSliderConfig,
    toggleToolNameInSet,
    type ComposerControlPillKey,
    type ComposerControlPillDescriptor,
} from '../lib/chatUiModels';
import { resolveComposerControlPillPresentation } from '../lib/chatComposerControlPillStyles';

interface ModelOptionItem {
    id: string;
    label: string;
}

interface UseChatComposerControlBarParams {
    prefill: string | null;
    showUrlInput: boolean;
    githubConfigured: boolean;
    showGithubInput: boolean;
    hasProjectContext: boolean;
    thinkingEnabled: boolean;
    setThinkingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    battleMode: boolean;
    setBattleMode: React.Dispatch<React.SetStateAction<boolean>>;
    showInspector: boolean;
    setShowInspector: React.Dispatch<React.SetStateAction<boolean>>;
    expertMode: string | null;
    setShowExpertMenu: React.Dispatch<React.SetStateAction<boolean>>;
    showVariableMenu: boolean;
    setShowVariableMenu: React.Dispatch<React.SetStateAction<boolean>>;
    jsonMode: boolean;
    setJsonMode: React.Dispatch<React.SetStateAction<boolean>>;
    streamingEnabled: boolean;
    setStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    historyLength: number;
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
    setShowRecommendations: React.Dispatch<React.SetStateAction<boolean>>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    setActiveTab: React.Dispatch<React.SetStateAction<SidebarTab>>;
    setIsEditingSystemPrompt: React.Dispatch<React.SetStateAction<boolean>>;
    setSystemPrompt: (value: string) => void;
    secondaryModel: string;
    modelOptionItems: ModelOptionItem[];
    currentModel: string;
    setSecondaryModel: React.Dispatch<React.SetStateAction<string>>;
    setAutoRouting: React.Dispatch<React.SetStateAction<boolean>>;
    setEnabledTools: React.Dispatch<React.SetStateAction<Set<string>>>;
    setResponseFormat: React.Dispatch<React.SetStateAction<'text' | 'json_object'>>;
    setAutoSummarizeContext: React.Dispatch<React.SetStateAction<boolean>>;
    applyTrimSuggestions: (count?: number) => void;
    includeAllContext: () => void;
    excludeTrimSuggestion: (messageIndex: number) => void;
    setBatchSize: React.Dispatch<React.SetStateAction<number>>;
    setTemperature: React.Dispatch<React.SetStateAction<number>>;
    setTopP: React.Dispatch<React.SetStateAction<number>>;
    setMaxTokens: React.Dispatch<React.SetStateAction<number>>;
    modelNameById: Map<string, string>;
    currentModelContextLength?: number;
    modelName: string;
    sessionId: string;
    sessionTitle: string;
    handleTogglePrefill: () => void;
    handleToggleUrlInput: () => void;
    handleToggleGithubInput: () => void;
    handleProjectContextControlClick: () => void;
}

export const useChatComposerControlBar = ({
    prefill,
    showUrlInput,
    githubConfigured,
    showGithubInput,
    hasProjectContext,
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
    historyLength,
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
    currentModelContextLength,
    modelName,
    sessionId,
    sessionTitle,
    handleTogglePrefill,
    handleToggleUrlInput,
    handleToggleGithubInput,
    handleProjectContextControlClick,
}: UseChatComposerControlBarParams) => {
    const handleToggleThinking = React.useCallback(() => {
        setThinkingEnabled((prev) => !prev);
    }, [setThinkingEnabled]);

    const handleToggleBattleMode = React.useCallback(() => {
        setBattleMode((prev) => !prev);
    }, [setBattleMode]);

    const handleToggleInspector = React.useCallback(() => {
        setShowInspector((prev) => !prev);
    }, [setShowInspector]);

    const handleToggleExpertMenu = React.useCallback(() => {
        setShowExpertMenu((prev) => !prev);
    }, [setShowExpertMenu]);

    const handleToggleVariableMenu = React.useCallback(() => {
        setShowVariableMenu((prev) => !prev);
    }, [setShowVariableMenu]);

    const handleToggleJsonMode = React.useCallback(() => {
        setJsonMode((prev) => {
            const next = !prev;
            toast.success(next ? 'JSON mode enabled' : 'JSON mode disabled');
            return next;
        });
    }, [setJsonMode]);

    const handleToggleStreamingMode = React.useCallback(() => {
        setStreamingEnabled((prev) => {
            const next = !prev;
            toast.success(next ? 'Streaming enabled' : 'Streaming disabled');
            return next;
        });
    }, [setStreamingEnabled]);

    const handleOpenAnalyticsPanel = React.useCallback(() => {
        setShowAnalytics(true);
    }, [setShowAnalytics]);

    const handleOpenRecommendationsPanel = React.useCallback(() => {
        setShowRecommendations(true);
    }, [setShowRecommendations]);

    const handleToggleSidebar = React.useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, [setSidebarOpen]);

    const handleCloseVariableMenu = React.useCallback(() => {
        setShowVariableMenu(false);
    }, [setShowVariableMenu]);

    const handleInsertVariable = React.useCallback((variable: string) => {
        setInput((prev) => prev + variable);
        setShowVariableMenu(false);
    }, [setInput, setShowVariableMenu]);

    const handleCloseSidebar = React.useCallback(() => {
        setSidebarOpen(false);
    }, [setSidebarOpen]);

    const handleSelectInspectorTab = React.useCallback(() => {
        setActiveTab('inspector');
    }, [setActiveTab]);

    const handleSelectControlsTab = React.useCallback(() => {
        setActiveTab('controls');
    }, [setActiveTab]);

    const handleSelectPromptsTab = React.useCallback(() => {
        setActiveTab('prompts');
    }, [setActiveTab]);

    const handleSelectDocumentsTab = React.useCallback(() => {
        setActiveTab('documents');
    }, [setActiveTab]);

    const handleStartEditingSystemPrompt = React.useCallback(() => {
        setIsEditingSystemPrompt(true);
    }, [setIsEditingSystemPrompt]);

    const handleStopEditingSystemPrompt = React.useCallback(() => {
        setIsEditingSystemPrompt(false);
    }, [setIsEditingSystemPrompt]);

    const handleSystemPromptChange = React.useCallback((value: string) => {
        setSystemPrompt(value);
    }, [setSystemPrompt]);

    const handleToggleBattleModeWithSecondaryFallback = React.useCallback(() => {
        const next = !battleMode;
        setBattleMode(next);
        if (next && !secondaryModel && modelOptionItems.length > 1) {
            setSecondaryModel(modelOptionItems.find((model) => model.id !== currentModel)?.id || '');
        }
    }, [battleMode, secondaryModel, modelOptionItems, currentModel, setBattleMode, setSecondaryModel]);

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
    }, [setAutoSummarizeContext]);

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
        () => getMaxTokensSliderConfig(currentModelContextLength),
        [currentModelContextLength]
    );

    const composerControlDescriptors = React.useMemo<ComposerControlPillDescriptor[]>(() => buildComposerControlPillDescriptors({
        prefillEnabled: prefill !== null,
        showUrlInput,
        githubConfigured,
        showGithubInput,
        hasProjectContext,
        thinkingEnabled,
        battleMode,
        showInspector,
        expertMode,
        showVariableMenu,
        jsonMode,
        streamingEnabled,
        hasHistory: historyLength > 0,
        sidebarOpen,
    }), [
        prefill,
        showUrlInput,
        githubConfigured,
        showGithubInput,
        hasProjectContext,
        thinkingEnabled,
        battleMode,
        showInspector,
        expertMode,
        showVariableMenu,
        jsonMode,
        streamingEnabled,
        historyLength,
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
        return composerControlDescriptors
            .filter((descriptor) => descriptor.visible)
            .map((descriptor) => {
                const presentation = resolveComposerControlPillPresentation(descriptor);
                return {
                    key: descriptor.key,
                    label: descriptor.label,
                    onClick: controlPillActionHandlers[descriptor.key],
                    icon: presentation.icon,
                    className: presentation.className,
                    title: presentation.title,
                };
            });
    }, [composerControlDescriptors, controlPillActionHandlers]);

    const composerVariableContext = React.useMemo<ComposerVariableContext>(() => ({
        modelId: currentModel,
        modelName,
        sessionId,
        sessionTitle,
        messageCount: historyLength,
    }), [currentModel, modelName, sessionId, sessionTitle, historyLength]);

    return {
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
    };
};
