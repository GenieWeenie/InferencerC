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

export type OpenRouterBillingCacheState = {
    latest: OpenRouterAuthoritativeBilling | null;
    history: OpenRouterAuthoritativeBilling[];
};

export type OpenRouterBillingHistoryPage = {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNewer: boolean;
    hasOlder: boolean;
    items: OpenRouterAuthoritativeBilling[];
};

export type OpenRouterAuthoritativeBillingFetchResult = {
    billing: OpenRouterAuthoritativeBilling;
    fromCache: boolean;
    history: OpenRouterAuthoritativeBilling[];
};

export type OpenRouterBillingReconciliation = {
    localEstimatedCostUsd: number;
    authoritativeUsedUsd: number | null;
    driftUsd: number | null;
    driftPercent: number | null;
};

export type OpenRouterActivityRow = {
    date: string; // YYYY-MM-DD
    model: string;
    usageUsd: number;
    requests: number | null;
    promptTokens: number | null;
    completionTokens: number | null;
    reasoningTokens: number | null;
    byokUsageInferenceUsd: number | null;
};

export type OpenRouterActivityCacheState = {
    fetchedAt: string | null;
    rows: OpenRouterActivityRow[];
};

export type OpenRouterActivityFetchResult = {
    rows: OpenRouterActivityRow[];
    fetchedAt: string;
    fromCache: boolean;
};

export type OpenRouterDailySpendPoint = {
    date: string;
    usageUsd: number;
};

export type OpenRouterModelCostBreakdownRow = {
    model: string;
    usageUsd: number;
    sharePercent: number;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    reasoningTokens: number;
};

const OPENROUTER_CREDITS_URL = 'https://openrouter.ai/api/v1/credits';
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key';
const OPENROUTER_ACTIVITY_URL = 'https://openrouter.ai/api/v1/activity';
const OPENROUTER_BILLING_CACHE_KEY = 'openrouter_authoritative_billing_cache_v1';
const OPENROUTER_ACTIVITY_CACHE_KEY = 'openrouter_authoritative_activity_cache_v1';
const CURRENCY_PRECISION = 1_000_000;
const DEFAULT_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_HISTORY_SNAPSHOTS = 1_008; // ~7 days at 10-minute fetch cadence.
const DEFAULT_HISTORY_PAGE_SIZE = 12;

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

const sanitizeFiniteNonNegativeInteger = (value: unknown): number | null => {
    const parsed = sanitizeFiniteNumber(value);
    if (parsed === null || parsed < 0) {
        return null;
    }
    return Math.floor(parsed);
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

const getPayloadArray = (payload: unknown): unknown[] | null => {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (!isRecord(payload)) {
        return null;
    }
    if (Array.isArray(payload.data)) {
        return payload.data;
    }
    if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
        return payload.data.items;
    }
    return null;
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

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const normalizeDateKey = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString().slice(0, 10);
};

const sanitizeSource = (value: unknown): OpenRouterSource | null => {
    if (value === 'credits' || value === 'key' || value === 'credits+key') {
        return value;
    }
    return null;
};

const sanitizeBillingSnapshot = (value: unknown): OpenRouterAuthoritativeBilling | null => {
    if (!isRecord(value)) {
        return null;
    }

    const source = sanitizeSource(value.source);
    if (!source) {
        return null;
    }

    const fetchedAt = typeof value.fetchedAt === 'string' ? value.fetchedAt.trim() : '';
    if (!fetchedAt) {
        return null;
    }
    const timestamp = new Date(fetchedAt).getTime();
    if (!Number.isFinite(timestamp)) {
        return null;
    }

    const usedUsd = value.usedUsd === null ? null : sanitizeFiniteNumber(value.usedUsd);
    const limitUsd = value.limitUsd === null ? null : sanitizeFiniteNumber(value.limitUsd);
    const remainingUsd = value.remainingUsd === null ? null : sanitizeFiniteNumber(value.remainingUsd);
    if (usedUsd === null && limitUsd === null && remainingUsd === null) {
        return null;
    }

    return {
        usedUsd: roundCurrency(usedUsd),
        limitUsd: roundCurrency(limitUsd),
        remainingUsd: roundCurrency(remainingUsd),
        source,
        fetchedAt: new Date(timestamp).toISOString(),
    };
};

