/**
 * Workflows Manager Component
 *
 * UI for creating and managing automated workflows
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Trash2, Edit2, Save, Zap, History, RotateCcw,
    CheckCircle, AlertCircle
} from 'lucide-react';
import {
    workflowsService,
    WorkflowRule,
    WorkflowCondition,
    WorkflowAction,
    WorkflowExecution,
} from '../services/workflows';
import { toast } from 'sonner';

const CONDITION_TYPES: WorkflowCondition['type'][] = ['intent', 'keyword', 'message-count', 'topic', 'category', 'model'];
const CONDITION_OPERATORS: WorkflowCondition['operator'][] = [
    'equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater-than',
    'less-than',
];
const ACTION_TYPES: WorkflowAction['type'][] = [
    'set-model',
    'set-temperature',
    'set-system-prompt',
    'add-context',
    'trigger-webhook',
    'send-notification',
];

const isConditionType = (value: string): value is WorkflowCondition['type'] =>
    CONDITION_TYPES.includes(value as WorkflowCondition['type']);
const isConditionOperator = (value: string): value is WorkflowCondition['operator'] =>
    CONDITION_OPERATORS.includes(value as WorkflowCondition['operator']);
const isActionType = (value: string): value is WorkflowAction['type'] =>
    ACTION_TYPES.includes(value as WorkflowAction['type']);

interface WorkflowsManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WorkflowsManager: React.FC<WorkflowsManagerProps> = ({
    isOpen,
    onClose,
}) => {
    const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
    const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [rerunningId, setRerunningId] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadWorkflows();
            setExecutionHistory(workflowsService.getExecutionHistory(50));
            setPendingCount(workflowsService.getPendingApprovals().length);
        }
    }, [isOpen]);

    const loadWorkflows = () => {
        setWorkflows(workflowsService.getAllWorkflows());
    };

    const refreshHistory = () => {
        setExecutionHistory(workflowsService.getExecutionHistory(50));
    };

    const handleRerun = async (workflowId: string) => {
        setRerunningId(workflowId);
        try {
            const exec = await workflowsService.runWorkflowById(workflowId);
            if (exec) {
                toast.success('Workflow rerun completed');
                refreshHistory();
                setPendingCount(workflowsService.getPendingApprovals().length);
            } else {
                toast.error('Workflow not found');
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Rerun failed');
        } finally {
            setRerunningId(null);
        }
    };

    const handleApprovePending = async () => {
        setApproving(true);
        try {
            const result = await workflowsService.approveAndRunPendingActions();
            if (result.success) {
                toast.success('Approved actions completed');
                setPendingCount(0);
            } else {
                toast.error(result.error ?? 'Approval run failed');
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Approval failed');
        } finally {
            setApproving(false);
        }
    };

    const handleCreateWorkflow = () => {
        const newWorkflow: Omit<WorkflowRule, 'id'> = {
            name: 'New Workflow',
            description: '',
            enabled: true,
            conditions: [],
            actions: [],
            priority: 0,
        };
        const created = workflowsService.createWorkflow(newWorkflow);
        setEditingWorkflow(created);
        setShowCreateForm(false);
        loadWorkflows();
    };

    const handleSaveWorkflow = (workflow: WorkflowRule) => {
        workflowsService.updateWorkflow(workflow.id, workflow);
        loadWorkflows();
        setEditingWorkflow(null);
        toast.success('Workflow saved!');
    };

    const handleDeleteWorkflow = (id: string) => {
        if (confirm('Delete this workflow?')) {
            workflowsService.deleteWorkflow(id);
            loadWorkflows();
            toast.success('Workflow deleted');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Zap className="w-6 h-6 text-yellow-400" />
                            <h2 className="text-2xl font-bold text-white">Workflows</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setShowCreateForm(true);
                                    handleCreateWorkflow();
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                New Workflow
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Pending approvals banner (GEN-151) */}
                    {pendingCount > 0 && (
                        <div className="mx-6 mt-4 flex items-center justify-between gap-4 py-3 px-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <span className="text-amber-200 text-sm">
                                {pendingCount} high-impact action{pendingCount !== 1 ? 's' : ''} require approval (webhook, notification).
                            </span>
                            <button
                                onClick={handleApprovePending}
                                disabled={approving}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {approving ? 'Running…' : 'Approve and run'}
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {workflows.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No workflows configured</p>
                                <p className="text-sm mt-2">Create a workflow to automate conversation handling</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {workflows.map((workflow) => (
                                    <WorkflowCard
                                        key={workflow.id}
                                        workflow={workflow}
                                        onEdit={() => setEditingWorkflow(workflow)}
                                        onDelete={() => handleDeleteWorkflow(workflow.id)}
                                        onToggle={(enabled) => {
                                            workflowsService.updateWorkflow(workflow.id, { enabled });
                                            loadWorkflows();
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Run history (GEN-152) */}
                        <div className="mt-8 pt-6 border-t border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <History className="w-5 h-5 text-slate-400" />
                                <h3 className="text-lg font-semibold text-white">Run history</h3>
                            </div>
                            {executionHistory.length === 0 ? (
                                <p className="text-sm text-slate-500">No runs yet. Workflows will appear here when they run.</p>
                            ) : (
                                <ul className="space-y-2 max-h-48 overflow-y-auto">
                                    {executionHistory.map((exec, i) => {
                                        const name = workflowsService.getWorkflow(exec.workflowId)?.name ?? exec.workflowId;
                                        const date = new Date(exec.triggeredAt).toLocaleString();
                                        return (
                                            <li
                                                key={`${exec.workflowId}-${exec.triggeredAt}-${i}`}
                                                className="flex items-center justify-between gap-2 py-2 px-3 bg-slate-800/50 rounded border border-slate-700"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-medium text-white truncate block">{name}</span>
                                                    <span className="text-xs text-slate-500">{date}</span>
                                                    {exec.error && (
                                                        <span className="text-xs text-red-400 block truncate">{exec.error}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {exec.success ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" aria-hidden />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden />
                                                    )}
                                                    <button
                                                        onClick={() => handleRerun(exec.workflowId)}
                                                        disabled={rerunningId === exec.workflowId}
                                                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                                        title="Rerun workflow"
                                                        aria-label="Rerun workflow"
                                                    >
                                                        <RotateCcw size={14} className={rerunningId === exec.workflowId ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Edit Dialog */}
                    {editingWorkflow && (
                        <WorkflowEditor
                            workflow={editingWorkflow}
                            onSave={handleSaveWorkflow}
                            onClose={() => setEditingWorkflow(null)}
                        />
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Workflow Card Component
const WorkflowCard: React.FC<{
    workflow: WorkflowRule;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (enabled: boolean) => void;
}> = ({ workflow, onEdit, onDelete, onToggle }) => {
    return (
        <div className={`bg-slate-800 border rounded-lg p-4 ${workflow.enabled ? 'border-green-500/50' : 'border-slate-700'}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{workflow.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                            Priority: {workflow.priority}
                        </span>
                    </div>
                    {workflow.description && (
                        <p className="text-sm text-slate-400 mb-2">{workflow.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{workflow.conditions.length} conditions</span>
                        <span>{workflow.actions.length} actions</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggle(!workflow.enabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${workflow.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${workflow.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Workflow Editor Component
const WorkflowEditor: React.FC<{
    workflow: WorkflowRule;
    onSave: (workflow: WorkflowRule) => void;
    onClose: () => void;
}> = ({ workflow, onSave, onClose }) => {
    const [edited, setEdited] = useState<WorkflowRule>({ ...workflow });

    const addCondition = () => {
        setEdited({
            ...edited,
            conditions: [
                ...edited.conditions,
                { type: 'keyword', operator: 'contains', value: '' },
            ],
        });
    };

    const addAction = () => {
        setEdited({
            ...edited,
            actions: [
                ...edited.actions,
                { type: 'set-model', value: '' },
            ],
        });
    };

    return (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-slate-800 rounded-lg border border-slate-700 p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Edit Workflow</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                        <input
                            type="text"
                            value={edited.name}
                            onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                        <input
                            type="number"
                            value={edited.priority}
                            onChange={(e) => setEdited({ ...edited, priority: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">Conditions</label>
                            <button
                                onClick={addCondition}
                                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
                            >
                                <Plus size={14} className="inline mr-1" />
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {edited.conditions.map((condition, i) => (
                                <div key={i} className="flex gap-2 items-center bg-slate-900 p-2 rounded">
                                    <select
                                        value={condition.type}
                                        onChange={(e) => {
                                            const updated = [...edited.conditions];
                                            if (isConditionType(e.target.value)) {
                                                updated[i] = { ...condition, type: e.target.value };
                                            }
                                            setEdited({ ...edited, conditions: updated });
                                        }}
                                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                    >
                                        <option value="intent">Intent</option>
                                        <option value="keyword">Keyword</option>
                                        <option value="message-count">Message Count</option>
                                        <option value="model">Model</option>
                                    </select>
                                    <select
                                        value={condition.operator}
                                        onChange={(e) => {
                                            const updated = [...edited.conditions];
                                            if (isConditionOperator(e.target.value)) {
                                                updated[i] = { ...condition, operator: e.target.value };
                                            }
                                            setEdited({ ...edited, conditions: updated });
                                        }}
                                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="contains">Contains</option>
                                        <option value="starts-with">Starts With</option>
                                        <option value="ends-with">Ends With</option>
                                        <option value="greater-than">Greater Than</option>
                                        <option value="less-than">Less Than</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={condition.value}
                                        onChange={(e) => {
                                            const updated = [...edited.conditions];
                                            updated[i] = { ...condition, value: e.target.value };
                                            setEdited({ ...edited, conditions: updated });
                                        }}
                                        className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                        placeholder="Value"
                                    />
                                    <button
                                        onClick={() => {
                                            const updated = edited.conditions.filter((_, idx) => idx !== i);
                                            setEdited({ ...edited, conditions: updated });
                                        }}
                                        className="p-1 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">Actions</label>
                            <button
                                onClick={addAction}
                                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
                            >
                                <Plus size={14} className="inline mr-1" />
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {edited.actions.map((action, i) => (
                                <div key={i} className="flex gap-2 items-center bg-slate-900 p-2 rounded">
                                    <select
                                        value={action.type}
                                        onChange={(e) => {
                                            const updated = [...edited.actions];
                                            if (isActionType(e.target.value)) {
                                                updated[i] = { ...action, type: e.target.value };
                                            }
                                            setEdited({ ...edited, actions: updated });
                                        }}
                                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                    >
                                        <option value="set-model">Set Model</option>
                                        <option value="set-temperature">Set Temperature</option>
                                        <option value="set-system-prompt">Set System Prompt</option>
                                        <option value="trigger-webhook">Trigger Webhook</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={action.value}
                                        onChange={(e) => {
                                            const updated = [...edited.actions];
                                            updated[i] = { ...action, value: e.target.value };
                                            setEdited({ ...edited, actions: updated });
                                        }}
                                        className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                        placeholder="Value"
                                    />
                                    <button
                                        onClick={() => {
                                            const updated = edited.actions.filter((_, idx) => idx !== i);
                                            setEdited({ ...edited, actions: updated });
                                        }}
                                        className="p-1 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(edited)}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={16} />
                            Save Workflow
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
