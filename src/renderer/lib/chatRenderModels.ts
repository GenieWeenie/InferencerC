import type { ChatMessage } from '../../shared/types';

export interface ExperimentalFeatureMenuItem {
  key: string;
  label: string;
  icon: 'brain' | 'multimodal' | 'collaboration' | 'cloud' | 'workspaces' | 'compliance' | 'blockchain' | 'agents' | 'federated';
}

export const EXPERIMENTAL_FEATURE_MENU_ITEMS: ReadonlyArray<ExperimentalFeatureMenuItem> = [
  { key: 'bci', label: 'Brain-Computer Interface', icon: 'brain' },
  { key: 'multimodal', label: 'Multi-Modal AI', icon: 'multimodal' },
  { key: 'collaboration', label: 'Real-Time Collaboration', icon: 'collaboration' },
  { key: 'cloudSync', label: 'Cloud Sync', icon: 'cloud' },
  { key: 'teamWorkspaces', label: 'Team Workspaces', icon: 'workspaces' },
  { key: 'enterpriseCompliance', label: 'Enterprise SSO & Audit', icon: 'compliance' },
  { key: 'blockchain', label: 'Blockchain Integration', icon: 'blockchain' },
  { key: 'aiAgents', label: 'AI Agents', icon: 'agents' },
  { key: 'federatedLearning', label: 'Federated Learning', icon: 'federated' },
];

export interface ChatRowMetadata {
  previousMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  isSearchResult: boolean;
  isCurrentSearchResult: boolean;
  isLastMessage: boolean;
  isShowingComparison: boolean;
  isComparisonPartnerHidden: boolean;
  isBookmarked: boolean;
  selectedTokenForMessage: any;
  messageRating: 'up' | 'down' | undefined;
  isEditingRow: boolean;
  editingContentForRow: string;
  isLazyLoaded: boolean;
}

interface BuildChatRowMetadataParams {
  history: ChatMessage[];
  editingMessageIndex: number | null;
  searchResultSet: Set<number>;
  activeSearchMessageIndex: number | undefined;
  comparisonIndex: number | null;
  bookmarkedMessages: Set<number>;
  selectedToken: any;
  messageRatings: Record<number, 'up' | 'down'>;
  editedMessageContent: string;
  loadedMessageIndices: Set<number>;
}

export const buildChatRowMetadata = ({
  history,
  editingMessageIndex,
  searchResultSet,
  activeSearchMessageIndex,
  comparisonIndex,
  bookmarkedMessages,
  selectedToken,
  messageRatings,
  editedMessageContent,
  loadedMessageIndices,
}: BuildChatRowMetadataParams): ChatRowMetadata[] => {
  const metadata = new Array<ChatRowMetadata>(history.length);
  const selectedTokenMessageIndex =
    selectedToken && typeof selectedToken === 'object' && Number.isInteger(selectedToken.messageIndex)
      ? selectedToken.messageIndex
      : -1;

  for (let index = 0; index < history.length; index += 1) {
    const isEditingRow = editingMessageIndex === index;
    metadata[index] = {
      previousMessage: index > 0 ? history[index - 1] : null,
      nextMessage: index < history.length - 1 ? history[index + 1] : null,
      isSearchResult: searchResultSet.has(index),
      isCurrentSearchResult: activeSearchMessageIndex === index,
      isLastMessage: index === history.length - 1,
      isShowingComparison: comparisonIndex === index,
      isComparisonPartnerHidden: comparisonIndex === index - 1,
      isBookmarked: bookmarkedMessages.has(index),
      selectedTokenForMessage: selectedTokenMessageIndex === index ? selectedToken : null,
      messageRating: messageRatings[index],
      isEditingRow,
      editingContentForRow: isEditingRow ? editedMessageContent : '',
      isLazyLoaded: !loadedMessageIndices.has(index),
    };
  }

  return metadata;
};

export interface SearchResultPreviewCacheEntry {
  signature: string;
  preview: string;
  roleLabel: string;
  roleClass: string;
}

export interface SearchResultRowViewModel {
  resultIndex: number;
  messageIndex: number;
  preview: string;
  roleLabel: string;
  roleClass: string;
}

interface BuildSearchResultRowsParams {
  searchResults: number[];
  history: ChatMessage[];
  previewCache: Map<number, SearchResultPreviewCacheEntry>;
  maxPreviewLength?: number;
}

interface BuildSearchResultRowsResult {
  rows: SearchResultRowViewModel[];
  nextPreviewCache: Map<number, SearchResultPreviewCacheEntry>;
}

const DEFAULT_MAX_PREVIEW_LENGTH = 100;

const buildSearchPreview = (content: string, maxPreviewLength: number): string =>
  content.length > maxPreviewLength ? `${content.slice(0, maxPreviewLength)}...` : content;

const buildSearchSignature = (role: ChatMessage['role'], content: string): string =>
  `${role}\u0000${content}`;

export const buildSearchResultRows = ({
  searchResults,
  history,
  previewCache,
  maxPreviewLength = DEFAULT_MAX_PREVIEW_LENGTH,
}: BuildSearchResultRowsParams): BuildSearchResultRowsResult => {
  const rows: SearchResultRowViewModel[] = [];
  const nextPreviewCache = new Map<number, SearchResultPreviewCacheEntry>();

  for (let resultIndex = 0; resultIndex < searchResults.length; resultIndex += 1) {
    const messageIndex = searchResults[resultIndex];
    const message = history[messageIndex];
    if (!message) {
      continue;
    }

    const content = message.content || '';
    const signature = buildSearchSignature(message.role, content);
    let cachedPreview = previewCache.get(messageIndex);

    if (!cachedPreview || cachedPreview.signature !== signature) {
      const isUser = message.role === 'user';
      cachedPreview = {
        signature,
        preview: buildSearchPreview(content, maxPreviewLength),
        roleLabel: isUser ? 'You' : 'Assistant',
        roleClass: isUser ? 'text-blue-400' : 'text-emerald-400',
      };
    }

    nextPreviewCache.set(messageIndex, cachedPreview);
    rows.push({
      resultIndex,
      messageIndex,
      preview: cachedPreview.preview,
      roleLabel: cachedPreview.roleLabel,
      roleClass: cachedPreview.roleClass,
    });
  }

  return { rows, nextPreviewCache };
};
