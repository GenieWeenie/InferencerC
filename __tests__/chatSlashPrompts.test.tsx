/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatSlashPrompts } from '../src/renderer/hooks/useChatSlashPrompts';

describe('useChatSlashPrompts', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('filters prompt aliases by slash query and inserts selected prompt', () => {
        const setInput = (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>;

        const { result } = renderHook(() => useChatSlashPrompts({
            prompts: [
                { id: '1', alias: 'greet', content: 'Hello there', category: 'General', title: 'Greet' },
                { id: '2', alias: 'summarize', content: 'Summarize this', category: 'General', title: 'Summarize' },
            ],
            input: '/gr',
            setInput,
        }));

        const focus = jest.fn();
        act(() => {
            result.current.setSlashMatch({ query: 'gr', index: 0 });
            (result.current.textareaRef as React.MutableRefObject<any>).current = {
                selectionEnd: 3,
                focus,
            };
        });

        expect(result.current.filteredPrompts).toHaveLength(1);
        expect(result.current.filteredPrompts[0].alias).toBe('greet');

        act(() => {
            result.current.insertPrompt(result.current.filteredPrompts[0]);
            jest.runAllTimers();
        });

        expect(setInput).toHaveBeenCalled();
        expect(focus).toHaveBeenCalled();
    });
});
