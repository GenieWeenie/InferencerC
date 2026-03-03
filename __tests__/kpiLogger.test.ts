/** @jest-environment jsdom */
import {
    recordFirstSuccess,
    recordSessionStart,
    recordSessionEnd,
    getKpiSnapshot,
} from '../src/renderer/lib/kpiLogger';

const KPI_STORAGE_KEY = 'app_kpi_stats';

const createMockStorage = () => {
    const store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        clear: () => {
            for (const k of Object.keys(store)) delete store[k];
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        get length() {
            return Object.keys(store).length;
        },
        key: () => null,
    };
};

let mockStorage: ReturnType<typeof createMockStorage>;

beforeAll(() => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
    });
});

beforeEach(() => {
    mockStorage.clear();
});

describe('kpiLogger', () => {
    describe('recordFirstSuccess', () => {
        it('stores ISO timestamp on first call', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T12:00:00.000Z'));

            recordFirstSuccess();

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBe('2026-03-02T12:00:00.000Z');

            jest.useRealTimers();
        });

        it('is idempotent — second call does not overwrite', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T12:00:00.000Z'));

            recordFirstSuccess();
            jest.setSystemTime(new Date('2026-03-03T15:00:00.000Z'));
            recordFirstSuccess();

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBe('2026-03-02T12:00:00.000Z');

            jest.useRealTimers();
        });
    });

    describe('recordSessionStart / recordSessionEnd', () => {
        it('creates session entries with startedAt', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T10:00:00.000Z'));

            recordSessionStart();

            const snapshot = getKpiSnapshot();
            expect(snapshot.totalSessions).toBe(1);
            expect(snapshot.crashFreeSessions).toBe(0);

            jest.useRealTimers();
        });

        it('tracks clean exits when recordSessionEnd(true) is called', () => {
            recordSessionStart();
            recordSessionEnd(true);

            const snapshot = getKpiSnapshot();
            expect(snapshot.totalSessions).toBe(1);
            expect(snapshot.crashFreeSessions).toBe(1);
        });

        it('does not count crash-free when recordSessionEnd(false) is called', () => {
            recordSessionStart();
            recordSessionEnd(false);

            const snapshot = getKpiSnapshot();
            expect(snapshot.totalSessions).toBe(1);
            expect(snapshot.crashFreeSessions).toBe(0);
        });

        it('recordSessionEnd without recordSessionStart is a no-op', () => {
            recordSessionEnd(true);

            const snapshot = getKpiSnapshot();
            expect(snapshot.totalSessions).toBe(0);
            expect(snapshot.crashFreeSessions).toBe(0);
        });

        it('recordSessionEnd updates only the last session', () => {
            recordSessionStart();
            recordSessionStart();
            recordSessionEnd(true);

            const snapshot = getKpiSnapshot();
            expect(snapshot.totalSessions).toBe(2);
            expect(snapshot.crashFreeSessions).toBe(1);
        });
    });

    describe('getKpiSnapshot', () => {
        it('returns correct aggregated data', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T10:00:00.000Z'));

            recordFirstSuccess();
            recordSessionStart();
            recordSessionEnd(true);
            recordSessionStart();
            recordSessionEnd(false);

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBe('2026-03-02T10:00:00.000Z');
            expect(snapshot.totalSessions).toBe(2);
            expect(snapshot.crashFreeSessions).toBe(1);
            expect(snapshot.weeksWithActivity).toContain('2026-W10');
            expect(snapshot.weeksWithActivity).toEqual(
                expect.arrayContaining(['2026-W10'])
            );

            jest.useRealTimers();
        });

        it('weeksWithActivity contains unique sorted week keys', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T10:00:00.000Z'));
            recordSessionStart();
            jest.setSystemTime(new Date('2026-03-05T10:00:00.000Z'));
            recordSessionStart();
            jest.setSystemTime(new Date('2026-02-15T10:00:00.000Z'));
            recordSessionStart();

            const snapshot = getKpiSnapshot();
            expect(snapshot.weeksWithActivity).toEqual(
                expect.arrayContaining(['2026-W07', '2026-W10'])
            );
            expect(snapshot.weeksWithActivity).toEqual(
                [...snapshot.weeksWithActivity].sort()
            );

            jest.useRealTimers();
        });

        it('returns empty snapshot when no data', () => {
            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBeNull();
            expect(snapshot.totalSessions).toBe(0);
            expect(snapshot.crashFreeSessions).toBe(0);
            expect(snapshot.weeksWithActivity).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('handles corrupted localStorage (invalid JSON)', () => {
            mockStorage.setItem(KPI_STORAGE_KEY, 'not valid json');

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBeNull();
            expect(snapshot.totalSessions).toBe(0);
            expect(snapshot.crashFreeSessions).toBe(0);
            expect(snapshot.weeksWithActivity).toEqual([]);
        });

        it('handles corrupted localStorage (non-object parsed)', () => {
            mockStorage.setItem(KPI_STORAGE_KEY, '"a string"');

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBeNull();
            expect(snapshot.totalSessions).toBe(0);
        });

        it('handles missing keys — returns empty data', () => {
            expect(mockStorage.getItem(KPI_STORAGE_KEY)).toBeNull();

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBeNull();
            expect(snapshot.totalSessions).toBe(0);
            expect(snapshot.weeksWithActivity).toEqual([]);
        });

        it('recordFirstSuccess works after corrupted data is cleared', () => {
            mockStorage.setItem(KPI_STORAGE_KEY, '{{{');
            mockStorage.clear();

            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-03-02T12:00:00.000Z'));
            recordFirstSuccess();

            const snapshot = getKpiSnapshot();
            expect(snapshot.firstSuccessAt).toBe('2026-03-02T12:00:00.000Z');

            jest.useRealTimers();
        });
    });
});
