/**
 * Topic Modeling Service
 *
 * Advanced topic modeling and extraction from conversations
 */

import { ChatMessage } from '../../shared/types';
import { HistoryService } from './history';
import { keyPointExtractionService } from './keyPointExtraction';

export interface Topic {
    id: string;
    name: string;
    keywords: string[];
    weight: number; // 0-1, importance of this topic
    messageIndices: number[]; // Messages that mention this topic
    frequency: number; // How many times this topic appears
}

export interface TopicModel {
    sessionId: string;
    topics: Topic[];
    primaryTopic: Topic | null;
    topicDistribution: Record<string, number>; // Topic ID -> weight
    analyzedAt: number;
}

export interface TopicCluster {
    topicId: string;
    topicName: string;
    sessions: string[]; // Session IDs that share this topic
    similarity: number; // Average similarity between sessions
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const clamp = (value: number, min: number, max: number): number => (
    Math.min(max, Math.max(min, value))
);

const parseJson = (raw: string): unknown => {
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

const sanitizeNumberArray = (value: unknown): number[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const sanitized: number[] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (!Number.isInteger(entry) || entry < 0 || sanitized.includes(entry)) {
            continue;
        }
        sanitized.push(entry);
    }
    return sanitized;
};

const sanitizeKeywords = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const keywords: string[] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (typeof entry !== 'string') {
            continue;
        }
        const keyword = entry.trim();
        if (!keyword || keywords.includes(keyword)) {
            continue;
        }
        keywords.push(keyword);
    }
    return keywords;
};

const sanitizeTopic = (value: unknown): Topic | null => {
    const record = isRecord(value) ? value : null;
    const weight = isFiniteNumber(record ? record.weight : null)
        ? clamp(record!.weight as number, 0, 1)
        : null;
    const frequency = isFiniteNumber(record ? record.frequency : null)
        ? Math.max(0, Math.floor(record!.frequency as number))
        : null;

    if (!record
        || typeof record.id !== 'string'
        || typeof record.name !== 'string'
        || weight === null
        || !Array.isArray(record.messageIndices)
        || frequency === null) {
        return null;
    }

    const id = record.id.trim();
    const name = record.name.trim();
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        keywords: sanitizeKeywords(record.keywords),
        weight,
        messageIndices: sanitizeNumberArray(record.messageIndices),
        frequency,
    };
};

const sanitizeTopicDistribution = (value: unknown): Record<string, number> => {
    if (!isRecord(value)) {
        return {};
    }

    const distribution: Record<string, number> = {};
    Object.entries(value).forEach(([key, entry]) => {
        const trimmedKey = key.trim();
        if (!trimmedKey || !isFiniteNumber(entry)) {
            return;
        }
        distribution[trimmedKey] = clamp(entry, 0, 1);
    });
    return distribution;
};

const sanitizeTopicModel = (value: unknown): TopicModel | null => {
    if (!isRecord(value)
        || typeof value.sessionId !== 'string'
        || !Array.isArray(value.topics)
        || !isFiniteNumber(value.analyzedAt)) {
        return null;
    }

    const sessionId = value.sessionId.trim();
    if (!sessionId) {
        return null;
    }

    const seenTopicIds = new Set<string>();
    const topics = value.topics
        .map((entry) => sanitizeTopic(entry))
        .filter((entry): entry is Topic => {
            if (!entry) {
                return false;
            }
            if (seenTopicIds.has(entry.id)) {
                return false;
            }
            seenTopicIds.add(entry.id);
            return true;
        });

    const primaryTopic = sanitizeTopic(value.primaryTopic);
    const primaryTopicId = primaryTopic?.id;
    const resolvedPrimaryTopic = primaryTopicId && topics.some((topic) => topic.id === primaryTopicId)
        ? primaryTopic
        : (topics[0] || null);

    return {
        sessionId,
        topics,
        primaryTopic: resolvedPrimaryTopic,
        topicDistribution: sanitizeTopicDistribution(value.topicDistribution),
        analyzedAt: Math.max(0, Math.floor(value.analyzedAt)),
    };
};

