import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react';
import { usePrompts, PromptSnippet } from '../hooks/usePrompts';

const PromptManager: React.FC = () => {
    const { prompts, savePrompt, updatePrompt, deletePrompt } = usePrompts();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form inputs
    const [alias, setAlias] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const resetForm = () => {
        setAlias('');
        setTitle('');
        setContent('');
        setEditingId(null);
        setIsCreating(false);
    };

    const handleEdit = (p: PromptSnippet) => {
        setEditingId(p.id);
        setAlias(p.alias);
        setTitle(p.title);
        setContent(p.content);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingId(null);
        setAlias('');
        setTitle('');
        setContent('');
    };

    const handleSave = () => {
        if (!alias || !title || !content) return;

        if (editingId) {
            updatePrompt(editingId, alias, title, content);
        } else {
            savePrompt(alias, title, content);
        }
        resetForm();
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            {/* Header / List Mode */}
            {!isCreating && !editingId ? (
                <>
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-slate-200">Prompt Library</h3>
                            <p className="text-xs text-slate-500">Manage slash commands</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="p-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20"
                            title="Create new prompt"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {prompts.map(p => (
                            <div key={p.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 group hover:border-slate-600 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">/{p.alias}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(p)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Edit2 size={12} /></button>
                                        <button onClick={() => { if (confirm('Delete?')) deletePrompt(p.id) }} className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-slate-200 mb-1">{p.title}</div>
                                <div className="text-xs text-slate-500 line-clamp-2 font-mono bg-slate-950 p-2 rounded border border-slate-800/50">{p.content}</div>
                            </div>
                        ))}

                        {prompts.length === 0 && (
                            <div className="text-center text-slate-500 py-8 text-sm">
                                No prompts yet. <br />Click "+" to add one.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Edit/Create Mode */
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <h3 className="text-sm font-bold text-slate-200">{isCreating ? 'New Prompt' : 'Edit Prompt'}</h3>
                        <button onClick={resetForm} className="text-slate-500 hover:text-white"><X size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Command Alias</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-mono">/</span>
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={e => setAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-6 pr-3 text-sm font-mono text-white focus:border-primary outline-none transition-colors"
                                    placeholder="e.g. debug-code"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Title / Description</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-primary outline-none transition-colors"
                                placeholder="Describe what this does..."
                            />
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-xs font-bold text-slate-400 uppercase">Prompt Content</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full flex-1 min-h-[200px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-300 focus:border-primary outline-none resize-none custom-scrollbar"
                                placeholder="Enter the text to insert..."
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <button
                            onClick={handleSave}
                            disabled={!alias || !title || !content}
                            className="w-full py-2 bg-primary text-white rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} /> Save Prompt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptManager;
