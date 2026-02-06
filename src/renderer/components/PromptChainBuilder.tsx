/**
 * Prompt Chain Builder Component
 *
 * Visual interface for building and executing prompt chains.
 * Features:
 * - Drag-and-drop step ordering
 * - Visual chain flow
 * - Step configuration
 * - Real-time execution with progress
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    X, Plus, Play, Pause, RotateCcw, Save, Trash2, ChevronDown, ChevronRight,
    GitBranch, ArrowRight, Check, AlertCircle, Loader2, Settings2, Copy,
    FileText, Zap, Filter, Layers
} from 'lucide-react';
import {
    PromptChainingService,
    PromptChain,
    ChainStep,
    ChainExecutionState,
    StepResult,
    ChainContext,
    ChainStepType
} from '../services/promptChaining';

interface PromptChainBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onExecutePrompt: (
        prompt: string,
        systemPrompt?: string,
        modelId?: string,
        temperature?: number
    ) => Promise<{ content: string; tokensUsed?: number }>;
}

const STEP_TYPE_INFO: Record<ChainStepType, { icon: React.ReactNode; label: string; color: string }> = {
    prompt: { icon: <FileText className="w-4 h-4" />, label: 'Prompt', color: 'blue' },
    transform: { icon: <Zap className="w-4 h-4" />, label: 'Transform', color: 'purple' },
    condition: { icon: <Filter className="w-4 h-4" />, label: 'Condition', color: 'orange' },
    aggregate: { icon: <Layers className="w-4 h-4" />, label: 'Aggregate', color: 'green' },
};

export const PromptChainBuilder: React.FC<PromptChainBuilderProps> = ({
    isOpen,
    onClose,
    onExecutePrompt,
}) => {
    const [chains, setChains] = useState<PromptChain[]>([]);
    const [selectedChain, setSelectedChain] = useState<PromptChain | null>(null);
    const [editingChain, setEditingChain] = useState<PromptChain | null>(null);
    const [executionState, setExecutionState] = useState<ChainExecutionState | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());
    const [view, setView] = useState<'list' | 'builder' | 'execute'>('list');

    // Load chains
    useEffect(() => {
        if (isOpen) {
            setChains(PromptChainingService.getAllChains());
        }
    }, [isOpen]);

    const handleSelectChain = (chain: PromptChain) => {
        setSelectedChain(chain);
        setView('execute');
    };

    const handleCreateNew = () => {
        const newChain: PromptChain = {
            id: '',
            name: 'New Chain',
            description: '',
            version: 1,
            steps: [
                {
                    id: 'step-1',
                    name: 'Step 1',
                    type: 'prompt',
                    prompt: '{{input}}',
                }
            ],
            outputStep: 'step-1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0,
            tags: [],
        };
        setEditingChain(newChain);
        setView('builder');
    };

    const handleEditChain = (chain: PromptChain) => {
        setEditingChain({ ...chain });
        setView('builder');
    };

    const handleSaveChain = () => {
        if (!editingChain) return;

        if (editingChain.id) {
            PromptChainingService.updateChain(editingChain.id, editingChain);
        } else {
            PromptChainingService.createChain(
                editingChain.name,
                editingChain.description,
                editingChain.steps,
                editingChain.outputStep,
                editingChain.tags
            );
        }

        setChains(PromptChainingService.getAllChains());
        setEditingChain(null);
        setView('list');
    };

    const handleDeleteChain = (chainId: string) => {
        if (confirm('Are you sure you want to delete this chain?')) {
            PromptChainingService.deleteChain(chainId);
            setChains(PromptChainingService.getAllChains());
            if (selectedChain?.id === chainId) {
                setSelectedChain(null);
            }
        }
    };

    const handleExecuteChain = async () => {
        if (!selectedChain || !inputValue.trim()) return;

        setStepResults(new Map());
        setExecutionState({
            chainId: selectedChain.id,
            startedAt: Date.now(),
            currentStepId: '',
            status: 'running',
            input: inputValue,
            stepResults: new Map(),
        });

        try {
            const finalState = await PromptChainingService.executeChain(
                selectedChain.id,
                inputValue,
                {
                    onStepStart: (step, context) => {
                        setExecutionState(prev => prev ? {
                            ...prev,
                            currentStepId: step.id,
                        } : null);
                    },
                    onStepComplete: (step, result) => {
                        setStepResults(prev => new Map(prev).set(step.id, result));
                    },
                    onStepError: (step, error) => {
                        console.error(`Step ${step.id} error:`, error);
                    },
                    onChainComplete: (state) => {
                        setExecutionState(state);
                    },
                    executePrompt: onExecutePrompt,
                }
            );

            setExecutionState(finalState);
        } catch (error) {
            console.error('Chain execution error:', error);
            setExecutionState(prev => prev ? {
                ...prev,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            } : null);
        }
    };

    const handleAddStep = () => {
        if (!editingChain) return;

        const newStep: ChainStep = {
            id: `step-${Date.now()}`,
            name: `Step ${editingChain.steps.length + 1}`,
            type: 'prompt',
            prompt: '{{input}}',
        };

        setEditingChain({
            ...editingChain,
            steps: [...editingChain.steps, newStep],
            outputStep: newStep.id,
        });
    };

    const handleUpdateStep = (stepId: string, updates: Partial<ChainStep>) => {
        if (!editingChain) return;

        setEditingChain({
            ...editingChain,
            steps: editingChain.steps.map(s =>
                s.id === stepId ? { ...s, ...updates } : s
            ),
        });
    };

    const handleRemoveStep = (stepId: string) => {
        if (!editingChain) return;

        const newSteps = editingChain.steps.filter(s => s.id !== stepId);
        setEditingChain({
            ...editingChain,
            steps: newSteps,
            outputStep: newSteps.length > 0 ? newSteps[newSteps.length - 1].id : '',
        });
    };

    const toggleStepExpanded = (stepId: string) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) {
                next.delete(stepId);
            } else {
                next.add(stepId);
            }
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <GitBranch className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Prompt Chain Builder</h2>
                        {view !== 'list' && (
                            <button
                                onClick={() => {
                                    setView('list');
                                    setEditingChain(null);
                                    setSelectedChain(null);
                                }}
                                className="text-sm text-slate-400 hover:text-white"
                            >
                                ← Back to List
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {view === 'list' && (
                        <ChainList
                            chains={chains}
                            onSelect={handleSelectChain}
                            onEdit={handleEditChain}
                            onDelete={handleDeleteChain}
                            onCreateNew={handleCreateNew}
                        />
                    )}

                    {view === 'builder' && editingChain && (
                        <ChainEditor
                            chain={editingChain}
                            onUpdateChain={setEditingChain}
                            onAddStep={handleAddStep}
                            onUpdateStep={handleUpdateStep}
                            onRemoveStep={handleRemoveStep}
                            onSave={handleSaveChain}
                            onCancel={() => {
                                setEditingChain(null);
                                setView('list');
                            }}
                        />
                    )}

                    {view === 'execute' && selectedChain && (
                        <ChainExecutor
                            chain={selectedChain}
                            inputValue={inputValue}
                            onInputChange={setInputValue}
                            onExecute={handleExecuteChain}
                            executionState={executionState}
                            stepResults={stepResults}
                            expandedSteps={expandedSteps}
                            onToggleStep={toggleStepExpanded}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Chain List Component
const ChainList: React.FC<{
    chains: PromptChain[];
    onSelect: (chain: PromptChain) => void;
    onEdit: (chain: PromptChain) => void;
    onDelete: (chainId: string) => void;
    onCreateNew: () => void;
}> = ({ chains, onSelect, onEdit, onDelete, onCreateNew }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-400">Your Chains</h3>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
                <Plus className="w-4 h-4" />
                New Chain
            </button>
        </div>

        <div className="grid gap-3">
            {chains.map(chain => (
                <div
                    key={chain.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="text-white font-medium">{chain.name}</h4>
                            <p className="text-sm text-slate-400 mt-1">{chain.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span>{chain.steps.length} steps</span>
                                <span>Used {chain.usageCount} times</span>
                                {chain.tags.length > 0 && (
                                    <div className="flex gap-1">
                                        {chain.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 bg-slate-700 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onSelect(chain)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                title="Execute"
                            >
                                <Play className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                                onClick={() => onEdit(chain)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Settings2 className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                                onClick={() => onDelete(chain.id)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {chains.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No chains yet. Create your first one!</p>
                </div>
            )}
        </div>
    </div>
);

// Chain Editor Component
const ChainEditor: React.FC<{
    chain: PromptChain;
    onUpdateChain: (chain: PromptChain) => void;
    onAddStep: () => void;
    onUpdateStep: (stepId: string, updates: Partial<ChainStep>) => void;
    onRemoveStep: (stepId: string) => void;
    onSave: () => void;
    onCancel: () => void;
}> = ({ chain, onUpdateChain, onAddStep, onUpdateStep, onRemoveStep, onSave, onCancel }) => (
    <div className="space-y-6">
        {/* Chain Info */}
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Chain Name</label>
                <input
                    type="text"
                    value={chain.name}
                    onChange={(e) => onUpdateChain({ ...chain, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea
                    value={chain.description}
                    onChange={(e) => onUpdateChain({ ...chain, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                />
            </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-400">Steps</h3>
                <button
                    onClick={onAddStep}
                    className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                >
                    <Plus className="w-4 h-4" />
                    Add Step
                </button>
            </div>

            {chain.steps.map((step, index) => (
                <StepEditor
                    key={step.id}
                    step={step}
                    index={index}
                    allSteps={chain.steps}
                    isOutput={chain.outputStep === step.id}
                    onUpdate={(updates) => onUpdateStep(step.id, updates)}
                    onRemove={() => onRemoveStep(step.id)}
                    onSetAsOutput={() => onUpdateChain({ ...chain, outputStep: step.id })}
                />
            ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
                <Save className="w-4 h-4" />
                Save Chain
            </button>
        </div>
    </div>
);

// Step Editor Component
const StepEditor: React.FC<{
    step: ChainStep;
    index: number;
    allSteps: ChainStep[];
    isOutput: boolean;
    onUpdate: (updates: Partial<ChainStep>) => void;
    onRemove: () => void;
    onSetAsOutput: () => void;
}> = ({ step, index, allSteps, isOutput, onUpdate, onRemove, onSetAsOutput }) => {
    const [expanded, setExpanded] = useState(true);
    const typeInfo = STEP_TYPE_INFO[step.type];

    return (
        <div className={`border rounded-lg ${isOutput ? 'border-green-600' : 'border-slate-700'} bg-slate-800`}>
            <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`p-1.5 rounded bg-${typeInfo.color}-500/20 text-${typeInfo.color}-400`}>
                    {typeInfo.icon}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                            e.stopPropagation();
                            onUpdate({ name: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent text-white font-medium focus:outline-none"
                    />
                    <div className="text-xs text-slate-500">{typeInfo.label}</div>
                </div>
                {isOutput && (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        Output
                    </span>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-1 hover:bg-slate-700 rounded"
                >
                    <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </div>

            {expanded && (
                <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                        <select
                            value={step.type}
                            onChange={(e) => onUpdate({ type: e.target.value as ChainStepType })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                        >
                            <option value="prompt">Prompt</option>
                            <option value="transform">Transform</option>
                            <option value="aggregate">Aggregate</option>
                        </select>
                    </div>

                    {step.type === 'prompt' && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Prompt (use {'{{input}}'} or {'{{stepName.output}}'})
                                </label>
                                <textarea
                                    value={step.prompt || ''}
                                    onChange={(e) => onUpdate({ prompt: e.target.value })}
                                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white font-mono"
                                    rows={4}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Temperature</label>
                                    <input
                                        type="number"
                                        value={step.temperature ?? 0.7}
                                        onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Depends On</label>
                                    <select
                                        multiple
                                        value={step.dependsOn || []}
                                        onChange={(e) => {
                                            const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                            onUpdate({ dependsOn: selected });
                                        }}
                                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                    >
                                        {allSteps.filter(s => s.id !== step.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {!isOutput && (
                        <button
                            onClick={onSetAsOutput}
                            className="text-xs text-green-400 hover:text-green-300"
                        >
                            Set as output step
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Chain Executor Component
const ChainExecutor: React.FC<{
    chain: PromptChain;
    inputValue: string;
    onInputChange: (value: string) => void;
    onExecute: () => void;
    executionState: ChainExecutionState | null;
    stepResults: Map<string, StepResult>;
    expandedSteps: Set<string>;
    onToggleStep: (stepId: string) => void;
}> = ({ chain, inputValue, onInputChange, onExecute, executionState, stepResults, expandedSteps, onToggleStep }) => {
    const isRunning = executionState?.status === 'running';
    const outputStep = chain.steps.find(s => s.id === chain.outputStep);
    const outputResult = outputStep ? stepResults.get(outputStep.id) : null;

    return (
        <div className="space-y-6">
            {/* Chain Info */}
            <div>
                <h3 className="text-xl font-semibold text-white">{chain.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{chain.description}</p>
            </div>

            {/* Input */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Input</label>
                <textarea
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Enter your input here..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    disabled={isRunning}
                />
            </div>

            {/* Execute Button */}
            <button
                onClick={onExecute}
                disabled={isRunning || !inputValue.trim()}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium transition-colors ${isRunning
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
            >
                {isRunning ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executing...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        Execute Chain
                    </>
                )}
            </button>

            {/* Step Progress */}
            {executionState && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-400">Progress</h4>
                    <div className="space-y-2">
                        {chain.steps.map((step, index) => {
                            const result = stepResults.get(step.id);
                            const isCurrent = executionState.currentStepId === step.id && isRunning;
                            const isComplete = !!result && !result.error;
                            const hasError = !!result?.error;
                            const isExpanded = expandedSteps.has(step.id);

                            return (
                                <div key={step.id} className="bg-slate-800 rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-750"
                                        onClick={() => onToggleStep(step.id)}
                                    >
                                        {isCurrent && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                                        {isComplete && <Check className="w-4 h-4 text-green-400" />}
                                        {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
                                        {!isCurrent && !isComplete && !hasError && (
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                                        )}
                                        <span className="flex-1 text-sm text-white">{step.name}</span>
                                        {result && (
                                            <span className="text-xs text-slate-500">
                                                {result.completedAt - result.startedAt}ms
                                            </span>
                                        )}
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                    {isExpanded && result && (
                                        <div className="p-3 pt-0 border-t border-slate-700">
                                            <div className="text-xs text-slate-400 mb-1">Output:</div>
                                            <pre className="text-sm text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto max-h-40">
                                                {result.output || result.error || 'No output'}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Final Output */}
            {outputResult && !isRunning && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-slate-400">Final Output</h4>
                        <button
                            onClick={() => navigator.clipboard.writeText(outputResult.output)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                        >
                            <Copy className="w-3 h-3" />
                            Copy
                        </button>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 border border-green-600/50">
                        <pre className="text-sm text-white whitespace-pre-wrap">
                            {outputResult.output}
                        </pre>
                    </div>
                </div>
            )}

            {/* Error State */}
            {executionState?.status === 'failed' && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Chain execution failed</span>
                    </div>
                    <p className="text-sm text-red-300 mt-2">{executionState.error}</p>
                </div>
            )}
        </div>
    );
};

export default PromptChainBuilder;
