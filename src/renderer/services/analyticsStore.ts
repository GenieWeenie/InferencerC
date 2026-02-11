export interface UsageStatsRecord {
    date: string;
    tokenCount: number;
    messageCount: number;
    modelId: string;
    sessionId: string;
}

const ANALYTICS_KEY = 'inferencer-analytics';

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return value;
};

const sanitizeUsageStatsRecord = (value: unknown): UsageStatsRecord | null => {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    const date = sanitizeNonEmptyString(entry.date);
    const modelId = sanitizeNonEmptyString(entry.modelId);
    const sessionId = sanitizeNonEmptyString(entry.sessionId);
    const tokenCount = sanitizeFiniteNonNegativeNumber(entry.tokenCount);
    const messageCount = sanitizeFiniteNonNegativeNumber(entry.messageCount);
    if (!date || !modelId || !sessionId || tokenCount === null || messageCount === null) {
        return null;
    }
    return {
        date,
        tokenCount,
        messageCount,
        modelId,
        sessionId,
    };
};

export const readAnalyticsUsageStats = (): UsageStatsRecord[] => {
    try {
        const data = localStorage.getItem(ANALYTICS_KEY);
        if (!data) return [];
        const parsed = parseJson(data);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => sanitizeUsageStatsRecord(entry))
            .filter((entry): entry is UsageStatsRecord => entry !== null);
    } catch (error) {
        console.error('Failed to load analytics:', error);
        return [];
    }
};

export const writeAnalyticsUsageStats = (stats: UsageStatsRecord[]): void => {
    try {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(stats));
    } catch (error) {
        console.error('Failed to save analytics:', error);
    }
};

export const clearAnalyticsUsageStats = (): void => {
    localStorage.removeItem(ANALYTICS_KEY);
};