const trimHistory = (history: OpenRouterAuthoritativeBilling[]): OpenRouterAuthoritativeBilling[] => {
    if (history.length <= MAX_HISTORY_SNAPSHOTS) {
        return history;
    }
    return history.slice(history.length - MAX_HISTORY_SNAPSHOTS);
};

const normalizeHistory = (value: unknown): OpenRouterAuthoritativeBilling[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set<string>();
    const snapshots: OpenRouterAuthoritativeBilling[] = [];
    for (let index = 0; index < value.length; index++) {
        const snapshot = sanitizeBillingSnapshot(value[index]);
        if (!snapshot || seen.has(snapshot.fetchedAt)) {
            continue;
        }
        seen.add(snapshot.fetchedAt);
        snapshots.push(snapshot);
    }

    snapshots.sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());
    return trimHistory(snapshots);
};

const readLocalStorageItem = (key: string): string | null => {
    if (typeof localStorage === 'undefined') {
        return null;
    }
    return localStorage.getItem(key);
};

const writeLocalStorageItem = (key: string, value: string): void => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: string): void => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    localStorage.removeItem(key);
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

export const parseOpenRouterBillingCache = (raw: string): OpenRouterBillingCacheState => {
    const parsed = parseJson(raw);
    if (!isRecord(parsed)) {
        return {
            latest: null,
            history: [],
        };
    }

    const history = normalizeHistory(parsed.history);
    const latest = sanitizeBillingSnapshot(parsed.latest) ?? (history.length > 0 ? history[history.length - 1] : null);

    return {
        latest,
        history,
    };
};

export const loadOpenRouterBillingCache = (): OpenRouterBillingCacheState => {
    try {
        const raw = readLocalStorageItem(OPENROUTER_BILLING_CACHE_KEY);
        if (!raw) {
            return {
                latest: null,
                history: [],
            };
        }
        return parseOpenRouterBillingCache(raw);
    } catch {
        return {
            latest: null,
            history: [],
        };
    }
};

export const persistOpenRouterBillingCache = (cache: OpenRouterBillingCacheState): void => {
    const normalizedHistory = normalizeHistory(cache.history);
    const latest = cache.latest ?? (normalizedHistory.length > 0 ? normalizedHistory[normalizedHistory.length - 1] : null);
    writeLocalStorageItem(
        OPENROUTER_BILLING_CACHE_KEY,
        JSON.stringify({
            latest,
            history: normalizedHistory,
        })
    );
};

export const clearOpenRouterBillingCache = (): void => {
    removeLocalStorageItem(OPENROUTER_BILLING_CACHE_KEY);
};

