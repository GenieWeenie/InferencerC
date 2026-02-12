import { buildOpenRouterUsageStats } from '../settingsStorage';

describe('buildOpenRouterUsageStats', () => {
    it('counts only openrouter usage records', () => {
        const stats = buildOpenRouterUsageStats([
            {
                date: '2026-02-12',
                tokenCount: 1000,
                messageCount: 1,
                modelId: 'openrouter/stepfun/step-3.5-flash:free',
                sessionId: 's1',
            },
            {
                date: '2026-02-12',
                tokenCount: 500,
                messageCount: 1,
                modelId: 'local-lmstudio',
                sessionId: 's2',
            },
            {
                date: '2026-02-12',
                tokenCount: 300,
                messageCount: 1,
                modelId: 'openrouter/openai/gpt-4o-mini',
                sessionId: 's1',
            },
        ]);

        expect(stats.totalTokens).toBe(1300);
        expect(stats.sessionCount).toBe(1);
        expect(stats.estimatedCost).toBeCloseTo(0.0026, 6);
    });
});
