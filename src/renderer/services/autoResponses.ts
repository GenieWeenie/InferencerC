/**
 * Auto-Responses Service
 *
 * Set up automatic responses for common queries
 */

import { ChatMessage } from '../../shared/types';

export interface AutoResponse {
    id: string;
    name: string;
    description?: string;
    triggers: ResponseTrigger[];
    response: string;
    systemPrompt?: string;
    modelId?: string; // If not set, uses current model
    enabled: boolean;
    priority: number; // Higher priority = checked first
    matchCount: number;
    lastMatched?: number;
    createdAt: number;
}

export interface ResponseTrigger {
    type: 'exact' | 'contains' | 'starts-with' | 'ends-with' | 'regex' | 'intent';
    value: string;
    caseSensitive?: boolean;
}

export interface AutoResponseMatch {
    responseId: string;
    matchedAt: number;
    trigger: ResponseTrigger;
    userMessage: string;
    responseSent: boolean;
}

const TRIGGER_TYPES = new Set<ResponseTrigger['type']>([
    'exact',
    'contains',
    'starts-with',
    'ends-with',
    'regex',
    'intent',
]);

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

const sanitizeFiniteNonNegativeInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
};

const sanitizeTrigger = (value: unknown): ResponseTrigger | null => {
    if (!isRecord(value) || !TRIGGER_TYPES.has(value.type as ResponseTrigger['type'])) {
        return null;
    }
    const triggerValue = sanitizeNonEmptyString(value.value);
    if (!triggerValue) {
        return null;
    }

    return {
        type: value.type as ResponseTrigger['type'],
        value: triggerValue,
        caseSensitive: typeof value.caseSensitive === 'boolean' ? value.caseSensitive : undefined,
    };
};

const sanitizeResponse = (value: unknown): AutoResponse | null => {
    if (!isRecord(value) || !Array.isArray(value.triggers) || typeof value.enabled !== 'boolean') {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const responseText = sanitizeNonEmptyString(value.response);
    const priority = sanitizeFiniteNonNegativeInteger(value.priority);
    const matchCount = sanitizeFiniteNonNegativeInteger(value.matchCount);
    const createdAt = sanitizeFiniteNonNegativeInteger(value.createdAt);
    if (!id || !name || !responseText || priority === null || matchCount === null || createdAt === null) {
        return null;
    }

    const seenTriggerSignatures = new Set<string>();
    const triggers = value.triggers
        .map((entry) => sanitizeTrigger(entry))
        .filter((entry): entry is ResponseTrigger => {
            if (!entry) {
                return false;
            }
            const signature = `${entry.type}:${entry.value}:${entry.caseSensitive ? '1' : '0'}`;
            if (seenTriggerSignatures.has(signature)) {
                return false;
            }
            seenTriggerSignatures.add(signature);
            return true;
        });
    if (triggers.length === 0) {
        return null;
    }
    const lastMatched = sanitizeFiniteNonNegativeInteger(value.lastMatched);

    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) || undefined,
        triggers,
        response: responseText,
        systemPrompt: sanitizeNonEmptyString(value.systemPrompt) || undefined,
        modelId: sanitizeNonEmptyString(value.modelId) || undefined,
        enabled: value.enabled,
        priority,
        matchCount,
        lastMatched: lastMatched === null ? undefined : Math.max(createdAt, lastMatched),
        createdAt,
    };
};

