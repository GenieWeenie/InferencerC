/**
 * Conversation Analytics Service
 *
 * Analyzes conversation patterns and effectiveness:
 * - Message patterns (length, frequency, response times)
 * - Model performance comparison
 * - Conversation effectiveness metrics
 * - Topic trends and patterns
 * - User engagement metrics
 * - Regeneration and editing patterns
 */

import { ChatSession, ChatMessage } from '../../shared/types';
import { HistoryService } from './history';
import { keyPointExtractionService, ExtractionResult } from './keyPointExtraction';

// Analytics data structures
export interface ConversationMetrics {
    sessionId: string;
    title: string;
    modelId: string;
    messageCount: number;
    totalTokens: number;
    avgResponseTime: number;
    totalDuration: number; // Time from first to last message
    avgMessageLength: number;
    userMessageCount: number;
    assistantMessageCount: number;
    regenerationCount: number;
    editCount: number;
    branchCount: number;
    createdAt: number;
    lastModified: number;
    effectiveness: EffectivenessMetrics;
    topics: string[];
    sentiment?: SentimentScore;
}

export interface EffectivenessMetrics {
    completionRate: number; // 0-1: How many conversations reached a conclusion
    engagementScore: number; // 0-1: Based on message count, length, back-and-forth
    responseQuality: number; // 0-1: Based on regeneration rate, edits
    userSatisfaction?: number; // 0-1: If user ratings are available
}

export interface SentimentScore {
    overall: number; // -1 to 1 (negative to positive)
    userMessages: number;
    assistantMessages: number;
    trend: 'improving' | 'declining' | 'stable';
}

export interface ModelPerformance {
    modelId: string;
    totalConversations: number;
    avgResponseTime: number;
    avgTokensPerMessage: number;
    avgMessageLength: number;
    avgEngagementScore: number;
    avgCompletionRate: number;
    totalTokens: number;
    totalMessages: number;
}

export interface PatternAnalysis {
    peakHours: number[]; // Hours of day when most active
    peakDays: string[]; // Days of week when most active
    avgSessionDuration: number;
    avgMessagesPerSession: number;
    commonTopics: Array<{ topic: string; frequency: number }>;
    modelPreferences: Array<{ modelId: string; usage: number; avgScore: number }>;
    conversationLengths: {
        short: number; // < 10 messages
        medium: number; // 10-50 messages
        long: number; // > 50 messages
    };
}

export interface TrendData {
    date: string;
    conversations: number;
    messages: number;
    tokens: number;
    avgEngagement: number;
    topModel: string;
}

type ConversationBranchTree = {
    branches?: unknown[];
};

export class ConversationAnalyticsService {
    private static instance: ConversationAnalyticsService;
    private cache: Map<string, ConversationMetrics> = new Map();
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private constructor() {}

    static getInstance(): ConversationAnalyticsService {
        if (!ConversationAnalyticsService.instance) {
            ConversationAnalyticsService.instance = new ConversationAnalyticsService();
        }
        return ConversationAnalyticsService.instance;
    }

    /**
     * Analyze a single conversation
     */
    async analyzeConversation(sessionId: string): Promise<ConversationMetrics | null> {
        const session = HistoryService.getSession(sessionId);
        if (!session || !session.messages || session.messages.length === 0) {
            return null;
        }

        const messages = session.messages;
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        // Calculate response times (time between user message and assistant response)
        const responseTimes: number[] = [];
        for (let i = 0; i < messages.length - 1; i++) {
            if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
                const responseTime = messages[i + 1].generationTime || 0;
                if (responseTime > 0) {
                    responseTimes.push(responseTime);
                }
            }
        }

        // Estimate tokens (rough: ~4 chars per token)
        const totalTokens = messages.reduce((sum, m) => {
            return sum + Math.ceil((m.content?.length || 0) / 4);
        }, 0);

        // Calculate duration
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        const totalDuration = session.lastModified - (session.lastModified - 86400000); // Approximate

        // Count regenerations and edits (simplified: count messages with same parent)
        const regenerationCount = this.countRegenerations(messages);
        const editCount = this.countEdits(messages);