const sanitizeActivityRow = (value: unknown): OpenRouterActivityRow | null => {
    if (!isRecord(value)) {
        return null;
    }

    const date = normalizeDateKey(value.date);
    if (!date) {
        return null;
    }

    const usageUsd = firstNonNull(
        sanitizeFiniteNumber(value.usage),
        sanitizeFiniteNumber(value.usageUsd)
    );
    if (usageUsd === null || usageUsd < 0) {
        return null;
    }

    const model = (
        typeof value.model === 'string' && value.model.trim().length > 0
            ? value.model.trim()
            : typeof value.model_permaslug === 'string' && value.model_permaslug.trim().length > 0
                ? value.model_permaslug.trim()
                : typeof value.endpoint_id === 'string' && value.endpoint_id.trim().length > 0
                    ? value.endpoint_id.trim()
                    : 'unknown'
    );

    return {
        date,
        model,
        usageUsd: roundCurrency(usageUsd) ?? 0,
        requests: firstNonNull(
            sanitizeFiniteNonNegativeInteger(value.requests),
            sanitizeFiniteNonNegativeInteger(value.requestCount)
        ),
        promptTokens: firstNonNull(
            sanitizeFiniteNonNegativeInteger(value.prompt_tokens),
            sanitizeFiniteNonNegativeInteger(value.promptTokens)
        ),
        completionTokens: firstNonNull(
            sanitizeFiniteNonNegativeInteger(value.completion_tokens),
            sanitizeFiniteNonNegativeInteger(value.completionTokens)
        ),
        reasoningTokens: firstNonNull(
            sanitizeFiniteNonNegativeInteger(value.reasoning_tokens),
            sanitizeFiniteNonNegativeInteger(value.reasoningTokens)
        ),
        byokUsageInferenceUsd: roundCurrency(firstNonNull(
            sanitizeFiniteNumber(value.byok_usage_inference),
            sanitizeFiniteNumber(value.byokUsageInferenceUsd)
        )),
    };
};

const normalizeActivityRows = (rows: unknown): OpenRouterActivityRow[] => {
    if (!Array.isArray(rows)) {
        return [];
    }

    const deduped = new Map<string, OpenRouterActivityRow>();
    for (let index = 0; index < rows.length; index++) {
        const row = sanitizeActivityRow(rows[index]);
        if (!row) {
            continue;
        }
        const dedupeKey = `${row.date}|${row.model}`;
        const existing = deduped.get(dedupeKey);
        if (!existing) {
            deduped.set(dedupeKey, row);
            continue;
        }
        deduped.set(dedupeKey, {
            ...existing,
            usageUsd: roundCurrency(existing.usageUsd + row.usageUsd) ?? existing.usageUsd + row.usageUsd,
            requests: (existing.requests ?? 0) + (row.requests ?? 0),
            promptTokens: (existing.promptTokens ?? 0) + (row.promptTokens ?? 0),
            completionTokens: (existing.completionTokens ?? 0) + (row.completionTokens ?? 0),
            reasoningTokens: (existing.reasoningTokens ?? 0) + (row.reasoningTokens ?? 0),
            byokUsageInferenceUsd: roundCurrency((existing.byokUsageInferenceUsd ?? 0) + (row.byokUsageInferenceUsd ?? 0)),
        });
    }

    return Array.from(deduped.values()).sort((a, b) => {
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return a.model.localeCompare(b.model);
    });
};

export const parseOpenRouterActivityPayload = (payload: unknown): OpenRouterActivityRow[] => {
    return normalizeActivityRows(getPayloadArray(payload));
};

export const parseOpenRouterActivityCache = (raw: string): OpenRouterActivityCacheState => {
    const parsed = parseJson(raw);
    if (!isRecord(parsed)) {
        return {
            fetchedAt: null,
            rows: [],
        };
    }

    const fetchedAt = typeof parsed.fetchedAt === 'string' && Number.isFinite(new Date(parsed.fetchedAt).getTime())
        ? new Date(parsed.fetchedAt).toISOString()
        : null;

    return {
        fetchedAt,
        rows: normalizeActivityRows(parsed.rows),
    };
};

export const loadOpenRouterActivityCache = (): OpenRouterActivityCacheState => {
    try {
        const raw = readLocalStorageItem(OPENROUTER_ACTIVITY_CACHE_KEY);
        if (!raw) {
            return {
                fetchedAt: null,
                rows: [],
            };
        }
        return parseOpenRouterActivityCache(raw);
    } catch {
        return {
            fetchedAt: null,
            rows: [],
        };
    }
};

export const persistOpenRouterActivityCache = (cache: OpenRouterActivityCacheState): void => {
    const fetchedAt = typeof cache.fetchedAt === 'string' && Number.isFinite(new Date(cache.fetchedAt).getTime())
        ? new Date(cache.fetchedAt).toISOString()
        : null;
    writeLocalStorageItem(
        OPENROUTER_ACTIVITY_CACHE_KEY,
        JSON.stringify({
            fetchedAt,
            rows: normalizeActivityRows(cache.rows),
        })
    );
};

