export type ChatShortcutAction =
    | 'openShortcutsModal'
    | 'newChat'
    | 'toggleHistory'
    | 'clearChat'
    | 'toggleSearch'
    | 'copyLastResponse'
    | 'openExportDialog'
    | 'openGlobalSearch'
    | 'openRecommendations'
    | 'toggleTreeView'
    | 'toggleBranching'
    | 'escape'
    | { type: 'navigateBranch'; direction: -1 | 1 };

export interface ResolveChatShortcutContext {
    isTyping: boolean;
    branchingEnabled: boolean;
    allowClearChat: boolean;
    allowExportDialog: boolean;
}

const normalizeKey = (key: string): string => {
    if (key === ' ') return 'space';
    if (key.length === 1) return key.toLowerCase();
    return key;
};

const hasCommandModifier = (event: KeyboardEvent): boolean => event.metaKey || event.ctrlKey;

export const isTypingShortcutTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName;
    return tagName === 'TEXTAREA' || tagName === 'INPUT';
};

export const resolveChatShortcutAction = (
    event: KeyboardEvent,
    context: ResolveChatShortcutContext
): ChatShortcutAction | null => {
    const key = normalizeKey(event.key);

    if (hasCommandModifier(event) && event.shiftKey && (key === '?' || key === '/')) {
        return 'openShortcutsModal';
    }

    if (hasCommandModifier(event) && key === 'n' && !context.isTyping) {
        return 'newChat';
    }

    if (hasCommandModifier(event) && key === 'k' && !context.isTyping) {
        return 'newChat';
    }

    if (hasCommandModifier(event) && key === '/' && !event.shiftKey) {
        return 'toggleHistory';
    }

    if (hasCommandModifier(event) && key === 'l' && !context.isTyping) {
        return context.allowClearChat ? 'clearChat' : null;
    }

    if (hasCommandModifier(event) && key === 'f' && !event.shiftKey) {
        return 'toggleSearch';
    }

    if (hasCommandModifier(event) && event.shiftKey && key === 'c' && !context.isTyping) {
        return 'copyLastResponse';
    }

    if (hasCommandModifier(event) && event.shiftKey && key === 'e' && !context.isTyping) {
        return context.allowExportDialog ? 'openExportDialog' : null;
    }

    if (hasCommandModifier(event) && event.shiftKey && key === 'f') {
        return 'openGlobalSearch';
    }

    if (hasCommandModifier(event) && event.shiftKey && key === 'r') {
        return 'openRecommendations';
    }

    if (hasCommandModifier(event) && key === 't' && !context.isTyping) {
        return 'toggleTreeView';
    }

    if (hasCommandModifier(event) && key === 'b' && !context.isTyping) {
        return 'toggleBranching';
    }

    if (event.altKey && key === 'ArrowLeft' && context.branchingEnabled) {
        return { type: 'navigateBranch', direction: -1 };
    }

    if (event.altKey && key === 'ArrowRight' && context.branchingEnabled) {
        return { type: 'navigateBranch', direction: 1 };
    }

    if (key === 'Escape') {
        return 'escape';
    }

    return null;
};

export interface ChatShortcutDispatcher {
    openShortcutsModal: () => void;
    newChat: () => void;
    toggleHistory: () => void;
    clearChat: () => void;
    toggleSearch: () => void;
    copyLastResponse: () => void;
    openExportDialog: () => void;
    openGlobalSearch: () => void;
    openRecommendations: () => void;
    toggleTreeView: () => void;
    toggleBranching: () => void;
    navigateBranch: (direction: -1 | 1) => void;
    escape: () => void;
}

export const dispatchChatShortcutAction = (
    action: ChatShortcutAction,
    dispatcher: ChatShortcutDispatcher
): void => {
    if (typeof action === 'object' && action.type === 'navigateBranch') {
        dispatcher.navigateBranch(action.direction);
        return;
    }

    switch (action) {
        case 'openShortcutsModal':
            dispatcher.openShortcutsModal();
            break;
        case 'newChat':
            dispatcher.newChat();
            break;
        case 'toggleHistory':
            dispatcher.toggleHistory();
            break;
        case 'clearChat':
            dispatcher.clearChat();
            break;
        case 'toggleSearch':
            dispatcher.toggleSearch();
            break;
        case 'copyLastResponse':
            dispatcher.copyLastResponse();
            break;
        case 'openExportDialog':
            dispatcher.openExportDialog();
            break;
        case 'openGlobalSearch':
            dispatcher.openGlobalSearch();
            break;
        case 'openRecommendations':
            dispatcher.openRecommendations();
            break;
        case 'toggleTreeView':
            dispatcher.toggleTreeView();
            break;
        case 'toggleBranching':
            dispatcher.toggleBranching();
            break;
        case 'escape':
            dispatcher.escape();
            break;
        default:
            break;
    }
};
