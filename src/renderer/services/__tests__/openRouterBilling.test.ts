/**
 * @jest-environment jsdom
 */

import {
    buildOpenRouterBillingCsv,
    buildOpenRouterBillingReconciliation,
    clearOpenRouterBillingCache,
    fetchOpenRouterAuthoritativeBillingWithCache,
    isCachedBillingFresh,
    loadOpenRouterBillingCache,
    OpenRouterBillingError,
    fetchOpenRouterAuthoritativeBilling,
    paginateOpenRouterBillingHistory,
    parseOpenRouterCreditsPayload,
    parseOpenRouterBillingCache,
    parseOpenRouterKeyPayload,
    persistOpenRouterBillingCache,
    resolveOpenRouterAuthoritativeBilling,
} from '../openRouterBilling';

const createJsonResponse = (payload: unknown, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
} as Response);

describe('openRouterBilling', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('parses credits and key payload fields defensively', () => {
        expect(parseOpenRouterCreditsPayload({
            data: { total_credits: '12.50', total_usage: 4.125 },
        })).toEqual({
            totalCredits: 12.5,
            totalUsage: 4.125,
        });

        expect(parseOpenRouterKeyPayload({
            data: { usage: '5.6', limit: '20', limit_remaining: 14.4 },
        })).toEqual({
            usage: 5.6,
            limit: 20,
            limitRemaining: 14.4,
        });
    });

    it('resolves authoritative billing with stable precedence', () => {
        const resolved = resolveOpenRouterAuthoritativeBilling(
            { totalCredits: 20, totalUsage: 7.1 },
            { usage: 7.3, limit: 30, limitRemaining: 22.7 },
            '2026-02-12T00:00:00.000Z'
        );

        expect(resolved).toEqual({
            usedUsd: 7.1,
            limitUsd: 30,
            remainingUsd: 22.7,
            source: 'credits+key',
            fetchedAt: '2026-02-12T00:00:00.000Z',
        });
    });

    it('falls back to /key data when /credits is unavailable', async () => {
        const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
            .mockResolvedValueOnce(createJsonResponse({ error: { message: 'forbidden' } }, 403))
            .mockResolvedValueOnce(createJsonResponse({ data: { usage: 2.75, limit: 10, limit_remaining: 7.25 } }, 200));
        global.fetch = fetchMock as unknown as typeof fetch;

        const billing = await fetchOpenRouterAuthoritativeBilling('test-key');

        expect(billing.usedUsd).toBe(2.75);
        expect(billing.limitUsd).toBe(10);
        expect(billing.remainingUsd).toBe(7.25);
        expect(billing.source).toBe('key');
    });

    it('throws a readable error when both authoritative endpoints fail', async () => {
        const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
            .mockResolvedValueOnce(createJsonResponse({ error: { message: 'forbidden' } }, 403))
            .mockResolvedValueOnce(createJsonResponse({ error: { message: 'unauthorized' } }, 401));
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(fetchOpenRouterAuthoritativeBilling('bad-key'))
            .rejects
            .toBeInstanceOf(OpenRouterBillingError);
    });

    it('parses and persists cache snapshots safely', () => {
        const parsed = parseOpenRouterBillingCache(JSON.stringify({
            latest: {
                usedUsd: 1.2,
                limitUsd: 5,
                remainingUsd: 3.8,
                source: 'credits',
                fetchedAt: '2026-02-12T00:00:00.000Z',
            },
            history: [
                {
                    usedUsd: 0.8,
                    limitUsd: 5,
                    remainingUsd: 4.2,
                    source: 'credits',
                    fetchedAt: '2026-02-11T23:00:00.000Z',
                },
            ],
        }));

        expect(parsed.latest?.usedUsd).toBe(1.2);
        expect(parsed.history).toHaveLength(1);

        persistOpenRouterBillingCache(parsed);
        const loaded = loadOpenRouterBillingCache();
        expect(loaded.latest?.usedUsd).toBe(1.2);
        expect(loaded.history).toHaveLength(1);
    });

    it('reuses fresh cached billing when within max age', async () => {
        persistOpenRouterBillingCache({
            latest: {
                usedUsd: 2.5,
                limitUsd: 10,
                remainingUsd: 7.5,
                source: 'key',
                fetchedAt: new Date().toISOString(),
            },
            history: [
                {
                    usedUsd: 2.5,
                    limitUsd: 10,
                    remainingUsd: 7.5,
                    source: 'key',
                    fetchedAt: new Date().toISOString(),
                },
            ],
        });

        const fetchSpy = jest.fn();
        global.fetch = fetchSpy as unknown as typeof fetch;
        const result = await fetchOpenRouterAuthoritativeBillingWithCache('test-key');

        expect(result.fromCache).toBe(true);
        expect(result.billing.usedUsd).toBe(2.5);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('paginates history with latest page first', () => {
        const history = [
            { usedUsd: 1, limitUsd: 10, remainingUsd: 9, source: 'key', fetchedAt: '2026-02-11T00:00:00.000Z' },
            { usedUsd: 2, limitUsd: 10, remainingUsd: 8, source: 'key', fetchedAt: '2026-02-12T00:00:00.000Z' },
            { usedUsd: 3, limitUsd: 10, remainingUsd: 7, source: 'key', fetchedAt: '2026-02-13T00:00:00.000Z' },
        ] as const;

        const latestPage = paginateOpenRouterBillingHistory([...history], 0, 2);
        expect(latestPage.items.map((item) => item.usedUsd)).toEqual([2, 3]);
        expect(latestPage.hasOlder).toBe(true);

        const olderPage = paginateOpenRouterBillingHistory([...history], 1, 2);
        expect(olderPage.items.map((item) => item.usedUsd)).toEqual([1]);
        expect(olderPage.hasNewer).toBe(true);
    });

    it('clears cache entries explicitly', () => {
        persistOpenRouterBillingCache({
            latest: {
                usedUsd: 1,
                limitUsd: 2,
                remainingUsd: 1,
                source: 'credits',
                fetchedAt: '2026-02-12T00:00:00.000Z',
            },
            history: [],
        });
        expect(loadOpenRouterBillingCache().latest).not.toBeNull();
        clearOpenRouterBillingCache();
        expect(loadOpenRouterBillingCache().latest).toBeNull();
    });

    it('validates cached freshness windows', () => {
        expect(isCachedBillingFresh(null)).toBe(false);
        expect(isCachedBillingFresh({
            usedUsd: 1,
            limitUsd: 5,
            remainingUsd: 4,
            source: 'credits',
            fetchedAt: new Date().toISOString(),
        }, 10_000)).toBe(true);
    });

    it('builds reconciliation metrics from local vs authoritative usage', () => {
        const reconciliation = buildOpenRouterBillingReconciliation(4, {
            usedUsd: 5,
            remainingUsd: 10,
            limitUsd: 15,
            source: 'credits',
            fetchedAt: '2026-02-12T00:00:00.000Z',
        });

        expect(reconciliation).toEqual({
            localEstimatedCostUsd: 4,
            authoritativeUsedUsd: 5,
            driftUsd: -1,
            driftPercent: -20,
        });
    });

    it('builds CSV with snapshot and reconciliation rows', () => {
        const csv = buildOpenRouterBillingCsv(
            [
                {
                    usedUsd: 1.5,
                    remainingUsd: 8.5,
                    limitUsd: 10,
                    source: 'key',
                    fetchedAt: '2026-02-12T00:00:00.000Z',
                },
            ],
            2,
            {
                usedUsd: 1.5,
                remainingUsd: 8.5,
                limitUsd: 10,
                source: 'key',
                fetchedAt: '2026-02-12T00:00:00.000Z',
            }
        );

        expect(csv).toContain('row_type,timestamp_iso,source,used_usd,remaining_usd,limit_usd,local_estimated_cost_usd,drift_usd,drift_percent');
        expect(csv).toContain('snapshot,2026-02-12T00:00:00.000Z,key,1.5,8.5,10,,,');
        expect(csv).toContain('reconciliation_latest,2026-02-12T00:00:00.000Z,key,1.5,8.5,10,2,0.5,33.333333');
    });
});