const parseStoredModels = (raw: string): TopicModel[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenSessionIds = new Set<string>();
    return parsed
        .map((entry) => sanitizeTopicModel(entry))
        .filter((entry): entry is TopicModel => {
            if (!entry) {
                return false;
            }
            if (seenSessionIds.has(entry.sessionId)) {
                return false;
            }
            seenSessionIds.add(entry.sessionId);
            return true;
        });
};

export class TopicModelingService {
    private static instance: TopicModelingService;
    private readonly STORAGE_KEY = 'topic_models';

    private constructor() {}

    static getInstance(): TopicModelingService {
        if (!TopicModelingService.instance) {
            TopicModelingService.instance = new TopicModelingService();
        }
        return TopicModelingService.instance;
    }

    /**
     * Generate topic model for a conversation
     */
    generateTopicModel(sessionId: string): TopicModel | null {
        const session = HistoryService.getSession(sessionId);
        if (!session || !session.messages || session.messages.length === 0) {
            return null;
        }

        // Extract topics using key point extraction
        const extractionResult = keyPointExtractionService.extractKeyPoints(session.messages);
        const rawTopics = extractionResult.topics;

        // Build topic model with enhanced analysis
        const topics: Topic[] = [];
        const allText = session.messages.map(m => m.content || '').join(' ').toLowerCase();

        rawTopics.forEach((topicName, index) => {
            const keywords = this.extractKeywords(topicName, allText);
            const messageIndices = this.findTopicMentions(topicName, session.messages);
            const weight = this.calculateTopicWeight(topicName, keywords, messageIndices.length, session.messages.length);

            topics.push({
                id: `topic-${index}`,
                name: topicName,
                keywords,
                weight,
                messageIndices,
                frequency: messageIndices.length,
            });
        });

        // Sort by weight
        topics.sort((a, b) => b.weight - a.weight);

        // Calculate topic distribution
        const topicDistribution: Record<string, number> = {};
        topics.forEach(topic => {
            topicDistribution[topic.id] = topic.weight;
        });

        const result: TopicModel = {
            sessionId,
            topics,
            primaryTopic: topics[0] || null,
            topicDistribution,
            analyzedAt: Date.now(),
        };

        // Save model
        this.saveTopicModel(result);

        return result;
    }

