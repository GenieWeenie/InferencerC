/**
 * Conversation Templates Service
 * 
 * Allows users to save and reuse conversation templates.
 * Features:
 * - Save current conversation as a template
 * - Load template to start a new conversation
 * - Template library management
 * - Template categories and tags
 * - Import/Export templates
 */

import { ChatMessage, ImageAttachment } from '../../shared/types';

export interface ConversationTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    systemPrompt?: string;
    initialMessages: Omit<ChatMessage, 'isLoading' | 'generationTime'>[];
    settings?: {
        temperature?: number;
        topP?: number;
        maxTokens?: number;
        expertMode?: string | null;
        thinkingEnabled?: boolean;
    };
    createdAt: number;
    updatedAt: number;
    usageCount: number;
}

export interface TemplateCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
}

const TEMPLATES_STORAGE_KEY = 'conversation_templates';
const CATEGORIES_STORAGE_KEY = 'template_categories';

const MESSAGE_ROLES = new Set<ChatMessage['role']>([
    'system',
    'user',
    'assistant',
    'tool',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
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

const sanitizeFiniteNonNegativeNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return value;
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    value.forEach((entry) => {
        const normalized = sanitizeNonEmptyString(entry);
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        result.push(normalized);
    });
    return result;
};

const sanitizeTemplateSettings = (value: unknown): ConversationTemplate['settings'] | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    return {
        temperature: typeof value.temperature === 'number' && Number.isFinite(value.temperature) ? value.temperature : undefined,
        topP: typeof value.topP === 'number' && Number.isFinite(value.topP) ? value.topP : undefined,
        maxTokens: typeof value.maxTokens === 'number' && Number.isFinite(value.maxTokens) ? value.maxTokens : undefined,
        expertMode: typeof value.expertMode === 'string' || value.expertMode === null ? value.expertMode : undefined,
        thinkingEnabled: typeof value.thinkingEnabled === 'boolean' ? value.thinkingEnabled : undefined,
    };
};

const sanitizeTemplateMessage = (value: unknown): ConversationTemplate['initialMessages'][number] | null => {
    if (!isRecord(value)) {
        return null;
    }
    const content = sanitizeNonEmptyString(value.content);
    if (!MESSAGE_ROLES.has(value.role as ChatMessage['role']) || !content) {
        return null;
    }
    return {
        role: value.role as ChatMessage['role'],
        content,
        images: Array.isArray(value.images) ? value.images.filter((image): image is ImageAttachment => {
            if (!isRecord(image)) {
                return false;
            }
            return (
                typeof image.id === 'string'
                && typeof image.name === 'string'
                && (image.mimeType === 'image/png'
                    || image.mimeType === 'image/jpeg'
                    || image.mimeType === 'image/gif'
                    || image.mimeType === 'image/webp')
                && typeof image.base64 === 'string'
                && typeof image.thumbnailUrl === 'string'
            );
        }) : undefined,
    };
};

const sanitizeTemplate = (value: unknown): ConversationTemplate | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const description = typeof value.description === 'string' ? value.description.trim() : '';
    const category = sanitizeNonEmptyString(value.category);
    const createdAt = sanitizeFiniteNonNegativeNumber(value.createdAt);
    const updatedAt = sanitizeFiniteNonNegativeNumber(value.updatedAt);
    const usageCount = sanitizeFiniteNonNegativeNumber(value.usageCount);
    if (
        !id
        || !name
        || !category
        || createdAt === null
        || updatedAt === null
        || usageCount === null
    ) {
        return null;
    }
    const initialMessages = Array.isArray(value.initialMessages)
        ? value.initialMessages.map(sanitizeTemplateMessage).filter((message): message is ConversationTemplate['initialMessages'][number] => message !== null)
        : [];
    if (initialMessages.length === 0) {
        return null;
    }

    return {
        id,
        name,
        description,
        category,
        tags: sanitizeStringArray(value.tags),
        systemPrompt: sanitizeNonEmptyString(value.systemPrompt) || undefined,
        initialMessages,
        settings: sanitizeTemplateSettings(value.settings),
        createdAt: Math.floor(createdAt),
        updatedAt: Math.max(Math.floor(createdAt), Math.floor(updatedAt)),
        usageCount: Math.floor(usageCount),
    };
};

