import React from 'react';
import {
    dispatchChatShortcutAction,
    isTypingShortcutTarget,
    resolveChatShortcutAction,
} from '../lib/chatKeyboardShortcuts';

interface UseChatKeyboardControllerParams {
    historyLength: number;
    branchingEnabled: boolean;
    showShortcutsModal: boolean;
    editingMessageIndex: number | null;
    onOpenShortcutsModal: () => void;
    onNewChat: () => void;
    onToggleHistory: () => void;
    onClearChat: () => void;
    onToggleSearch: () => void;
    onCopyLastResponse: () => void;
    onOpenExportDialog: () => void;
    onOpenGlobalSearch: () => void;
    onOpenRecommendations: () => void;
    onToggleTreeView: () => void;
    onToggleBranching: () => void;
    onNavigateBranch: (direction: -1 | 1) => void;
    onCloseShortcutsModal: () => void;
    onCancelEdit: () => void;
    onStopGeneration: () => void;
}

export const useChatKeyboardController = ({
    historyLength,
    branchingEnabled,
    showShortcutsModal,
    editingMessageIndex,
    onOpenShortcutsModal,
    onNewChat,
    onToggleHistory,
    onClearChat,
    onToggleSearch,
    onCopyLastResponse,
    onOpenExportDialog,
    onOpenGlobalSearch,
    onOpenRecommendations,
    onToggleTreeView,
    onToggleBranching,
    onNavigateBranch,
    onCloseShortcutsModal,
    onCancelEdit,
    onStopGeneration,
}: UseChatKeyboardControllerParams): void => {
    const handleShortcutEscape = React.useCallback(() => {
        if (showShortcutsModal) {
            onCloseShortcutsModal();
            return;
        }
        if (editingMessageIndex !== null) {
            onCancelEdit();
            return;
        }
        onStopGeneration();
    }, [showShortcutsModal, editingMessageIndex, onCloseShortcutsModal, onCancelEdit, onStopGeneration]);

    const shortcutStateRef = React.useRef({
        historyLength,
        branchingEnabled,
    });

    const shortcutDispatcherRef = React.useRef<
        (action: ReturnType<typeof resolveChatShortcutAction>) => void
    >(() => {});

    React.useEffect(() => {
        shortcutStateRef.current = {
            historyLength,
            branchingEnabled,
        };
    }, [historyLength, branchingEnabled]);

    React.useEffect(() => {
        shortcutDispatcherRef.current = (action) => {
            if (!action) {
                return;
            }

            dispatchChatShortcutAction(action, {
                openShortcutsModal: onOpenShortcutsModal,
                newChat: onNewChat,
                toggleHistory: onToggleHistory,
                clearChat: onClearChat,
                toggleSearch: onToggleSearch,
                copyLastResponse: onCopyLastResponse,
                openExportDialog: onOpenExportDialog,
                openGlobalSearch: onOpenGlobalSearch,
                openRecommendations: onOpenRecommendations,
                toggleTreeView: onToggleTreeView,
                toggleBranching: onToggleBranching,
                navigateBranch: onNavigateBranch,
                escape: handleShortcutEscape,
            });
        };
    }, [
        onOpenShortcutsModal,
        onNewChat,
        onToggleHistory,
        onClearChat,
        onToggleSearch,
        onCopyLastResponse,
        onOpenExportDialog,
        onOpenGlobalSearch,
        onOpenRecommendations,
        onToggleTreeView,
        onToggleBranching,
        onNavigateBranch,
        handleShortcutEscape,
    ]);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const action = resolveChatShortcutAction(event, {
                isTyping: isTypingShortcutTarget(event.target),
                branchingEnabled: shortcutStateRef.current.branchingEnabled,
                allowClearChat: shortcutStateRef.current.historyLength > 0,
                allowExportDialog: shortcutStateRef.current.historyLength > 0,
            });

            if (!action) {
                return;
            }

            event.preventDefault();
            shortcutDispatcherRef.current(action);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
