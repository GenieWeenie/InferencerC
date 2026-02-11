import { formatPerfMs } from '../src/renderer/hooks/useChatPerfBenchmarks';

describe('chatPerfBenchmarks', () => {
  it('formats benchmark values deterministically', () => {
    expect(formatPerfMs(undefined)).toBe('...');
    expect(formatPerfMs(null)).toBe('n/a');
    expect(formatPerfMs(17.6)).toBe('18ms');
  });
});
