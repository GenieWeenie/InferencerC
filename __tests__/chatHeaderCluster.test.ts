import { getConnectionStatusDotClassName } from '../src/renderer/components/chat/ChatHeaderCluster';

describe('chatHeaderCluster', () => {
  it('returns deterministic class names for known connection states', () => {
    expect(getConnectionStatusDotClassName('online')).toBe('bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]');
    expect(getConnectionStatusDotClassName('checking')).toBe('bg-amber-500 animate-pulse');
    expect(getConnectionStatusDotClassName('offline')).toBe('bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]');
    expect(getConnectionStatusDotClassName('none')).toBe('bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]');
  });
});