    /**
     * Extract keywords related to a topic
     */
    private extractKeywords(topicName: string, allText: string): string[] {
        const topicWords = topicName.toLowerCase().split(/\s+/);
        const keywords: string[] = [];

        // Find words that co-occur with topic words
        const words = allText.split(/\s+/).filter(w => w.length > 3);
        const wordFreq: Record<string, number> = {};

        words.forEach((word, index) => {
            // Check if word is near topic words
            const contextWindow = 5;
            const start = Math.max(0, index - contextWindow);
            const end = Math.min(words.length, index + contextWindow);
            const context = words.slice(start, end).join(' ');

            if (topicWords.some(tw => context.includes(tw))) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Get top keywords
        const sorted = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);

        return [...topicWords, ...sorted].slice(0, 8);
    }

    /**
     * Find messages that mention a topic
     */
    private findTopicMentions(topicName: string, messages: ChatMessage[]): number[] {
        const topicWords = topicName.toLowerCase().split(/\s+/);
        const indices: number[] = [];

        messages.forEach((msg, index) => {
            const content = (msg.content || '').toLowerCase();
            if (topicWords.some(tw => content.includes(tw))) {
                indices.push(index);
            }
        });

        return indices;
    }

    /**
     * Calculate topic weight
     */
    private calculateTopicWeight(
        topicName: string,
        keywords: string[],
        mentionCount: number,
        totalMessages: number
    ): number {
        // Base weight from mention frequency
        const frequencyWeight = mentionCount / Math.max(totalMessages, 1);

        // Keyword diversity weight
        const keywordWeight = Math.min(keywords.length / 5, 1);

        // Topic name length (longer = more specific = higher weight)
        const specificityWeight = Math.min(topicName.split(/\s+/).length / 3, 1);

        // Combined weight
        return (frequencyWeight * 0.5 + keywordWeight * 0.3 + specificityWeight * 0.2);
    }

    /**
     * Find similar topics across conversations
     */
    findSimilarTopics(topicName: string, limit: number = 5): TopicCluster[] {
        const allModels = this.getAllTopicModels();
        const clusters: Map<string, TopicCluster> = new Map();

        allModels.forEach(model => {
            model.topics.forEach(topic => {
                const similarity = this.calculateTopicSimilarity(topicName, topic.name);
                if (similarity > 0.5) {
                    const key = topic.name.toLowerCase();
                    if (!clusters.has(key)) {
                        clusters.set(key, {
                            topicId: topic.id,
                            topicName: topic.name,
                            sessions: [],
                            similarity: 0,
                        });
                    }
                    const cluster = clusters.get(key)!;
                    cluster.sessions.push(model.sessionId);
                    cluster.similarity = (cluster.similarity + similarity) / 2;
                }
            });
        });

        return Array.from(clusters.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Calculate similarity between two topic names
     */
    private calculateTopicSimilarity(topic1: string, topic2: string): number {
        const words1 = new Set(topic1.toLowerCase().split(/\s+/));
        const words2 = new Set(topic2.toLowerCase().split(/\s+/));

        const intersection = [...words1].filter(w => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;

        return union > 0 ? intersection / union : 0;
    }

    /**
     * Get topic model for a session
     */
    getTopicModel(sessionId: string): TopicModel | null {
        try {
            const normalizedSessionId = sanitizeNonEmptyString(sessionId);
            if (!normalizedSessionId) {
                return null;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;
            const models = parseStoredModels(stored);
            return models.find(m => m.sessionId === normalizedSessionId) || null;
        } catch (error) {
            console.error('Failed to load topic model:', error);
            return null;
        }
    }

    /**
     * Get all topic models
     */
    getAllTopicModels(): TopicModel[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return parseStoredModels(stored);
        } catch (error) {
            console.error('Failed to load topic models:', error);
            return [];
        }
    }

    /**
     * Save topic model
     */
    private saveTopicModel(model: TopicModel): void {
        try {
            const sanitizedModel = sanitizeTopicModel(model);
            if (!sanitizedModel) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const models = stored ? parseStoredModels(stored) : [];
            const index = models.findIndex(m => m.sessionId === sanitizedModel.sessionId);
            if (index >= 0) {
                models[index] = sanitizedModel;
            } else {
                models.push(sanitizedModel);
            }
            const seenSessionIds = new Set<string>();
            const persisted = models
                .map((entry) => sanitizeTopicModel(entry))
                .filter((entry): entry is TopicModel => {
                    if (!entry) {
                        return false;
                    }
                    if (seenSessionIds.has(entry.sessionId)) {
                        return false;
                    }
                    seenSessionIds.add(entry.sessionId);
                    return true;
                });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persisted));
        } catch (error) {
            console.error('Failed to save topic model:', error);
        }
    }

    /**
     * Get most common topics across all conversations
     */
    getMostCommonTopics(limit: number = 10): Array<{ topic: string; frequency: number; sessions: string[] }> {
        const allModels = this.getAllTopicModels();
        const topicFreq: Record<string, { frequency: number; sessions: Set<string> }> = {};

        allModels.forEach(model => {
            model.topics.forEach(topic => {
                const key = topic.name.toLowerCase();
                if (!topicFreq[key]) {
                    topicFreq[key] = { frequency: 0, sessions: new Set() };
                }
                topicFreq[key].frequency += topic.frequency;
                topicFreq[key].sessions.add(model.sessionId);
            });
        });

        return Object.entries(topicFreq)
            .map(([topic, data]) => ({
                topic,
                frequency: data.frequency,
                sessions: Array.from(data.sessions),
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);
    }
}

export const topicModelingService = TopicModelingService.getInstance();
