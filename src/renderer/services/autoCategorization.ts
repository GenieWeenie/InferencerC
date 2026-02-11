/**
 * Auto-Categorization Service
 *
 * Automatically categorize conversations by topic using content analysis
 */

import { ChatMessage } from '../../shared/types';
import { keyPointExtractionService } from './keyPointExtraction';
import { HistoryService } from './history';

export interface Category {
    id: string;
    name: string;
    description?: string;
    keywords: string[];
    color?: string;
}

export interface ConversationCategory {
    sessionId: string;
    primaryCategory: string;
    secondaryCategories: string[];
    confidence: number; // 0-1
    autoTagged: boolean;
    taggedAt: number;
}

// Predefined categories
export const DEFAULT_CATEGORIES: Category[] = [
    {
        id: 'coding',
        name: 'Coding',
        description: 'Programming, code, development',
        keywords: ['code', 'function', 'program', 'script', 'bug', 'error', 'debug', 'api', 'component', 'variable', 'class', 'interface', 'typescript', 'javascript', 'python', 'react', 'node'],
        color: '#3b82f6',
    },
    {
        id: 'creative',
        name: 'Creative Writing',
        description: 'Creative content, stories, poems',
        keywords: ['write', 'story', 'poem', 'creative', 'narrative', 'fiction', 'imagine', 'character', 'plot'],
        color: '#a855f7',
    },
    {
        id: 'analysis',
        name: 'Analysis',
        description: 'Data analysis, research, evaluation',
        keywords: ['analyze', 'analysis', 'evaluate', 'research', 'study', 'examine', 'assess', 'review', 'compare'],
        color: '#10b981',
    },
    {
        id: 'learning',
        name: 'Learning',
        description: 'Education, tutorials, explanations',
        keywords: ['learn', 'teach', 'explain', 'tutorial', 'guide', 'how to', 'understand', 'concept', 'lesson'],
        color: '#f59e0b',
    },
    {
        id: 'business',
        name: 'Business',
        description: 'Business, strategy, planning',
        keywords: ['business', 'strategy', 'plan', 'marketing', 'sales', 'customer', 'product', 'market', 'revenue'],
        color: '#ef4444',
    },
    {
        id: 'technical',
        name: 'Technical Support',
        description: 'Technical help, troubleshooting',
        keywords: ['help', 'support', 'troubleshoot', 'fix', 'issue', 'problem', 'solution', 'error', 'bug'],
        color: '#06b6d4',
    },
    {
        id: 'general',
        name: 'General',
        description: 'General conversation',
        keywords: [],
        color: '#6b7280',
    },
];

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
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

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < value.length; index++) {
        const normalized = sanitizeNonEmptyString(value[index]);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }
    return result;
};

const sanitizeCategory = (value: unknown): Category | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) || undefined,
        keywords: sanitizeStringArray(value.keywords),
        color: sanitizeNonEmptyString(value.color) || undefined,
    };
};

const parseStoredCategories = (raw: string): Category[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }
    const categories = parsed
        .map((entry) => sanitizeCategory(entry))
        .filter((entry): entry is Category => entry !== null);
    const seenIds = new Set<string>();
    return categories.filter((entry) => {
        if (seenIds.has(entry.id)) {
            return false;
        }
        seenIds.add(entry.id);
        return true;
    });
};

const sanitizeConversationCategory = (value: unknown): ConversationCategory | null => {
    if (!isRecord(value) || typeof value.autoTagged !== 'boolean') {
        return null;
    }
    const sessionId = sanitizeNonEmptyString(value.sessionId);
    const primaryCategory = sanitizeNonEmptyString(value.primaryCategory);
    if (!sessionId || !primaryCategory
        || typeof value.confidence !== 'number'
        || !Number.isFinite(value.confidence)
        || typeof value.taggedAt !== 'number'
        || !Number.isFinite(value.taggedAt)) {
        return null;
    }
    const secondaryCategories = sanitizeStringArray(value.secondaryCategories)
        .filter((entry) => entry !== primaryCategory);
    const confidence = Math.max(0, Math.min(1, value.confidence));
    const taggedAt = Math.max(0, Math.floor(value.taggedAt));

    return {
        sessionId,
        primaryCategory,
        secondaryCategories,
        confidence,
        autoTagged: value.autoTagged,
        taggedAt,
    };
};

