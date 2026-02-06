/**
 * Summarization Service
 * 
 * Uses the LLM to generate intelligent summaries of conversations.
 * Features:
 * - Automatic summarization for long conversations
 * - Key point extraction
 * - Topic detection
 * - Summary caching
 */

import { ChatMessage } from '../../shared/types';

export interface ConversationSummary {
    id: string;
    sessionId: string;
    summary: string;
    keyPoints: string[];
    topics: string[];
    messageCount: number;
    generatedAt: number;
    lastMessageTimestamp?: number;
}

export interface SummarizationOptions {
    maxLength?: number; // Max summary length in words
    includeKeyPoints?: boolean;
    includeTopics?: boolean;
    style?: 'brief' | 'detailed' | 'bullet';
}

const SUMMARY_CACHE_KEY = 'conversation_summaries';
const SUMMARY_THRESHOLD = 10; // Generate summary after this many messages

export class SummarizationService {
    private static cache = new Map<string, ConversationSummary>();

    /**
     * Initialize cache from localStorage
     */
    static init(): void {
        try {
            const cached = localStorage.getItem(SUMMARY_CACHE_KEY);
            if (cached) {
                const summaries: ConversationSummary[] = JSON.parse(cached);
                summaries.forEach(s => this.cache.set(s.sessionId, s));
            }
        } catch (error) {
            console.error('Failed to load summary cache:', error);
        }
    }

    /**
     * Get cached summary for a session
     */
    static getCachedSummary(sessionId: string): ConversationSummary | null {
        return this.cache.get(sessionId) || null;
    }

    /**
     * Check if a conversation needs a summary update
     */
    static needsUpdate(sessionId: string, currentMessageCount: number): boolean {
        const cached = this.cache.get(sessionId);
        if (!cached) {
            return currentMessageCount >= SUMMARY_THRESHOLD;
        }
        // Re-summarize every 10 new messages
        return currentMessageCount - cached.messageCount >= 10;
    }

    /**
     * Build the prompt for summarization
     */
    static buildSummarizationPrompt(
        messages: ChatMessage[],
        options: SummarizationOptions = {}
    ): string {
        const {
            maxLength = 100,
            includeKeyPoints = true,
            includeTopics = true,
            style = 'detailed'
        } = options;

        const conversationText = messages
            .filter(m => m.role !== 'system' && m.content)
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`)
            .join('\n\n');

        let styleInstruction = '';
        switch (style) {
            case 'brief':
                styleInstruction = 'Be very concise, 1-2 sentences maximum.';
                break;
            case 'bullet':
                styleInstruction = 'Use bullet points for the summary.';
                break;
            case 'detailed':
            default:
                styleInstruction = 'Provide a clear, comprehensive summary.';
        }

        let prompt = `Analyze the following conversation and provide:

1. A summary (maximum ${maxLength} words). ${styleInstruction}
`;

        if (includeKeyPoints) {
            prompt += `2. 3-5 key points or takeaways from the conversation.
`;
        }

        if (includeTopics) {
            prompt += `3. 2-4 main topics or themes discussed.
`;
        }

        prompt += `
Respond in the following JSON format only (no other text):
{
    "summary": "Your summary here",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "topics": ["Topic 1", "Topic 2"]
}

CONVERSATION:
${conversationText}`;

        return prompt;
    }

    /**
     * Generate a summary using the LLM
     */
    static async generateSummary(
        sessionId: string,
        messages: ChatMessage[],
        modelId: string,
        options: SummarizationOptions = {}
    ): Promise<ConversationSummary | null> {
        // Filter out system messages and empty content
        const validMessages = messages.filter(m => m.role !== 'system' && m.content);

        if (validMessages.length < 3) {
            return null; // Not enough content to summarize
        }

        const prompt = this.buildSummarizationPrompt(validMessages, options);

        try {
            // Determine endpoint based on model type
            let url = 'http://localhost:3000/v1/chat/completions';
            let actualModelId = modelId;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            const openRouterApiKey = localStorage.getItem('openRouterApiKey');
            if (modelId.startsWith('openrouter/') && openRouterApiKey) {
                url = 'https://openrouter.ai/api/v1/chat/completions';
                actualModelId = modelId.replace('openrouter/', '');
                headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                headers['HTTP-Referer'] = 'http://localhost:5173';
                headers['X-Title'] = 'WinInferencer';
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: actualModelId,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that summarizes conversations. Always respond with valid JSON only.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3, // Low temperature for consistent summaries
                    max_tokens: 500,
                    stream: false
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            // Parse the JSON response
            const parsed = this.parseJsonResponse(content);

            if (!parsed || !parsed.summary) {
                throw new Error('Invalid response format');
            }

            const summary: ConversationSummary = {
                id: `summary-${Date.now()}`,
                sessionId,
                summary: parsed.summary,
                keyPoints: parsed.keyPoints || [],
                topics: parsed.topics || [],
                messageCount: messages.length,
                generatedAt: Date.now(),
            };

            // Cache the summary
            this.cache.set(sessionId, summary);
            this.persistCache();

            return summary;
        } catch (error) {
            console.error('Failed to generate summary:', error);
            return null;
        }
    }

    /**
     * Parse JSON response with fallback handling
     */
    private static parseJsonResponse(content: string): { summary: string; keyPoints?: string[]; topics?: string[] } | null {
        try {
            // Try direct JSON parse
            return JSON.parse(content);
        } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch {
                    // Continue to fallback
                }
            }

            // Try to find JSON object in the content
            const objectMatch = content.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                try {
                    return JSON.parse(objectMatch[0]);
                } catch {
                    // Continue to fallback
                }
            }

            // Fallback: Treat the entire content as the summary
            if (content.trim()) {
                return {
                    summary: content.trim().substring(0, 500),
                    keyPoints: [],
                    topics: []
                };
            }

            return null;
        }
    }

    /**
     * Generate a quick title from the first few messages
     */
    static generateTitle(messages: ChatMessage[]): string {
        const firstUserMessage = messages.find(m => m.role === 'user' && m.content);
        if (!firstUserMessage) return 'New Chat';

        const content = firstUserMessage.content;

        // Clean and truncate
        const cleaned = content
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length <= 40) {
            return cleaned;
        }

        // Find a good break point
        let truncated = cleaned.substring(0, 40);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 20) {
            truncated = truncated.substring(0, lastSpace);
        }

        return truncated + '...';
    }

    /**
     * Delete cached summary
     */
    static deleteSummary(sessionId: string): void {
        this.cache.delete(sessionId);
        this.persistCache();
    }

    /**
     * Clear all cached summaries
     */
    static clearAll(): void {
        this.cache.clear();
        localStorage.removeItem(SUMMARY_CACHE_KEY);
    }

    /**
     * Persist cache to localStorage
     */
    private static persistCache(): void {
        try {
            const summaries = Array.from(this.cache.values());
            localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(summaries));
        } catch (error) {
            console.error('Failed to persist summary cache:', error);
        }
    }

    /**
     * Get summary statistics
     */
    static getStats(): { totalSummaries: number; cacheSize: number } {
        const summaries = Array.from(this.cache.values());
        return {
            totalSummaries: summaries.length,
            cacheSize: JSON.stringify(summaries).length
        };
    }
}

// Initialize cache on load
SummarizationService.init();

export default SummarizationService;