const parseStoredResponses = (raw: string): AutoResponse[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenIds = new Set<string>();
    return parsed
        .map((entry) => sanitizeResponse(entry))
        .filter((entry): entry is AutoResponse => {
            if (!entry) {
                return false;
            }
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
};

export class AutoResponsesService {
    private static instance: AutoResponsesService;
    private readonly STORAGE_KEY = 'auto_responses';

    private constructor() {}

    static getInstance(): AutoResponsesService {
        if (!AutoResponsesService.instance) {
            AutoResponsesService.instance = new AutoResponsesService();
        }
        return AutoResponsesService.instance;
    }

    /**
     * Check if a message matches any auto-response
     */
    checkAutoResponse(message: string): AutoResponse | null {
        const responses = this.getAllResponses()
            .filter(r => r.enabled)
            .sort((a, b) => b.priority - a.priority);

        for (const response of responses) {
            if (this.matchesTriggers(message, response.triggers)) {
                // Update match stats
                response.matchCount++;
                response.lastMatched = Date.now();
                this.saveResponse(response);

                return response;
            }
        }

        return null;
    }

    /**
     * Check if message matches triggers
     */
    private matchesTriggers(message: string, triggers: ResponseTrigger[]): boolean {
        return triggers.some(trigger => {
            const messageToCheck = trigger.caseSensitive ? message : message.toLowerCase();
            const valueToCheck = trigger.caseSensitive ? trigger.value : trigger.value.toLowerCase();

            switch (trigger.type) {
                case 'exact':
                    return messageToCheck === valueToCheck;
                case 'contains':
                    return messageToCheck.includes(valueToCheck);
                case 'starts-with':
                    return messageToCheck.startsWith(valueToCheck);
                case 'ends-with':
                    return messageToCheck.endsWith(valueToCheck);
                case 'regex':
                    try {
                        const regex = new RegExp(trigger.value, trigger.caseSensitive ? '' : 'i');
                        return regex.test(message);
                    } catch {
                        return false;
                    }
                case 'intent':
                    // Simple intent matching (could be enhanced with AI)
                    return this.matchesIntent(message, trigger.value);
                default:
                    return false;
            }
        });
    }

    /**
     * Simple intent matching
     */
    private matchesIntent(message: string, intent: string): boolean {
        const lowerMessage = message.toLowerCase();
        const lowerIntent = intent.toLowerCase();

        // Common intent patterns
        const intentPatterns: Record<string, string[]> = {
            greeting: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
            goodbye: ['bye', 'goodbye', 'see you', 'farewell', 'later'],
            help: ['help', 'assist', 'support', 'how to', 'how do', 'what is', 'explain'],
            thanks: ['thanks', 'thank you', 'appreciate', 'grateful'],
        };

        const patterns = intentPatterns[lowerIntent] || [lowerIntent];
        return patterns.some(pattern => lowerMessage.includes(pattern));
    }

    /**
     * Create an auto-response
     */
    createResponse(response: Omit<AutoResponse, 'id' | 'createdAt' | 'matchCount'>): AutoResponse {
        const candidate: AutoResponse = {
            ...response,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            matchCount: 0,
        };
        const newResponse = sanitizeResponse(candidate);
        if (!newResponse) {
            throw new Error('Invalid auto-response configuration');
        }

        this.saveResponse(newResponse);
        return newResponse;
    }

    /**
     * Get all responses
     */
    getAllResponses(): AutoResponse[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return parseStoredResponses(stored);
        } catch (error) {
            console.error('Failed to load auto-responses:', error);
            return [];
        }
    }

    /**
     * Get a response by ID
     */
    getResponse(id: string): AutoResponse | null {
        const responses = this.getAllResponses();
        return responses.find(r => r.id === id) || null;
    }

    /**
     * Update a response
     */
    updateResponse(id: string, updates: Partial<AutoResponse>): boolean {
        const response = this.getResponse(id);
        if (!response) return false;

        const updated = sanitizeResponse({
            ...response,
            ...updates,
            id: response.id,
            createdAt: response.createdAt,
            triggers: typeof updates.triggers !== 'undefined'
                ? updates.triggers
                    .map((trigger) => sanitizeTrigger(trigger))
                    .filter((trigger): trigger is ResponseTrigger => trigger !== null)
                : response.triggers,
        });
        if (!updated) {
            return false;
        }
        this.saveResponse(updated);
        return true;
    }

    /**
     * Delete a response
     */
    deleteResponse(id: string): boolean {
        const responses = this.getAllResponses();
        const filtered = responses.filter(r => r.id !== id);
        if (filtered.length === responses.length) return false;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Save a response
     */
    private saveResponse(response: AutoResponse): void {
        const sanitized = sanitizeResponse(response);
        if (!sanitized) {
            return;
        }
        const responses = this.getAllResponses();
        const index = responses.findIndex(r => r.id === sanitized.id);
        if (index >= 0) {
            responses[index] = sanitized;
        } else {
            responses.push(sanitized);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(responses));
    }

    /**
     * Get most used responses
     */
    getMostUsedResponses(limit: number = 10): AutoResponse[] {
        const sanitizedLimit = sanitizeFiniteNonNegativeInteger(limit) ?? 10;
        return this.getAllResponses()
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, sanitizedLimit);
    }
}

export const autoResponsesService = AutoResponsesService.getInstance();
