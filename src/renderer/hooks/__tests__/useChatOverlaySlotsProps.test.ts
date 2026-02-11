import React from 'react';
import { buildChatOverlaySlotsProps, type UseChatOverlaySlotsPropsParams } from '../useChatOverlaySlotsProps';
import type { ChatOverlaySlotsProps } from '../../components/chat/chatOverlayTypes';

const boolSetter = (() => undefined) as React.Dispatch<React.SetStateAction<boolean>>;
const stringSetter = (() => undefined) as React.Dispatch<React.SetStateAction<string>>;
const numberSetter = (() => undefined) as React.Dispatch<React.SetStateAction<number>>;
const nullableStringSetter = (() => undefined) as React.Dispatch<React.SetStateAction<string | null>>;

describe('buildChatOverlaySlotsProps', () => {
    it('maps tree state into ChatOverlaySlots props and preserves passthrough fields', () => {
        const treeManager = { id: 'tree-manager' } as unknown as ChatOverlaySlotsProps['treeManager'];
        const params: UseChatOverlaySlotsPropsParams = {
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
            treeState: {
                treeManager,
                currentPath: ['root', 'child'],
            },
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
            systemPrompt: 'You are helpful.',
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
        };

        const result = buildChatOverlaySlotsProps(params);

        expect(result.treeManager).toBe(treeManager);
        expect(result.currentPath).toEqual(['root', 'child']);
        expect(result.sessionId).toBe('session-1');
        expect(result.systemPrompt).toBe('You are helpful.');
    });
});
