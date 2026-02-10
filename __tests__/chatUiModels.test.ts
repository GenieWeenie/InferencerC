import { getMessageActionCapabilities } from '../src/renderer/lib/chatMessageActions';
import {
  buildContextTrimSuggestionRows,
  buildComposerControlPillDescriptors,
  buildLongPressMenuActionItems,
  buildRecentContextMessageRows,
  getWrappedSearchResultIndex,
  getMaxTokensSliderConfig,
  toggleToolNameInSet,
} from '../src/renderer/lib/chatUiModels';

describe('chatUiModels', () => {
  it('builds long-press actions deterministically for user and assistant messages', () => {
    const userCapabilities = getMessageActionCapabilities({ role: 'user', isLoading: false });
    const assistantLoadingCapabilities = getMessageActionCapabilities({ role: 'assistant', isLoading: true });
    const assistantReadyCapabilities = getMessageActionCapabilities({ role: 'assistant', isLoading: false });

    expect(
      buildLongPressMenuActionItems(userCapabilities, false)
        .filter((item) => item.visible)
        .map((item) => item.action)
    ).toEqual(['copy', 'bookmark', 'edit', 'branch', 'delete']);

    expect(
      buildLongPressMenuActionItems(assistantLoadingCapabilities, false)
        .filter((item) => item.visible)
        .map((item) => item.action)
    ).toEqual(['copy', 'bookmark', 'branch', 'delete']);

    expect(
      buildLongPressMenuActionItems(assistantReadyCapabilities, true)
        .filter((item) => item.visible)
        .map((item) => item.action)
    ).toEqual(['copy', 'bookmark', 'regenerate', 'branch', 'delete']);

    expect(buildLongPressMenuActionItems(userCapabilities, true)[1].label).toBe('Remove bookmark');
    expect(buildLongPressMenuActionItems(userCapabilities, false)[1].label).toBe('Bookmark message');
  });

  it('wraps search result navigation indexes at boundaries', () => {
    expect(getWrappedSearchResultIndex(0, 3, 'previous')).toBe(2);
    expect(getWrappedSearchResultIndex(2, 3, 'previous')).toBe(1);
    expect(getWrappedSearchResultIndex(2, 3, 'next')).toBe(0);
    expect(getWrappedSearchResultIndex(0, 3, 'next')).toBe(1);
    expect(getWrappedSearchResultIndex(0, 0, 'next')).toBe(0);
    expect(getWrappedSearchResultIndex(0, -1, 'previous')).toBe(0);
  });

  it('maps composer control-pill descriptors in a stable order with expected visibility and labels', () => {
    const baseline = buildComposerControlPillDescriptors({
      prefillEnabled: false,
      showUrlInput: false,
      githubConfigured: true,
      showGithubInput: false,
      hasProjectContext: false,
      thinkingEnabled: false,
      battleMode: false,
      showInspector: false,
      expertMode: null,
      showVariableMenu: false,
      jsonMode: false,
      streamingEnabled: true,
      hasHistory: false,
      sidebarOpen: false,
    });

    expect(baseline.map((item) => item.key)).toEqual([
      'control-response',
      'tools',
      'github',
      'project',
      'thinking',
      'battle',
      'inspector',
      'expert-config',
      'variables',
      'json',
      'stream',
      'analytics',
      'recommendations',
      'controls',
    ]);
    expect(baseline.find((item) => item.key === 'project')?.label).toBe('Project');
    expect(baseline.find((item) => item.key === 'expert-config')?.label).toBe('Expert Config');
    expect(baseline.find((item) => item.key === 'recommendations')?.visible).toBe(false);

    const active = buildComposerControlPillDescriptors({
      prefillEnabled: true,
      showUrlInput: true,
      githubConfigured: false,
      showGithubInput: true,
      hasProjectContext: true,
      thinkingEnabled: true,
      battleMode: true,
      showInspector: true,
      expertMode: 'coding',
      showVariableMenu: true,
      jsonMode: true,
      streamingEnabled: false,
      hasHistory: true,
      sidebarOpen: true,
    });

    expect(active.find((item) => item.key === 'github')?.visible).toBe(false);
    expect(active.find((item) => item.key === 'project')?.label).toBe('Context');
    expect(active.find((item) => item.key === 'expert-config')?.label).toBe('Expert: coding');
    expect(active.find((item) => item.key === 'control-response')?.active).toBe(true);
    expect(active.find((item) => item.key === 'stream')?.active).toBe(false);
    expect(active.find((item) => item.key === 'recommendations')?.visible).toBe(true);
  });

  it('toggles tool names in a deterministic copy without mutating input set', () => {
    const initial = new Set(['web_fetch', 'calculator']);
    const removed = toggleToolNameInSet(initial, 'web_fetch');
    const added = toggleToolNameInSet(initial, 'rag_search');

    expect(Array.from(initial).sort()).toEqual(['calculator', 'web_fetch']);
    expect(Array.from(removed).sort()).toEqual(['calculator']);
    expect(Array.from(added).sort()).toEqual(['calculator', 'rag_search', 'web_fetch']);
  });

  it('builds trim rows and recent context rows with stable formatting and keys', () => {
    const trimRows = buildContextTrimSuggestionRows([
      { messageIndex: 1, role: 'assistant', estimatedTokenSavings: 250, preview: 'older response' },
      { messageIndex: 4, role: 'user', estimatedTokenSavings: 120, preview: 'large prompt' },
    ], 1);
    expect(trimRows).toEqual([
      {
        key: 'trim-1',
        messageIndex: 1,
        label: '#2 (assistant) • save ~250 tokens',
        preview: 'older response',
      },
    ]);

    const recentRows = buildRecentContextMessageRows(
      [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'bbb' },
        { role: 'user', content: 'cccc' },
      ],
      new Set([1]),
      (text) => text.length,
      2
    );

    expect(recentRows).toEqual([
      {
        key: 'ctx-1',
        index: 1,
        role: 'assistant',
        estimatedTokens: 3,
        included: false,
      },
      {
        key: 'ctx-2',
        index: 2,
        role: 'user',
        estimatedTokens: 4,
        included: true,
      },
    ]);
  });

  it('computes max-token slider bounds consistently for default and large models', () => {
    expect(getMaxTokensSliderConfig()).toEqual({
      maxContextLength: 32768,
      sliderMax: 31129,
      sliderStep: 100,
    });
    expect(getMaxTokensSliderConfig(8192)).toEqual({
      maxContextLength: 8192,
      sliderMax: 7782,
      sliderStep: 10,
    });
    expect(getMaxTokensSliderConfig(200000)).toEqual({
      maxContextLength: 200000,
      sliderMax: 190000,
      sliderStep: 100,
    });
  });
});
