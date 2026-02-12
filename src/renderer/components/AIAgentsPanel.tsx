/**
 * AI Agents Panel
 *
 * Deploy autonomous AI agents for tasks
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Plus, Play, Pause, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
    aiAgentsService,
    AIAgent,
    AgentTask,
} from '../services/aiAgents';
import { toast } from 'sonner';

type CreateAgentInput = {
    name: string;
    description: string;
    role: string;
    capabilities: string[];
    model: string;
    systemPrompt: string;
    isActive: boolean;
};

interface AIAgentsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onExecutePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>;
}

export const AIAgentsPanel: React.FC<AIAgentsPanelProps> = ({
    isOpen,
    onClose,
    onExecutePrompt,
}) => {
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [showCreateAgent, setShowCreateAgent] = useState(false);
    const [newAgent, setNewAgent] = useState<CreateAgentInput>({
        name: '',
        description: '',
        role: '',
        capabilities: [],
        model: '',
        systemPrompt: '',
        isActive: true,
    });

    useEffect(() => {
        if (isOpen) {
            setAgents(aiAgentsService.getAllAgents());
        }
    }, [isOpen]);

    const handleCreateAgent = () => {
        if (!newAgent.name || !newAgent.role || !newAgent.model) {
            toast.error('Please fill in all required fields');
            return;
        }

        const agent = aiAgentsService.createAgent(newAgent);
        setAgents([...agents, agent]);
        setShowCreateAgent(false);
        setNewAgent({
            name: '',
            description: '',
            role: '',
            capabilities: [],
            model: '',
            systemPrompt: '',
            isActive: true,
        });
        toast.success('Agent created!');
    };

    const handleToggleAgent = (agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            aiAgentsService.updateAgent(agentId, { isActive: !agent.isActive });
            setAgents(aiAgentsService.getAllAgents());
        }
    };

    const handleDeleteAgent = (agentId: string) => {
        if (confirm('Delete this agent?')) {
            aiAgentsService.deleteAgent(agentId);
            setAgents(agents.filter(a => a.id !== agentId));
            toast.success('Agent deleted');
        }
    };

    const handleAddTask = (agentId: string) => {
        const description = prompt('Task description:');
        const type = prompt('Task type (research/analysis/generation/automation/monitoring):') as AgentTask['type'];
        if (description && type) {
            aiAgentsService.addTask(agentId, {
                type,
                description,
                parameters: {},
            });
            setAgents(aiAgentsService.getAllAgents());
            toast.success('Task added!');
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
                    className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Bot className="w-6 h-6 text-cyan-400" />
                            <h2 className="text-2xl font-bold text-white">AI Agents</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowCreateAgent(true)}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Create Agent
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {showCreateAgent ? (
                            <CreateAgentForm
                                agent={newAgent}
                                onChange={setNewAgent}
                                onSave={handleCreateAgent}
                                onCancel={() => setShowCreateAgent(false)}
                            />
                        ) : agents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No agents created yet</p>
                                <button
                                    onClick={() => setShowCreateAgent(true)}
                                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                                >
                                    Create Your First Agent
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {agents.map((agent) => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        onToggle={() => handleToggleAgent(agent.id)}
                                        onDelete={() => handleDeleteAgent(agent.id)}
                                        onAddTask={() => handleAddTask(agent.id)}
                                        onSelect={() => setSelectedAgent(agent)}
                                        onExecutePrompt={onExecutePrompt}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Create Agent Form Component
const CreateAgentForm: React.FC<{
    agent: CreateAgentInput;
    onChange: (agent: CreateAgentInput) => void;
    onSave: () => void;
    onCancel: () => void;
}> = ({ agent, onChange, onSave, onCancel }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
            <input
                type="text"
                value={agent.name}
                onChange={(e) => onChange({ ...agent, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                placeholder="Research Assistant"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
            <input
                type="text"
                value={agent.role}
                onChange={(e) => onChange({ ...agent, role: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                placeholder="Research and analyze topics"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
                value={agent.description}
                onChange={(e) => onChange({ ...agent, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                rows={2}
                placeholder="An AI agent specialized in research..."
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Model *</label>
            <input
                type="text"
                value={agent.model}
                onChange={(e) => onChange({ ...agent, model: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                placeholder="gpt-4"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">System Prompt</label>
            <textarea
                value={agent.systemPrompt}
                onChange={(e) => onChange({ ...agent, systemPrompt: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                rows={4}
                placeholder="You are a research assistant..."
            />
        </div>
        <div className="flex gap-2">
            <button
                onClick={onSave}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
            >
                Create Agent
            </button>
            <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
                Cancel
            </button>
        </div>
    </div>
);

// Agent Card Component
const AgentCard: React.FC<{
    agent: AIAgent;
    onToggle: () => void;
    onDelete: () => void;
    onAddTask: () => void;
    onSelect: () => void;
    onExecutePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>;
}> = ({ agent, onToggle, onDelete, onAddTask, onSelect, onExecutePrompt }) => {
    const [tasks, setTasks] = useState(aiAgentsService.getAgentTasks(agent.id));

    useEffect(() => {
        setTasks(aiAgentsService.getAgentTasks(agent.id));
    }, [agent.id]);

    const handleExecuteTask = async (taskId: string) => {
        try {
            await aiAgentsService.executeTask(agent.id, taskId, onExecutePrompt);
            setTasks(aiAgentsService.getAgentTasks(agent.id));
            toast.success('Task executed!');
        } catch (error) {
            toast.error('Failed to execute task');
        }
    };

    return (
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold text-white">{agent.name}</h3>
                        {agent.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mb-1">{agent.description}</p>
                    <p className="text-xs text-slate-500">Role: {agent.role} • Model: {agent.model}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggle}
                        className={`p-2 rounded transition-colors ${
                            agent.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                        }`}
                    >
                        {agent.isActive ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Tasks */}
            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Tasks</span>
                    <button
                        onClick={onAddTask}
                        className="text-xs px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30"
                    >
                        + Add Task
                    </button>
                </div>
                {tasks.pending.length > 0 && (
                    <div className="space-y-1">
                        {tasks.pending.map((task) => (
                            <div key={task.id} className="p-2 bg-slate-900 rounded flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="text-xs font-medium text-white">{task.description}</div>
                                    <div className="text-xs text-slate-500">{task.type}</div>
                                </div>
                                <button
                                    onClick={() => handleExecuteTask(task.id)}
                                    className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                                >
                                    Execute
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {tasks.completed.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <div className="text-xs text-slate-500 mb-1">Completed ({tasks.completed.length})</div>
                        {tasks.completed.slice(-3).map((task) => (
                            <div key={task.id} className="p-2 bg-slate-900/50 rounded flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-slate-400 truncate">{task.description}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
