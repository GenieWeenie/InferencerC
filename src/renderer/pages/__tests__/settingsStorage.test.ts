/**
 * @jest-environment jsdom
 */

import { buildOpenRouterUsageStats, readStoredBooleanWithFallback } from '../settingsStorage';

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

describe('readStoredBooleanWithFallback', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns parsed booleans when values are valid', () => {
        localStorage.setItem('flagA', 'true');
        localStorage.setItem('flagB', 'false');

        expect(readStoredBooleanWithFallback('flagA', false)).toBe(true);
        expect(readStoredBooleanWithFallback('flagB', true)).toBe(false);
    });

    it('falls back when value is missing or invalid', () => {
        localStorage.setItem('flagA', 'not-a-boolean');

        expect(readStoredBooleanWithFallback('flagA', true)).toBe(true);
        expect(readStoredBooleanWithFallback('missing', false)).toBe(false);
    });
});
