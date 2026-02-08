export interface UsageStatsRecord {
    date: string;
    tokenCount: number;
    messageCount: number;
    modelId: string;
    sessionId: string;
}

const ANALYTICS_KEY = 'inferencer-analytics';

const isUsageStatsRecord = (value: unknown): value is UsageStatsRecord => {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Record<string, unknown>;
    return typeof entry.date === 'string'
        && typeof entry.tokenCount === 'number'
        && Number.isFinite(entry.tokenCount)
        && typeof entry.messageCount === 'number'
        && Number.isFinite(entry.messageCount)
        && typeof entry.modelId === 'string'
        && typeof entry.sessionId === 'string';
};

export const readAnalyticsUsageStats = (): UsageStatsRecord[] => {
    try {
        const data = localStorage.getItem(ANALYTICS_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isUsageStatsRecord);
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
