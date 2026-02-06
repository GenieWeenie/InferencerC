/**
 * Key Point Extraction Service
 *
 * Extracts and displays key points from conversations using:
 * - TF-IDF based keyword extraction
 * - Sentence importance scoring
 * - Named entity recognition (simple pattern matching)
 * - Action item detection
 * - Question/Answer pairing
 */

import { ChatMessage } from '../../shared/types';

// Extracted key point
export interface KeyPoint {
    id: string;
    type: KeyPointType;
    content: string;
    context?: string; // Surrounding context
    messageIndex: number;
    importance: number; // 0-1 score
    timestamp?: number;
    tags: string[];
}

export type KeyPointType =
    | 'insight'      // Important observation or conclusion
    | 'decision'     // A decision that was made
    | 'action'       // Action item or task
    | 'question'     // Key question asked
    | 'answer'       // Important answer
    | 'definition'   // Definition or explanation
    | 'example'      // Example or illustration
    | 'warning'      // Warning or caution
    | 'summary';     // Summary statement

// Extraction result
export interface ExtractionResult {
    keyPoints: KeyPoint[];
    summary: string;
    topics: string[];
    actionItems: string[];
    decisions: string[];
    statistics: ExtractionStats;
}

export interface ExtractionStats {
    totalMessages: number;
    totalWords: number;
    avgMessageLength: number;
    extractionTimeMs: number;
    keyPointCount: number;
}

// TF-IDF document
interface TfIdfDocument {
    terms: Map<string, number>;
    wordCount: number;
}

// Stop words for filtering
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
    'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'she', 'that', 'the', 'this',
    'to', 'was', 'were', 'will', 'with', 'you', 'your', 'i', 'me', 'my', 'we', 'our',
    'they', 'their', 'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how',
    'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'can', 'could', 'may', 'might', 'must', 'need', 'shall', 'should', 'would',
    'do', 'does', 'did', 'doing', 'done', 'being', 'been', 'am', 'also', 'but',
    'if', 'then', 'else', 'because', 'while', 'although', 'though', 'however',
    'about', 'after', 'before', 'above', 'below', 'between', 'into', 'through',
    'during', 'without', 'again', 'further', 'once', 'here', 'there', 'these',
    'those', 'would', 'could', 'should', 'going', 'get', 'got', 'like', 'want'
]);

