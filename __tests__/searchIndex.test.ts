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

const createSession = (
  id: string,
  title: string,
  messageContent: string
): ChatSession => ({
  id,
  title,
  lastModified: Date.now(),
  modelId: 'test-model',
  messages: [{ role: 'user', content: messageContent }],
});

describe('SearchIndexService', () => {
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

  beforeEach(() => {
    localStorage.clear();
    SearchIndexService.saveIndex({
      version: 1,
      updatedAt: Date.now(),
      terms: {},
      sessionTerms: {},
    });
  });

  it('intersects four-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta', 'gamma delta'),
      createSession('s2', 'alpha beta', 'gamma'),
      createSession('s3', 'alpha delta', 'gamma'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta');

    expect(result).toEqual(new Set(['s1']));
  });

  it('returns empty set when any of four terms is missing', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta', 'gamma delta'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma epsilon');

    expect(result.size).toBe(0);
  });
});
