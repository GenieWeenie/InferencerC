/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ChatMessage } from '../../../../shared/types';
import type { ContextUsage } from '../../../services/contextManagement';
import { ChatContextWindowPanel, ChatSummaryPanel } from '../ChatContextPanels';

const buildUsage = (overrides: Partial<ContextUsage> = {}): ContextUsage => ({
    inputTokens: 1200,
    reservedOutputTokens: 800,
    totalTokens: 2000,
    maxContextTokens: 4000,
    fillRatio: 0.5,
    warning: false,
    ...overrides,
});

describe('ChatContextPanels', () => {
    it('hides the context window panel when there is no history', () => {
        const { container } = render(
            <ChatContextWindowPanel
                hasHistory={false}
                contextUsage={buildUsage()}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders context usage stats when history exists', () => {
        render(
            <ChatContextWindowPanel
                hasHistory
                contextUsage={buildUsage()}
            />
        );

        expect(screen.getByText('Context Window')).toBeTruthy();
        expect(screen.getByText('50% • 2,000 / 4,000 tokens')).toBeTruthy();
    });

    it('shows warning guidance when context usage is high', () => {
        render(
            <ChatContextWindowPanel
                hasHistory
                contextUsage={buildUsage({
                    fillRatio: 0.91,
                    warning: true,
                    totalTokens: 4550,
                    maxContextTokens: 5000,
                })}
            />
        );

        expect(
            screen.getByText('Context is above 80%. Open Controls and use Context Optimizer to trim or auto-summarize.')
        ).toBeTruthy();
    });

    it('hides summary panel when the conversation is still short', () => {
        const shortHistory: ChatMessage[] = [
            { role: 'user', content: 'one' },
            { role: 'assistant', content: 'two' },
            { role: 'user', content: 'three' },
            { role: 'assistant', content: 'four' },
        ];

        const { container } = render(
            <ChatSummaryPanel
                history={shortHistory}
                sessionId="session-1"
                modelId="local"
            />
        );

        expect(container.firstChild).toBeNull();
    });
});
