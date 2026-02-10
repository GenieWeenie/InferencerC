import type { ChatMessageAction, ChatMessageActionCapabilities } from './chatMessageActions';
import type { ChatMessage } from '../../shared/types';

export type SearchNavigationDirection = 'previous' | 'next';

export const getWrappedSearchResultIndex = (
  currentIndex: number,
  resultCount: number,
  direction: SearchNavigationDirection
): number => {
  if (resultCount <= 0) {
    return 0;
  }

  if (direction === 'previous') {
    return currentIndex > 0 ? currentIndex - 1 : resultCount - 1;
  }

  return currentIndex < resultCount - 1 ? currentIndex + 1 : 0;
};

export interface LongPressMenuActionItem {
  action: ChatMessageAction;
  label: string;
  visible: boolean;
  destructive?: boolean;
}

export const buildLongPressMenuActionItems = (
  capabilities: ChatMessageActionCapabilities,
  isBookmarked: boolean
): LongPressMenuActionItem[] => [
  {
    action: 'copy',
    label: 'Copy message',
    visible: capabilities.canCopy,
  },
  {
    action: 'bookmark',
    label: isBookmarked ? 'Remove bookmark' : 'Bookmark message',
    visible: capabilities.canBookmark,
  },
  {
    action: 'edit',
    label: 'Edit message',
    visible: capabilities.canEdit,
  },
  {
    action: 'regenerate',
    label: 'Regenerate',
    visible: capabilities.canRegenerate,
  },
  {
    action: 'branch',
    label: 'Branch from here',
    visible: capabilities.canBranch,
  },
  {
    action: 'delete',
    label: 'Delete from here',
    visible: capabilities.canDelete,
    destructive: true,
  },
];

export type ComposerControlPillKey =
  | 'control-response'
  | 'tools'
  | 'github'
  | 'project'
  | 'thinking'
  | 'battle'
  | 'inspector'
  | 'expert-config'
  | 'variables'
  | 'json'
  | 'stream'
  | 'analytics'
  | 'recommendations'
  | 'controls';

export interface ComposerControlPillDescriptor {
  key: ComposerControlPillKey;
  label: string;
  active: boolean;
  visible: boolean;
}

export interface ComposerControlPillStateInput {
  prefillEnabled: boolean;
  showUrlInput: boolean;
  githubConfigured: boolean;
  showGithubInput: boolean;
  hasProjectContext: boolean;
  thinkingEnabled: boolean;
  battleMode: boolean;
  showInspector: boolean;
  expertMode: string | null;
  showVariableMenu: boolean;
  jsonMode: boolean;
  streamingEnabled: boolean;
  hasHistory: boolean;
  sidebarOpen: boolean;
}

export const buildComposerControlPillDescriptors = (
  state: ComposerControlPillStateInput
): ComposerControlPillDescriptor[] => [
  {
    key: 'control-response',
    label: 'Control Response',
    active: state.prefillEnabled,
    visible: true,
  },
  {
    key: 'tools',
    label: 'Tools',
    active: state.showUrlInput,
    visible: true,
  },
  {
    key: 'github',
    label: 'GitHub',
    active: state.showGithubInput,
    visible: state.githubConfigured,
  },
  {
    key: 'project',
    label: state.hasProjectContext ? 'Context' : 'Project',
    active: state.hasProjectContext,
    visible: true,
  },
  {
    key: 'thinking',
    label: 'Thinking',
    active: state.thinkingEnabled,
    visible: true,
  },
  {
    key: 'battle',
    label: 'Battle',
    active: state.battleMode,
    visible: true,
  },
  {
    key: 'inspector',
    label: 'Inspector',
    active: state.showInspector,
    visible: true,
  },
  {
    key: 'expert-config',
    label: state.expertMode ? `Expert: ${state.expertMode}` : 'Expert Config',
    active: Boolean(state.expertMode),
    visible: true,
  },
  {
    key: 'variables',
    label: 'Variables',
    active: state.showVariableMenu,
    visible: true,
  },
  {
    key: 'json',
    label: 'JSON',
    active: state.jsonMode,
    visible: true,
  },
  {
    key: 'stream',
    label: 'Stream',
    active: state.streamingEnabled,
    visible: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    active: false,
    visible: true,
  },
  {
    key: 'recommendations',
    label: 'Recommendations',
    active: false,
    visible: state.hasHistory,
  },
  {
    key: 'controls',
    label: 'Controls',
    active: state.sidebarOpen,
    visible: true,
  },
];

export const toggleToolNameInSet = (enabledTools: Set<string>, toolName: string): Set<string> => {
  const next = new Set(enabledTools);
  if (next.has(toolName)) {
    next.delete(toolName);
  } else {
    next.add(toolName);
  }
  return next;
};

export interface ContextTrimSuggestionLike {
  messageIndex: number;
  role: string;
  estimatedTokenSavings: number;
  preview: string;
}

export interface ContextTrimSuggestionRow {
  key: string;
  messageIndex: number;
  label: string;
  preview: string;
}

export const buildContextTrimSuggestionRows = (
  suggestions: ContextTrimSuggestionLike[],
  limit: number = 3
): ContextTrimSuggestionRow[] => suggestions.slice(0, Math.max(0, limit)).map((suggestion) => ({
  key: `trim-${suggestion.messageIndex}`,
  messageIndex: suggestion.messageIndex,
  label: `#${suggestion.messageIndex + 1} (${suggestion.role}) • save ~${suggestion.estimatedTokenSavings} tokens`,
  preview: suggestion.preview,
}));

export interface RecentContextMessageRow {
  key: string;
  index: number;
  role: ChatMessage['role'];
  estimatedTokens: number;
  included: boolean;
}

export const buildRecentContextMessageRows = (
  history: ChatMessage[],
  excludedIndices: Set<number>,
  estimateTokens: (text: string) => number,
  limit: number = 20
): RecentContextMessageRow[] => {
  const start = Math.max(0, history.length - Math.max(0, limit));
  return history.slice(start).map((message, offset) => {
    const index = start + offset;
    return {
      key: `ctx-${index}`,
      index,
      role: message.role,
      estimatedTokens: estimateTokens(message.content || ''),
      included: !excludedIndices.has(index),
    };
  });
};

export interface MaxTokensSliderConfig {
  maxContextLength: number;
  sliderMax: number;
  sliderStep: number;
}

export const getMaxTokensSliderConfig = (contextLength?: number): MaxTokensSliderConfig => {
  const maxContextLength = contextLength || 32768;
  const maxAllowedTokens = Math.floor(maxContextLength * 0.95);
  const sliderMax = Math.max(4096, maxAllowedTokens);
  const sliderStep = sliderMax > 10000 ? 100 : 10;
  return {
    maxContextLength,
    sliderMax,
    sliderStep,
  };
};
