/**
 * Workspace Views Panel
 *
 * Multiple workspace view modes (grid, list, kanban)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, List, Grid3x3, Columns, LayoutGrid, Calendar, Tag, Box } from 'lucide-react';
import {
    workspaceViewsService,
    WorkspaceViewMode,
    WorkspaceViewConfig,
    ConversationGroup,
} from '../services/workspaceViews';
import { toast } from 'sonner';

interface WorkspaceViewsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Array<{
        id: string;
        title: string;
        lastMessage?: string;
        messageCount: number;
        lastActivity: number;
        pinned?: boolean;
        archived?: boolean;
        category?: string;
        tags?: string[];
        model?: string;
    }>;
    onSelectConversation?: (id: string) => void;
}

export const WorkspaceViewsPanel: React.FC<WorkspaceViewsPanelProps> = ({
    isOpen,
    onClose,
    conversations,
    onSelectConversation,
}) => {
    const isGroupByValue = (value: string): value is NonNullable<WorkspaceViewConfig['groupBy']> => {
        return value === 'none' || value === 'date' || value === 'category' || value === 'model' || value === 'tag';
    };

    const isSortByValue = (value: string): value is NonNullable<WorkspaceViewConfig['sortBy']> => {
        return value === 'lastActivity' || value === 'date' || value === 'title' || value === 'messageCount';
    };

    const [config, setConfig] = useState<WorkspaceViewConfig>(workspaceViewsService.getConfig());
    const [groupedConversations, setGroupedConversations] = useState<ConversationGroup[]>([]);

    useEffect(() => {
        if (isOpen) {
            updateGroupedConversations();
        }
    }, [isOpen, config, conversations]);

    const updateGroupedConversations = () => {
        const filtered = conversations.filter(conv => {
            if (!config.showPinned && conv.pinned) return false;
            if (!config.showArchived && conv.archived) return false;
            return true;
        });

        const sorted = workspaceViewsService.sortConversations(
            filtered,
            config.sortBy,
            config.sortOrder
        );

        const grouped = workspaceViewsService.groupConversations(sorted, config.groupBy);
        setGroupedConversations(grouped);
    };

    const handleModeChange = (mode: WorkspaceViewMode) => {
        const updated = { ...config, mode };
        setConfig(updated);
        workspaceViewsService.updateConfig(updated);
    };

    const handleConfigChange = (updates: Partial<WorkspaceViewConfig>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        workspaceViewsService.updateConfig(updated);
    };

    if (!isOpen) return null;

    const viewIcons = {
        list: List,
        grid: Grid3x3,
        kanban: Columns,
        compact: LayoutGrid,
    };

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
                    className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <LayoutGrid className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Workspace Views</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                            aria-label="Close workspace views"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                        <div className="flex items-center gap-4">
                            {/* View Mode */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">View:</span>
                                {(['list', 'grid', 'kanban', 'compact'] as WorkspaceViewMode[]).map((mode) => {
                                    const Icon = viewIcons[mode];
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => handleModeChange(mode)}
                                            className={`p-2 rounded transition-colors ${
                                                config.mode === mode
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                            aria-label={`Switch to ${mode} view`}
                                        >
                                            <Icon size={16} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Group By */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Group:</span>
                                <select
                                    value={config.groupBy || 'none'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (isGroupByValue(value)) {
                                            handleConfigChange({ groupBy: value });
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                >
                                    <option value="none">None</option>
                                    <option value="date">Date</option>
                                    <option value="category">Category</option>
                                    <option value="model">Model</option>
                                    <option value="tag">Tag</option>
                                </select>
                            </div>

                            {/* Sort By */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Sort:</span>
                                <select
                                    value={config.sortBy || 'lastActivity'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (isSortByValue(value)) {
                                            handleConfigChange({ sortBy: value });
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                >
                                    <option value="lastActivity">Last Activity</option>
                                    <option value="date">Date</option>
                                    <option value="title">Title</option>
                                    <option value="messageCount">Message Count</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {config.mode === 'list' && (
                            <ListView
                                groups={groupedConversations}
                                onSelect={onSelectConversation}
                            />
                        )}
                        {config.mode === 'grid' && (
                            <GridView
                                groups={groupedConversations}
                                onSelect={onSelectConversation}
                            />
                        )}
                        {config.mode === 'kanban' && (
                            <KanbanView
                                groups={groupedConversations}
                                onSelect={onSelectConversation}
                            />
                        )}
                        {config.mode === 'compact' && (
                            <CompactView
                                groups={groupedConversations}
                                onSelect={onSelectConversation}
                            />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// View Components
const ListView: React.FC<{
    groups: ConversationGroup[];
    onSelect?: (id: string) => void;
}> = ({ groups, onSelect }) => (
    <div className="space-y-6">
        {groups.map((group) => (
            <div key={group.id}>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">{group.label}</h3>
                <div className="space-y-1">
                    {group.conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelect?.(conv.id)}
                            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {conv.pinned && <Box size={12} className="text-yellow-400" />}
                                        <span className="font-medium text-white">{conv.title}</span>
                                    </div>
                                    {conv.lastMessage && (
                                        <p className="text-xs text-slate-400 mt-1 truncate">{conv.lastMessage}</p>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {conv.messageCount} messages
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const GridView: React.FC<{
    groups: ConversationGroup[];
    onSelect?: (id: string) => void;
}> = ({ groups, onSelect }) => (
    <div className="space-y-6">
        {groups.map((group) => (
            <div key={group.id}>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">{group.label}</h3>
                <div className="grid grid-cols-3 gap-3">
                    {group.conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelect?.(conv.id)}
                            className="p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors"
                        >
                            <div className="font-medium text-white mb-1">{conv.title}</div>
                            <div className="text-xs text-slate-400">{conv.messageCount} messages</div>
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const KanbanView: React.FC<{
    groups: ConversationGroup[];
    onSelect?: (id: string) => void;
}> = ({ groups, onSelect }) => (
    <div className="flex gap-4 overflow-x-auto pb-4">
        {groups.map((group) => (
            <div key={group.id} className="flex-shrink-0 w-64">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">{group.label}</h3>
                <div className="space-y-2">
                    {group.conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelect?.(conv.id)}
                            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors"
                        >
                            <div className="font-medium text-white text-sm">{conv.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{conv.messageCount} messages</div>
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const CompactView: React.FC<{
    groups: ConversationGroup[];
    onSelect?: (id: string) => void;
}> = ({ groups, onSelect }) => (
    <div className="space-y-2">
        {groups.flatMap(group => group.conversations).map((conv) => (
            <button
                key={conv.id}
                onClick={() => onSelect?.(conv.id)}
                className="w-full p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors flex items-center justify-between"
            >
                <span className="text-sm text-white truncate">{conv.title}</span>
                <span className="text-xs text-slate-500 ml-2">{conv.messageCount}</span>
            </button>
        ))}
    </div>
);
