/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  formatPerfMs,
  parseStoredBenchmarks,
  useChatPerfBenchmarks,
} from '../src/renderer/hooks/useChatPerfBenchmarks';

describe('chatPerfBenchmarks', () => {
  it('formats benchmark values deterministically', () => {
    expect(formatPerfMs(undefined)).toBe('...');
    expect(formatPerfMs(null)).toBe('n/a');
    expect(formatPerfMs(17.6)).toBe('18ms');
  });

  it('parses stored benchmarks safely and keeps only valid top samples', () => {
    localStorage.setItem('benchmarks', JSON.stringify([
      { timestamp: 1, modelId: 'a', mode: 'single', inputChars: 10, inputToRenderMs: 50, inputToFirstTokenMs: 40 },
      { timestamp: 2, modelId: 'b', mode: 'battle', inputChars: 11, inputToRenderMs: 51, inputToFirstTokenMs: 41 },
      { timestamp: 3, modelId: 'c', mode: 'single', inputChars: 12, inputToRenderMs: 52, inputToFirstTokenMs: 42 },
      { timestamp: 4, modelId: 'd', mode: 'single', inputChars: 13, inputToRenderMs: 53, inputToFirstTokenMs: 43 },
      { timestamp: 5, modelId: 'e', mode: 'single', inputChars: 14, inputToRenderMs: 54, inputToFirstTokenMs: 44 },
      { timestamp: 6, modelId: 'f', mode: 'single', inputChars: 15, inputToRenderMs: 55, inputToFirstTokenMs: 45 },
      { timestamp: 'bad', modelId: 'g', mode: 'single', inputChars: 1, inputToRenderMs: 1 },
    ]));

    const parsed = parseStoredBenchmarks('benchmarks');
    expect(parsed).toHaveLength(5);
    expect(parsed[0]?.modelId).toBe('a');
    expect(parsed[4]?.modelId).toBe('e');
  });

  it('rewrites persisted benchmark history to bounded size and clears on demand', async () => {
    localStorage.setItem('benchmarks', JSON.stringify([
      { timestamp: 1, modelId: 'a', mode: 'single', inputChars: 10, inputToRenderMs: 50, inputToFirstTokenMs: 40 },
      { timestamp: 2, modelId: 'b', mode: 'battle', inputChars: 11, inputToRenderMs: 51, inputToFirstTokenMs: 41 },
      { timestamp: 3, modelId: 'c', mode: 'single', inputChars: 12, inputToRenderMs: 52, inputToFirstTokenMs: 42 },
      { timestamp: 4, modelId: 'd', mode: 'single', inputChars: 13, inputToRenderMs: 53, inputToFirstTokenMs: 43 },
      { timestamp: 5, modelId: 'e', mode: 'single', inputChars: 14, inputToRenderMs: 54, inputToFirstTokenMs: 44 },
      { timestamp: 6, modelId: 'f', mode: 'single', inputChars: 15, inputToRenderMs: 55, inputToFirstTokenMs: 45 },
    ]));

    const { result } = renderHook(() => useChatPerfBenchmarks({
      storageKey: 'benchmarks',
      history: [],
      attachmentsLength: 0,
      imageAttachmentsLength: 0,
      battleMode: false,
      secondaryModel: '',
      prefill: null,
      currentModel: 'model-a',
    }));

    await waitFor(() => {
      expect(result.current.recentPerfBenchmarks).toHaveLength(5);
    });

    const persisted = JSON.parse(localStorage.getItem('benchmarks') || '[]');
    expect(persisted).toHaveLength(5);

    act(() => {
      result.current.clearPerfHistory();
    });

    expect(localStorage.getItem('benchmarks')).toBe('[]');
    expect(result.current.recentPerfBenchmarks).toEqual([]);
  });
});
