/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatInspectorTabPanel } from '../ChatInspectorComposerPanels';

describe('ChatInspectorTabPanel', () => {
    it('submits token updates from the Update button', () => {
        const onUpdateToken = jest.fn();

        render(
            <ChatInspectorTabPanel
                selectedToken={{
                    messageIndex: 4,
                    tokenIndex: 2,
                    logprob: {
                        token: 'React',
                        logprob: -0.2,
                        top_logprobs: [
                            { token: 'React', logprob: -0.2 },
                            { token: 'Vue', logprob: -1.5 },
                        ],
                    },
                }}
                onUpdateToken={onUpdateToken}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Svelte' } });
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        expect(onUpdateToken).toHaveBeenCalledWith(4, 2, 'Svelte');
    });
});
