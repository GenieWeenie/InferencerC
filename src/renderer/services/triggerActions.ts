/**
 * Trigger Actions Service
 *
 * Trigger actions based on conversation outcomes
 */

import { ChatMessage } from '../../shared/types';
import { HistoryService } from './history';

export interface TriggerCondition {
    type: 'message-count' | 'sentiment' | 'keyword' | 'topic' | 'model-response' | 'error' | 'custom';
    operator: 'equals' | 'greater-than' | 'less-than' | 'contains' | 'matches';
    value: string | number;
}

export interface TriggerAction {
    type: 'send-notification' | 'save-to-file' | 'send-webhook' | 'change-model' | 'execute-script' | 'tag-conversation' | 'export-conversation';
    config: Record<string, unknown>;
}

export interface TriggerRule {
    id: string;
    name: string;
    description?: string;
    conditions: TriggerCondition[];
    actions: TriggerAction[];
    enabled: boolean;
    priority: number;
    triggerCount: number;
    lastTriggered?: number;
    createdAt: number;
}

export interface TriggerExecution {
    ruleId: string;
    triggeredAt: number;
    conditionsMatched: TriggerCondition[];
    actionsExecuted: TriggerAction[];
    success: boolean;
    error?: string;
}

export class TriggerActionsService {
    private static instance: TriggerActionsService;
    private readonly STORAGE_KEY = 'trigger_rules';
    private readonly EXECUTIONS_KEY = 'trigger_executions';

    private constructor() {}

    static getInstance(): TriggerActionsService {
        if (!TriggerActionsService.instance) {
            TriggerActionsService.instance = new TriggerActionsService();
        }
        return TriggerActionsService.instance;
    }

    /**
     * Check triggers for a conversation
     */
    async checkTriggers(sessionId: string, newMessage?: ChatMessage): Promise<TriggerExecution[]> {
        const session = HistoryService.getSession(sessionId);
        if (!session) return [];

        const rules = this.getAllRules()
            .filter(r => r.enabled)
            .sort((a, b) => b.priority - a.priority);

        const executions: TriggerExecution[] = [];

        for (const rule of rules) {
            const matched = await this.checkConditions(rule, session, newMessage);
            if (matched.length > 0) {
                const execution = await this.executeActions(rule, session);
                executions.push(execution);

                // Update rule stats
                rule.triggerCount++;
                rule.lastTriggered = Date.now();
                this.saveRule(rule);
            }
        }

        return executions;
    }

    /**
     * Check if conditions match
     */
    private async checkConditions(
        rule: TriggerRule,
        session: ReturnType<typeof HistoryService.getSession>,
        newMessage?: ChatMessage
    ): Promise<TriggerCondition[]> {
        if (!session) return [];

        const matched: TriggerCondition[] = [];

        for (const condition of rule.conditions) {
            let matches = false;

            switch (condition.type) {
                case 'message-count':
                    const count = session.messages?.length || 0;
                    matches = this.evaluateCondition(count, condition.operator, condition.value as number);
                    break;

                case 'keyword':
                    const allText = session.messages?.map(m => m.content || '').join(' ').toLowerCase() || '';
                    matches = this.evaluateCondition(allText, condition.operator, condition.value as string);
                    break;

                case 'sentiment':
                    // Would need sentiment analysis service
                    // For now, simplified check
                    matches = false; // Placeholder
                    break;

                case 'error':
                    const hasError = session.messages?.some(m => 
                        (m.content || '').toLowerCase().includes('error') ||
                        (m.content || '').toLowerCase().includes('failed')
                    );
                    matches = hasError && condition.operator === 'equals' && condition.value === 'true';
                    break;

                case 'model-response':
                    if (newMessage && newMessage.role === 'assistant') {
                        matches = this.evaluateCondition(newMessage.content || '', condition.operator, condition.value as string);
                    }
                    break;

                default:
                    matches = false;
            }

            if (matches) {
                matched.push(condition);
            }
        }

        // All conditions must match (AND logic)
        return matched.length === rule.conditions.length ? matched : [];
    }

    /**
     * Evaluate a condition
     */
    private evaluateCondition(
        actual: string | number,
        operator: TriggerCondition['operator'],
        expected: string | number
    ): boolean {
        switch (operator) {
            case 'equals':
                return actual === expected;
            case 'greater-than':
                return Number(actual) > Number(expected);
            case 'less-than':
                return Number(actual) < Number(expected);
            case 'contains':
                return String(actual).includes(String(expected));
            case 'matches':
                try {
                    const regex = new RegExp(String(expected), 'i');
                    return regex.test(String(actual));
                } catch {
                    return false;
                }
            default:
                return false;
        }
    }

