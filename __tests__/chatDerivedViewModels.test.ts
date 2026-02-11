import { buildChatDerivedViewModels } from '../src/renderer/hooks/useChatDerivedViewModels';

describe('chatDerivedViewModels', () => {
  it('derives current model/session metadata and footer height', () => {
    const result = buildChatDerivedViewModels({
      availableModels: [
        {
          id: 'm1',
          name: 'Model One',
          pathOrUrl: '/tmp/m1',
          type: 'local-folder',
          contextLength: 65536,
          status: 'loaded',
          adapter: 'lm-studio',
        },
      ],
      currentModel: 'm1',
      savedSessions: [
        {
          id: 's1',
          title: 'Session One',
          lastModified: 1,
          modelId: 'm1',
          messages: [],
        },
      ],
      sessionId: 's1',
      isCompactViewport: false,
      composerOverlayHeight: 320,
    });

    expect(result.currentModelObj?.id).toBe('m1');
    expect(result.currentModelName).toBe('Model One');
    expect(result.currentSessionTitle).toBe('Session One');
    expect(result.contextWindowTokens).toBe(65536);
    expect(result.messageListFooterHeight).toBe(360);
  });

  it('falls back when model/session are not found and keeps minimum footer height', () => {
    const result = buildChatDerivedViewModels({
      availableModels: [],
      currentModel: 'unknown-model',
      savedSessions: [],
      sessionId: 'unknown-session',
      isCompactViewport: true,
      composerOverlayHeight: 80,
    });

    expect(result.currentModelObj).toBeUndefined();
    expect(result.currentModelName).toBe('unknown-model');
    expect(result.currentSessionTitle).toBe('New Chat');
    expect(result.contextWindowTokens).toBe(32768);
    expect(result.messageListFooterHeight).toBe(132);
  });
});
