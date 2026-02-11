import { resolveBattleModelName } from '../src/renderer/components/chat/ChatMessageRow';

describe('chatMessageRow helpers', () => {
  it('prefers explicit model name captured from content', () => {
    const modelName = resolveBattleModelName(
      '**Model A: Fancy Model**\nresponse',
      /\*\*Model A:\s*(.+?)\*\*/,
      'model-a',
      new Map([['model-a', 'Fallback A']]),
      'Model A',
    );

    expect(modelName).toBe('Fancy Model');
  });

  it('falls back to id map and then to label', () => {
    expect(
      resolveBattleModelName(
        'no match here',
        /\*\*Model B:\s*(.+?)\*\*/,
        'model-b',
        new Map([['model-b', 'Mapped B']]),
        'Model B',
      ),
    ).toBe('Mapped B');

    expect(
      resolveBattleModelName(
        undefined,
        /\*\*Model B:\s*(.+?)\*\*/,
        'missing-id',
        new Map(),
        'Model B',
      ),
    ).toBe('Model B');
  });
});
