import React from 'react';
import { Edit2, Plus, Sparkles, Trash2 } from 'lucide-react';

export interface SettingsSystemPreset {
    id: string;
    name: string;
    prompt: string;
}

interface SettingsPresetsTabProps {
    showAddPreset: boolean;
    setShowAddPreset: React.Dispatch<React.SetStateAction<boolean>>;
    newPreset: Partial<SettingsSystemPreset>;
    setNewPreset: React.Dispatch<React.SetStateAction<Partial<SettingsSystemPreset>>>;
    presets: SettingsSystemPreset[];
    editingPreset: string | null;
    setEditingPreset: React.Dispatch<React.SetStateAction<string | null>>;
    onAddPreset: () => void;
    onUpdatePreset: (id: string, prompt: string) => void;
    onDeletePreset: (id: string) => void;
}

export const SettingsPresetsTab: React.FC<SettingsPresetsTabProps> = ({
    showAddPreset,
    setShowAddPreset,
    newPreset,
    setNewPreset,
    presets,
    editingPreset,
    setEditingPreset,
    onAddPreset,
    onUpdatePreset,
    onDeletePreset,
}) => {
    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">System Prompt Presets</h3>
                    <p className="text-slate-500 text-sm">Create reusable system prompts for different use cases.</p>
                </div>
                <button
                    onClick={() => setShowAddPreset(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                >
                    <Plus size={16} /> New Preset
                </button>
            </div>

            {showAddPreset && (
                <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-white mb-4">New System Preset</h4>
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                        <input
                            value={newPreset.name}
                            onChange={(event) => setNewPreset({ ...newPreset, name: event.target.value })}
                            placeholder="My Expert Persona"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 block mb-1">System Prompt</label>
                        <textarea
                            value={newPreset.prompt}
                            onChange={(event) => setNewPreset({ ...newPreset, prompt: event.target.value })}
                            placeholder="You are an expert..."
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAddPreset(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={onAddPreset} className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg">Save</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {presets.map((preset) => (
                    <div key={preset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-primary" />
                                <span className="font-bold text-white">{preset.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setEditingPreset(preset.id)}
                                    className="p-1.5 text-slate-500 hover:text-blue-400"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => onDeletePreset(preset.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        {editingPreset === preset.id ? (
                            <div className="mt-2">
                                <textarea
                                    defaultValue={preset.prompt}
                                    id={`preset-${preset.id}`}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-primary/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
                                />
                                <div className="flex gap-2 justify-end mt-2">
                                    <button onClick={() => setEditingPreset(null)} className="px-3 py-1 text-slate-400 text-sm">Cancel</button>
                                    <button
                                        onClick={() => {
                                            const element = document.getElementById(`preset-${preset.id}`) as HTMLTextAreaElement;
                                            onUpdatePreset(preset.id, element.value);
                                        }}
                                        className="px-3 py-1 bg-primary text-slate-900 text-sm font-bold rounded"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm line-clamp-2">{preset.prompt}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