export const clearOpenRouterActivityCache = (): void => {
    removeLocalStorageItem(OPENROUTER_ACTIVITY_CACHE_KEY);
};

export const isCachedActivityFresh = (
    fetchedAt: string | null,
    maxAgeMs: number = DEFAULT_CACHE_MAX_AGE_MS
): boolean => {
    if (!fetchedAt) {
        return false;
    }
    const fetchedAtMs = new Date(fetchedAt).getTime();
    if (!Number.isFinite(fetchedAtMs)) {
        return false;
    }
    const ageMs = Date.now() - fetchedAtMs;
    return ageMs >= 0 && ageMs <= maxAgeMs;
};

export const buildOpenRouterDailySpend = (rows: OpenRouterActivityRow[]): OpenRouterDailySpendPoint[] => {
    const daily = new Map<string, number>();
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        daily.set(row.date, (daily.get(row.date) ?? 0) + row.usageUsd);
    }

    return Array.from(daily.entries())
        .map(([date, usageUsd]) => ({
            date,
            usageUsd: roundCurrency(usageUsd) ?? usageUsd,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
};

export const buildOpenRouterModelCostBreakdown = (rows: OpenRouterActivityRow[]): OpenRouterModelCostBreakdownRow[] => {
    const byModel = new Map<string, OpenRouterModelCostBreakdownRow>();
    let totalUsage = 0;

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        totalUsage += row.usageUsd;
        const existing = byModel.get(row.model) ?? {
            model: row.model,
            usageUsd: 0,
            sharePercent: 0,
            requests: 0,
            promptTokens: 0,
            completionTokens: 0,
            reasoningTokens: 0,
        };
        existing.usageUsd += row.usageUsd;
        existing.requests += row.requests ?? 0;
        existing.promptTokens += row.promptTokens ?? 0;
        existing.completionTokens += row.completionTokens ?? 0;
        existing.reasoningTokens += row.reasoningTokens ?? 0;
        byModel.set(row.model, existing);
    }

    const denominator = totalUsage > 0 ? totalUsage : 0;
    return Array.from(byModel.values())
        .map((entry) => ({
            ...entry,
            usageUsd: roundCurrency(entry.usageUsd) ?? entry.usageUsd,
            sharePercent: denominator > 0
                ? roundCurrency((entry.usageUsd / denominator) * 100) ?? (entry.usageUsd / denominator) * 100
                : 0,
        }))
        .sort((a, b) => {
            if (b.usageUsd !== a.usageUsd) {
                return b.usageUsd - a.usageUsd;
            }
            return a.model.localeCompare(b.model);
        });
};

const appendBillingSnapshot = (
    history: OpenRouterAuthoritativeBilling[],
    snapshot: OpenRouterAuthoritativeBilling
): OpenRouterAuthoritativeBilling[] => {
    const normalizedHistory = normalizeHistory(history);
    if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1]?.fetchedAt === snapshot.fetchedAt) {
        return normalizedHistory;
    }

    return trimHistory([...normalizedHistory, snapshot]);
};

const getSnapshotAgeMs = (snapshot: OpenRouterAuthoritativeBilling): number | null => {
    const snapshotMs = new Date(snapshot.fetchedAt).getTime();
    if (!Number.isFinite(snapshotMs)) {
        return null;
    }
    return Date.now() - snapshotMs;
};

const roundReconciliationValue = (value: number): number => {
    return Math.round(value * CURRENCY_PRECISION) / CURRENCY_PRECISION;
};

const formatCsvField = (value: string | number | null): string => {
    if (value === null) {
        return '';
    }
    const raw = typeof value === 'number' ? String(value) : value;
    if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
};

