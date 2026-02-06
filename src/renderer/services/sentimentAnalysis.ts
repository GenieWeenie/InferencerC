/**
 * Sentiment Analysis Service
 *
 * Advanced sentiment analysis for conversations
 */

import { ChatMessage } from '../../shared/types';
import { HistoryService } from './history';

export interface SentimentResult {
    sessionId: string;
    overallSentiment: number; // -1 to 1 (negative to positive)
    sentimentLabel: 'very-negative' | 'negative' | 'neutral' | 'positive' | 'very-positive';
    messageSentiments: MessageSentiment[];
    userSentiment: number;
    assistantSentiment: number;
    sentimentTrend: 'improving' | 'declining' | 'stable';
    emotions: EmotionScores;
    analyzedAt: number;
}

export interface MessageSentiment {
    messageIndex: number;
    sentiment: number; // -1 to 1
    label: 'very-negative' | 'negative' | 'neutral' | 'positive' | 'very-positive';
    confidence: number; // 0-1
    emotions: EmotionScores;
}

export interface EmotionScores {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    neutral: number;
}

// Enhanced sentiment lexicons
const POSITIVE_WORDS = new Set([
    'good', 'great', 'excellent', 'perfect', 'amazing', 'wonderful', 'fantastic', 'awesome',
    'thanks', 'thank you', 'helpful', 'useful', 'yes', 'correct', 'right', 'love', 'like',
    'appreciate', 'brilliant', 'outstanding', 'superb', 'terrific', 'delighted', 'pleased',
    'satisfied', 'happy', 'glad', 'excited', 'enthusiastic', 'optimistic', 'confident'
]);

const NEGATIVE_WORDS = new Set([
    'bad', 'wrong', 'error', 'no', 'incorrect', 'failed', 'problem', 'issue', 'terrible',
    'awful', 'horrible', 'worst', 'hate', 'dislike', 'frustrated', 'angry', 'annoyed',
    'disappointed', 'confused', 'stuck', 'broken', 'bug', 'crash', 'slow', 'difficult',
    'impossible', 'useless', 'waste', 'regret', 'sorry', 'apologize', 'concerned', 'worried'
]);