    /**
     * Execute actions
     */
    private async executeActions(
        rule: TriggerRule,
        session: ReturnType<typeof HistoryService.getSession>
    ): Promise<TriggerExecution> {
        const execution: TriggerExecution = {
            ruleId: rule.id,
            triggeredAt: Date.now(),
            conditionsMatched: rule.conditions,
            actionsExecuted: [],
            success: true,
        };

        for (const action of rule.actions) {
            try {
                await this.executeAction(action, session);
                execution.actionsExecuted.push(action);
            } catch (error) {
                execution.success = false;
                execution.error = error instanceof Error ? error.message : 'Unknown error';
                break;
            }
        }

        this.saveExecution(execution);
        return execution;
    }

    /**
     * Execute a single action
     */
    private async executeAction(
        action: TriggerAction,
        session: ReturnType<typeof HistoryService.getSession>
    ): Promise<void> {
        switch (action.type) {
            case 'send-notification':
                // Show browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(action.config.title as string || 'Trigger Alert', {
                        body: action.config.message as string || 'A trigger condition was met',
                    });
                }
                break;

            case 'send-webhook':
                // Send webhook
                if (action.config.url) {
                    await fetch(action.config.url as string, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: session?.id,
                            title: session?.title,
                            messageCount: session?.messages?.length || 0,
                            ...action.config.data,
                        }),
                    });
                }
                break;

            case 'tag-conversation':
                // Tag conversation (would integrate with autoTaggingService)
                if (action.config.tag && session) {
                    window.dispatchEvent(new CustomEvent('trigger-tag-conversation', {
                        detail: { sessionId: session.id, tag: action.config.tag },
                    }));
                }
                break;

            case 'export-conversation':
                // Export conversation (would integrate with export service)
                if (session) {
                    window.dispatchEvent(new CustomEvent('trigger-export-conversation', {
                        detail: { sessionId: session.id, format: action.config.format || 'json' },
                    }));
                }
                break;

            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    /**
     * Create a trigger rule
     */
    createRule(rule: Omit<TriggerRule, 'id' | 'createdAt' | 'triggerCount'>): TriggerRule {
        const newRule: TriggerRule = {
            ...rule,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            triggerCount: 0,
        };

        this.saveRule(newRule);
        return newRule;
    }

    /**
     * Get all rules
     */
    getAllRules(): TriggerRule[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return JSON.parse(stored);
        } catch (error) {
            console.error('Failed to load trigger rules:', error);
            return [];
        }
    }

    /**
     * Get a rule by ID
     */
    getRule(id: string): TriggerRule | null {
        const rules = this.getAllRules();
        return rules.find(r => r.id === id) || null;
    }

    /**
     * Update a rule
     */
    updateRule(id: string, updates: Partial<TriggerRule>): boolean {
        const rule = this.getRule(id);
        if (!rule) return false;

        const updated = { ...rule, ...updates };
        this.saveRule(updated);
        return true;
    }

    /**
     * Delete a rule
     */
    deleteRule(id: string): boolean {
        const rules = this.getAllRules();
        const filtered = rules.filter(r => r.id !== id);
        if (filtered.length === rules.length) return false;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Save a rule
     */
    private saveRule(rule: TriggerRule): void {
        const rules = this.getAllRules();
        const index = rules.findIndex(r => r.id === rule.id);
        if (index >= 0) {
            rules[index] = rule;
        } else {
            rules.push(rule);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rules));
    }

    /**
     * Save execution record
     */
    private saveExecution(execution: TriggerExecution): void {
        try {
            const stored = localStorage.getItem(this.EXECUTIONS_KEY);
            const executions: TriggerExecution[] = stored ? JSON.parse(stored) : [];
            executions.push(execution);
            // Keep only last 100 executions
            if (executions.length > 100) {
                executions.shift();
            }
            localStorage.setItem(this.EXECUTIONS_KEY, JSON.stringify(executions));
        } catch (error) {
            console.error('Failed to save execution:', error);
        }
    }

    /**
     * Get execution history
     */
    getExecutionHistory(limit: number = 20): TriggerExecution[] {
        try {
            const stored = localStorage.getItem(this.EXECUTIONS_KEY);
            if (!stored) return [];
            const executions: TriggerExecution[] = JSON.parse(stored);
            return executions
                .sort((a, b) => b.triggeredAt - a.triggeredAt)
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to load execution history:', error);
            return [];
        }
    }
}

export const triggerActionsService = TriggerActionsService.getInstance();
