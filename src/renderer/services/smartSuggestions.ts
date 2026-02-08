/**
 * Smart Suggestions Service
 *
 * AI-powered follow-up question suggestions based on conversation context
 */

import { ChatMessage } from '../../shared/types';
import { keyPointExtractionService } from './keyPointExtraction';

export interface Suggestion {
    id: string;
    text: string;
    type: SuggestionType;
    confidence: number; // 0-1
    context?: string; // Why this suggestion is relevant
}

export type SuggestionType =
    | 'follow-up'      // Natural continuation
    | 'clarification'  // Ask for clarification
    | 'example'        // Request examples
    | 'deep-dive'      // Explore deeper
    | 'alternative'    // Alternative approach
    | 'related';       // Related topic

export interface SuggestionContext {
    lastMessage: string;
    conversationHistory: ChatMessage[];
    topics: string[];
    keyPoints: string[];
}

export class SmartSuggestionsService {
    private static instance: SmartSuggestionsService;

    private constructor() {}

    static getInstance(): SmartSuggestionsService {
        if (!SmartSuggestionsService.instance) {
            SmartSuggestionsService.instance = new SmartSuggestionsService();
        }
        return SmartSuggestionsService.instance;
    }

    /**
     * Generate smart suggestions based on conversation context
     */
    async generateSuggestions(
        conversationHistory: ChatMessage[],
        lastMessage?: string
    ): Promise<Suggestion[]> {
        if (conversationHistory.length === 0) {
            return this.getDefaultSuggestions();
        }

        const lastMsg = lastMessage || conversationHistory[conversationHistory.length - 1]?.content || '';
        const context = await this.buildContext(conversationHistory, lastMsg);
        const suggestions = this.analyzeAndSuggest(context);

        // Sort by confidence and return top suggestions
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }

    /**
     * Build context from conversation
     */
    private async buildContext(
        history: ChatMessage[],
        lastMessage: string
    ): Promise<SuggestionContext> {
        // Extract topics and key points
        const extractionResult = keyPointExtractionService.extractKeyPoints(history);
        const topics = extractionResult.topics.slice(0, 5);
        const keyPoints = extractionResult.keyPoints
            .slice(0, 5)
            .map(kp => kp.content);

        return {
            lastMessage,
            conversationHistory: history,
            topics,
            keyPoints,
        };
    }

    /**
     * Analyze context and generate suggestions
     */
    private analyzeAndSuggest(context: SuggestionContext): Suggestion[] {
        const suggestions: Suggestion[] = [];
        const lastMsg = context.lastMessage.toLowerCase();

        // Follow-up questions based on last message content
        if (lastMsg.includes('how')) {
            suggestions.push({
                id: '1',
                text: 'Can you provide a step-by-step example?',
                type: 'example',
                confidence: 0.8,
                context: 'Last message asks "how" - suggesting an example would help',
            });
        }

        if (lastMsg.includes('what') || lastMsg.includes('explain')) {
            suggestions.push({
                id: '2',
                text: 'Can you break this down into simpler terms?',
                type: 'clarification',
                confidence: 0.7,
            });
            suggestions.push({
                id: '3',
                text: 'What are the key components of this?',
                type: 'deep-dive',
                confidence: 0.75,
            });
        }

        if (lastMsg.includes('why')) {
            suggestions.push({
                id: '4',
                text: 'What are the alternatives?',
                type: 'alternative',
                confidence: 0.8,
            });
        }

        // Topic-based suggestions
        if (context.topics.length > 0) {
            const mainTopic = context.topics[0];
            suggestions.push({
                id: '5',
                text: `Tell me more about ${mainTopic}`,
                type: 'deep-dive',
                confidence: 0.7,
                context: `Based on topic: ${mainTopic}`,
            });
        }

        // Key point-based suggestions
        if (context.keyPoints.length > 0) {
            const keyPoint = context.keyPoints[0];
            if (keyPoint.length < 100) {
                suggestions.push({
                    id: '6',
                    text: `How does "${keyPoint.substring(0, 50)}..." work in practice?`,
                    type: 'follow-up',
                    confidence: 0.65,
                });
            }
        }

        // Pattern-based suggestions
        if (lastMsg.includes('code') || lastMsg.includes('function') || lastMsg.includes('script')) {
            suggestions.push({
                id: '7',
                text: 'Can you show me a complete working example?',
                type: 'example',
                confidence: 0.85,
            });
            suggestions.push({
                id: '8',
                text: 'What are the best practices for this?',
                type: 'deep-dive',
                confidence: 0.7,
            });
        }

        if (lastMsg.includes('error') || lastMsg.includes('bug') || lastMsg.includes('problem')) {
            suggestions.push({
                id: '9',
                text: 'What are common causes of this issue?',
                type: 'clarification',
                confidence: 0.8,
            });
            suggestions.push({
                id: '10',
                text: 'How can I prevent this in the future?',
                type: 'follow-up',
                confidence: 0.75,
            });
        }

        // Generic follow-ups
        suggestions.push({
            id: '11',
            text: 'Can you elaborate on that?',
            type: 'follow-up',
            confidence: 0.6,
        });

        suggestions.push({
            id: '12',
            text: 'What should I consider next?',
            type: 'follow-up',
            confidence: 0.55,
        });

        // Related topic suggestions
        if (context.topics.length > 1) {
            context.topics.slice(1, 3).forEach((topic, index) => {
                suggestions.push({
                    id: `related-${index}`,
                    text: `Tell me about ${topic}`,
                    type: 'related',
                    confidence: 0.5,
                    context: `Related topic from conversation`,
                });
            });
        }

        return suggestions;
    }

    /**
     * Get default suggestions for empty conversations
     */
    private getDefaultSuggestions(): Suggestion[] {
        return [
            {
                id: 'default-1',
                text: 'Help me understand...',
                type: 'follow-up',
                confidence: 0.5,
            },
            {
                id: 'default-2',
                text: 'Can you explain...',
                type: 'clarification',
                confidence: 0.5,
            },
            {
                id: 'default-3',
                text: 'Show me an example of...',
                type: 'example',
                confidence: 0.5,
            },
        ];
    }

    /**
     * Generate suggestions using AI (if model is available)
     */
    async generateAISuggestions(
        conversationHistory: ChatMessage[],
        executePrompt: (prompt: string) => Promise<{ content: string }>
    ): Promise<Suggestion[]> {
        try {
            const lastMessages = conversationHistory.slice(-5);
            const context = lastMessages
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const prompt = `Based on this conversation, suggest 3-5 natural follow-up questions the user might want to ask. Make them specific and relevant to the conversation context.

Conversation:
${context}

Respond with a JSON array of suggestions:
[
  {"text": "question 1", "type": "follow-up"},
  {"text": "question 2", "type": "clarification"}
]

Types: follow-up, clarification, example, deep-dive, alternative, related`;

            const result = await executePrompt(prompt);
            const content = result.content.trim();

            // Try to parse JSON from response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((s: any, i: number) => ({
                    id: `ai-${i}`,
                    text: s.text,
                    type: s.type || 'follow-up',
                    confidence: 0.8,
                }));
            }
        } catch (error) {
            console.error('AI suggestion generation failed:', error);
        }

        // Fallback to rule-based suggestions
        return this.generateSuggestions(conversationHistory);
    }
}

export const smartSuggestionsService = SmartSuggestionsService.getInstance();
