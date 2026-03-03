/** @jest-environment jsdom */
import { WorkflowsService, HIGH_IMPACT_ACTION_TYPES } from '../src/renderer/services/workflows';
import type { WorkflowExecution } from '../src/renderer/services/workflows';

const EXECUTION_HISTORY_KEY = 'workflow_execution_history';

class MockLocalStorage {
    private store = new Map<string, string>();

    get length(): number {
        return this.store.size;
    }

    getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    key(index: number): string | null {
        if (index < 0 || index >= this.store.size) return null;
        return Array.from(this.store.keys())[index] ?? null;
    }

    clear(): void {
        this.store.clear();
    }
}

describe('WorkflowsService', () => {
    const localStorageMock = new MockLocalStorage();

    beforeAll(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            value: localStorageMock,
            configurable: true,
            writable: true,
        });
    });

    beforeEach(() => {
        jest.resetModules();
        localStorageMock.clear();
    });

    function getService(): WorkflowsService {
        const { WorkflowsService: WS } = require('../src/renderer/services/workflows') as typeof import('../src/renderer/services/workflows');
        return WS.getInstance();
    }

    describe('execution history - parseStoredExecutionHistory (indirect)', () => {
        it('handles valid JSON array', () => {
            const validEntry: WorkflowExecution = {
                workflowId: 'wf-1',
                triggeredAt: 1000,
                conditionsMatched: [],
                actionsExecuted: [{ type: 'set-model', value: 'gpt-4' }],
                success: true,
            };
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, JSON.stringify([validEntry]));
            const service = getService();
            const history = service.getExecutionHistory(10);
            expect(history).toHaveLength(1);
            expect(history[0]).toMatchObject({
                workflowId: 'wf-1',
                triggeredAt: 1000,
                success: true,
            });
        });

        it('handles invalid JSON', () => {
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, 'not valid json');
            const service = getService();
            expect(service.getExecutionHistory()).toEqual([]);
        });

        it('handles non-array JSON', () => {
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, '{"workflowId":"w1"}');
            const service = getService();
            expect(service.getExecutionHistory()).toEqual([]);
        });
    });

    describe('execution history - sanitizeExecution (indirect)', () => {
        it('accepts valid entries', () => {
            const valid = {
                workflowId: 'wf-2',
                triggeredAt: 2000,
                conditionsMatched: [],
                actionsExecuted: [],
                success: false,
                error: 'test error',
            };
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, JSON.stringify([valid]));
            const service = getService();
            const history = service.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toMatchObject({
                workflowId: 'wf-2',
                triggeredAt: 2000,
                success: false,
                error: 'test error',
            });
        });

        it('rejects entries missing required fields', () => {
            localStorageMock.setItem(
                EXECUTION_HISTORY_KEY,
                JSON.stringify([
                    { workflowId: 'w1' },
                    { triggeredAt: 1000 },
                    { workflowId: 'w2', triggeredAt: 2000 },
                    null,
                    [],
                ])
            );
            const service = getService();
            expect(service.getExecutionHistory()).toEqual([]);
        });
    });

    describe('execution history - load and get', () => {
        it('loads history from localStorage on construction', () => {
            const entry = {
                workflowId: 'wf-load',
                triggeredAt: 3000,
                conditionsMatched: [],
                actionsExecuted: [],
                success: true,
            };
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, JSON.stringify([entry]));
            const service = getService();
            const history = service.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0].workflowId).toBe('wf-load');
        });

        it('getExecutionHistory returns stored history (most recent first)', () => {
            const entries = [
                { workflowId: 'a', triggeredAt: 1000, conditionsMatched: [], actionsExecuted: [], success: true },
                { workflowId: 'b', triggeredAt: 2000, conditionsMatched: [], actionsExecuted: [], success: true },
            ];
            localStorageMock.setItem(EXECUTION_HISTORY_KEY, JSON.stringify(entries));
            const service = getService();
            const history = service.getExecutionHistory(5);
            expect(history).toHaveLength(2);
            expect(history[0].workflowId).toBe('b');
            expect(history[1].workflowId).toBe('a');
        });
    });

    describe('approved-actions', () => {
        it('executeActions with non-high-impact actions executes normally', () => {
            const service = getService();
            const w = service.createWorkflow({
                name: 'Low impact',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'hello' }],
                actions: [
                    { type: 'set-model', value: 'gpt-4' },
                    { type: 'set-temperature', value: 0.7 },
                ],
                priority: 1,
            });
            service.checkWorkflows('hello world', []);
            expect(service.getPendingApprovals()).toHaveLength(0);
            const history = service.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0].success).toBe(true);
        });

        it('executeActions with high-impact actions defers to pending', () => {
            const service = getService();
            service.createWorkflow({
                name: 'High impact webhook',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'deploy' }],
                actions: [{ type: 'trigger-webhook', value: 'https://example.com/webhook' }],
                priority: 1,
            });
            service.checkWorkflows('deploy to prod', []);
            expect(service.getPendingApprovals()).toHaveLength(1);
            expect(service.getPendingApprovals()[0].type).toBe('trigger-webhook');
        });

        it('executeActions with send-notification defers to pending', () => {
            const service = getService();
            service.createWorkflow({
                name: 'High impact notify',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'alert' }],
                actions: [{ type: 'send-notification', value: 'Important alert' }],
                priority: 1,
            });
            service.checkWorkflows('alert the team', []);
            expect(service.getPendingApprovals()).toHaveLength(1);
            expect(service.getPendingApprovals()[0].type).toBe('send-notification');
        });

        it('getPendingApprovals returns the pending list', () => {
            const service = getService();
            service.createWorkflow({
                name: 'Pending',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'x' }],
                actions: [
                    { type: 'trigger-webhook', value: 'url1' },
                    { type: 'send-notification', value: 'msg1' },
                ],
                priority: 1,
            });
            service.checkWorkflows('x', []);
            const pending = service.getPendingApprovals();
            expect(pending).toHaveLength(2);
            expect(pending.map((a) => a.type)).toContain('trigger-webhook');
            expect(pending.map((a) => a.type)).toContain('send-notification');
        });

        it('approveAndRunPendingActions executes and clears pending', async () => {
            const service = getService();
            service.createWorkflow({
                name: 'Approve',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'go' }],
                actions: [{ type: 'trigger-webhook', value: 'https://api.example.com' }],
                priority: 1,
            });
            service.checkWorkflows('go ahead', []);
            expect(service.getPendingApprovals()).toHaveLength(1);
            const result = await service.approveAndRunPendingActions();
            expect(result.success).toBe(true);
            expect(service.getPendingApprovals()).toHaveLength(0);
        });
    });

    describe('runWorkflowById', () => {
        it('creates an execution entry in history', async () => {
            const service = getService();
            const w = service.createWorkflow({
                name: 'Rerun workflow',
                enabled: true,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'test' }],
                actions: [{ type: 'set-model', value: 'claude' }],
                priority: 1,
            });
            const before = service.getExecutionHistory().length;
            const exec = await service.runWorkflowById(w.id);
            expect(exec).not.toBeNull();
            expect(exec!.workflowId).toBe(w.id);
            expect(exec!.actionsExecuted).toHaveLength(1);
            expect(exec!.actionsExecuted[0].type).toBe('set-model');
            const history = service.getExecutionHistory();
            expect(history.length).toBe(before + 1);
            expect(history[0].workflowId).toBe(w.id);
        });

        it('returns null for unknown workflow id', async () => {
            const service = getService();
            const exec = await service.runWorkflowById('nonexistent-id');
            expect(exec).toBeNull();
        });
    });

    describe('HIGH_IMPACT_ACTION_TYPES', () => {
        it('includes trigger-webhook and send-notification', () => {
            expect(HIGH_IMPACT_ACTION_TYPES.has('trigger-webhook')).toBe(true);
            expect(HIGH_IMPACT_ACTION_TYPES.has('send-notification')).toBe(true);
        });
    });
});
