import { SearchIndexService, __searchIndexInternals } from '../src/renderer/services/searchIndex';
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

  it('keeps singleton-candidate intersections stable across repeated generic-path searches', () => {
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

    const query = 'rareterm alpha beta gamma delta epsilon zeta eta theta iota';
    const expected = new Set(['s1']);

    for (let i = 0; i < 20; i++) {
      expect(SearchIndexService.searchSessions(query)).toEqual(expected);
    }
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

  it('dedupes query terms in first-seen order across long token lengths', () => {
    const cases: Array<{ name: string; tokens: string[] }> = [
      {
        name: '10-token branch shape',
        tokens: ['alpha', 'beta', 'alpha', 'gamma', 'beta', 'delta', 'epsilon', 'gamma', 'zeta', 'alpha'],
      },
      {
        name: '20-token branch shape',
        tokens: [
          'one', 'two', 'three', 'one', 'four', 'two', 'five', 'six', 'three', 'seven',
          'eight', 'nine', 'five', 'ten', 'eleven', 'twelve', 'seven', 'thirteen', 'fourteen', 'eight',
        ],
      },
      {
        name: '33-token branch shape',
        tokens: [
          't01', 't02', 't03', 't04', 't05', 't06', 't07', 't08', 't09', 't10', 't11',
          't12', 't13', 't14', 't15', 't16', 't17', 't18', 't19', 't20', 't21', 't22',
          't23', 't24', 't25', 't26', 't27', 't28', 't29', 't30', 't31', 't32', 't33',
        ].flatMap((token, index) => (index % 3 === 0 ? [token, token] : [token])),
      },
      {
        name: '40-token fallback shape',
        tokens: Array.from({ length: 40 }, (_, index) => `tok${(index % 12) + 1}`),
      },
    ];

    for (let i = 0; i < cases.length; i++) {
      const testCase = cases[i];
      const query = testCase.tokens.join(' ');
      const expected = Array.from(new Set(testCase.tokens));
      expect(__searchIndexInternals.getUniqueQueryTerms(query)).toEqual(expected);
    }
  });

  it('keeps large-query (40 tokens) intersections stable across repeated runs', () => {
    const allTerms = Array.from({ length: 15 }, (_, i) => `term${i + 1}`);
    const sessions: ChatSession[] = [
      createSession('s1', allTerms.slice(0, 8).join(' '), allTerms.slice(8).join(' ')),
      createSession('s2', allTerms.slice(0, 7).join(' '), allTerms.slice(8).join(' ')),
      createSession('s3', allTerms.slice(0, 10).join(' '), allTerms.slice(10).join(' ')),
    ];
    SearchIndexService.rebuildIndex(sessions);

    const longQuery = Array.from({ length: 40 }, (_, i) => `term${(i % 15) + 1}`).join(' ');
    const firstRun = SearchIndexService.searchSessions(longQuery);
    expect(firstRun).toEqual(new Set(['s1', 's3']));

    for (let i = 0; i < 20; i++) {
      expect(SearchIndexService.searchSessions(longQuery)).toEqual(firstRun);
    }
  });

  it('sanitizes malformed persisted index maps when hydrating from storage', () => {
    localStorage.setItem('app_search_index', JSON.stringify({
      version: -3.2,
      updatedAt: 'bad',
      terms: {
        ' alpha ': [' s1 ', '', 's1', 's2', 5],
        '   ': ['ignored'],
      },
      sessionTerms: {
        ' session-1 ': ['alpha', ' alpha ', 8],
      },
    }));

    const index = SearchIndexService.getIndex();

    expect(index.version).toBe(1);
    expect(index.updatedAt).toEqual(expect.any(Number));
    expect(index.terms).toEqual({ alpha: ['s1', 's2'] });
    expect(index.sessionTerms).toEqual({ 'session-1': ['alpha'] });
  });

  it('falls back to an empty index when persisted JSON is unreadable', () => {
    localStorage.setItem('app_search_index', '{bad-json');

    const index = SearchIndexService.getIndex();

    expect(index.terms).toEqual({});
    expect(index.sessionTerms).toEqual({});
  });
});
