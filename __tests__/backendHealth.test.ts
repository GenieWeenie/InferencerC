/** @jest-environment jsdom */

jest.mock('../src/renderer/services/backendHealthEnv', () => ({
    getAllowBrowserProbe: () => false,
}));

describe('BackendHealthService', () => {
    let backendHealthService: { getState: () => unknown; isOnline: () => boolean; subscribe: (fn: (s: unknown) => void) => () => void; reportRequestResult: (online: boolean) => void; checkNow: () => Promise<void> };

    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
        Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true, writable: true });
        delete (window as unknown as { electronAPI?: unknown }).electronAPI;
        const mod = require('../src/renderer/services/backendHealth') as { backendHealthService: typeof backendHealthService };
        backendHealthService = mod.backendHealthService;
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('getState', () => {
        it('returns initial state (online: false, source: init)', () => {
            const state = backendHealthService.getState() as { online: boolean; source: string };
            expect(state.online).toBe(false);
            expect(state.source).toBe('init');
        });
    });

    describe('isOnline', () => {
        it('returns false initially', () => {
            expect(backendHealthService.isOnline()).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('calls listener immediately with current state and returns unsubscribe function', () => {
            const listener = jest.fn();
            const unsubscribe = backendHealthService.subscribe(listener);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ online: false, source: 'init' }));
            backendHealthService.reportRequestResult(true);
            expect(listener).toHaveBeenCalledTimes(2);
            unsubscribe();
            backendHealthService.reportRequestResult(false);
            expect(listener).toHaveBeenCalledTimes(2);
        });
    });

    describe('reportRequestResult', () => {
        it('reportRequestResult(true) sets online to true and resets consecutiveFailures', () => {
            backendHealthService.reportRequestResult(true);
            const state = backendHealthService.getState() as { online: boolean; consecutiveFailures: number };
            expect(state.online).toBe(true);
            expect(state.consecutiveFailures).toBe(0);
        });

        it('reportRequestResult(false) increments consecutiveFailures', () => {
            backendHealthService.reportRequestResult(false);
            const state = backendHealthService.getState() as { online: boolean; consecutiveFailures: number };
            expect(state.online).toBe(false);
            expect(state.consecutiveFailures).toBe(1);
        });
    });

    describe('consecutive failures', () => {
        it('multiple false reports increment counter', () => {
            backendHealthService.reportRequestResult(false);
            expect((backendHealthService.getState() as { consecutiveFailures: number }).consecutiveFailures).toBe(1);
            backendHealthService.reportRequestResult(false);
            expect((backendHealthService.getState() as { consecutiveFailures: number }).consecutiveFailures).toBe(2);
            backendHealthService.reportRequestResult(false);
            expect((backendHealthService.getState() as { consecutiveFailures: number }).consecutiveFailures).toBe(3);
        });
    });

    describe('listener notification', () => {
        it('notifies listener only on state change (online→offline or vice versa), not on same-state updates', () => {
            const listener = jest.fn();
            backendHealthService.subscribe(listener);
            listener.mockClear();

            backendHealthService.reportRequestResult(true);
            expect(listener).toHaveBeenCalledTimes(1);

            backendHealthService.reportRequestResult(true);
            expect(listener).toHaveBeenCalledTimes(1);

            backendHealthService.reportRequestResult(false);
            expect(listener).toHaveBeenCalledTimes(2);

            backendHealthService.reportRequestResult(false);
            expect(listener).toHaveBeenCalledTimes(2);
        });
    });

    describe('checkNow', () => {
        it('runs a probe; with no electronAPI and allowBrowserProbe false, sets online to false', async () => {
            backendHealthService.reportRequestResult(true);
            expect(backendHealthService.isOnline()).toBe(true);

            await backendHealthService.checkNow();
            expect(backendHealthService.isOnline()).toBe(false);
        });
    });
});
