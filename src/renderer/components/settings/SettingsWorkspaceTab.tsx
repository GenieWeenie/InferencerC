/**
 * Workspace & context settings (GEN-153): workspace memory boundaries and context controls.
 */
import React, { useState, useEffect } from 'react';
import { FolderOpen, Tag } from 'lucide-react';
import {
    getCurrentWorkspaceId,
    setCurrentWorkspaceId,
    getWorkspaceMemory,
    setWorkspaceMemory,
    setCurrentWorkspaceIdFromPath,
    deriveWorkspaceIdFromPath,
    type WorkspaceMemory,
} from '../../services/workspaceMemory';
import { projectContextService } from '../../services/projectContext';
import { toast } from 'sonner';

export const SettingsWorkspaceTab: React.FC = () => {
    const [workspaceId, setWorkspaceIdState] = useState(getCurrentWorkspaceId());
    const [memory, setMemory] = useState<WorkspaceMemory>({});
    const [projectFolderPath, setProjectFolderPath] = useState<string | null>(null);

    useEffect(() => {
        setWorkspaceIdState(getCurrentWorkspaceId());
        setMemory(getWorkspaceMemory(getCurrentWorkspaceId()));
    }, []);

    useEffect(() => {
        const ctx = projectContextService.getContext();
        setProjectFolderPath(ctx?.folderPath ?? null);
    }, []);

    const handleWorkspaceIdChange = (id: string) => {
        const normalized = id.trim() || 'default';
        setCurrentWorkspaceId(normalized);
        setWorkspaceIdState(normalized);
        setMemory(getWorkspaceMemory(normalized));
        toast.success('Workspace updated');
    };

    const handleUseProjectFolder = () => {
        const ctx = projectContextService.getContext();
        if (!ctx?.folderPath) {
            toast.error('No project folder selected. Add one from the Chat composer.');
            return;
        }
        const id = deriveWorkspaceIdFromPath(ctx.folderPath);
        setCurrentWorkspaceId(id);
        setWorkspaceIdState(id);
        setWorkspaceMemory(id, { ...getWorkspaceMemory(id), label: ctx.folderPath.split(/[/\\]/).pop() ?? ctx.folderPath });
        setMemory(getWorkspaceMemory(id));
        toast.success('Workspace set to project folder');
    };

    const handleLabelChange = (label: string) => {
        const next = { ...memory, label: label.trim().slice(0, 128) };
        setMemory(next);
        setWorkspaceMemory(workspaceId, next);
    };

    const handleMaxContextChange = (value: number) => {
        const n = Math.min(100, Math.max(0, Math.floor(value)));
        const next = { ...memory, maxContextItems: n };
        setMemory(next);
        setWorkspaceMemory(workspaceId, next);
    };

    const handleIncludeProjectContextChange = (checked: boolean) => {
        const next = { ...memory, includeProjectContext: checked };
        setMemory(next);
        setWorkspaceMemory(workspaceId, next);
        toast.success(checked ? 'Project context will be included when enabled in Chat' : 'Project context preference saved');
    };

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Tag className="text-primary" size={22} />
                    Workspace & context
                </h3>
                <p className="text-slate-500 text-sm">
                    Scope what the app remembers per workspace. Each workspace can have a label and context limits.
                </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Current workspace</label>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={workspaceId}
                            onChange={(e) => setWorkspaceIdState(e.target.value)}
                            onBlur={() => handleWorkspaceIdChange(workspaceId)}
                            className="flex-1 min-w-[120px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono"
                            placeholder="default"
                        />
                        <span className="text-xs text-slate-500">ID</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Workspace label (optional)</label>
                    <input
                        type="text"
                        value={memory.label ?? ''}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        placeholder="e.g. My Project"
                        maxLength={128}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Use project folder as workspace</label>
                    <p className="text-slate-500 text-sm mb-2">
                        {projectFolderPath
                            ? `Current project folder: ${projectFolderPath}`
                            : 'No project folder selected. In Chat, use the project context control to select a folder.'}
                    </p>
                    <button
                        type="button"
                        onClick={handleUseProjectFolder}
                        disabled={!projectFolderPath}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                        <FolderOpen size={16} />
                        Set workspace from project folder
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max context items (0–100)</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={memory.maxContextItems ?? 10}
                        onChange={(e) => handleMaxContextChange(Number(e.target.value))}
                        onBlur={(e) => handleMaxContextChange(Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                    <p className="text-slate-500 text-xs mt-1">Max files/snippets to include in context when using project context.</p>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={memory.includeProjectContext ?? true}
                            onChange={(e) => handleIncludeProjectContextChange(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
                        />
                        Prefer including project context in messages when enabled in Chat
                    </label>
                </div>
            </div>
        </div>
    );
};