        // Extract topics using key point extraction
        const extractionResult = keyPointExtractionService.extractKeyPoints(messages);
        const topics = extractionResult.topics.slice(0, 10); // Top 10 topics

        // Calculate effectiveness metrics
        const effectiveness: EffectivenessMetrics = {
            completionRate: this.calculateCompletionRate(messages),
            engagementScore: this.calculateEngagementScore(messages, totalDuration),
            responseQuality: this.calculateResponseQuality(regenerationCount, editCount, messages.length),
        };

        // Calculate sentiment (simplified)
        const sentiment = this.calculateSentiment(messages);

        // Count branches if tree structure exists
        const branchCount = session.conversationTree
            ? this.countBranches(session.conversationTree)
            : 0;

        const metrics: ConversationMetrics = {
            sessionId: session.id,
            title: session.title,
            modelId: session.modelId,
            messageCount: messages.length,
            totalTokens,
            avgResponseTime: responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 0,
            totalDuration,
            avgMessageLength: messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length,
            userMessageCount: userMessages.length,
            assistantMessageCount: assistantMessages.length,
            regenerationCount,
            editCount,
            branchCount,
            createdAt: session.lastModified - totalDuration,
            lastModified: session.lastModified,
            effectiveness,
            topics,
            sentiment,
        };