const sanitizeCategory = (value: unknown): TemplateCategory | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const icon = sanitizeNonEmptyString(value.icon);
    const color = sanitizeNonEmptyString(value.color);
    if (!id || !name || !icon || !color) {
        return null;
    }
    return {
        id,
        name,
        icon,
        color,
    };
};

// Built-in categories
const DEFAULT_CATEGORIES: TemplateCategory[] = [
    { id: 'coding', name: 'Coding', icon: 'Code2', color: 'blue' },
    { id: 'writing', name: 'Writing', icon: 'FileText', color: 'purple' },
    { id: 'analysis', name: 'Analysis', icon: 'BarChart3', color: 'green' },
    { id: 'learning', name: 'Learning', icon: 'Lightbulb', color: 'yellow' },
    { id: 'brainstorm', name: 'Brainstorm', icon: 'Brain', color: 'pink' },
    { id: 'general', name: 'General', icon: 'MessageSquare', color: 'slate' },
];

// Built-in templates
const DEFAULT_TEMPLATES: ConversationTemplate[] = [
    {
        id: 'template-code-review',
        name: 'Code Review',
        description: 'Get a thorough code review with suggestions for improvements',
        category: 'coding',
        tags: ['review', 'refactor', 'quality'],
        systemPrompt: 'You are an expert code reviewer. Analyze the provided code thoroughly, looking for bugs, security issues, performance problems, and style improvements. Provide specific, actionable feedback.',
        initialMessages: [
            {
                role: 'user',
                content: 'Please review the following code and provide detailed feedback on:\n1. Code quality and style\n2. Potential bugs or issues\n3. Performance considerations\n4. Security concerns\n5. Suggestions for improvement\n\n```\n[Paste your code here]\n```'
            }
        ],
        settings: { temperature: 0.3, expertMode: 'coding' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    },
    {
        id: 'template-explain-concept',
        name: 'Explain Like I\'m Five',
        description: 'Get complex topics explained in simple terms',
        category: 'learning',
        tags: ['explain', 'simple', 'teach'],
        systemPrompt: 'You are a patient teacher who excels at explaining complex topics in simple, easy-to-understand terms. Use analogies, examples, and avoid jargon. Start with the basics and build up gradually.',
        initialMessages: [
            {
                role: 'user',
                content: 'Can you explain [TOPIC] to me in simple terms, as if I were 5 years old? Use analogies and examples I can relate to.'
            }
        ],
        settings: { temperature: 0.7 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    },
    {
        id: 'template-blog-post',
        name: 'Blog Post Writer',
        description: 'Create engaging blog posts on any topic',
        category: 'writing',
        tags: ['blog', 'content', 'seo'],
        systemPrompt: 'You are an expert content writer who creates engaging, SEO-friendly blog posts. Write in a conversational yet professional tone. Include compelling hooks, clear structure with headings, and actionable takeaways.',
        initialMessages: [
            {
                role: 'user',
                content: 'Write a comprehensive blog post about [TOPIC]. Include:\n- An attention-grabbing headline\n- A compelling introduction\n- 3-5 main sections with subheadings\n- Practical examples or tips\n- A conclusion with a call to action\n\nTarget audience: [DESCRIBE AUDIENCE]\nDesired length: ~1500 words'
            }
        ],
        settings: { temperature: 0.7, expertMode: 'creative' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    },
    {
        id: 'template-debug-helper',
        name: 'Debug Assistant',
        description: 'Get help debugging issues in your code',
        category: 'coding',
        tags: ['debug', 'error', 'fix'],
        systemPrompt: 'You are an expert debugger. Help identify and fix bugs by asking clarifying questions, analyzing error messages, suggesting console.log statements, and providing step-by-step debugging strategies.',
        initialMessages: [
            {
                role: 'user',
                content: 'I\'m getting this error and need help debugging:\n\n**Error Message:**\n```\n[Paste error here]\n```\n\n**Relevant Code:**\n```\n[Paste relevant code here]\n```\n\n**What I Expected:** [Describe expected behavior]\n\n**What Actually Happens:** [Describe actual behavior]'
            }
        ],
        settings: { temperature: 0.2, expertMode: 'coding' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    },
    {
        id: 'template-brainstorm',
        name: 'Idea Brainstorm',
        description: 'Generate creative ideas and explore possibilities',
        category: 'brainstorm',
        tags: ['ideas', 'creative', 'brainstorm'],
        systemPrompt: 'You are a creative ideation partner. Generate diverse, innovative ideas without judgment. Think outside the box, combine unexpected concepts, and explore multiple angles. Encourage wild ideas alongside practical ones.',
        initialMessages: [
            {
                role: 'user',
                content: 'I need to brainstorm ideas for [PROJECT/CHALLENGE].\n\nContext: [Brief background]\n\nConstraints: [Any limitations]\n\nPlease generate at least 10 diverse ideas, ranging from practical to creative/unconventional.'
            }
        ],
        settings: { temperature: 0.9 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    },
    {
        id: 'template-data-analysis',
        name: 'Data Analysis',
        description: 'Analyze data and extract insights',
        category: 'analysis',
        tags: ['data', 'statistics', 'insights'],
        systemPrompt: 'You are a data analyst expert. Analyze data thoroughly, identify patterns and trends, suggest visualizations, and provide actionable insights. Be statistically rigorous but explain findings in accessible terms.',
        initialMessages: [
            {
                role: 'user',
                content: 'Please analyze this data and provide insights:\n\n```\n[Paste your data here - CSV, JSON, or table format]\n```\n\nI\'m specifically interested in:\n1. Key trends and patterns\n2. Outliers or anomalies\n3. Statistical summaries\n4. Recommended visualizations\n5. Actionable insights'
            }
        ],
        settings: { temperature: 0.3, expertMode: 'math' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
    }
];

export class TemplateService {
    private static templates: Map<string, ConversationTemplate> = new Map();
    private static categories: TemplateCategory[] = [...DEFAULT_CATEGORIES];
    private static initialized = false;

    /**
     * Initialize the service, load templates from storage
     */
    static init(): void {
        if (this.initialized) return;

        try {
            // Load user templates
            const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
            if (stored) {
                const parsed = parseJson(stored);
                if (Array.isArray(parsed)) {
                    parsed.forEach((entry) => {
                        const template = sanitizeTemplate(entry);
                        if (template) {
                            this.templates.set(template.id, template);
                        }
                    });
                }
            }

            // Add default templates if not already present
            DEFAULT_TEMPLATES.forEach(t => {
                if (!this.templates.has(t.id)) {
                    this.templates.set(t.id, t);
                }
            });

            // Load custom categories
            const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            if (storedCategories) {
                const parsedCategories = parseJson(storedCategories);
                const customCategories = Array.isArray(parsedCategories)
                    ? parsedCategories.map(sanitizeCategory).filter((category): category is TemplateCategory => category !== null)
                    : [];
                customCategories.forEach(c => {
                    if (!this.categories.find(cat => cat.id === c.id)) {
                        this.categories.push(c);
                    }
                });
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize template service:', error);
            this.initialized = true;
        }
    }

    /**
     * Get all templates
     */
    static getAllTemplates(): ConversationTemplate[] {
        this.init();
        return Array.from(this.templates.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get templates by category
     */
    static getTemplatesByCategory(categoryId: string): ConversationTemplate[] {
        this.init();
        return this.getAllTemplates().filter(t => t.category === categoryId);
    }

    /**
     * Get a specific template
     */
    static getTemplate(id: string): ConversationTemplate | undefined {
        this.init();
        return this.templates.get(id);
    }

    /**
     * Create a new template from current conversation
     */
    static createTemplate(
        name: string,
        description: string,
        category: string,
        messages: ChatMessage[],
        systemPrompt?: string,
        settings?: ConversationTemplate['settings'],
        tags: string[] = []
    ): ConversationTemplate {
        this.init();

        const candidate: ConversationTemplate = {
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            category,
            tags,
            systemPrompt,
            initialMessages: messages.map(m => ({
                role: m.role,
                content: m.content,
                images: m.images
            })),
            settings,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0
        };
        const template = sanitizeTemplate(candidate);
        if (!template) {
            throw new Error('Invalid template configuration');
        }

        this.templates.set(template.id, template);
        this.persist();

        return template;
    }

    /**
     * Update an existing template
     */
    static updateTemplate(id: string, updates: Partial<ConversationTemplate>): ConversationTemplate | null {
        this.init();

        const template = this.templates.get(id);
        if (!template) return null;

        const updated = sanitizeTemplate({
            ...template,
            ...updates,
            id: template.id,
            createdAt: template.createdAt,
            usageCount: template.usageCount,
            initialMessages: typeof updates.initialMessages !== 'undefined'
                ? updates.initialMessages
                    .map((message) => sanitizeTemplateMessage(message))
                    .filter((message): message is ConversationTemplate['initialMessages'][number] => message !== null)
                : template.initialMessages,
            tags: typeof updates.tags !== 'undefined'
                ? sanitizeStringArray(updates.tags)
                : template.tags,
            settings: typeof updates.settings !== 'undefined'
                ? sanitizeTemplateSettings(updates.settings)
                : template.settings,
            updatedAt: Date.now()
        });
        if (!updated) {
            return null;
        }

        this.templates.set(id, updated);
        this.persist();

        return updated;
    }

    /**
     * Delete a template
     */
    static deleteTemplate(id: string): boolean {
        this.init();

        // Don't allow deleting built-in templates
        if (DEFAULT_TEMPLATES.find(t => t.id === id)) {
            return false;
        }

        const deleted = this.templates.delete(id);
        if (deleted) {
            this.persist();
        }
        return deleted;
    }

    /**
     * Record template usage
     */
    static recordUsage(id: string): void {
        this.init();

        const template = this.templates.get(id);
        if (template) {
            template.usageCount++;
            template.updatedAt = Date.now();
            this.templates.set(id, template);
            this.persist();
        }
    }

    /**
     * Get most used templates
     */
    static getMostUsedTemplates(limit: number = 5): ConversationTemplate[] {
        this.init();
        return this.getAllTemplates()
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * Search templates
     */
    static searchTemplates(query: string): ConversationTemplate[] {
        this.init();

        const lowerQuery = query.toLowerCase();
        return this.getAllTemplates().filter(t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            t.category.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get all categories
     */
    static getCategories(): TemplateCategory[] {
        this.init();
        return this.categories;
    }

    /**
     * Export templates to JSON
     */
    static exportTemplates(templateIds?: string[]): string {
        this.init();

        const templates = templateIds
            ? this.getAllTemplates().filter(t => templateIds.includes(t.id))
            : this.getAllTemplates().filter(t => !DEFAULT_TEMPLATES.find(d => d.id === t.id));

        return JSON.stringify({
            version: '1.0',
            exportedAt: Date.now(),
            templates
        }, null, 2);
    }

    /**
     * Import templates from JSON
     */
    static importTemplates(jsonData: string): { imported: number; errors: string[] } {
        this.init();

        const errors: string[] = [];
        let imported = 0;

        const data = parseJson(jsonData);
        if (!isRecord(data) || !Array.isArray(data.templates)) {
            errors.push('Invalid template file format');
            return { imported, errors };
        }

        for (const templateEntry of data.templates) {
            const template = sanitizeTemplate(templateEntry);
            if (!template) {
                const fallbackName = isRecord(templateEntry) && typeof templateEntry.name === 'string'
                    ? templateEntry.name
                    : 'unknown';
                errors.push(`Failed to import template: ${fallbackName}`);
                continue;
            }
            const newTemplate: ConversationTemplate = {
                ...template,
                id: `template-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                usageCount: 0,
            };
            this.templates.set(newTemplate.id, newTemplate);
            imported++;
        }

        if (imported > 0) {
            this.persist();
        }

        return { imported, errors };
    }

    /**
     * Persist templates to localStorage
     */
    private static persist(): void {
        try {
            // Only persist non-default templates
            const seenIds = new Set<string>();
            const userTemplates = Array.from(this.templates.values())
                .filter(t => !DEFAULT_TEMPLATES.find(d => d.id === t.id))
                .map((entry) => sanitizeTemplate(entry))
                .filter((entry): entry is ConversationTemplate => {
                    if (!entry) {
                        return false;
                    }
                    if (seenIds.has(entry.id)) {
                        return false;
                    }
                    seenIds.add(entry.id);
                    return true;
                });

            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(userTemplates));
        } catch (error) {
            console.error('Failed to persist templates:', error);
        }
    }

    /**
     * Reset to defaults
     */
    static reset(): void {
        this.templates.clear();
        DEFAULT_TEMPLATES.forEach(t => this.templates.set(t.id, t));
        localStorage.removeItem(TEMPLATES_STORAGE_KEY);
    }
}

// Initialize on load
TemplateService.init();

export default TemplateService;