const INTENSIFIERS = new Set(['very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'really']);

const EMOTION_WORDS: Record<keyof EmotionScores, Set<string>> = {
    joy: new Set(['happy', 'joy', 'excited', 'delighted', 'pleased', 'thrilled', 'ecstatic', 'cheerful', 'glad']),
    sadness: new Set(['sad', 'depressed', 'disappointed', 'upset', 'unhappy', 'melancholy', 'gloomy', 'sorrowful']),
    anger: new Set(['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'rage', 'outraged']),
    fear: new Set(['afraid', 'scared', 'worried', 'anxious', 'nervous', 'terrified', 'fearful', 'concerned']),
    surprise: new Set(['surprised', 'shocked', 'amazed', 'astonished', 'wow', 'incredible', 'unbelievable']),
    disgust: new Set(['disgusted', 'revolted', 'sick', 'nauseated', 'repulsed']),
    neutral: new Set(),
};

export class SentimentAnalysisService {
    private static instance: SentimentAnalysisService;
    private readonly STORAGE_KEY = 'sentiment_analysis';

    private constructor() {}

    static getInstance(): SentimentAnalysisService {
        if (!SentimentAnalysisService.instance) {
            SentimentAnalysisService.instance = new SentimentAnalysisService();
        }
        return SentimentAnalysisService.instance;
    }

    /**
     * Analyze sentiment for a conversation
     */
    analyzeSentiment(sessionId: string): SentimentResult | null {
        const session = HistoryService.getSession(sessionId);
        if (!session || !session.messages || session.messages.length === 0) {
            return null;
        }

        const messages = session.messages;
        const messageSentiments: MessageSentiment[] = [];

        // Analyze each message
        messages.forEach((msg, index) => {
            const sentiment = this.analyzeMessage(msg.content || '');
            messageSentiments.push({
                messageIndex: index,
                ...sentiment,
            });
        });

        // Calculate overall sentiment
        const overallSentiment = messageSentiments.reduce((sum, m) => sum + m.sentiment, 0) / messageSentiments.length;

        // Separate user and assistant sentiments
        const userMessages = messageSentiments.filter((_, i) => messages[i].role === 'user');
        const assistantMessages = messageSentiments.filter((_, i) => messages[i].role === 'assistant');

        const userSentiment = userMessages.length > 0
            ? userMessages.reduce((sum, m) => sum + m.sentiment, 0) / userMessages.length
            : 0;

        const assistantSentiment = assistantMessages.length > 0
            ? assistantMessages.reduce((sum, m) => sum + m.sentiment, 0) / assistantMessages.length
            : 0;

        // Calculate trend
        const sentimentTrend = this.calculateTrend(messageSentiments);

        // Aggregate emotions
        const emotions = this.aggregateEmotions(messageSentiments);

        const result: SentimentResult = {
            sessionId,
            overallSentiment,
            sentimentLabel: this.getSentimentLabel(overallSentiment),
            messageSentiments,
            userSentiment,
            assistantSentiment,
            sentimentTrend,
            emotions,
            analyzedAt: Date.now(),
        };

        // Save result
        this.saveSentiment(result);

        return result;
    }

    /**
     * Analyze sentiment of a single message
     */
    private analyzeMessage(content: string): {
        sentiment: number;
        label: SentimentResult['sentimentLabel'];
        confidence: number;
        emotions: EmotionScores;
    } {
        const lowerContent = content.toLowerCase();
        const words = lowerContent.split(/\s+/);

        let positiveScore = 0;
        let negativeScore = 0;
        const emotions: EmotionScores = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            neutral: 0,
        };

        let intensity = 1.0;

        words.forEach((word, index) => {
            // Check for intensifiers
            if (INTENSIFIERS.has(word) && index < words.length - 1) {
                intensity = 1.5;
                return;
            }

            // Check positive/negative words
            if (POSITIVE_WORDS.has(word)) {
                positiveScore += intensity;
                intensity = 1.0; // Reset
            } else if (NEGATIVE_WORDS.has(word)) {
                negativeScore += intensity;
                intensity = 1.0; // Reset
            }

            // Check emotion words
            Object.entries(EMOTION_WORDS).forEach(([emotion, wordSet]) => {
                if (wordSet.has(word)) {
                    emotions[emotion as keyof EmotionScores] += intensity;
                }
            });
        });

        // Check for negation (e.g., "not good")
        const negationPattern = /\b(not|no|never|nothing|nobody|nowhere)\s+\w+/gi;
        const negations = content.match(negationPattern);
        if (negations) {
            // Flip sentiment if negation found
            const temp = positiveScore;
            positiveScore = negativeScore;
            negativeScore = temp;
        }

        // Calculate sentiment score (-1 to 1)
        const total = positiveScore + negativeScore;
        const sentiment = total > 0
            ? (positiveScore - negativeScore) / (total + 1) // +1 to avoid division by zero
            : 0;

        // Calculate confidence based on word count and score magnitude
        const confidence = Math.min(1.0, total / 5); // More words = higher confidence

        return {
            sentiment,
            label: this.getSentimentLabel(sentiment),
            confidence,
            emotions: this.normalizeEmotions(emotions),
        };
    }

    /**
     * Get sentiment label from score
     */
    private getSentimentLabel(score: number): SentimentResult['sentimentLabel'] {
        if (score >= 0.6) return 'very-positive';
        if (score >= 0.2) return 'positive';
        if (score <= -0.6) return 'very-negative';
        if (score <= -0.2) return 'negative';
        return 'neutral';
    }

    /**
     * Calculate sentiment trend
     */
    private calculateTrend(messageSentiments: MessageSentiment[]): 'improving' | 'declining' | 'stable' {
        if (messageSentiments.length < 2) return 'stable';

        const midPoint = Math.floor(messageSentiments.length / 2);
        const firstHalf = messageSentiments.slice(0, midPoint);
        const secondHalf = messageSentiments.slice(midPoint);

        const firstAvg = firstHalf.reduce((sum, m) => sum + m.sentiment, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + m.sentiment, 0) / secondHalf.length;

        const diff = secondAvg - firstAvg;
        if (diff > 0.1) return 'improving';
        if (diff < -0.1) return 'declining';
        return 'stable';
    }

    /**
     * Aggregate emotions from all messages
     */
    private aggregateEmotions(messageSentiments: MessageSentiment[]): EmotionScores {
        const aggregated: EmotionScores = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            neutral: 0,
        };

        messageSentiments.forEach(msg => {
            Object.keys(aggregated).forEach(emotion => {
                aggregated[emotion as keyof EmotionScores] += msg.emotions[emotion as keyof EmotionScores];
            });
        });

        return this.normalizeEmotions(aggregated);
    }

    /**
     * Normalize emotion scores to 0-1 range
     */
    private normalizeEmotions(emotions: EmotionScores): EmotionScores {
        const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
        if (total === 0) {
            return { ...emotions, neutral: 1 };
        }

        const normalized: EmotionScores = {} as EmotionScores;
        Object.keys(emotions).forEach(emotion => {
            normalized[emotion as keyof EmotionScores] = emotions[emotion as keyof EmotionScores] / total;
        });

        return normalized;
    }

    /**
     * Save sentiment analysis result
     */
    private saveSentiment(result: SentimentResult): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const sentiments: SentimentResult[] = stored ? JSON.parse(stored) : [];
            const index = sentiments.findIndex(s => s.sessionId === result.sessionId);
            if (index >= 0) {
                sentiments[index] = result;
            } else {
                sentiments.push(result);
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sentiments));
        } catch (error) {
            console.error('Failed to save sentiment analysis:', error);
        }
    }

    /**
     * Get sentiment for a session
     */
    getSentiment(sessionId: string): SentimentResult | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;
            const sentiments: SentimentResult[] = JSON.parse(stored);
            return sentiments.find(s => s.sessionId === sessionId) || null;
        } catch (error) {
            console.error('Failed to load sentiment:', error);
            return null;
        }
    }

    /**
     * Analyze all conversations
     */
    analyzeAllConversations(): SentimentResult[] {
        const sessions = HistoryService.getAllSessions();
        return sessions
            .map(s => this.analyzeSentiment(s.id))
            .filter((s): s is SentimentResult => s !== null);
    }

    /**
     * Get average sentiment across all conversations
     */
    getAverageSentiment(): number {
        const allSentiments = this.analyzeAllConversations();
        if (allSentiments.length === 0) return 0;
        return allSentiments.reduce((sum, s) => sum + s.overallSentiment, 0) / allSentiments.length;
    }
}

export const sentimentAnalysisService = SentimentAnalysisService.getInstance();
