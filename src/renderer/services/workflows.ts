/**
 * Workflows Service
 *
 * Create automated workflows for conversation handling
 */

import { ChatMessage } from '../../shared/types';
import { detectIntent } from '../lib/chatUtils';

export interface WorkflowRule {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    priority: number; // Higher priority runs first
}

export interface WorkflowCondition {
    type: 'intent' | 'keyword' | 'message-count' | 'topic' | 'category' | 'model';
    operator: 'equals' | 'contains' | 'starts-with' | 'ends-with' | 'greater-than' | 'less-than';
    value: string | number;
}

export interface WorkflowAction {
    type: 'set-model' | 'set-temperature' | 'set-system-prompt' | 'add-context' | 'trigger-webhook' | 'send-notification';
    value: string | number;
    config?: Record<string, unknown>;
}

export interface WorkflowExecution {
    workflowId: string;
    triggeredAt: number;
    conditionsMatched: WorkflowCondition[];
    actionsExecuted: WorkflowAction[];
    success: boolean;
    error?: string;
}

export class WorkflowsService {
    private static instance: WorkflowsService;
    private workflows: Map<string, WorkflowRule> = new Map();
    private readonly STORAGE_KEY = 'workflows';
    private executionHistory: WorkflowExecution[] = [];

    private constructor() {
        this.loadWorkflows();
    }

    static getInstance(): WorkflowsService {
        if (!WorkflowsService.instance) {
            WorkflowsService.instance = new WorkflowsService();
        }
        return WorkflowsService.instance;
    }

    /**
     * Load workflows from localStorage
     */
    private loadWorkflows(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const workflows: WorkflowRule[] = JSON.parse(stored);
                workflows.forEach(w => {
                    this.workflows.set(w.id, w);
                });
            }
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
    }

    /**
     * Save workflows to localStorage
     */
    private saveWorkflows(): void {
        try {
            const workflows = Array.from(this.workflows.values());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
        } catch (error) {
            console.error('Failed to save workflows:', error);
        }
    }

    /**
     * Create a new workflow
     */
    createWorkflow(workflow: Omit<WorkflowRule, 'id'>): WorkflowRule {
        const newWorkflow: WorkflowRule = {
            ...workflow,
            id: crypto.randomUUID(),
        };
        this.workflows.set(newWorkflow.id, newWorkflow);
        this.saveWorkflows();
        return newWorkflow;
    }

    /**
     * Get all workflows
     */
    getAllWorkflows(): WorkflowRule[] {
        return Array.from(this.workflows.values())
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get a workflow by ID
     */
    getWorkflow(id: string): WorkflowRule | undefined {
        return this.workflows.get(id);
    }

    /**
     * Update a workflow
     */
    updateWorkflow(id: string, updates: Partial<WorkflowRule>): boolean {
        const workflow = this.workflows.get(id);
        if (!workflow) return false;

        const updated = { ...workflow, ...updates };
        this.workflows.set(id, updated);
        this.saveWorkflows();
        return true;
    }

    /**
     * Delete a workflow
     */
    deleteWorkflow(id: string): boolean {
        const deleted = this.workflows.delete(id);
        if (deleted) {
            this.saveWorkflows();
        }
        return deleted;
    }

    /**
     * Check if workflow conditions match
     */
    private checkConditions(
        workflow: WorkflowRule,
        message: string,
        conversationHistory: ChatMessage[],
        currentModel?: string
    ): { matched: boolean; matchedConditions: WorkflowCondition[] } {
        const matchedConditions: WorkflowCondition[] = [];

        for (const condition of workflow.conditions) {
            let matches = false;

            switch (condition.type) {
                case 'intent':
                    const intent = detectIntent(message);
                    matches = this.evaluateCondition(intent, condition.operator, condition.value as string);
                    break;

                case 'keyword':
                    matches = this.evaluateCondition(message.toLowerCase(), condition.operator, (condition.value as string).toLowerCase());
                    break;

                case 'message-count':
                    matches = this.evaluateCondition(conversationHistory.length, condition.operator, condition.value as number);
                    break;

                case 'model':
                    if (currentModel) {
                        matches = this.evaluateCondition(currentModel, condition.operator, condition.value as string);
                    }
                    break;

                default:
                    matches = false;
            }

            if (matches) {
                matchedConditions.push(condition);
            }
        }

        // All conditions must match (AND logic)
        const allMatched = matchedConditions.length === workflow.conditions.length && workflow.conditions.length > 0;

        return { matched: allMatched, matchedConditions };
    }

    /**
     * Evaluate a single condition
     */
    private evaluateCondition(
        actual: string | number,
        operator: WorkflowCondition['operator'],
        expected: string | number
    ): boolean {
        switch (operator) {
            case 'equals':
                return actual === expected;
            case 'contains':
                return String(actual).includes(String(expected));
            case 'starts-with':
                return String(actual).startsWith(String(expected));
            case 'ends-with':
                return String(actual).endsWith(String(expected));
            case 'greater-than':
                return Number(actual) > Number(expected);
            case 'less-than':
                return Number(actual) < Number(expected);
            default:
                return false;
        }
    }

    /**
     * Execute workflow actions
     */
    private executeActions(actions: WorkflowAction[]): { success: boolean; error?: string } {
        try {
            // Actions would be executed here
            // For now, we just track them
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check and execute matching workflows
     */
    async checkWorkflows(
        message: string,
        conversationHistory: ChatMessage[],
        currentModel?: string
    ): Promise<WorkflowExecution[]> {
        const executions: WorkflowExecution[] = [];
        const enabledWorkflows = this.getAllWorkflows().filter(w => w.enabled);

        for (const workflow of enabledWorkflows) {
            const { matched, matchedConditions } = this.checkConditions(
                workflow,
                message,
                conversationHistory,
                currentModel
            );

            if (matched) {
                const result = this.executeActions(workflow.actions);
                const execution: WorkflowExecution = {
                    workflowId: workflow.id,
                    triggeredAt: Date.now(),
                    conditionsMatched: matchedConditions,
                    actionsExecuted: workflow.actions,
                    success: result.success,
                    error: result.error,
                };

                executions.push(execution);
                this.executionHistory.push(execution);

                // Limit history size
                if (this.executionHistory.length > 100) {
                    this.executionHistory = this.executionHistory.slice(-100);
                }
            }
        }

        return executions;
    }

    /**
     * Get execution history
     */
    getExecutionHistory(limit: number = 20): WorkflowExecution[] {
        return this.executionHistory.slice(-limit).reverse();
    }
}

export const workflowsService = WorkflowsService.getInstance();
