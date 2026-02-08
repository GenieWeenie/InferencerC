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
        const newResponse: AutoResponse = {
            ...response,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            matchCount: 0,
        };

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
            return JSON.parse(stored);
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

        const updated = { ...response, ...updates };
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
        const responses = this.getAllResponses();
        const index = responses.findIndex(r => r.id === response.id);
        if (index >= 0) {
            responses[index] = response;
        } else {
            responses.push(response);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(responses));
    }

    /**
     * Get most used responses
     */
    getMostUsedResponses(limit: number = 10): AutoResponse[] {
        return this.getAllResponses()
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, limit);
    }
}

export const autoResponsesService = AutoResponsesService.getInstance();
