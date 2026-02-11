/**
 * @jest-environment jsdom
 */
import React from 'react';
import { buildChatCoreOverlaySlots } from '../ChatCoreOverlays';
import { buildChatFeatureOverlaySlots } from '../ChatFeatureOverlays';
import type { ChatOverlaySlotsProps } from '../chatOverlayTypes';

const boolSetter = (() => undefined) as React.Dispatch<React.SetStateAction<boolean>>;
const stringSetter = (() => undefined) as React.Dispatch<React.SetStateAction<string>>;
const numberSetter = (() => undefined) as React.Dispatch<React.SetStateAction<number>>;
const nullableStringSetter = (() => undefined) as React.Dispatch<React.SetStateAction<string | null>>;

const createBaseProps = (): ChatOverlaySlotsProps => ({
    showShortcutsModal: false,
    setShowShortcutsModal: boolSetter,
    showRequestLog: false,
    setShowRequestLog: boolSetter,
    apiLogs: [],
    clearApiLogs: jest.fn(),
    showAnalytics: false,
    setShowAnalytics: boolSetter,
    usageStats: [],
    branchingEnabled: false,
    showTreeView: false,
    setShowTreeView: boolSetter,
    treeManager: null,
    currentPath: ['root'],
    showExportDialog: false,
    setShowExportDialog: boolSetter,
    history: [],
    savedSessions: [],
    sessionId: 'session-1',
    showGlobalSearch: false,
    setShowGlobalSearch: boolSetter,
    handleLoadSession: jest.fn(),
    onJumpToSearchMessage: jest.fn(),
    showTemplateLibrary: false,
    setShowTemplateLibrary: boolSetter,
    createNewSession: jest.fn(),
    setSystemPrompt: stringSetter,
    setTemperature: numberSetter,
    setTopP: numberSetter,
    setMaxTokens: numberSetter,
    setExpertMode: nullableStringSetter,
    setThinkingEnabled: boolSetter,
    replaceHistory: jest.fn(),
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    expertMode: null,
    thinkingEnabled: false,
    showABTesting: false,
    setShowABTesting: boolSetter,
    executeChatCompletion: jest.fn(async () => ({ content: 'ok' })),
    input: '',
    showPromptOptimization: false,
    setShowPromptOptimization: boolSetter,
    showCalendarSchedule: false,
    setShowCalendarSchedule: boolSetter,
    showRecommendations: false,
    setShowRecommendations: boolSetter,
    showWorkflows: false,
    setShowWorkflows: boolSetter,
    showAPIPlayground: false,
    setShowAPIPlayground: boolSetter,
    showDeveloperDocs: false,
    setShowDeveloperDocs: boolSetter,
    showPluginManager: false,
    setShowPluginManager: boolSetter,
    showCodeIntegration: false,
    setShowCodeIntegration: boolSetter,
    selectedCode: null,
    setSelectedCode: (() => undefined) as React.Dispatch<React.SetStateAction<{ code: string; language?: string } | null>>,
    showWorkspaceViews: false,
    setShowWorkspaceViews: boolSetter,
    showTutorial: false,
    currentTutorial: null,
    handleCompleteTutorial: jest.fn(),
    handleSkipTutorial: jest.fn(),
    showBCI: false,
    setShowBCI: boolSetter,
    showMultiModal: false,
    setShowMultiModal: boolSetter,
    onSendMultiModal: jest.fn(async () => undefined),
    showCollaboration: false,
    setShowCollaboration: boolSetter,
    showCloudSync: false,
    setShowCloudSync: boolSetter,
    showTeamWorkspaces: false,
    setShowTeamWorkspaces: boolSetter,
    availableModels: [],
    showEnterpriseCompliance: false,
    setShowEnterpriseCompliance: boolSetter,
    showBlockchain: false,
    setShowBlockchain: boolSetter,
    showAIAgents: false,
    setShowAIAgents: boolSetter,
    showFederatedLearning: false,
    setShowFederatedLearning: boolSetter,
    devMonitorsEnabled: false,
    showRecoveryDialog: false,
    setShowRecoveryDialog: boolSetter,
    handleRestoreSession: jest.fn(),
    handleDismissRecovery: jest.fn(),
    recoveryState: null,
    onApplyOptimizedPrompt: jest.fn(),
});

describe('chat overlay slot builders', () => {
    it('produces core overlays only when related flags are enabled', () => {
        const base = createBaseProps();
        const slotsDisabled = buildChatCoreOverlaySlots({
            ...base,
            currentSessionTitle: 'Conversation',
        });

        expect(slotsDisabled.keyboardShortcutsModal).toBeNull();
        expect(slotsDisabled.requestResponseLog).toBeNull();

        const slotsEnabled = buildChatCoreOverlaySlots({
            ...base,
            showShortcutsModal: true,
            showRequestLog: true,
            currentSessionTitle: 'Conversation',
        });

        expect(slotsEnabled.keyboardShortcutsModal).not.toBeNull();
        expect(slotsEnabled.requestResponseLog).not.toBeNull();
    });

    it('produces feature overlays only when related flags are enabled', () => {
        const base = createBaseProps();

        const slotsDisabled = buildChatFeatureOverlaySlots({
            ...base,
            currentSessionTitle: 'Conversation',
        });
        expect(slotsDisabled.abTestingPanel).toBeNull();
        expect(slotsDisabled.workflowsManager).toBeNull();

        const slotsEnabled = buildChatFeatureOverlaySlots({
            ...base,
            showABTesting: true,
            showWorkflows: true,
            currentSessionTitle: 'Conversation',
        });

        expect(slotsEnabled.abTestingPanel).not.toBeNull();
        expect(slotsEnabled.workflowsManager).not.toBeNull();
    });
});