// Patterns for different key point types
const PATTERNS = {
    action: [
        /(?:need to|should|must|have to|will|going to|let's|please)\s+([^.!?]+)/gi,
        /(?:TODO|FIXME|ACTION|TASK):\s*([^.!?\n]+)/gi,
        /(?:remember to|don't forget to)\s+([^.!?]+)/gi,
    ],
    decision: [
        /(?:decided|agreed|chosen|selected|opted|going with)\s+(?:to\s+)?([^.!?]+)/gi,
        /(?:we'll|let's go with|the plan is to)\s+([^.!?]+)/gi,
        /(?:final decision|conclusion|verdict):\s*([^.!?\n]+)/gi,
    ],
    question: [
        /(?:^|\.\s*|\?\s*)((?:what|how|why|when|where|who|which|can|could|would|should|is|are|do|does)[^?]*\?)/gi,
    ],
    definition: [
        /([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:is|are|means|refers to|defined as)\s+([^.!?]+)/gi,
        /(?:definition|meaning):\s*([^.!?\n]+)/gi,
    ],
    warning: [
        /(?:warning|caution|be careful|watch out|note that|important):\s*([^.!?\n]+)/gi,
        /(?:don't|never|avoid)\s+([^.!?]+)/gi,
    ],
    insight: [
        /(?:key insight|important point|main takeaway|the key is|fundamentally)\s*:?\s*([^.!?\n]+)/gi,
        /(?:this means|this suggests|this indicates|this shows)\s+([^.!?]+)/gi,
    ],
    summary: [
        /(?:in summary|to summarize|in conclusion|overall|in short)\s*,?\s*([^.!?\n]+)/gi,
        /(?:the main point|the bottom line|essentially)\s+(?:is\s+)?([^.!?]+)/gi,
    ],
};

export class KeyPointExtractionService {
    /**
     * Extract key points from messages
     */
    static extract(messages: ChatMessage[]): ExtractionResult {
        const startTime = performance.now();

        // Filter to text messages only
        const textMessages = messages.filter(
            m => m.content && typeof m.content === 'string' && m.content.trim()
        );

        if (textMessages.length === 0) {
            return {
                keyPoints: [],
                summary: '',
                topics: [],
                actionItems: [],
                decisions: [],
                statistics: {
                    totalMessages: 0,
                    totalWords: 0,
                    avgMessageLength: 0,
                    extractionTimeMs: 0,
                    keyPointCount: 0,
                },
            };
        }

        const keyPoints: KeyPoint[] = [];
        const actionItems: string[] = [];
        const decisions: string[] = [];

        // Extract key points from each message
        textMessages.forEach((msg, index) => {
            const content = msg.content;

            // Extract pattern-based key points
            this.extractPatternBasedPoints(content, index, keyPoints, actionItems, decisions);
        });

        // Extract topics using TF-IDF
        const topics = this.extractTopics(textMessages);

        // Calculate importance scores
        this.calculateImportanceScores(keyPoints, textMessages);

        // Sort by importance
        keyPoints.sort((a, b) => b.importance - a.importance);

        // Generate summary
        const summary = this.generateSummary(keyPoints, topics);

        // Calculate statistics
        const totalWords = textMessages.reduce(
            (sum, m) => sum + m.content.split(/\s+/).length,
            0
        );

        const endTime = performance.now();

        return {
            keyPoints,
            summary,
            topics,
            actionItems: [...new Set(actionItems)],
            decisions: [...new Set(decisions)],
            statistics: {
                totalMessages: textMessages.length,
                totalWords,
                avgMessageLength: Math.round(totalWords / textMessages.length),
                extractionTimeMs: Math.round(endTime - startTime),
                keyPointCount: keyPoints.length,
            },
        };
    }

    /**
     * Extract key points using pattern matching
     */
    private static extractPatternBasedPoints(
        content: string,
        messageIndex: number,
        keyPoints: KeyPoint[],
        actionItems: string[],
        decisions: string[]
    ): void {
        const types: KeyPointType[] = [
            'action', 'decision', 'question', 'definition',
            'warning', 'insight', 'summary'
        ];

        for (const type of types) {
            const patterns = PATTERNS[type as keyof typeof PATTERNS];
            if (!patterns) continue;

            for (const pattern of patterns) {
                // Reset regex state
                pattern.lastIndex = 0;

                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const extracted = match[1]?.trim() || match[0]?.trim();
                    if (extracted && extracted.length > 10) {
                        const keyPoint: KeyPoint = {
                            id: `kp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            type,
                            content: extracted.charAt(0).toUpperCase() + extracted.slice(1),
                            messageIndex,
                            importance: 0.5, // Will be adjusted later
                            tags: [],
                        };

                        // Add context (surrounding text)
                        const matchStart = match.index;
                        const contextStart = Math.max(0, matchStart - 50);
                        const contextEnd = Math.min(content.length, matchStart + extracted.length + 50);
                        keyPoint.context = content.slice(contextStart, contextEnd);

                        keyPoints.push(keyPoint);

                        // Track action items and decisions separately
                        if (type === 'action') {
                            actionItems.push(extracted);
                        } else if (type === 'decision') {
                            decisions.push(extracted);
                        }
                    }
                }
            }
        }

        // Extract important sentences (based on position and content)
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        sentences.forEach((sentence, idx) => {
            const trimmed = sentence.trim();

            // First and last sentences are often important
            const isFirstOrLast = idx === 0 || idx === sentences.length - 1;

            // Check for signal words
            const hasSignalWord = /(?:important|key|critical|essential|main|primary|significant)/i.test(trimmed);

            if ((isFirstOrLast || hasSignalWord) && trimmed.length > 30) {
                // Check if not already captured by patterns
                const alreadyExists = keyPoints.some(
                    kp => trimmed.includes(kp.content) || kp.content.includes(trimmed.slice(0, 50))
                );

                if (!alreadyExists) {
                    keyPoints.push({
                        id: `kp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'insight',
                        content: trimmed,
                        messageIndex,
                        importance: hasSignalWord ? 0.7 : 0.4,
                        tags: [],
                    });
                }
            }
        });
    }

    /**
     * Extract topics using TF-IDF
     */
    private static extractTopics(messages: ChatMessage[]): string[] {
        // Build TF-IDF documents
        const documents: TfIdfDocument[] = messages.map(msg => {
            const terms = new Map<string, number>();
            const words = this.tokenize(msg.content);

            for (const word of words) {
                terms.set(word, (terms.get(word) || 0) + 1);
            }

            return { terms, wordCount: words.length };
        });

        // Calculate document frequencies
        const docFreq = new Map<string, number>();
        for (const doc of documents) {
            for (const term of doc.terms.keys()) {
                docFreq.set(term, (docFreq.get(term) || 0) + 1);
            }
        }

        // Calculate TF-IDF scores
        const tfidfScores = new Map<string, number>();
        const numDocs = documents.length;

        for (const doc of documents) {
            for (const [term, tf] of doc.terms) {
                const df = docFreq.get(term) || 1;
                const idf = Math.log(numDocs / df);
                const tfidf = (tf / doc.wordCount) * idf;

                tfidfScores.set(term, (tfidfScores.get(term) || 0) + tfidf);
            }
        }

        // Get top terms
        return Array.from(tfidfScores.entries())
            .filter(([term]) => term.length > 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term]) => term);
    }

    /**
     * Tokenize text into words
     */
    private static tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 2 && !STOP_WORDS.has(word));
    }

    /**
     * Calculate importance scores for key points
     */
    private static calculateImportanceScores(
        keyPoints: KeyPoint[],
        messages: ChatMessage[]
    ): void {
        // Factors affecting importance:
        // 1. Type weight
        // 2. Position in conversation
        // 3. Length
        // 4. Keyword presence

        const typeWeights: Record<KeyPointType, number> = {
            decision: 0.9,
            action: 0.85,
            warning: 0.8,
            insight: 0.75,
            answer: 0.7,
            summary: 0.7,
            definition: 0.65,
            question: 0.6,
            example: 0.5,
        };

        const totalMessages = messages.length;

        for (const kp of keyPoints) {
            let score = typeWeights[kp.type] || 0.5;

            // Position bonus (later messages slightly more important for conclusions)
            const positionFactor = 0.5 + (kp.messageIndex / totalMessages) * 0.3;
            score *= positionFactor;

            // Length factor (optimal length ~50-200 chars)
            const length = kp.content.length;
            const lengthFactor = length < 20 ? 0.5 : length > 300 ? 0.7 : 1.0;
            score *= lengthFactor;

            // Keyword bonus
            const keywordBonus = /(?:important|key|critical|essential|main|primary)/i.test(kp.content)
                ? 1.2
                : 1.0;
            score *= keywordBonus;

            kp.importance = Math.min(1, Math.max(0, score));
        }
    }

    /**
     * Generate a summary from key points and topics
     */
    private static generateSummary(keyPoints: KeyPoint[], topics: string[]): string {
        if (keyPoints.length === 0) {
            return 'No key points extracted from the conversation.';
        }

        const parts: string[] = [];

        // Add topic overview
        if (topics.length > 0) {
            parts.push(`Topics discussed: ${topics.slice(0, 5).join(', ')}.`);
        }

        // Add top insights
        const insights = keyPoints
            .filter(kp => kp.type === 'insight' || kp.type === 'summary')
            .slice(0, 3);

        if (insights.length > 0) {
            parts.push(`Key insights: ${insights.map(i => i.content).join(' ')}`);
        }

        // Add decisions
        const decisions = keyPoints.filter(kp => kp.type === 'decision').slice(0, 2);
        if (decisions.length > 0) {
            parts.push(`Decisions made: ${decisions.map(d => d.content).join('; ')}`);
        }

        // Add action items count
        const actions = keyPoints.filter(kp => kp.type === 'action');
        if (actions.length > 0) {
            parts.push(`${actions.length} action item(s) identified.`);
        }

        return parts.join(' ');
    }

    /**
     * Get key points by type
     */
    static getByType(result: ExtractionResult, type: KeyPointType): KeyPoint[] {
        return result.keyPoints.filter(kp => kp.type === type);
    }

    /**
     * Get top N key points
     */
    static getTopKeyPoints(result: ExtractionResult, n: number = 5): KeyPoint[] {
        return result.keyPoints.slice(0, n);
    }

    /**
     * Export key points to markdown
     */
    static exportToMarkdown(result: ExtractionResult): string {
        let md = '# Conversation Key Points\n\n';

        md += '## Summary\n\n';
        md += `${result.summary}\n\n`;

        if (result.topics.length > 0) {
            md += '## Topics\n\n';
            result.topics.forEach(topic => {
                md += `- ${topic}\n`;
            });
            md += '\n';
        }

        if (result.actionItems.length > 0) {
            md += '## Action Items\n\n';
            result.actionItems.forEach(item => {
                md += `- [ ] ${item}\n`;
            });
            md += '\n';
        }

        if (result.decisions.length > 0) {
            md += '## Decisions\n\n';
            result.decisions.forEach(decision => {
                md += `- ${decision}\n`;
            });
            md += '\n';
        }

        // Group other key points by type
        const typeGroups = new Map<KeyPointType, KeyPoint[]>();
        for (const kp of result.keyPoints) {
            if (kp.type !== 'action' && kp.type !== 'decision') {
                if (!typeGroups.has(kp.type)) {
                    typeGroups.set(kp.type, []);
                }
                typeGroups.get(kp.type)!.push(kp);
            }
        }

        for (const [type, points] of typeGroups) {
            if (points.length > 0) {
                const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
                md += `## ${typeLabel}\n\n`;
                points.slice(0, 5).forEach(kp => {
                    md += `- ${kp.content}\n`;
                });
                md += '\n';
            }
        }

        // Stats
        md += '---\n\n';
        md += `*Extracted ${result.statistics.keyPointCount} key points from ${result.statistics.totalMessages} messages `;
        md += `(${result.statistics.totalWords} words) in ${result.statistics.extractionTimeMs}ms*\n`;

        return md;
    }
}

export default KeyPointExtractionService;

// Export instance with convenience method that matches usage pattern
export const keyPointExtractionService = {
    extractKeyPoints: (messages: ChatMessage[]): ExtractionResult => {
        return KeyPointExtractionService.extract(messages);
    },
    extract: (messages: ChatMessage[]): ExtractionResult => {
        return KeyPointExtractionService.extract(messages);
    },
};
