import React from 'react';
import {
  analyzeComposerInput,
  collectPastedImageFiles,
  describeDroppedFiles,
  resolveComposerKeyAction,
} from '../src/renderer/lib/chatComposerHandlers';
import {
  getOrderedChatOverlayNodes,
} from '../src/renderer/components/chat/ChatOverlays';
import {
  resolveChatSidebarPanel,
  type ChatSidebarPanels,
} from '../src/renderer/components/chat/ChatSidebar';

describe('chatComposerHandlers', () => {
  it('describes dropped files with deterministic kind mapping', () => {
    const files = [
      { type: 'image/png', name: 'hero.png' } as File,
      { type: 'text/plain', name: 'notes.txt' } as File,
      { type: 'application/pdf', name: 'report.pdf' } as File,
    ];

    expect(describeDroppedFiles(files)).toEqual([
      { file: files[0], kind: 'image' },
      { file: files[1], kind: 'text' },
      { file: files[2], kind: 'unsupported' },
    ]);
  });

  it('extracts pasted image files only', () => {
    const imageFile = { type: 'image/png', name: 'paste.png' } as File;
    const textFile = { type: 'text/plain', name: 'ignored.txt' } as File;

    const files = collectPastedImageFiles([
      { type: 'image/png', getAsFile: () => imageFile },
      { type: 'text/plain', getAsFile: () => textFile },
      { type: 'image/jpeg', getAsFile: () => null },
    ]);

    expect(files).toEqual([imageFile]);
  });

  it('analyzes composer input and returns slash + clamped height', () => {
    const result = analyzeComposerInput('hello /sum', 10, 999, 300);
    expect(result).toEqual({
      slashMatch: { query: 'sum', index: 7 },
      autoHeightPx: 300,
    });

    const noMatch = analyzeComposerInput('hello world', 5, 120, 300);
    expect(noMatch).toEqual({
      slashMatch: null,
      autoHeightPx: 120,
    });
  });

  it('resolves key actions deterministically for slash and send states', () => {
    expect(resolveComposerKeyAction({ key: 'ArrowUp', shiftKey: false, slashMenuOpen: true, filteredPromptCount: 2 })).toBe('navigate-up');
    expect(resolveComposerKeyAction({ key: 'ArrowDown', shiftKey: false, slashMenuOpen: true, filteredPromptCount: 1 })).toBe('navigate-down');
    expect(resolveComposerKeyAction({ key: 'Enter', shiftKey: false, slashMenuOpen: true, filteredPromptCount: 1 })).toBe('insert-prompt');
    expect(resolveComposerKeyAction({ key: 'Escape', shiftKey: false, slashMenuOpen: true, filteredPromptCount: 1 })).toBe('dismiss-slash');
    expect(resolveComposerKeyAction({ key: 'Enter', shiftKey: false, slashMenuOpen: false, filteredPromptCount: 0 })).toBe('send-message');
    expect(resolveComposerKeyAction({ key: 'Enter', shiftKey: true, slashMenuOpen: false, filteredPromptCount: 0 })).toBe('none');
  });
});

describe('chat overlay/sidebar mapping helpers', () => {
  it('keeps overlay slots in stable mount order', () => {
    const first = React.createElement('div', { key: 'a' }, 'a');
    const second = React.createElement('div', { key: 'b' }, 'b');
    const last = React.createElement('div', { key: 'z' }, 'z');

    const ordered = getOrderedChatOverlayNodes({
      keyboardShortcutsModal: first,
      analyticsDashboard: second,
      recoveryDialog: last,
    });

    expect(ordered[0]).toBe(first);
    expect(ordered[2]).toBe(second);
    expect(ordered[ordered.length - 1]).toBe(last);
  });

  it('routes sidebar tabs to the expected panel', () => {
    const panels: ChatSidebarPanels = {
      controls: 'controls-panel',
      prompts: 'prompts-panel',
      documents: 'documents-panel',
      inspector: 'inspector-panel',
    };

    expect(resolveChatSidebarPanel('controls', panels)).toBe('controls-panel');
    expect(resolveChatSidebarPanel('prompts', panels)).toBe('prompts-panel');
    expect(resolveChatSidebarPanel('documents', panels)).toBe('documents-panel');
    expect(resolveChatSidebarPanel('inspector', panels)).toBe('inspector-panel');
  });
});
