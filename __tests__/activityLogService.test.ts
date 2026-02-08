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
  });

  test('appends and persists valid log entries', () => {
    const entry: ApiActivityLogEntry = {
      id: 'entry-1',
      timestamp: Date.now(),
      type: 'request',
      model: 'local/test-model',
      request: { prompt: 'hello' },
    };

    activityLogService.append(entry);
    const saved = activityLogService.getEntries();

    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('entry-1');
    expect(saved[0].model).toBe('local/test-model');
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
  });
});
