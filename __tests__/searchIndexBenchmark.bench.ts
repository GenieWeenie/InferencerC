import {
  runSearchIndexBaseline,
  saveSearchIndexBenchmarkReport,
} from '../src/renderer/lib/performanceBenchmark';
import { SearchIndexService } from '../src/renderer/services/searchIndex';
import { ChatSession } from '../src/shared/types';

class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const createBenchmarkSessions = (count: number): ChatSession[] => {
  const sessions: ChatSession[] = [];
  for (let i = 0; i < count; i++) {
    const terms: string[] = [];
    for (let j = 0; j < 18; j++) {
      terms.push(`term${((i + j) % 48) + 1}`);
    }
    sessions.push({
      id: `bench-${i}`,
      title: terms.slice(0, 6).join(' '),
      lastModified: Date.now() - i * 1000,
      modelId: i % 2 === 0 ? 'model-a' : 'model-b',
      messages: [{ role: 'user', content: terms.slice(6).join(' ') }],
    });
  }
  return sessions;
};

describe('search index benchmark report', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new InMemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('runs and prints baseline stats for optimization tracking', () => {
    localStorage.clear();
    SearchIndexService.rebuildIndex(createBenchmarkSessions(300));

    const suite = runSearchIndexBaseline({
      iterations: 30,
      warmupRuns: 5,
    });

    // eslint-disable-next-line no-console
    console.table(
      suite.samples.map((sample) => ({
        queryLength: sample.queryLength,
        avgMs: sample.avgMs,
        minMs: sample.minMs,
        maxMs: sample.maxMs,
        resultCount: sample.resultCount,
      }))
    );

    if (process.env.SEARCH_INDEX_BENCHMARK_SAVE === '1') {
      const persisted = saveSearchIndexBenchmarkReport(suite, {
        storageKey: 'search_index_benchmark_reports_bench',
        label: 'npm benchmark:search-index',
      });
      // eslint-disable-next-line no-console
      console.log(`Saved benchmark snapshots: ${persisted.length}`);
    }

    expect(suite.samples.length).toBeGreaterThan(0);
  });
});
