/**
 * @jest-environment jsdom
 */
import {
    readAnalyticsUsageStats,
    sanitizeAnalyticsUsageStats,
    writeAnalyticsUsageStats,
} from '../src/renderer/services/analyticsStore';

describe('analyticsStore guards', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('sanitizes malformed records on write path', () => {
        writeAnalyticsUsageStats([
            {
                date: ' 2026-02-12 ',
                tokenCount: 42,
                messageCount: 3,
                modelId: ' model-a ',
                sessionId: ' session-a ',
            },
            {
                date: '',
                tokenCount: -1,
                messageCount: 1,
                modelId: 'x',
                sessionId: 'y',
            },
        ] as any);

        expect(readAnalyticsUsageStats()).toEqual([
            {
                date: '2026-02-12',
                tokenCount: 42,
                messageCount: 3,
                modelId: 'model-a',
                sessionId: 'session-a',
            },
        ]);
    });

    it('normalizes arbitrary payload shapes through sanitizer helper', () => {
        expect(sanitizeAnalyticsUsageStats(null)).toEqual([]);
        expect(sanitizeAnalyticsUsageStats([{ date: 'x' }])).toEqual([]);
        expect(sanitizeAnalyticsUsageStats([
            {
                date: '2026-02-12',
                tokenCount: 1,
                messageCount: 2,
                modelId: 'model-a',
                sessionId: 'session-a',
            },
        ])).toEqual([
            {
                date: '2026-02-12',
                tokenCount: 1,
                messageCount: 2,
                modelId: 'model-a',
                sessionId: 'session-a',
            },
        ]);
    });
});
