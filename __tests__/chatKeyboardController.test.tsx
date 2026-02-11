/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useChatKeyboardController } from '../src/renderer/hooks/useChatKeyboardController';

const createCallbacks = () => ({
    onOpenShortcutsModal: jest.fn(),
    onNewChat: jest.fn(),
    onToggleHistory: jest.fn(),
    onClearChat: jest.fn(),
    onToggleSearch: jest.fn(),
    onCopyLastResponse: jest.fn(),
    onOpenExportDialog: jest.fn(),
    onOpenGlobalSearch: jest.fn(),
    onOpenRecommendations: jest.fn(),
    onToggleTreeView: jest.fn(),
    onToggleBranching: jest.fn(),
    onNavigateBranch: jest.fn(),
    onCloseShortcutsModal: jest.fn(),
    onCancelEdit: jest.fn(),
    onStopGeneration: jest.fn(),
});

describe('useChatKeyboardController', () => {
    it('dispatches Ctrl+F to toggle search', () => {
        const callbacks = createCallbacks();
        renderHook(() => useChatKeyboardController({
            historyLength: 2,
            branchingEnabled: false,
            showShortcutsModal: false,
            editingMessageIndex: null,
            ...callbacks,
        }));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
        });

        expect(callbacks.onToggleSearch).toHaveBeenCalledTimes(1);
    });

    it('routes Escape to cancel edit when editing is active', () => {
        const callbacks = createCallbacks();

        const { rerender } = renderHook((props: { editingMessageIndex: number | null }) => useChatKeyboardController({
            historyLength: 2,
            branchingEnabled: false,
            showShortcutsModal: false,
            editingMessageIndex: props.editingMessageIndex,
            ...callbacks,
        }), {
            initialProps: { editingMessageIndex: null },
        });

        rerender({ editingMessageIndex: 1 });

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(callbacks.onCancelEdit).toHaveBeenCalledTimes(1);
    });
});