        return metrics;
    }

    /**
     * Analyze all conversations
     */
    async analyzeAllConversations(): Promise<ConversationMetrics[]> {
        const sessions = HistoryService.getAllSessions();
        const metrics: ConversationMetrics[] = [];

        for (const session of sessions) {
            const metric = await this.analyzeConversation(session.id);
            if (metric) {
                metrics.push(metric);
            }
        }

        return metrics;
    }

    /**
     * Get model performance comparison
     */
    async getModelPerformance(): Promise<ModelPerformance[]> {
        const metrics = await this.analyzeAllConversations();
        const modelMap = new Map<string, ModelPerformance>();

        metrics.forEach(metric => {
            if (!modelMap.has(metric.modelId)) {
                modelMap.set(metric.modelId, {
                    modelId: metric.modelId,
                    totalConversations: 0,
                    avgResponseTime: 0,
                    avgTokensPerMessage: 0,
                    avgMessageLength: 0,
                    avgEngagementScore: 0,
                    avgCompletionRate: 0,
                    totalTokens: 0,
                    totalMessages: 0,
                });
            }

            const perf = modelMap.get(metric.modelId)!;
            perf.totalConversations++;
            perf.totalTokens += metric.totalTokens;
            perf.totalMessages += metric.messageCount;
            perf.avgResponseTime = (perf.avgResponseTime * (perf.totalConversations - 1) + metric.avgResponseTime) / perf.totalConversations;
            perf.avgTokensPerMessage = perf.totalTokens / perf.totalMessages;
            perf.avgMessageLength = (perf.avgMessageLength * (perf.totalConversations - 1) + metric.avgMessageLength) / perf.totalConversations;
            perf.avgEngagementScore = (perf.avgEngagementScore * (perf.totalConversations - 1) + metric.effectiveness.engagementScore) / perf.totalConversations;
            perf.avgCompletionRate = (perf.avgCompletionRate * (perf.totalConversations - 1) + metric.effectiveness.completionRate) / perf.totalConversations;
        });

        return Array.from(modelMap.values()).sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);
    }

    /**
     * Get pattern analysis across all conversations
     */
    async getPatternAnalysis(): Promise<PatternAnalysis> {
        const metrics = await this.analyzeAllConversations();
        const sessions = HistoryService.getAllSessions();

        // Peak hours (0-23)
        const hourCounts = new Array(24).fill(0);
        sessions.forEach(session => {
            const date = new Date(session.lastModified);
            hourCounts[date.getHours()]++;
        });
        const peakHours = hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(h => h.hour);

        // Peak days
        const dayCounts: Record<string, number> = {};
        sessions.forEach(session => {
            const date = new Date(session.lastModified);
            const day = date.toLocaleDateString('en-US', { weekday: 'long' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const peakDays = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(d => d[0]);

        // Common topics
        const topicCounts: Record<string, number> = {};
        metrics.forEach(metric => {
            metric.topics.forEach(topic => {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            });
        });
        const commonTopics = Object.entries(topicCounts)
            .map(([topic, frequency]) => ({ topic, frequency }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10);

        // Model preferences
        const modelPerf = await this.getModelPerformance();
        const modelPreferences = modelPerf.map(m => ({
            modelId: m.modelId,
            usage: m.totalConversations,
            avgScore: m.avgEngagementScore,
        }));

        // Conversation lengths
        const lengths = {
            short: metrics.filter(m => m.messageCount < 10).length,
            medium: metrics.filter(m => m.messageCount >= 10 && m.messageCount <= 50).length,
            long: metrics.filter(m => m.messageCount > 50).length,
        };

        return {
            peakHours,
            peakDays,
            avgSessionDuration: metrics.reduce((sum, m) => sum + m.totalDuration, 0) / metrics.length || 0,
            avgMessagesPerSession: metrics.reduce((sum, m) => sum + m.messageCount, 0) / metrics.length || 0,
            commonTopics,
            modelPreferences,
            conversationLengths: lengths,
        };
    }

    /**
     * Get trend data over time
     */
    async getTrends(days: number = 30): Promise<TrendData[]> {
        const metrics = await this.analyzeAllConversations();
        const sessions = HistoryService.getAllSessions();

        const trends: Map<string, TrendData> = new Map();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        sessions.forEach(session => {
            const date = new Date(session.lastModified);
            if (date < cutoffDate) return;

            const dateStr = date.toISOString().split('T')[0];
            if (!trends.has(dateStr)) {
                trends.set(dateStr, {
                    date: dateStr,
                    conversations: 0,
                    messages: 0,
                    tokens: 0,
                    avgEngagement: 0,
                    topModel: '',
                });
            }

            const trend = trends.get(dateStr)!;
            trend.conversations++;
        });

        metrics.forEach(metric => {
            const date = new Date(metric.lastModified);
            if (date < cutoffDate) return;

            const dateStr = date.toISOString().split('T')[0];
            const trend = trends.get(dateStr);
            if (trend) {
                trend.messages += metric.messageCount;
                trend.tokens += metric.totalTokens;
                trend.avgEngagement = (trend.avgEngagement * (trend.conversations - 1) + metric.effectiveness.engagementScore) / trend.conversations;
            }
        });

        // Find top model per day
        const modelCountsByDate = new Map<string, Map<string, number>>();
        sessions.forEach(session => {
            const date = new Date(session.lastModified);
            if (date < cutoffDate) return;

            const dateStr = date.toISOString().split('T')[0];
            if (!modelCountsByDate.has(dateStr)) {
                modelCountsByDate.set(dateStr, new Map());
            }

            const modelCounts = modelCountsByDate.get(dateStr)!;
            modelCounts.set(session.modelId, (modelCounts.get(session.modelId) || 0) + 1);
        });

        trends.forEach((trend, dateStr) => {
            const modelCounts = modelCountsByDate.get(dateStr);
            if (modelCounts) {
                const topModel = Array.from(modelCounts.entries())
                    .sort((a, b) => b[1] - a[1])[0];
                if (topModel) {
                    trend.topModel = topModel[0];
                }
            }
        });

        return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Helper methods

    private countRegenerations(messages: ChatMessage[]): number {
        // Simplified: count assistant messages that might be regenerations
        // In a real implementation, track this via metadata
        return 0; // Placeholder
    }

    private countEdits(messages: ChatMessage[]): number {
        // Simplified: count edited messages
        // In a real implementation, track this via metadata
        return 0; // Placeholder
    }

    private countBranches(tree: unknown): number {
        if (!tree || typeof tree !== 'object') return 0;
        const maybeTree = tree as ConversationBranchTree;
        return Array.isArray(maybeTree.branches) ? maybeTree.branches.length : 0;
    }

    private calculateCompletionRate(messages: ChatMessage[]): number {
        // If conversation has > 5 messages and ends with assistant, consider it complete
        if (messages.length < 5) return 0.5;
        const lastMessage = messages[messages.length - 1];
        return lastMessage.role === 'assistant' ? 1.0 : 0.7;
    }

    private calculateEngagementScore(messages: ChatMessage[], duration: number): number {
        // Based on message count, length, and back-and-forth
        const messageCount = messages.length;
        const avgLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length;
        const backAndForth = this.countBackAndForth(messages);

        // Normalize scores (0-1)
        const countScore = Math.min(messageCount / 50, 1); // 50 messages = max score
        const lengthScore = Math.min(avgLength / 1000, 1); // 1000 chars = max score
        const backAndForthScore = Math.min(backAndForth / 20, 1); // 20 exchanges = max score

        return (countScore * 0.3 + lengthScore * 0.3 + backAndForthScore * 0.4);
    }

    private countBackAndForth(messages: ChatMessage[]): number {
        let count = 0;
        for (let i = 0; i < messages.length - 1; i++) {
            if (messages[i].role !== messages[i + 1].role) {
                count++;
            }
        }
        return count;
    }

    private calculateResponseQuality(regenerations: number, edits: number, messageCount: number): number {
        // Lower regeneration/edit rate = higher quality
        const regenerationRate = regenerations / messageCount;
        const editRate = edits / messageCount;
        const quality = 1 - Math.min(regenerationRate + editRate, 1);
        return Math.max(0, quality);
    }

    private calculateSentiment(messages: ChatMessage[]): SentimentScore {
        // Simplified sentiment analysis using keyword matching
        const positiveWords = ['good', 'great', 'excellent', 'perfect', 'thanks', 'helpful', 'yes', 'correct'];
        const negativeWords = ['bad', 'wrong', 'error', 'no', 'incorrect', 'failed', 'problem', 'issue'];

        let userPositive = 0;
        let userNegative = 0;
        let assistantPositive = 0;
        let assistantNegative = 0;

        messages.forEach(msg => {
            const content = (msg.content || '').toLowerCase();
            const positive = positiveWords.filter(w => content.includes(w)).length;
            const negative = negativeWords.filter(w => content.includes(w)).length;

            if (msg.role === 'user') {
                userPositive += positive;
                userNegative += negative;
            } else {
                assistantPositive += positive;
                assistantNegative += negative;
            }
        });

        const userSentiment = userPositive + userNegative > 0
            ? (userPositive - userNegative) / (userPositive + userNegative)
            : 0;
        const assistantSentiment = assistantPositive + assistantNegative > 0
            ? (assistantPositive - assistantNegative) / (assistantPositive + assistantNegative)
            : 0;

        const overall = (userSentiment + assistantSentiment) / 2;

        // Determine trend (simplified: compare first half vs second half)
        const firstHalf = messages.slice(0, Math.floor(messages.length / 2));
        const secondHalf = messages.slice(Math.floor(messages.length / 2));
        const firstSentiment = this.calculateSimpleSentiment(firstHalf);
        const secondSentiment = this.calculateSimpleSentiment(secondHalf);
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (secondSentiment > firstSentiment + 0.1) trend = 'improving';
        else if (secondSentiment < firstSentiment - 0.1) trend = 'declining';

        return {
            overall: Math.max(-1, Math.min(1, overall)),
            userMessages: Math.max(-1, Math.min(1, userSentiment)),
            assistantMessages: Math.max(-1, Math.min(1, assistantSentiment)),
            trend,
        };
    }

    private calculateSimpleSentiment(messages: ChatMessage[]): number {
        const positiveWords = ['good', 'great', 'excellent', 'perfect', 'thanks', 'helpful'];
        const negativeWords = ['bad', 'wrong', 'error', 'no', 'incorrect', 'failed'];

        let positive = 0;
        let negative = 0;

        messages.forEach(msg => {
            const content = (msg.content || '').toLowerCase();
            positive += positiveWords.filter(w => content.includes(w)).length;
            negative += negativeWords.filter(w => content.includes(w)).length;
        });

        return positive + negative > 0 ? (positive - negative) / (positive + negative) : 0;
    }
}

export const conversationAnalyticsService = ConversationAnalyticsService.getInstance();
