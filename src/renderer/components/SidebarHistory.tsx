import React, { useMemo, useState } from 'react';
import { Clock, MessageSquare, Trash2, Calendar, Archive, Pin, Edit2, Search, X, Check, Filter } from 'lucide-react';
import { ChatSession } from '../services/history';
import SkeletonLoader from './SkeletonLoader';

interface SidebarHistoryProps {
    sessions: ChatSession[];
    currentSessionId: string;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    onTogglePinSession: (id: string) => void;
    isLoading?: boolean;
}

const SidebarHistory: React.FC<SidebarHistoryProps> = ({ sessions, currentSessionId, onLoadSession, onDeleteSession, onRenameSession, onTogglePinSession, isLoading = false }) => {

    // Inline rename state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModel, setFilterModel] = useState<string>('');
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRangeStart, setDateRangeStart] = useState<string>('');
    const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

    // Get unique models from sessions
    const availableModels = useMemo(() => {
        const models = new Set<string>();
        sessions.forEach(session => {
            if (session.modelId) {
                models.add(session.modelId);
            }
        });
        return Array.from(models).sort();
    }, [sessions]);

    // Filter sessions by search query, model filter, and date range
    const filteredSessions = useMemo(() => {
        let filtered = sessions;

        // Filter by model
        if (filterModel) {
            filtered = filtered.filter(session => session.modelId === filterModel);
        }

        // Filter by date range
        if (dateRangeStart || dateRangeEnd) {
            filtered = filtered.filter(session => {
                const sessionDate = new Date(session.lastModified);
                const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
                
                if (dateRangeStart) {
                    const startDate = new Date(dateRangeStart);
                    if (sessionDateOnly < startDate) return false;
                }
                
                if (dateRangeEnd) {
                    const endDate = new Date(dateRangeEnd);
                    if (sessionDateOnly > endDate) return false;
                }
                
                return true;
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(session => {
                // Match title
                if (session.title.toLowerCase().includes(query)) return true;

                // Match message content
                if (session.messages && Array.isArray(session.messages)) {
                    return session.messages.some(msg =>
                        msg.content && msg.content.toLowerCase().includes(query)
                    );
                }
                return false;
            });
        }

        return filtered;
    }, [sessions, searchQuery, filterModel, dateRangeStart, dateRangeEnd]);

    // Group sessions
    const groupedSessions = useMemo(() => {
        const groups: Record<string, ChatSession[]> = {
            'Pinned': [],
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
            'Older': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const lastWeek = today - (86400000 * 7);

        filteredSessions.forEach(session => {
            if (session.pinned) {
                groups['Pinned'].push(session);
                return;
            }

            const date = new Date(session.lastModified).getTime();
            if (date >= today) {
                groups['Today'].push(session);
            } else if (date >= yesterday) {
                groups['Yesterday'].push(session);
            } else if (date >= lastWeek) {
                groups['Previous 7 Days'].push(session);
            } else {
                groups['Older'].push(session);
            }
        });

        return groups;
    }, [filteredSessions]);

    const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditValue(session.title);
    };

    const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
        e.stopPropagation();
        if (editValue.trim()) {
            onRenameSession(id, editValue);
        }
        setEditingId(null);
    };

    // Render a single session item
    const SessionItem = ({ s }: { s: ChatSession }) => {
        const isEditing = editingId === s.id;

        return (
            <div onClick={() => !isEditing && onLoadSession(s.id)}
                className={`group relative px-4 py-3 cursor-pointer transition-all duration-200 border-l-2 hover:bg-slate-800/50 ${s.id === currentSessionId ? 'bg-primary/5 border-l-primary' : 'border-l-transparent text-slate-400'}`}>

                <div className="flex justify-between items-start pr-12 min-h-[24px]">
                    {isEditing ? (
                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveRename(e, s.id)}
                                onBlur={() => setEditingId(null)}
                                className="w-full bg-slate-900 border border-primary/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                            />
                            <button onClick={e => handleSaveRename(e, s.id)} className="text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                        </div>
                    ) : (
                        <span className={`text-sm font-medium line-clamp-2 transition-colors ${s.id === currentSessionId ? 'text-primary' : 'group-hover:text-slate-200'}`} title={s.title}>
                            {s.title || "Untitled Chat"}
                        </span>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex items-center justify-between mt-1 gap-2">
                        <span className="text-[10px] text-slate-600 font-mono">
                            {new Date(s.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {s.modelId && (
                            <span className="text-[9px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded truncate max-w-[100px]" title={s.modelId}>
                                {s.modelId.split('/').pop()?.slice(0, 15) || s.modelId.slice(0, 15)}
                            </span>
                        )}
                    </div>
                )}

                {/* Hover Actions (Pinned items show unpin, others show pin) */}
                {!isEditing && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 rounded-lg p-1 shadow-lg border border-slate-700/50 backdrop-blur-sm">
                        <button onClick={(e) => { e.stopPropagation(); onTogglePinSession(s.id); }} className={`p-1.5 hover:bg-slate-700 rounded transition-colors ${s.pinned ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={s.pinned ? "Unpin" : "Pin"}>
                            <Pin size={12} fill={s.pinned ? "currentColor" : "none"} />
                        </button>
                        <button onClick={(e) => handleStartRename(e, s)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors" title="Rename">
                            <Edit2 size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors" title="Delete">
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Render skeleton loader for session item
    const SessionSkeleton = () => (
        <div className="px-4 py-3 border-l-2 border-l-transparent">
            <div className="flex justify-between items-start pr-12 min-h-[24px]">
                <SkeletonLoader variant="text" width="w-3/4" className="mb-2" />
            </div>
            <div className="flex items-center justify-between gap-2">
                <SkeletonLoader variant="text" width="w-16" height="h-3" />
                <SkeletonLoader variant="text" width="w-20" height="h-3" />
            </div>
        </div>
    );

    // Render skeleton group
    const renderSkeletonGroup = (label: string, count: number) => (
        <div key={label} className="mb-6">
            <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                {label === 'Today' && <Calendar size={12} />}
                {label}
            </div>
            <div className="space-y-0.5">
                {Array.from({ length: count }).map((_, i) => (
                    <SessionSkeleton key={`skeleton-${label}-${i}`} />
                ))}
            </div>
        </div>
    );

    const renderGroup = (label: string, list: ChatSession[]) => {
        if (list.length === 0) return null;
        return (
            <div key={label} className="mb-6">
                <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    {label === 'Pinned' && <Pin size={12} className="text-primary" />}
                    {label === 'Today' && <Calendar size={12} />}
                    {label === 'Older' && <Archive size={12} />}
                    {label}
                </div>
                <div className="space-y-0.5">
                    {list.map(s => <SessionItem key={s.id} s={s} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-800/50 space-y-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:bg-slate-800 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                
                {/* Filter Controls */}
                <div className="flex items-center gap-2">
                    {/* Model Filter */}
                    {availableModels.length > 0 && (
                        <select
                            value={filterModel}
                            onChange={e => setFilterModel(e.target.value)}
                            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-slate-800 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Models</option>
                            {availableModels.map(model => (
                                <option key={model} value={model}>
                                    {model.split('/').pop()?.slice(0, 20) || model.slice(0, 20)}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {/* Date Filter Toggle */}
                    <button
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className={`px-2 py-2 rounded-lg transition-colors border ${
                            showDateFilter || dateRangeStart || dateRangeEnd
                                ? 'bg-primary/20 border-primary/50 text-primary'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-300'
                        }`}
                        title="Filter by date range"
                    >
                        <Calendar size={14} />
                    </button>
                </div>
                
                {/* Date Range Filter */}
                {showDateFilter && (
                    <div className="space-y-2 p-2 bg-slate-800/30 rounded-lg border border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Filter size={12} />
                                Date Range
                            </span>
                            {(dateRangeStart || dateRangeEnd) && (
                                <button
                                    onClick={() => {
                                        setDateRangeStart('');
                                        setDateRangeEnd('');
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">From</label>
                                <input
                                    type="date"
                                    value={dateRangeStart}
                                    onChange={e => setDateRangeStart(e.target.value)}
                                    max={dateRangeEnd || undefined}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">To</label>
                                <input
                                    type="date"
                                    value={dateRangeEnd}
                                    onChange={e => setDateRangeEnd(e.target.value)}
                                    min={dateRangeStart || undefined}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                        </div>
                        {/* Quick Date Presets */}
                        <div className="flex flex-wrap gap-1 pt-1">
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    setDateRangeStart(today.toISOString().split('T')[0]);
                                    setDateRangeEnd(today.toISOString().split('T')[0]);
                                }}
                                className="px-2 py-0.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const yesterday = new Date(today);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    setDateRangeStart(yesterday.toISOString().split('T')[0]);
                                    setDateRangeEnd(today.toISOString().split('T')[0]);
                                }}
                                className="px-2 py-0.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            >
                                Last 2 Days
                            </button>
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const weekAgo = new Date(today);
                                    weekAgo.setDate(weekAgo.getDate() - 7);
                                    setDateRangeStart(weekAgo.toISOString().split('T')[0]);
                                    setDateRangeEnd(today.toISOString().split('T')[0]);
                                }}
                                className="px-2 py-0.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            >
                                Last 7 Days
                            </button>
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const monthAgo = new Date(today);
                                    monthAgo.setDate(monthAgo.getDate() - 30);
                                    setDateRangeStart(monthAgo.toISOString().split('T')[0]);
                                    setDateRangeEnd(today.toISOString().split('T')[0]);
                                }}
                                className="px-2 py-0.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            >
                                Last 30 Days
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
                {isLoading ? (
                    <>
                        {renderSkeletonGroup('Today', 3)}
                        {renderSkeletonGroup('Yesterday', 2)}
                        {renderSkeletonGroup('Previous 7 Days', 4)}
                    </>
                ) : (
                    <>
                        {/* Show search results count when searching or filtering */}
                        {(searchQuery || filterModel || dateRangeStart || dateRangeEnd) && (
                            <div className="px-4 mb-3 text-xs text-slate-500">
                                Found <span className="text-primary font-bold">{filteredSessions.length}</span> result{filteredSessions.length !== 1 ? 's' : ''}
                                {filterModel && (
                                    <span className="ml-1">
                                        for <span className="text-blue-400 font-medium">{filterModel.split('/').pop()}</span>
                                    </span>
                                )}
                                {(dateRangeStart || dateRangeEnd) && (
                                    <span className="ml-1">
                                        {dateRangeStart && dateRangeEnd
                                            ? `from ${new Date(dateRangeStart).toLocaleDateString()} to ${new Date(dateRangeEnd).toLocaleDateString()}`
                                            : dateRangeStart
                                                ? `from ${new Date(dateRangeStart).toLocaleDateString()}`
                                                : `until ${new Date(dateRangeEnd).toLocaleDateString()}`
                                        }
                                    </span>
                                )}
                            </div>
                        )}

                        {renderGroup('Pinned', groupedSessions['Pinned'])}
                        {renderGroup('Today', groupedSessions['Today'])}
                        {renderGroup('Yesterday', groupedSessions['Yesterday'])}
                        {renderGroup('Previous 7 Days', groupedSessions['Previous 7 Days'])}
                        {renderGroup('Older', groupedSessions['Older'])}

                        {filteredSessions.length === 0 && searchQuery && (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center px-6">
                                <Search size={32} className="mb-3 opacity-20" />
                                <p className="text-sm">No matches found.</p>
                                <p className="text-xs mt-1">Try a different search term.</p>
                            </div>
                        )}

                        {sessions.length === 0 && !searchQuery && (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center px-6">
                                <MessageSquare size={32} className="mb-3 opacity-20" />
                                <p className="text-sm">No recent chats.</p>
                                <p className="text-xs mt-1">Start a new conversation to save it here.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SidebarHistory;
