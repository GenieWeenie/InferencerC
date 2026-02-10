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

  it('intersects two-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta', 'gamma'),
      createSession('s2', 'alpha', 'delta'),
      createSession('s3', 'beta', 'epsilon'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta');

    expect(result).toEqual(new Set(['s1']));
  });

  it('intersects three-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta', 'gamma'),
      createSession('s2', 'alpha beta', 'delta'),
      createSession('s3', 'alpha gamma', 'delta'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma');

    expect(result).toEqual(new Set(['s1']));
  });

  it('intersects five-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta gamma', 'delta epsilon'),
      createSession('s2', 'alpha beta gamma', 'delta'),
      createSession('s3', 'alpha beta', 'gamma delta epsilon'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta epsilon');

    expect(result).toEqual(new Set(['s1', 's3']));
  });

  it('falls back correctly for six-term queries', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta gamma', 'delta epsilon zeta'),
      createSession('s2', 'alpha beta gamma', 'delta epsilon'),
      createSession('s3', 'alpha beta zeta', 'delta epsilon'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta epsilon zeta');

    expect(result).toEqual(new Set(['s1']));
  });

  it('intersects seven-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta gamma', 'delta epsilon zeta eta'),
      createSession('s2', 'alpha beta gamma', 'delta epsilon zeta'),
      createSession('s3', 'alpha beta gamma delta', 'epsilon zeta eta'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta epsilon zeta eta');

    expect(result).toEqual(new Set(['s1', 's3']));
  });

  it('intersects eight-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta gamma delta', 'epsilon zeta eta theta'),
      createSession('s2', 'alpha beta gamma delta', 'epsilon zeta eta'),
      createSession('s3', 'alpha beta gamma', 'delta epsilon zeta eta theta'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta epsilon zeta eta theta');

    expect(result).toEqual(new Set(['s1', 's3']));
  });

  it('intersects nine-term queries correctly', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta gamma delta epsilon', 'zeta eta theta iota'),
      createSession('s2', 'alpha beta gamma delta epsilon', 'zeta eta theta'),
      createSession('s3', 'alpha beta gamma delta', 'epsilon zeta eta theta iota'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha beta gamma delta epsilon zeta eta theta iota');

    expect(result).toEqual(new Set(['s1', 's3']));
  });

  it('handles singleton-candidate intersections without changing results', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'rareterm alpha beta', 'gamma delta epsilon'),
      createSession('s2', 'alpha beta', 'gamma delta epsilon'),
      createSession('s3', 'alpha gamma', 'delta epsilon'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('rareterm alpha beta gamma delta epsilon');

    expect(result).toEqual(new Set(['s1']));
  });

  it('handles singleton-candidate intersections in generic 10-term path', () => {
    const sessions: ChatSession[] = [
      createSession(
        's1',
        'rareterm alpha beta gamma delta epsilon',
        'zeta eta theta iota kappa'
      ),
      createSession(
        's2',
        'alpha beta gamma delta epsilon',
        'zeta eta theta iota kappa'
      ),
      createSession(
        's3',
        'alpha beta gamma',
        'delta epsilon zeta eta theta iota'
      ),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions(
      'rareterm alpha beta gamma delta epsilon zeta eta theta iota'
    );

    expect(result).toEqual(new Set(['s1']));
  });

  it('returns all matching sessions for one-term queries', () => {
    const sessions: ChatSession[] = [
      createSession('s1', 'alpha beta', 'gamma'),
      createSession('s2', 'alpha delta', 'epsilon'),
      createSession('s3', 'beta gamma', 'delta'),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const result = SearchIndexService.searchSessions('alpha');

    expect(result).toEqual(new Set(['s1', 's2']));
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
