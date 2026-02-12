type OpenRouterSource = 'credits' | 'key' | 'credits+key';

type OpenRouterCreditsData = {
    totalCredits: number | null;
    totalUsage: number | null;
};

type OpenRouterKeyData = {
    usage: number | null;
    limit: number | null;
    limitRemaining: number | null;
};

export type OpenRouterAuthoritativeBilling = {
    usedUsd: number | null;
    limitUsd: number | null;
    remainingUsd: number | null;
    source: OpenRouterSource;
    fetchedAt: string;
};

const OPENROUTER_CREDITS_URL = 'https://openrouter.ai/api/v1/credits';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const CURRENCY_PRECISION = 1_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const sanitizeFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

const roundCurrency = (value: number | null): number | null => {
    if (value === null) {
        return null;
    }
    return Math.round(value * CURRENCY_PRECISION) / CURRENCY_PRECISION;
};

const getPayloadData = (payload: unknown): Record<string, unknown> | null => {
    if (!isRecord(payload)) {
        return null;
    }

    const data = payload.data;
    if (!isRecord(data)) {
        return null;
    }

    return data;
};

const firstNonNull = (...values: Array<number | null>): number | null => {
    for (let index = 0; index < values.length; index++) {
        const value = values[index];
        if (value !== null) {
            return value;
        }
    }
    return null;
};

const extractErrorMessage = (payload: unknown): string | null => {
    if (!isRecord(payload)) {
        return null;
    }

    const nestedError = payload.error;
    if (isRecord(nestedError)) {
        const message = nestedError.message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message.trim();
        }
    }

    const topLevelMessage = payload.message;
    if (typeof topLevelMessage === 'string' && topLevelMessage.trim().length > 0) {
        return topLevelMessage.trim();
    }

    return null;
};

const parseResponsePayload = async (response: Response): Promise<unknown> => {
    const rawBody = await response.text();
    if (!rawBody || rawBody.trim().length === 0) {
        return null;
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        return rawBody;
    }
};

const computeFromLimit = (limit: number | null, remaining: number | null): number | null => {
    if (limit === null || remaining === null) {
        return null;
    }
    return limit - remaining;
};

export class OpenRouterBillingError extends Error {
    status: number | null;

    constructor(message: string, status: number | null = null) {
        super(message);
        this.name = 'OpenRouterBillingError';
        this.status = status;
    }
}

export const parseOpenRouterCreditsPayload = (payload: unknown): OpenRouterCreditsData | null => {
    const data = getPayloadData(payload);
    if (!data) {
        return null;
    }

    const totalCredits = sanitizeFiniteNumber(data.total_credits);
    const totalUsage = sanitizeFiniteNumber(data.total_usage);

    if (totalCredits === null && totalUsage === null) {
        return null;
    }

    return {
        totalCredits,
        totalUsage,
    };
};

export const parseOpenRouterKeyPayload = (payload: unknown): OpenRouterKeyData | null => {
    const data = getPayloadData(payload);
    if (!data) {
        return null;
    }

    const usage = sanitizeFiniteNumber(data.usage);
    const limit = data.limit === null ? null : sanitizeFiniteNumber(data.limit);
    const limitRemaining = data.limit_remaining === null ? null : sanitizeFiniteNumber(data.limit_remaining);

    if (usage === null && limit === null && limitRemaining === null) {
        return null;
    }

    return {
        usage,
        limit,
        limitRemaining,
    };
};

export const resolveOpenRouterAuthoritativeBilling = (
    credits: OpenRouterCreditsData | null,
    key: OpenRouterKeyData | null,
    fetchedAt: string
): OpenRouterAuthoritativeBilling | null => {
    if (!credits && !key) {
        return null;
    }

    const usedFromCredits = credits?.totalUsage ?? null;
    const usedFromKey = key?.usage ?? null;
    const usedFromKeyLimit = computeFromLimit(key?.limit ?? null, key?.limitRemaining ?? null);
    const usedUsd = firstNonNull(usedFromCredits, usedFromKey, usedFromKeyLimit);

    const limitFromKey = key?.limit ?? null;
    const limitFromCredits = credits?.totalCredits ?? null;
    const limitUsd = firstNonNull(limitFromKey, limitFromCredits);

    const remainingFromKey = key?.limitRemaining ?? null;
    const remainingFromCredits = credits && credits.totalCredits !== null && credits.totalUsage !== null
        ? credits.totalCredits - credits.totalUsage
        : null;
    const remainingFromLimit = limitUsd !== null && usedUsd !== null
        ? limitUsd - usedUsd
        : null;
    const remainingUsd = firstNonNull(remainingFromKey, remainingFromCredits, remainingFromLimit);

    if (usedUsd === null && limitUsd === null && remainingUsd === null) {
        return null;
    }

    return {
        usedUsd: roundCurrency(usedUsd),
        limitUsd: roundCurrency(limitUsd),
        remainingUsd: roundCurrency(remainingUsd),
        source: credits && key ? 'credits+key' : credits ? 'credits' : 'key',
        fetchedAt,
    };
};

const fetchOpenRouterPayload = async (url: string, apiKey: string): Promise<unknown> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
    });

    const payload = await parseResponsePayload(response);
    if (response.ok) {
        return payload;
    }

    const errorMessage = extractErrorMessage(payload);
    const statusMessage = `HTTP ${response.status}`;
    const urlLabel = url.endsWith('/credits') ? '/credits' : '/key';
    const message = errorMessage
        ? `OpenRouter ${urlLabel} request failed (${statusMessage}): ${errorMessage}`
        : `OpenRouter ${urlLabel} request failed (${statusMessage}).`;
    throw new OpenRouterBillingError(message, response.status);
};

const toBillingError = (error: unknown): OpenRouterBillingError => {
    if (error instanceof OpenRouterBillingError) {
        return error;
    }

    if (error instanceof Error) {
        return new OpenRouterBillingError(error.message);
    }

    return new OpenRouterBillingError('Unknown OpenRouter billing error.');
};

export const fetchOpenRouterAuthoritativeBilling = async (apiKey: string): Promise<OpenRouterAuthoritativeBilling> => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
        throw new OpenRouterBillingError('OpenRouter API key is required to fetch authoritative billing.');
    }

    let creditsPayload: unknown = null;
    let keyPayload: unknown = null;
    let creditsError: OpenRouterBillingError | null = null;
    let keyError: OpenRouterBillingError | null = null;

    try {
        creditsPayload = await fetchOpenRouterPayload(OPENROUTER_CREDITS_URL, normalizedApiKey);
    } catch (error) {
        creditsError = toBillingError(error);
    }

    try {
        keyPayload = await fetchOpenRouterPayload(OPENROUTER_KEY_URL, normalizedApiKey);
    } catch (error) {
        keyError = toBillingError(error);
    }

    const resolved = resolveOpenRouterAuthoritativeBilling(
        parseOpenRouterCreditsPayload(creditsPayload),
        parseOpenRouterKeyPayload(keyPayload),
        new Date().toISOString()
    );

    if (resolved) {
        return resolved;
    }

    if (creditsError && keyError) {
        throw new OpenRouterBillingError(`${creditsError.message} ${keyError.message}`.trim());
    }

    if (creditsError) {
        throw creditsError;
    }

    if (keyError) {
        throw keyError;
    }

    throw new OpenRouterBillingError('OpenRouter billing response did not include usable usage fields.');
};