const parseStoredCategorizations = (raw: string): ConversationCategory[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const categorizations = parsed
        .map((entry) => sanitizeConversationCategory(entry))
        .filter((entry): entry is ConversationCategory => entry !== null);
    const seenSessionIds = new Set<string>();
    return categorizations.filter((entry) => {
        if (seenSessionIds.has(entry.sessionId)) {
            return false;
        }
        seenSessionIds.add(entry.sessionId);
        return true;
    });
};

export class AutoCategorizationService {
    private static instance: AutoCategorizationService;
    private categories: Map<string, Category> = new Map();
    private readonly STORAGE_KEY = 'conversation_categories';
    private readonly CATEGORIES_KEY = 'custom_categories';

    private constructor() {
        this.loadCategories();
    }

    static getInstance(): AutoCategorizationService {
        if (!AutoCategorizationService.instance) {
            AutoCategorizationService.instance = new AutoCategorizationService();
        }
        return AutoCategorizationService.instance;
    }

    /**
     * Load categories from localStorage
     */
    private loadCategories(): void {
        // Load default categories
        this.categories.clear();
        DEFAULT_CATEGORIES.forEach((cat) => {
            const sanitizedDefault = sanitizeCategory(cat);
            if (!sanitizedDefault) {
                return;
            }
            this.categories.set(sanitizedDefault.id, sanitizedDefault);
        });

        // Load custom categories
        try {
            const stored = localStorage.getItem(this.CATEGORIES_KEY);
            if (stored) {
                const custom = parseStoredCategories(stored);
                custom.forEach((cat) => {
                    this.categories.set(cat.id, cat);
                });
            }
        } catch (error) {
            console.error('Failed to load custom categories:', error);
        }
    }

