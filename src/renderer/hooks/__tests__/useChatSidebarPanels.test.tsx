/**
 * @jest-environment jsdom
 */
import React from 'react';
import { buildChatSidebarPanels } from '../useChatSidebarPanels';
import { resolveChatSidebarPanel } from '../../components/chat/ChatSidebar';

describe('buildChatSidebarPanels', () => {
    it('creates all sidebar panel slots and lazy fallbacks', () => {
        const panels = buildChatSidebarPanels({
            controlsTabPanelProps: {
                systemPrompt: 'You are helpful.',
                isEditingSystemPrompt: false,
                onStartEditingSystemPrompt: jest.fn(),
                onStopEditingSystemPrompt: jest.fn(),
                onSystemPromptChange: jest.fn(),
                battleMode: false,
                onToggleBattleMode: jest.fn(),
                secondaryModel: '',
                secondaryModelDisplayName: 'Select...',
                nonCurrentModelOptionElements: [],
                onSecondaryModelChange: jest.fn(),
                thinkingEnabled: false,
                onToggleThinkingEnabled: jest.fn(),
                autoRouting: false,
                onToggleAutoRouting: jest.fn(),
                enabledTools: new Set<string>(),
                onToggleTool: jest.fn(),
                jsonModeEnabled: false,
                onToggleJsonMode: jest.fn(),
                contextUsage: {
                    inputTokens: 100,
                    reservedOutputTokens: 100,
                    totalTokens: 200,
                    maxContextTokens: 2000,
                    fillRatio: 0.1,
                    warning: false,
                },
                autoSummarizeContext: false,
                onToggleAutoSummarizeContext: jest.fn(),
                onApplySuggestedTrim: jest.fn(),
                onIncludeAllContext: jest.fn(),
                trimSuggestionRows: [],
                onExcludeTrimSuggestion: jest.fn(),
                recentContextRows: [],
                onToggleContextMessage: jest.fn(),
                batchSize: 1,
                onBatchSizeChange: jest.fn(),
                temperature: 0.7,
                onTemperatureChange: jest.fn(),
                topP: 0.9,
                onTopPChange: jest.fn(),
                maxTokens: 2048,
                onMaxTokensChange: jest.fn(),
                maxTokenSliderMax: 8192,
                maxTokenSliderStep: 128,
                modelContextLength: 8192,
            },
            selectedToken: null,
            onUpdateToken: jest.fn(),
        });

        expect(panels.controls).toBeTruthy();
        expect(panels.prompts).toBeTruthy();
        expect(panels.documents).toBeTruthy();
        expect(panels.inspector).toBeTruthy();

        expect(resolveChatSidebarPanel('prompts', panels)).toBeTruthy();
        expect(resolveChatSidebarPanel('documents', panels)).toBeTruthy();
    });
});