const formatOptionalNumericCsvField = (value: number | null): string => {
    return value === null ? '' : formatCsvField(value);
};

export const isCachedBillingFresh = (
    snapshot: OpenRouterAuthoritativeBilling | null,
    maxAgeMs: number = DEFAULT_CACHE_MAX_AGE_MS
): boolean => {
    if (!snapshot) {
        return false;
    }
    const ageMs = getSnapshotAgeMs(snapshot);
    if (ageMs === null) {
        return false;
    }
    return ageMs >= 0 && ageMs <= maxAgeMs;
};

export const buildOpenRouterBillingReconciliation = (
    localEstimatedCostUsd: number,
    authoritative: OpenRouterAuthoritativeBilling | null
): OpenRouterBillingReconciliation => {
    const safeLocalEstimate = Number.isFinite(localEstimatedCostUsd) ? localEstimatedCostUsd : 0;
    const authoritativeUsed = authoritative?.usedUsd ?? null;
    if (authoritativeUsed === null) {
        return {
            localEstimatedCostUsd: safeLocalEstimate,
            authoritativeUsedUsd: null,
            driftUsd: null,
            driftPercent: null,
        };
    }

    const driftUsd = safeLocalEstimate - authoritativeUsed;
    const driftPercent = authoritativeUsed === 0
        ? (safeLocalEstimate === 0 ? 0 : null)
        : (driftUsd / authoritativeUsed) * 100;

    return {
        localEstimatedCostUsd: roundReconciliationValue(safeLocalEstimate),
        authoritativeUsedUsd: roundReconciliationValue(authoritativeUsed),
        driftUsd: roundReconciliationValue(driftUsd),
        driftPercent: driftPercent === null ? null : roundReconciliationValue(driftPercent),
    };
};

export const buildOpenRouterBillingCsv = (
    history: OpenRouterAuthoritativeBilling[],
    localEstimatedCostUsd: number,
    latest: OpenRouterAuthoritativeBilling | null
): string => {
    const normalizedHistory = normalizeHistory(history);
    const latestSnapshot = latest ?? (normalizedHistory.length > 0 ? normalizedHistory[normalizedHistory.length - 1] : null);
    const reconciliation = buildOpenRouterBillingReconciliation(localEstimatedCostUsd, latestSnapshot);

    const header = [
        'row_type',
        'timestamp_iso',
        'source',
        'used_usd',
        'remaining_usd',
        'limit_usd',
        'local_estimated_cost_usd',
        'drift_usd',
        'drift_percent',
    ];
    const rows: string[] = [header.map((field) => formatCsvField(field)).join(',')];

    for (let index = 0; index < normalizedHistory.length; index++) {
        const snapshot = normalizedHistory[index];
        const row = [
            'snapshot',
            snapshot.fetchedAt,
            snapshot.source,
            formatOptionalNumericCsvField(snapshot.usedUsd),
            formatOptionalNumericCsvField(snapshot.remainingUsd),
            formatOptionalNumericCsvField(snapshot.limitUsd),
            '',
            '',
            '',
        ];
        rows.push(row.map((field) => formatCsvField(field)).join(','));
    }

    const reconciliationRow = [
        'reconciliation_latest',
        latestSnapshot?.fetchedAt ?? '',
        latestSnapshot?.source ?? '',
        formatOptionalNumericCsvField(latestSnapshot?.usedUsd ?? null),
        formatOptionalNumericCsvField(latestSnapshot?.remainingUsd ?? null),
        formatOptionalNumericCsvField(latestSnapshot?.limitUsd ?? null),
        formatCsvField(reconciliation.localEstimatedCostUsd),
        formatOptionalNumericCsvField(reconciliation.driftUsd),
        formatOptionalNumericCsvField(reconciliation.driftPercent),
    ];
    rows.push(reconciliationRow.map((field) => formatCsvField(field)).join(','));

    return rows.join('\n');
};

