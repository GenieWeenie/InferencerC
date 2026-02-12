/**
 * @jest-environment jsdom
 */

import {
    buildOpenRouterDailySpend,
    buildOpenRouterBillingCsv,
    buildOpenRouterBillingReconciliation,
    buildOpenRouterModelCostBreakdown,
    clearOpenRouterActivityCache,
    clearOpenRouterBillingCache,
    fetchOpenRouterActivityWithCache,
    fetchOpenRouterAuthoritativeBillingWithCache,
    isCachedBillingFresh,
    isCachedActivityFresh,
    loadOpenRouterActivityCache,
    loadOpenRouterBillingCache,
    OpenRouterBillingError,
    fetchOpenRouterAuthoritativeBilling,
    parseOpenRouterActivityCache,
    parseOpenRouterActivityPayload,
    paginateOpenRouterBillingHistory,
    parseOpenRouterCreditsPayload,
    parseOpenRouterBillingCache,
    parseOpenRouterKeyPayload,
    persistOpenRouterActivityCache,
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

    it('parses authoritative activity payload rows and aggregates duplicate model-day records', () => {
        const rows = parseOpenRouterActivityPayload({
            data: [
                { date: '2026-02-12', model: 'openrouter/model-a', usage: 1.2, requests: 2, prompt_tokens: 100, completion_tokens: 120 },
                { date: '2026-02-12T09:10:00.000Z', model: 'openrouter/model-a', usage: 0.3, requests: 1, prompt_tokens: 20, completion_tokens: 40 },
                { date: '2026-02-13', model_permaslug: 'openrouter/model-b', usage: '2.5', requests: '3' },
            ],
        });

        expect(rows).toEqual([
            {
                date: '2026-02-12',
                model: 'openrouter/model-a',
                usageUsd: 1.5,
                requests: 3,
                promptTokens: 120,
                completionTokens: 160,
                reasoningTokens: 0,
                byokUsageInferenceUsd: 0,
            },
            {
                date: '2026-02-13',
                model: 'openrouter/model-b',
                usageUsd: 2.5,
                requests: 3,
                promptTokens: null,
                completionTokens: null,
                reasoningTokens: null,
                byokUsageInferenceUsd: null,
            },
        ]);
    });

    it('builds daily spend and per-model cost breakdown from activity rows', () => {
        const rows = [
            { date: '2026-02-12', model: 'a', usageUsd: 1, requests: 1, promptTokens: 10, completionTokens: 20, reasoningTokens: 0, byokUsageInferenceUsd: null },
            { date: '2026-02-12', model: 'b', usageUsd: 3, requests: 4, promptTokens: 40, completionTokens: 50, reasoningTokens: 5, byokUsageInferenceUsd: null },
            { date: '2026-02-13', model: 'a', usageUsd: 2, requests: 2, promptTokens: 20, completionTokens: 30, reasoningTokens: 1, byokUsageInferenceUsd: null },
        ];

        expect(buildOpenRouterDailySpend(rows)).toEqual([
            { date: '2026-02-12', usageUsd: 4 },
            { date: '2026-02-13', usageUsd: 2 },
        ]);

        expect(buildOpenRouterModelCostBreakdown(rows)).toEqual([
            {
                model: 'a',
                usageUsd: 3,
                sharePercent: 50,
                requests: 3,
                promptTokens: 30,
                completionTokens: 50,
                reasoningTokens: 1,
            },
            {
                model: 'b',
                usageUsd: 3,
                sharePercent: 50,
                requests: 4,
                promptTokens: 40,
                completionTokens: 50,
                reasoningTokens: 5,
            },
        ]);
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

    it('parses and persists activity cache snapshots safely', () => {
        const parsed = parseOpenRouterActivityCache(JSON.stringify({
            fetchedAt: '2026-02-12T00:00:00.000Z',
            rows: [
                {
                    date: '2026-02-12',
                    model: 'openrouter/model-a',
                    usage: 1.75,
                    requests: 2,
                    prompt_tokens: 100,
                    completion_tokens: 120,
                },
            ],
        }));

        expect(parsed.fetchedAt).toBe('2026-02-12T00:00:00.000Z');
        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]?.usageUsd).toBe(1.75);

        persistOpenRouterActivityCache(parsed);
        const loaded = loadOpenRouterActivityCache();
        expect(loaded.fetchedAt).toBe('2026-02-12T00:00:00.000Z');
        expect(loaded.rows[0]?.usageUsd).toBe(1.75);
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

    it('fetches activity and reuses fresh activity cache', async () => {
        const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
            .mockResolvedValueOnce(createJsonResponse({
                data: [
                    { date: '2026-02-12', model: 'openrouter/model-a', usage: 1.2, requests: 2 },
                ],
            }, 200));
        global.fetch = fetchMock as unknown as typeof fetch;

        const first = await fetchOpenRouterActivityWithCache('test-key', { forceRefresh: true });
        expect(first.fromCache).toBe(false);
        expect(first.rows[0]?.model).toBe('openrouter/model-a');
        expect(first.rows[0]?.usageUsd).toBe(1.2);

        fetchMock.mockClear();
        const second = await fetchOpenRouterActivityWithCache('test-key');
        expect(second.fromCache).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
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

    it('clears activity cache entries explicitly', () => {
        persistOpenRouterActivityCache({
            fetchedAt: '2026-02-12T00:00:00.000Z',
            rows: [
                {
                    date: '2026-02-12',
                    model: 'openrouter/model-a',
                    usageUsd: 1,
                    requests: 1,
                    promptTokens: 10,
                    completionTokens: 20,
                    reasoningTokens: 0,
                    byokUsageInferenceUsd: null,
                },
            ],
        });
        expect(loadOpenRouterActivityCache().rows).toHaveLength(1);
        clearOpenRouterActivityCache();
        expect(loadOpenRouterActivityCache().rows).toHaveLength(0);
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
        expect(isCachedActivityFresh(new Date().toISOString(), 10_000)).toBe(true);
        expect(isCachedActivityFresh(null, 10_000)).toBe(false);
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
