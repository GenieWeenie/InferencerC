import type { ChatMessage } from '../src/shared/types';
import {
  buildChatRowMetadata,
  buildSearchResultRows,
  createChatRowMetadataCacheState,
  EXPERIMENTAL_FEATURE_MENU_ITEMS,
  getCachedChatRowMetadata,
} from '../src/renderer/lib/chatRenderModels';

describe('chatRenderModels', () => {
  it('keeps experimental feature menu order deterministic', () => {
    expect(EXPERIMENTAL_FEATURE_MENU_ITEMS.map((item) => item.key)).toEqual([
      'bci',
      'multimodal',
      'collaboration',
      'cloudSync',
      'teamWorkspaces',
      'enterpriseCompliance',
      'blockchain',
      'aiAgents',
      'federatedLearning',
    ]);
  });

  it('builds row metadata with expected flags and edit/lazy state', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'world' },
      { role: 'assistant', content: 'third' },
    ];

    const selectedToken = { messageIndex: 1, tokenIndex: 0, logprob: { token: 'world', logprob: -1 } };
    const metadata = buildChatRowMetadata({
      history,
      editingMessageIndex: 1,
      searchResultSet: new Set([1, 2]),
      activeSearchMessageIndex: 2,
      comparisonIndex: 1,
      bookmarkedMessages: new Set([0]),
      selectedToken,
      messageRatings: { 2: 'up' },
      editedMessageContent: 'edited content',
      loadedMessageIndices: new Set([0, 1]),
    });

    expect(metadata).toHaveLength(3);
    expect(metadata[0].previousMessage).toBeNull();
    expect(metadata[0].nextMessage).toBe(history[1]);
    expect(metadata[0].isBookmarked).toBe(true);
    expect(metadata[0].isLazyLoaded).toBe(false);

    expect(metadata[1].isEditingRow).toBe(true);
    expect(metadata[1].editingContentForRow).toBe('edited content');
    expect(metadata[1].selectedTokenForMessage).toBe(selectedToken);
    expect(metadata[1].isShowingComparison).toBe(true);
    expect(metadata[1].isCurrentSearchResult).toBe(false);

    expect(metadata[2].isCurrentSearchResult).toBe(true);
    expect(metadata[2].isComparisonPartnerHidden).toBe(true);
    expect(metadata[2].messageRating).toBe('up');
    expect(metadata[2].isLazyLoaded).toBe(true);
  });

  it('reuses cached previews when content signature is unchanged', () => {
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'Alpha beta gamma delta' },
      { role: 'user', content: 'User prompt' },
    ];
    const signature = `assistant\u0000${history[0].content}`;
    const cachedPreview = {
      signature,
      preview: 'cached preview',
      roleLabel: 'Assistant',
      roleClass: 'text-emerald-400',
    };
    const cache = new Map<number, typeof cachedPreview>([[0, cachedPreview]]);

    const { rows, nextPreviewCache } = buildSearchResultRows({
      searchResults: [0, 1],
      history,
      previewCache: cache,
      maxPreviewLength: 8,
    });

    expect(rows).toEqual([
      {
        resultIndex: 0,
        messageIndex: 0,
        preview: 'cached preview',
        roleLabel: 'Assistant',
        roleClass: 'text-emerald-400',
      },
      {
        resultIndex: 1,
        messageIndex: 1,
        preview: 'User pro...',
        roleLabel: 'You',
        roleClass: 'text-blue-400',
      },
    ]);
    expect(nextPreviewCache.get(0)).toBe(cachedPreview);
    expect(nextPreviewCache.has(1)).toBe(true);
  });

  it('invalidates preview cache entry when message content changes', () => {
    const oldEntry = {
      signature: 'assistant\u0000old',
      preview: 'old preview',
      roleLabel: 'Assistant',
      roleClass: 'text-emerald-400',
    };
    const history: ChatMessage[] = [
      { role: 'assistant', content: 'new content body' },
    ];

    const { rows, nextPreviewCache } = buildSearchResultRows({
      searchResults: [0],
      history,
      previewCache: new Map([[0, oldEntry]]),
      maxPreviewLength: 5,
    });

    expect(rows[0].preview).toBe('new c...');
    expect(nextPreviewCache.get(0)).not.toBe(oldEntry);
    expect(nextPreviewCache.get(0)?.signature).toBe('assistant\u0000new content body');
  });

  it('reuses cached row metadata for identical history signature inputs', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ];
    const cacheState = createChatRowMetadataCacheState();
    const params = {
      history,
      editingMessageIndex: null,
      searchResultSet: new Set<number>([1]),
      activeSearchMessageIndex: 1,
      comparisonIndex: null,
      bookmarkedMessages: new Set<number>(),
      selectedToken: null,
      messageRatings: {} as Record<number, 'up' | 'down'>,
      editedMessageContent: '',
      loadedMessageIndices: new Set<number>([0, 1]),
    };

    const first = getCachedChatRowMetadata(params, cacheState, 4);
    const second = getCachedChatRowMetadata(params, cacheState, 4);

    expect(second).toBe(first);
    expect(cacheState.entries).toHaveLength(1);
  });

  it('bounds row metadata cache size with oldest-entry eviction', () => {
    const history: ChatMessage[] = [{ role: 'assistant', content: 'm' }];
    const cacheState = createChatRowMetadataCacheState();
    const buildWithText = (text: string) => getCachedChatRowMetadata({
      history,
      editingMessageIndex: 0,
      searchResultSet: new Set<number>(),
      activeSearchMessageIndex: undefined,
      comparisonIndex: null,
      bookmarkedMessages: new Set<number>(),
      selectedToken: null,
      messageRatings: {} as Record<number, 'up' | 'down'>,
      editedMessageContent: text,
      loadedMessageIndices: new Set<number>(),
    }, cacheState, 3);

    buildWithText('one');
    buildWithText('two');
    buildWithText('three');
    buildWithText('four');

    expect(cacheState.entries).toHaveLength(3);
    expect(cacheState.entries.some((entry) => entry.signature.includes(':one'))).toBe(false);
  });
});
