import { activityLogService, ApiActivityLogEntry } from '../src/renderer/services/activityLog';

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('activityLogService', () => {
  const localStorageMock = new MockLocalStorage();

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    localStorageMock.clear();
    activityLogService.clear();
  });

  test('returns empty entries by default', () => {
    expect(activityLogService.getEntries()).toEqual([]);
    expect(activityLogService.getEntryCount()).toBe(0);
  });

  test('appends and persists valid log entries', () => {
    const entry: ApiActivityLogEntry = {
      id: '  entry-1  ',
      timestamp: Date.now(),
      type: 'request',
      model: '  local/test-model  ',
      request: { prompt: 'hello' },
    };

    activityLogService.append(entry);
    const saved = activityLogService.getEntries();

    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('entry-1');
    expect(saved[0].model).toBe('local/test-model');
    expect(activityLogService.getEntryCount()).toBe(1);
  });

  test('keeps only the latest 200 entries', () => {
    for (let i = 0; i < 205; i++) {
      activityLogService.append({
        id: `entry-${i}`,
        timestamp: i,
        type: 'response',
        model: 'remote/test-model',
        response: { index: i },
      });
    }

    const saved = activityLogService.getEntries();
    expect(saved).toHaveLength(200);
    expect(saved[0].id).toBe('entry-5');
    expect(saved[199].id).toBe('entry-204');
    expect(activityLogService.getEntryCount()).toBe(200);
  });

  test('clear removes all saved entries', () => {
    activityLogService.append({
      id: 'entry-clear',
      timestamp: Date.now(),
      type: 'error',
      model: 'local/test-model',
      error: 'boom',
    });

    expect(activityLogService.getEntries()).toHaveLength(1);
    activityLogService.clear();
    expect(activityLogService.getEntries()).toHaveLength(0);
    expect(activityLogService.getEntryCount()).toBe(0);
  });

  test('getEntryCount falls back to entries when count metadata is missing', () => {
    const entries: ApiActivityLogEntry[] = [
      {
        id: 'entry-fallback-1',
        timestamp: 1,
        type: 'request',
        model: 'local/test-model',
      },
      {
        id: 'entry-fallback-2',
        timestamp: 2,
        type: 'response',
        model: 'local/test-model',
      },
    ];

    localStorageMock.setItem('api_activity_log_entries', JSON.stringify(entries));
    localStorageMock.removeItem('api_activity_log_count');

    expect(activityLogService.getEntryCount()).toBe(2);
  });

  test('getEntryCount ignores invalid persisted count values', () => {
    localStorageMock.setItem('api_activity_log_count', 'not-a-number');
    localStorageMock.setItem('api_activity_log_entries', JSON.stringify([]));

    expect(activityLogService.getEntryCount()).toBe(0);
  });

  test('drops malformed persisted rows and strips invalid optional fields', () => {
    localStorageMock.setItem('api_activity_log_entries', JSON.stringify([
      {
        id: ' ok ',
        timestamp: 1,
        type: 'response',
        model: ' local/model ',
        duration: -3,
        error: '   ',
      },
      {
        id: 'bad',
        timestamp: -1,
        type: 'request',
        model: 'local/model',
      },
      {
        id: '',
        timestamp: 2,
        type: 'request',
        model: 'local/model',
      },
    ]));

    const entries = activityLogService.getEntries();
    expect(entries).toEqual([
      {
        id: 'ok',
        timestamp: 1,
        type: 'response',
        model: 'local/model',
        duration: undefined,
        error: undefined,
        request: undefined,
        response: undefined,
      },
    ]);
  });
});
