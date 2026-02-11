import {
    loadActivityLogService,
    loadAnalyticsStore,
} from '../src/renderer/lib/chatLazyServices';

describe('chatLazyServices', () => {
    it('reuses analytics store module promise', async () => {
        const first = await loadAnalyticsStore();
        const second = await loadAnalyticsStore();
        expect(first).toBe(second);
    });

    it('reuses activity log service instance promise', async () => {
        const first = await loadActivityLogService();
        const second = await loadActivityLogService();
        expect(first).toBe(second);
    });
});
