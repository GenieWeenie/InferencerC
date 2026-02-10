import type { ChatMessage } from '../../shared/types';

export type ChatMessageAction = 'copy' | 'bookmark' | 'edit' | 'regenerate' | 'branch' | 'delete';

export interface ChatMessageActionCapabilities {
  canCopy: boolean;
  canBookmark: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  canBranch: boolean;
  canDelete: boolean;
}

export const getMessageActionCapabilities = (
  message: Pick<ChatMessage, 'role' | 'isLoading'> | null | undefined
): ChatMessageActionCapabilities => {
  if (!message) {
    return {
      canCopy: false,
      canBookmark: false,
      canEdit: false,
      canRegenerate: false,
      canBranch: false,
      canDelete: false,
    };
  }

  const canEdit = message.role === 'user';
  const canRegenerate = message.role === 'assistant' && !message.isLoading;
  return {
    canCopy: true,
    canBookmark: true,
    canEdit,
    canRegenerate,
    canBranch: true,
    canDelete: true,
  };
};

export const isLongPressActionAllowed = (
  action: ChatMessageAction,
  message: Pick<ChatMessage, 'role' | 'isLoading'> | null | undefined
): boolean => {
  const capabilities = getMessageActionCapabilities(message);

  switch (action) {
    case 'copy':
      return capabilities.canCopy;
    case 'bookmark':
      return capabilities.canBookmark;
    case 'edit':
      return capabilities.canEdit;
    case 'regenerate':
      return capabilities.canRegenerate;
    case 'branch':
      return capabilities.canBranch;
    case 'delete':
      return capabilities.canDelete;
    default:
      return false;
  }
};