    /**
     * Save custom categories
     */
    private saveCategories(): void {
        try {
            const defaultIds = new Set(DEFAULT_CATEGORIES.map((category) => category.id));
            const custom = Array.from(this.categories.values())
                .filter((cat) => !defaultIds.has(cat.id))
                .map((cat) => sanitizeCategory(cat))
                .filter((cat): cat is Category => cat !== null);
            const seenIds = new Set<string>();
            const dedupedCustom = custom.filter((cat) => {
                if (seenIds.has(cat.id)) {
                    return false;
                }
                seenIds.add(cat.id);
                return true;
            });
            localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(dedupedCustom));

            const nextCategories = new Map<string, Category>();
            DEFAULT_CATEGORIES.forEach((category) => {
                const sanitizedDefault = sanitizeCategory(category);
                if (!sanitizedDefault) {
                    return;
                }
                nextCategories.set(sanitizedDefault.id, sanitizedDefault);
            });
            dedupedCustom.forEach((category) => {
                nextCategories.set(category.id, category);
            });
            this.categories = nextCategories;
        } catch (error) {
            console.error('Failed to save categories:', error);
        }
    }

    /**
     * Categorize a conversation
     */
    async categorizeConversation(sessionId: string): Promise<ConversationCategory | null> {
        const session = HistoryService.getSession(sessionId);
        if (!session || !session.messages || session.messages.length === 0) {
            return null;
        }

        // Extract topics and analyze content
        const extractionResult = keyPointExtractionService.extractKeyPoints(session.messages);
        const allText = session.messages
            .map(m => m.content || '')
            .join(' ')
            .toLowerCase();

        // Score each category
        const scores: Array<{ category: Category; score: number }> = [];

        for (const category of this.categories.values()) {
            if (category.id === 'general') continue; // Skip general, use as fallback

            let score = 0;
            const keywordMatches = category.keywords.filter(kw =>
                allText.includes(kw.toLowerCase())
            ).length;

            // Base score on keyword matches
            score += (keywordMatches / category.keywords.length) * 0.6;

            // Boost score if topics match
            const topicMatches = extractionResult.topics.filter(topic =>
                category.keywords.some(kw => topic.toLowerCase().includes(kw.toLowerCase()))
            ).length;
            score += (topicMatches / Math.max(extractionResult.topics.length, 1)) * 0.4;

            scores.push({ category, score });
        }

        // Sort by score
        scores.sort((a, b) => b.score - a.score);

        const primary = scores[0]?.category || this.categories.get('general')!;
        const secondary = scores.slice(1, 3).map(s => s.category.id);
        const confidence = scores[0]?.score || 0.3;

        const result: ConversationCategory = {
            sessionId,
            primaryCategory: primary.id,
            secondaryCategories: secondary,
            confidence,
            autoTagged: true,
            taggedAt: Date.now(),
        };

        // Save categorization
        this.saveCategorization(result);

        return result;
    }

    /**
     * Save categorization to localStorage
     */
    private saveCategorization(category: ConversationCategory): void {
        try {
            const sanitizedCategory = sanitizeConversationCategory(category);
            if (!sanitizedCategory) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const categorizations = stored ? parseStoredCategorizations(stored) : [];
            const index = categorizations.findIndex((entry) => entry.sessionId === sanitizedCategory.sessionId);
            if (index >= 0) {
                categorizations[index] = sanitizedCategory;
            } else {
                categorizations.push(sanitizedCategory);
            }
            const deduped: ConversationCategory[] = [];
            const seenSessionIds = new Set<string>();
            for (let currentIndex = categorizations.length - 1; currentIndex >= 0; currentIndex--) {
                const entry = categorizations[currentIndex];
                if (seenSessionIds.has(entry.sessionId)) {
                    continue;
                }
                seenSessionIds.add(entry.sessionId);
                deduped.push(entry);
            }
            deduped.reverse();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save categorization:', error);
        }
    }

    /**
     * Get categorization for a session
     */
    getCategorization(sessionId: string): ConversationCategory | null {
        try {
            const normalizedSessionId = sanitizeNonEmptyString(sessionId);
            if (!normalizedSessionId) {
                return null;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;
            const categorizations = parseStoredCategorizations(stored);
            return categorizations.find((entry) => entry.sessionId === normalizedSessionId) || null;
        } catch (error) {
            console.error('Failed to load categorization:', error);
            return null;
        }
    }

    /**
     * Get all categories
     */
    getAllCategories(): Category[] {
        return Array.from(this.categories.values());
    }

    /**
     * Add a custom category
     */
    addCategory(category: Category): void {
        const sanitizedCategory = sanitizeCategory(category);
        if (!sanitizedCategory) {
            return;
        }
        if (DEFAULT_CATEGORIES.some((entry) => entry.id === sanitizedCategory.id)) {
            return;
        }
        this.categories.set(sanitizedCategory.id, sanitizedCategory);
        this.saveCategories();
    }

    /**
     * Remove a custom category
     */
    removeCategory(categoryId: string): boolean {
        if (DEFAULT_CATEGORIES.find(c => c.id === categoryId)) {
            return false; // Cannot remove default categories
        }
        const removed = this.categories.delete(categoryId);
        if (removed) {
            this.saveCategories();
        }
        return removed;
    }

    /**
     * Categorize all conversations
     */
    async categorizeAll(): Promise<Map<string, ConversationCategory>> {
        const sessions = HistoryService.getAllSessions();
        const results = new Map<string, ConversationCategory>();

        for (const session of sessions) {
            const category = await this.categorizeConversation(session.id);
            if (category) {
                results.set(session.id, category);
            }
        }

        return results;
    }

    /**
     * Get conversations by category
     */
    getConversationsByCategory(categoryId: string): string[] {
        try {
            const normalizedCategoryId = sanitizeNonEmptyString(categoryId);
            if (!normalizedCategoryId) {
                return [];
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const categorizations = parseStoredCategorizations(stored);
            const result: string[] = [];
            const seenSessions = new Set<string>();
            for (let index = 0; index < categorizations.length; index++) {
                const entry = categorizations[index];
                if (entry.primaryCategory !== normalizedCategoryId
                    && !entry.secondaryCategories.includes(normalizedCategoryId)) {
                    continue;
                }
                if (seenSessions.has(entry.sessionId)) {
                    continue;
                }
                seenSessions.add(entry.sessionId);
                result.push(entry.sessionId);
            }
            return result;
        } catch (error) {
            console.error('Failed to load categorizations:', error);
            return [];
        }
    }
}

export const autoCategorizationService = AutoCategorizationService.getInstance();
