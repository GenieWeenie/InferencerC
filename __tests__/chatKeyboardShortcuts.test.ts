import {
  ChatShortcutAction,
  dispatchChatShortcutAction,
  isTypingShortcutTarget,
  resolveChatShortcutAction,
} from '../src/renderer/lib/chatKeyboardShortcuts';

const baseContext = {
  isTyping: false,
  branchingEnabled: true,
  allowClearChat: true,
  allowExportDialog: true,
};

const createEvent = (overrides: Partial<KeyboardEvent>): KeyboardEvent => ({
  key: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
} as KeyboardEvent);

describe('chatKeyboardShortcuts', () => {
  describe('resolveChatShortcutAction', () => {
    it('resolves ctrl+shift+/ to open shortcuts modal', () => {
      const action = resolveChatShortcutAction(
        createEvent({ key: '/', ctrlKey: true, shiftKey: true }),
        baseContext,
      );

      expect(action).toBe('openShortcutsModal');
    });

    it('ignores ctrl+n while typing in input context', () => {
      const action = resolveChatShortcutAction(
        createEvent({ key: 'n', ctrlKey: true }),
        { ...baseContext, isTyping: true },
      );

      expect(action).toBeNull();
    });

    it('gates clear/export shortcuts when unavailable', () => {
      const clearAction = resolveChatShortcutAction(
        createEvent({ key: 'l', ctrlKey: true }),
        { ...baseContext, allowClearChat: false },
      );
      const exportAction = resolveChatShortcutAction(
        createEvent({ key: 'E', ctrlKey: true, shiftKey: true }),
        { ...baseContext, allowExportDialog: false },
      );

      expect(clearAction).toBeNull();
      expect(exportAction).toBeNull();
    });

    it('only resolves branch navigation when branching is enabled', () => {
      const disabledAction = resolveChatShortcutAction(
        createEvent({ key: 'ArrowLeft', altKey: true }),
        { ...baseContext, branchingEnabled: false },
      );
      const enabledAction = resolveChatShortcutAction(
        createEvent({ key: 'ArrowRight', altKey: true }),
        baseContext,
      );

      expect(disabledAction).toBeNull();
      expect(enabledAction).toEqual({ type: 'navigateBranch', direction: 1 });
    });

    it('resolves escape regardless of typing state', () => {
      const action = resolveChatShortcutAction(
        createEvent({ key: 'Escape' }),
        { ...baseContext, isTyping: true },
      );

      expect(action).toBe('escape');
    });
  });

  describe('isTypingShortcutTarget', () => {
    it('detects input-like and contenteditable targets', () => {
      expect(isTypingShortcutTarget({ tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget)).toBe(true);
      expect(isTypingShortcutTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
      expect(isTypingShortcutTarget({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget)).toBe(false);
    });
  });

  describe('dispatchChatShortcutAction', () => {
    it('dispatches navigation payload actions', () => {
      const callLog: string[] = [];
      const dispatcher = {
        openShortcutsModal: () => callLog.push('openShortcutsModal'),
        newChat: () => callLog.push('newChat'),
        toggleHistory: () => callLog.push('toggleHistory'),
        clearChat: () => callLog.push('clearChat'),
        toggleSearch: () => callLog.push('toggleSearch'),
        copyLastResponse: () => callLog.push('copyLastResponse'),
        openExportDialog: () => callLog.push('openExportDialog'),
        openGlobalSearch: () => callLog.push('openGlobalSearch'),
        openRecommendations: () => callLog.push('openRecommendations'),
        toggleTreeView: () => callLog.push('toggleTreeView'),
        toggleBranching: () => callLog.push('toggleBranching'),
        navigateBranch: (direction: -1 | 1) => callLog.push(`navigateBranch:${direction}`),
        escape: () => callLog.push('escape'),
      };

      dispatchChatShortcutAction({ type: 'navigateBranch', direction: -1 }, dispatcher);
      dispatchChatShortcutAction('toggleSearch', dispatcher);

      expect(callLog).toEqual(['navigateBranch:-1', 'toggleSearch']);
    });

    it('supports string actions for all mapped handlers', () => {
      const events: ChatShortcutAction[] = [
        'openShortcutsModal',
        'newChat',
        'toggleHistory',
        'clearChat',
        'toggleSearch',
        'copyLastResponse',
        'openExportDialog',
        'openGlobalSearch',
        'openRecommendations',
        'toggleTreeView',
        'toggleBranching',
        'escape',
      ];
      const hits: string[] = [];
      const dispatcher = {
        openShortcutsModal: () => hits.push('openShortcutsModal'),
        newChat: () => hits.push('newChat'),
        toggleHistory: () => hits.push('toggleHistory'),
        clearChat: () => hits.push('clearChat'),
        toggleSearch: () => hits.push('toggleSearch'),
        copyLastResponse: () => hits.push('copyLastResponse'),
        openExportDialog: () => hits.push('openExportDialog'),
        openGlobalSearch: () => hits.push('openGlobalSearch'),
        openRecommendations: () => hits.push('openRecommendations'),
        toggleTreeView: () => hits.push('toggleTreeView'),
        toggleBranching: () => hits.push('toggleBranching'),
        navigateBranch: (_direction: -1 | 1) => hits.push('navigateBranch'),
        escape: () => hits.push('escape'),
      };

      events.forEach((event) => dispatchChatShortcutAction(event, dispatcher));

      expect(hits).toEqual(events);
    });
  });
});
