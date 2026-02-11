/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatComposerControlBar } from '../src/renderer/hooks/useChatComposerControlBar';

const createSetStateMock = <T,>() =>
    (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<T>>;

const createParams = (overrides: Record<string, unknown> = {}) => ({
    prefill: null,
    showUrlInput: false,
    githubConfigured: true,
    showGithubInput: false,
    hasProjectContext: false,
    thinkingEnabled: false,
    setThinkingEnabled: createSetStateMock<boolean>(),
    battleMode: false,
    setBattleMode: createSetStateMock<boolean>(),
    showInspector: false,
    setShowInspector: createSetStateMock<boolean>(),
    expertMode: null,
    setShowExpertMenu: createSetStateMock<boolean>(),
    showVariableMenu: false,
    setShowVariableMenu: createSetStateMock<boolean>(),
    jsonMode: false,
    setJsonMode: createSetStateMock<boolean>(),
    streamingEnabled: true,
    setStreamingEnabled: createSetStateMock<boolean>(),
    historyLength: 0,
    sidebarOpen: false,
    setSidebarOpen: createSetStateMock<boolean>(),
    setShowAnalytics: createSetStateMock<boolean>(),
    setShowRecommendations: createSetStateMock<boolean>(),
    setInput: createSetStateMock<string>(),
    setActiveTab: createSetStateMock<'inspector' | 'controls' | 'prompts' | 'documents'>(),
    setIsEditingSystemPrompt: createSetStateMock<boolean>(),
    setSystemPrompt: jest.fn(),
    secondaryModel: '',
    modelOptionItems: [
        { id: 'm1', label: 'Model One' },
        { id: 'm2', label: 'Model Two' },
    ],
    currentModel: 'm1',
    setSecondaryModel: createSetStateMock<string>(),
    setAutoRouting: createSetStateMock<boolean>(),
    setEnabledTools: createSetStateMock<Set<string>>(),
    setResponseFormat: createSetStateMock<'text' | 'json_object'>(),
    setAutoSummarizeContext: createSetStateMock<boolean>(),
    applyTrimSuggestions: jest.fn(),
    includeAllContext: jest.fn(),
    excludeTrimSuggestion: jest.fn(),
    setBatchSize: createSetStateMock<number>(),
    setTemperature: createSetStateMock<number>(),
    setTopP: createSetStateMock<number>(),
    setMaxTokens: createSetStateMock<number>(),
    modelNameById: new Map([
        ['m1', 'Model One'],
        ['m2', 'Model Two'],
    ]),
    currentModelContextLength: 8192,
    modelName: 'Model One',
    sessionId: 'session-1',
    sessionTitle: 'Session 1',
    handleTogglePrefill: jest.fn(),
    handleToggleUrlInput: jest.fn(),
    handleToggleGithubInput: jest.fn(),
    handleProjectContextControlClick: jest.fn(),
    ...overrides,
});

describe('useChatComposerControlBar', () => {
    it('builds control pill actions and hides recommendations when no history', () => {
        const { result } = renderHook(() => useChatComposerControlBar(createParams()));
        const keys = result.current.composerControlPillActions.map((action) => action.key);

        expect(keys).toContain('control-response');
        expect(keys).toContain('tools');
        expect(keys).toContain('project');
        expect(keys).toContain('stream');
        expect(keys).not.toContain('recommendations');
    });

    it('wires pill actions to provided handlers', () => {
        const params = createParams({ historyLength: 3 });
        const { result } = renderHook(() => useChatComposerControlBar(params));

        const toolsAction = result.current.composerControlPillActions.find((action) => action.key === 'tools');
        expect(toolsAction).toBeTruthy();

        act(() => {
            toolsAction!.onClick();
        });

        expect(params.handleToggleUrlInput).toHaveBeenCalledTimes(1);
        expect(result.current.composerControlPillActions.map((action) => action.key)).toContain('recommendations');
    });

    it('derives secondary model label and slider config', () => {
        const { result } = renderHook(() => useChatComposerControlBar(createParams({ secondaryModel: 'm2' })));

        expect(result.current.secondaryModelDisplayName).toBe('Model Two');
        expect(result.current.maxTokensSliderConfig.sliderMax).toBeGreaterThan(0);
        expect(result.current.maxTokensSliderConfig.sliderStep).toBeGreaterThan(0);
    });
});
