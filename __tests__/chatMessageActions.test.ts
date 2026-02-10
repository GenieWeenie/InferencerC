import {
  getMessageActionCapabilities,
  isLongPressActionAllowed,
} from '../src/renderer/lib/chatMessageActions';

describe('chatMessageActions', () => {
  it('computes user-message capabilities deterministically', () => {
    expect(getMessageActionCapabilities({ role: 'user', isLoading: false })).toEqual({
      canCopy: true,
      canBookmark: true,
      canEdit: true,
      canRegenerate: false,
      canBranch: true,
      canDelete: true,
    });
  });

  it('computes assistant capabilities with loading-aware regenerate rule', () => {
    expect(getMessageActionCapabilities({ role: 'assistant', isLoading: true }).canRegenerate).toBe(false);
    expect(getMessageActionCapabilities({ role: 'assistant', isLoading: false }).canRegenerate).toBe(true);
  });

  it('denies action execution for invalid long-press cases', () => {
    const assistantLoading = { role: 'assistant', isLoading: true } as const;
    const assistantReady = { role: 'assistant', isLoading: false } as const;

    expect(isLongPressActionAllowed('edit', assistantReady)).toBe(false);
    expect(isLongPressActionAllowed('regenerate', assistantLoading)).toBe(false);
    expect(isLongPressActionAllowed('regenerate', assistantReady)).toBe(true);
    expect(isLongPressActionAllowed('copy', null)).toBe(false);
  });
});

