import React from 'react';
import { Plus, Server, Trash2 } from 'lucide-react';

export interface SettingsModelEndpoint {
    id: string;
    name: string;
    url: string;
    type: 'lm-studio' | 'openai-compatible' | 'ollama';
}

interface SettingsEndpointsTabProps {
    showAddEndpoint: boolean;
    setShowAddEndpoint: React.Dispatch<React.SetStateAction<boolean>>;
    newEndpoint: Partial<SettingsModelEndpoint>;
    setNewEndpoint: React.Dispatch<React.SetStateAction<Partial<SettingsModelEndpoint>>>;
    endpoints: SettingsModelEndpoint[];
    onAddEndpoint: () => void;
    onDeleteEndpoint: (id: string) => void;
}

export const SettingsEndpointsTab: React.FC<SettingsEndpointsTabProps> = ({
    showAddEndpoint,
    setShowAddEndpoint,
    newEndpoint,
    setNewEndpoint,
    endpoints,
    onAddEndpoint,
    onDeleteEndpoint,
}) => {
    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">Model Endpoints</h3>
                    <p className="text-slate-500 text-sm">Configure custom LLM endpoints (LM Studio, Ollama, etc.)</p>
                </div>
                <button
                    onClick={() => setShowAddEndpoint(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                >
                    <Plus size={16} /> Add Endpoint
                </button>
            </div>

            {showAddEndpoint && (
                <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-white mb-4">New Endpoint</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                            <input
                                value={newEndpoint.name}
                                onChange={(event) => setNewEndpoint({ ...newEndpoint, name: event.target.value })}
                                placeholder="My LM Studio"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Type</label>
                            <select
                                value={newEndpoint.type}
                                onChange={(event) => setNewEndpoint({ ...newEndpoint, type: event.target.value as SettingsModelEndpoint['type'] })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            >
                                <option value="lm-studio">LM Studio</option>
                                <option value="openai-compatible">OpenAI Compatible</option>
                                <option value="ollama">Ollama</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 block mb-1">URL</label>
                        <input
                            value={newEndpoint.url}
                            onChange={(event) => setNewEndpoint({ ...newEndpoint, url: event.target.value })}
                            placeholder="http://localhost:1234/v1"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAddEndpoint(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={onAddEndpoint} className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg">Save</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Server size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-white">Local LM Studio</div>
                            <div className="text-xs text-slate-500 font-mono">http://localhost:3000</div>
                        </div>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">Default</span>
                </div>

                {endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                <Server size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-white">{endpoint.name}</div>
                                <div className="text-xs text-slate-500 font-mono">{endpoint.url}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{endpoint.type}</span>
                            <button
                                onClick={() => onDeleteEndpoint(endpoint.id)}
                                className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
