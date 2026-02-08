/**
 * Conversation Recommendations Service
 *
 * Suggest relevant past conversations based on current context
 */

import { ChatSession, ChatMessage } from '../../shared/types';
import { HistoryService } from './history';
import { keyPointExtractionService } from './keyPointExtraction';
import { autoCategorizationService } from './autoCategorization';

export interface Recommendation {
    sessionId: string;
    title: string;
    relevanceScore: number; // 0-1
    reasons: string[]; // Why this conversation is relevant
    similarity: {
        topics: number; // Topic overlap (0-1)
        keywords: number; // Keyword overlap (0-1)
        category: number; // Category match (0-1)
    };
}

export interface RecommendationContext {
    currentMessage: string;
    conversationHistory: ChatMessage[];
    topics: string[];
    category?: string;
}

export class ConversationRecommendationsService {
    private static instance: ConversationRecommendationsService;

    private constructor() {}

    static getInstance(): ConversationRecommendationsService {
        if (!ConversationRecommendationsService.instance) {
            ConversationRecommendationsService.instance = new ConversationRecommendationsService();
        }
        return ConversationRecommendationsService.instance;
    }

    /**
     * Get recommended conversations based on current context
     */
    async getRecommendations(
        currentSessionId: string,
        currentMessage?: string,
        limit: number = 5
    ): Promise<Recommendation[]> {
        const currentSession = HistoryService.getSession(currentSessionId);
        if (!currentSession) {
            return [];
        }

        // Build context from current conversation
        const context = await this.buildContext(
            currentSession.messages,
            currentMessage || currentSession.messages[currentSession.messages.length - 1]?.content || ''
        );

        // Get all other sessions
        const allSessions = HistoryService.getAllSessions()
            .filter(s => s.id !== currentSessionId);

        // Score each session
        const recommendations: Recommendation[] = [];

        for (const session of allSessions) {
            const score = await this.calculateRelevance(session, context);
            if (score.relevanceScore > 0.3) { // Only include if relevance > 30%
                recommendations.push({
                    sessionId: session.id,
                    title: session.title,
                    ...score,
                });
            }
        }

        // Sort by relevance and return top N
        return recommendations
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit);
    }

    /**
     * Build context from current conversation
     */
    private async buildContext(
        messages: ChatMessage[],
        currentMessage: string
    ): Promise<RecommendationContext> {
        // Extract topics
        const extractionResult = keyPointExtractionService.extractKeyPoints(messages);
        const topics = extractionResult.topics.slice(0, 5);

        // Get category
        const category = autoCategorizationService.getCategorization(
            messages.length > 0 ? 'temp' : ''
        )?.primaryCategory;

        return {
            currentMessage,
            conversationHistory: messages,
            topics,
            category,
        };
    }

    /**
     * Calculate relevance score for a session
     */
    private async calculateRelevance(
        session: ChatSession,
        context: RecommendationContext
    ): Promise<Omit<Recommendation, 'sessionId' | 'title'>> {
        if (!session.messages || session.messages.length === 0) {
            return {
                relevanceScore: 0,
                reasons: [],
                similarity: { topics: 0, keywords: 0, category: 0 },
            };
        }

        // Extract topics from target session
        const targetExtraction = keyPointExtractionService.extractKeyPoints(session.messages);
        const targetTopics = targetExtraction.topics.slice(0, 5);

        // Calculate topic similarity
        const topicOverlap = this.calculateTopicOverlap(context.topics, targetTopics);
        const topicScore = topicOverlap.overlap;

        // Calculate keyword similarity
        const currentText = context.currentMessage.toLowerCase();
        const targetText = session.messages
            .map(m => m.content || '')
            .join(' ')
            .toLowerCase();
        const keywordScore = this.calculateKeywordSimilarity(currentText, targetText);

        // Calculate category similarity
        const targetCategory = autoCategorizationService.getCategorization(session.id);
        const categoryScore = targetCategory?.primaryCategory === context.category ? 1.0 : 0.0;

        // Weighted relevance score
        const relevanceScore = (
            topicScore * 0.4 +
            keywordScore * 0.4 +
            categoryScore * 0.2
        );

        // Generate reasons
        const reasons: string[] = [];
        if (topicOverlap.overlap > 0.5) {
            reasons.push(`Similar topics: ${topicOverlap.commonTopics.join(', ')}`);
        }
        if (keywordScore > 0.5) {
            reasons.push('Contains similar keywords and concepts');
        }
        if (categoryScore > 0) {
            reasons.push(`Same category: ${targetCategory?.primaryCategory}`);
        }
        if (session.title.toLowerCase().includes(currentText.split(' ')[0])) {
            reasons.push('Title matches your current topic');
        }

        return {
            relevanceScore,
            reasons,
            similarity: {
                topics: topicScore,
                keywords: keywordScore,
                category: categoryScore,
            },
        };
    }

    /**
     * Calculate topic overlap between two topic lists
     */
    private calculateTopicOverlap(
        topics1: string[],
        topics2: string[]
    ): { overlap: number; commonTopics: string[] } {
        if (topics1.length === 0 || topics2.length === 0) {
            return { overlap: 0, commonTopics: [] };
        }

        const normalized1 = topics1.map(t => t.toLowerCase());
        const normalized2 = topics2.map(t => t.toLowerCase());

        const common: string[] = [];
        normalized1.forEach(t1 => {
            normalized2.forEach(t2 => {
                // Check for substring matches or word overlap
                if (t1.includes(t2) || t2.includes(t1) || this.wordsOverlap(t1, t2)) {
                    if (!common.includes(t1)) {
                        common.push(t1);
                    }
                }
            });
        });

        const overlap = common.length / Math.max(topics1.length, topics2.length);
        return { overlap, commonTopics: common };
    }

    /**
     * Check if two topic strings have word overlap
     */
    private wordsOverlap(topic1: string, topic2: string): boolean {
        const words1 = new Set(topic1.split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(topic2.split(/\s+/).filter(w => w.length > 3));
        const intersection = [...words1].filter(w => words2.has(w));
        return intersection.length > 0;
    }

    /**
     * Calculate keyword similarity between two texts
     */
    private calculateKeywordSimilarity(text1: string, text2: string): number {
        // Extract significant words (length > 4, not common words)
        const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
        
        const extractKeywords = (text: string): Set<string> => {
            return new Set(
                text
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(w => w.length > 4 && !commonWords.has(w))
            );
        };

        const keywords1 = extractKeywords(text1);
        const keywords2 = extractKeywords(text2);

        if (keywords1.size === 0 || keywords2.size === 0) {
            return 0;
        }

        const intersection = [...keywords1].filter(k => keywords2.has(k));
        const union = new Set([...keywords1, ...keywords2]);

        // Jaccard similarity
        return intersection.length / union.size;
    }
}

export const conversationRecommendationsService = ConversationRecommendationsService.getInstance();
