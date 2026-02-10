import {
  areSearchResultIndicesEqual,
  findChatSearchMatches,
  normalizeChatSearchQuery,
} from '../src/renderer/lib/chatSearch';

describe('chatSearch helpers', () => {
  it('normalizes query by trimming and lowercasing', () => {
    expect(normalizeChatSearchQuery('  HeLLo World  ')).toBe('hello world');
    expect(normalizeChatSearchQuery('   ')).toBe('');
  });

  it('finds matching message indices for normalized queries', () => {
    const searchable = [
      'alpha beta',
      'gamma delta',
      'beta epsilon',
      '',
    ];

    expect(findChatSearchMatches(searchable, 'beta')).toEqual([0, 2]);
    expect(findChatSearchMatches(searchable, 'delta')).toEqual([1]);
    expect(findChatSearchMatches(searchable, '')).toEqual([]);
  });

  it('compares search result index arrays deterministically', () => {
    expect(areSearchResultIndicesEqual([], [])).toBe(true);
    expect(areSearchResultIndicesEqual([1, 3], [1, 3])).toBe(true);
    expect(areSearchResultIndicesEqual([1, 3], [3, 1])).toBe(false);
    expect(areSearchResultIndicesEqual([1], [1, 2])).toBe(false);
  });
});
