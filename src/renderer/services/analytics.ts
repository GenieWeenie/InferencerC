import { UsageStats } from '../components/AnalyticsDashboard';
import { privacyService } from './privacy';

const ANALYTICS_KEY = 'inferencer-analytics';
const MAX_HISTORY_DAYS = 30;

export class AnalyticsService {
    private static instance: AnalyticsService;

    private constructor() {}

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Check if tracking is allowed (respects privacy mode)
     */
    private canTrack(): boolean {
        return privacyService.isAnalyticsEnabled();
    }

    // Track a message
    trackMessage(sessionId: string, modelId: string, tokenCount: number): void {
        if (!this.canTrack()) return;
        const today = new Date().toISOString().split('T')[0];
        const stats = this.getUsageStats();

        const newStat: UsageStats = {
            date: today,
            tokenCount,
            messageCount: 1,
            modelId,
            sessionId,
        };

        stats.push(newStat);

        // Clean old stats (older than MAX_HISTORY_DAYS)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const filteredStats = stats.filter(s => s.date >= cutoffStr);

        this.saveUsageStats(filteredStats);
    }

    // Get all usage stats
    getUsageStats(): UsageStats[] {
        try {
            const data = localStorage.getItem(ANALYTICS_KEY);
            if (!data) return [];
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            return [];
        }
    }

    // Save usage stats
    private saveUsageStats(stats: UsageStats[]): void {
        try {
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(stats));
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    // Clear all analytics
    clearAnalytics(): void {
        localStorage.removeItem(ANALYTICS_KEY);
    }

    // Get stats summary
    getStatsSummary() {
        const stats = this.getUsageStats();

        const total = stats.reduce(
            (acc, stat) => ({
                tokens: acc.tokens + stat.tokenCount,
                messages: acc.messages + stat.messageCount,
            }),
            { tokens: 0, messages: 0 }
        );

        return {
            totalTokens: total.tokens,
            totalMessages: total.messages,
            totalSessions: new Set(stats.map(s => s.sessionId)).size,
            avgTokensPerMessage: total.messages > 0 ? Math.round(total.tokens / total.messages) : 0,
        };
    }
}

export const analyticsService = AnalyticsService.getInstance();
