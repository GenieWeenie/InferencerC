/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { usePrompts } from '../src/renderer/hooks/usePrompts';

describe('usePrompts mutation guards', () => {
    beforeEach(() => {
        localStorage.clear();
        Object.defineProperty(globalThis, 'crypto', {
            value: {
                randomUUID: jest.fn(() => 'uuid-test'),
            },
            configurable: true,
        });
    });

    it('sanitizes saved prompt inputs and blocks duplicates/invalid payloads', () => {
        localStorage.setItem('user_prompts', JSON.stringify([
            { id: 'a', alias: 'alpha', title: 'Alpha', content: 'Prompt A' },
        ]));

        const { result } = renderHook(() => usePrompts());

        act(() => {
            result.current.savePrompt('  /Beta  ', '  Beta Title  ', '  Beta Content  ');
        });
        expect(result.current.prompts.map((p) => p.alias)).toEqual(['alpha', 'Beta']);

        act(() => {
            result.current.savePrompt(' beta ', 'Duplicate', 'Should be ignored');
        });
        expect(result.current.prompts).toHaveLength(2);

        act(() => {
            result.current.savePrompt('   ', 'Bad', 'Bad');
        });
        expect(result.current.prompts).toHaveLength(2);

        const persisted = JSON.parse(localStorage.getItem('user_prompts') || '[]');
        expect(persisted).toHaveLength(2);
        expect(persisted[1]).toMatchObject({
            id: 'uuid-test',
            alias: 'Beta',
            title: 'Beta Title',
            content: 'Beta Content',
        });
    });

    it('sanitizes update/delete paths and skips no-op writes', () => {
        localStorage.setItem('user_prompts', JSON.stringify([
            { id: 'a', alias: 'alpha', title: 'Alpha', content: 'Prompt A' },
            { id: 'b', alias: 'beta', title: 'Beta', content: 'Prompt B' },
        ]));

        const { result } = renderHook(() => usePrompts());

        act(() => {
            result.current.updatePrompt('a', '  /gamma  ', '  New Title  ', '  New content  ');
        });
        expect(result.current.prompts.find((p) => p.id === 'a')).toMatchObject({
            alias: 'gamma',
            title: 'New Title',
            content: 'New content',
        });

        const beforeDuplicateUpdate = localStorage.getItem('user_prompts');
        act(() => {
            result.current.updatePrompt('a', ' beta ', 'Dup', 'Dup');
        });
        expect(localStorage.getItem('user_prompts')).toBe(beforeDuplicateUpdate);

        const beforeInvalidDelete = localStorage.getItem('user_prompts');
        act(() => {
            result.current.deletePrompt('missing');
        });
        expect(localStorage.getItem('user_prompts')).toBe(beforeInvalidDelete);

        act(() => {
            result.current.deletePrompt('b');
        });
        expect(result.current.prompts.map((p) => p.id)).toEqual(['a']);
    });
});