export const paginateOpenRouterBillingHistory = (
    history: OpenRouterAuthoritativeBilling[],
    page: number,
    pageSize: number = DEFAULT_HISTORY_PAGE_SIZE
): OpenRouterBillingHistoryPage => {
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_HISTORY_PAGE_SIZE;
    const normalizedHistory = normalizeHistory(history);
    const totalItems = normalizedHistory.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
    const safePage = Math.min(Math.max(0, Math.floor(page)), totalPages - 1);

    const sliceStart = Math.max(0, totalItems - (safePage + 1) * safePageSize);
    const sliceEnd = Math.max(sliceStart, totalItems - safePage * safePageSize);
    const items = normalizedHistory.slice(sliceStart, sliceEnd);

    return {
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        totalItems,
        hasNewer: safePage > 0,
        hasOlder: safePage < totalPages - 1,
        items,
    };
};

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

export const fetchOpenRouterActivity = async (apiKey: string): Promise<OpenRouterActivityRow[]> => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
        throw new OpenRouterBillingError('OpenRouter API key is required to fetch usage activity.');
    }

    const payload = await fetchOpenRouterPayload(OPENROUTER_ACTIVITY_URL, normalizedApiKey);
    const rows = parseOpenRouterActivityPayload(payload);
    if (rows.length === 0) {
        throw new OpenRouterBillingError(
            'OpenRouter activity response had no usable rows. This endpoint may require a provisioning key.'
        );
    }
    return rows;
};

export const fetchOpenRouterActivityWithCache = async (
    apiKey: string,
    options?: { forceRefresh?: boolean; maxAgeMs?: number }
): Promise<OpenRouterActivityFetchResult> => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
        throw new OpenRouterBillingError('OpenRouter API key is required to fetch usage activity.');
    }

    const forceRefresh = options?.forceRefresh === true;
    const maxAgeMs = Number.isFinite(options?.maxAgeMs) && (options?.maxAgeMs ?? 0) > 0
        ? Math.floor(options?.maxAgeMs as number)
        : DEFAULT_CACHE_MAX_AGE_MS;

    const cache = loadOpenRouterActivityCache();
    if (!forceRefresh && isCachedActivityFresh(cache.fetchedAt, maxAgeMs) && cache.rows.length > 0 && cache.fetchedAt) {
        return {
            rows: cache.rows,
            fetchedAt: cache.fetchedAt,
            fromCache: true,
        };
    }

    const rows = await fetchOpenRouterActivity(normalizedApiKey);
    const fetchedAt = new Date().toISOString();
    persistOpenRouterActivityCache({
        fetchedAt,
        rows,
    });

    return {
        rows,
        fetchedAt,
        fromCache: false,
    };
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

export const fetchOpenRouterAuthoritativeBillingWithCache = async (
    apiKey: string,
    options?: { forceRefresh?: boolean; maxAgeMs?: number }
): Promise<OpenRouterAuthoritativeBillingFetchResult> => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
        throw new OpenRouterBillingError('OpenRouter API key is required to fetch authoritative billing.');
    }

    const forceRefresh = options?.forceRefresh === true;
    const maxAgeMs = Number.isFinite(options?.maxAgeMs) && (options?.maxAgeMs ?? 0) > 0
        ? Math.floor(options?.maxAgeMs as number)
        : DEFAULT_CACHE_MAX_AGE_MS;

    const cache = loadOpenRouterBillingCache();
    if (!forceRefresh && isCachedBillingFresh(cache.latest, maxAgeMs) && cache.latest) {
        return {
            billing: cache.latest,
            fromCache: true,
            history: cache.history,
        };
    }

    const billing = await fetchOpenRouterAuthoritativeBilling(normalizedApiKey);
    const history = appendBillingSnapshot(cache.history, billing);
    persistOpenRouterBillingCache({
        latest: billing,
        history,
    });

    return {
        billing,
        fromCache: false,
        history,
    };
};
