/**
 * @jest-environment jsdom
 */

import {
    OpenRouterBillingError,
    fetchOpenRouterAuthoritativeBilling,
    parseOpenRouterCreditsPayload,
    parseOpenRouterKeyPayload,
    resolveOpenRouterAuthoritativeBilling,
} from '../openRouterBilling';

const createJsonResponse = (payload: unknown, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
} as Response);

describe('openRouterBilling', () => {
    const originalFetch = global.fetch;

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
});
