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

const CONDITION_TYPES = new Set<WorkflowCondition['type']>([
    'intent',
    'keyword',
    'message-count',
    'topic',
    'category',
    'model',
]);

const CONDITION_OPERATORS = new Set<WorkflowCondition['operator']>([
    'equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater-than',
    'less-than',
]);

const ACTION_TYPES = new Set<WorkflowAction['type']>([
    'set-model',
    'set-temperature',
    'set-system-prompt',
    'add-context',
    'trigger-webhook',
    'send-notification',
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

const sanitizeCondition = (value: unknown): WorkflowCondition | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (!CONDITION_TYPES.has(value.type as WorkflowCondition['type'])) {
        return null;
    }
    if (!CONDITION_OPERATORS.has(value.operator as WorkflowCondition['operator'])) {
        return null;
    }

    const isMessageCountCondition = value.type === 'message-count';
    if (isMessageCountCondition) {
        if (typeof value.value !== 'number' || !Number.isFinite(value.value)) {
            return null;
        }
    } else if (!sanitizeNonEmptyString(value.value)) {
        return null;
    }

    return {
        type: value.type as WorkflowCondition['type'],
        operator: value.operator as WorkflowCondition['operator'],
        value: isMessageCountCondition
            ? value.value as number
            : sanitizeNonEmptyString(value.value) as string,
    };
};

const sanitizeAction = (value: unknown): WorkflowAction | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (!ACTION_TYPES.has(value.type as WorkflowAction['type'])) {
        return null;
    }
    const actionValue = typeof value.value === 'string'
        ? sanitizeNonEmptyString(value.value)
        : (typeof value.value === 'number' && Number.isFinite(value.value) ? value.value : null);
    if (actionValue === null) {
        return null;
    }
    if (value.config !== undefined && !isRecord(value.config)) {
        return null;
    }
    const config = isRecord(value.config) ? value.config : undefined;
    return {
        type: value.type as WorkflowAction['type'],
        value: actionValue,
        config,
    };
};

const sanitizeWorkflow = (value: unknown): WorkflowRule | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    if (!id || !name) {
        return null;
    }
    if (typeof value.enabled !== 'boolean') {
        return null;
    }
    if (typeof value.priority !== 'number' || !Number.isFinite(value.priority)) {
        return null;
    }

    const conditions = Array.isArray(value.conditions)
        ? value.conditions.map(sanitizeCondition).filter((condition): condition is WorkflowCondition => condition !== null)
        : [];
    const actions = Array.isArray(value.actions)
        ? value.actions.map(sanitizeAction).filter((action): action is WorkflowAction => action !== null)
        : [];
    if (conditions.length === 0 || actions.length === 0) {
        return null;
    }

    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) ?? undefined,
        enabled: value.enabled,
        conditions,
        actions,
        priority: value.priority,
    };
};

const parseStoredWorkflows = (raw: string): WorkflowRule[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenIds = new Set<string>();
    return parsed
        .map((entry) => sanitizeWorkflow(entry))
        .filter((entry): entry is WorkflowRule => {
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
                const parsed = parseStoredWorkflows(stored);
                parsed.forEach((entry) => {
                    this.workflows.set(entry.id, entry);
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
            const seenIds = new Set<string>();
            const workflows = Array.from(this.workflows.values())
                .map((entry) => sanitizeWorkflow(entry))
                .filter((entry): entry is WorkflowRule => {
                    if (!entry) {
                        return false;
                    }
                    if (seenIds.has(entry.id)) {
                        return false;
                    }
                    seenIds.add(entry.id);
                    return true;
                });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
        } catch (error) {
            console.error('Failed to save workflows:', error);
        }
    }

    /**
     * Create a new workflow
     */
    createWorkflow(workflow: Omit<WorkflowRule, 'id'>): WorkflowRule {
        const candidate: WorkflowRule = {
            ...workflow,
            id: crypto.randomUUID(),
        };
        const newWorkflow = sanitizeWorkflow(candidate);
        if (!newWorkflow) {
            throw new Error('Invalid workflow configuration');
        }
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

        const updated = sanitizeWorkflow({
            ...workflow,
            ...updates,
            id: workflow.id,
        });
        if (!updated) {
            return false;
        }
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
                    if (typeof condition.value === 'string') {
                        matches = this.evaluateCondition(intent, condition.operator, condition.value);
                    }
                    break;

                case 'keyword':
                    if (typeof condition.value === 'string') {
                        matches = this.evaluateCondition(message.toLowerCase(), condition.operator, condition.value.toLowerCase());
                    }
                    break;

                case 'message-count':
                    if (typeof condition.value === 'number') {
                        matches = this.evaluateCondition(conversationHistory.length, condition.operator, condition.value);
                    }
                    break;

                case 'model':
                    if (currentModel && typeof condition.value === 'string') {
                        matches = this.evaluateCondition(currentModel, condition.operator, condition.value);
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
