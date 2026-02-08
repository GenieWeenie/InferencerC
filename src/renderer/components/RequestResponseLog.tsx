import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ApiActivityLogEntry } from '../services/activityLog';

export type LogEntry = ApiActivityLogEntry;

interface RequestResponseLogProps {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
    onClear: () => void;
}

const RequestResponseLog: React.FC<RequestResponseLogProps> = ({ isOpen, onClose, logs, onClear }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatJson = (obj: any) => {
        try {
            return JSON.stringify(obj, null, 2);
        } catch {
            return String(obj);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Log Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-slate-900 shadow-2xl border-l border-slate-700 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-white">API Activity Log</h2>
                                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onClear}
                                    className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
                                >
                                    Clear All
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Log Entries */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <p className="text-sm">No API calls yet</p>
                                    <p className="text-xs mt-1">Requests and responses will appear here when you send messages</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {[...logs].reverse().map((log) => {
                                        const isExpanded = expandedId === log.id;
                                        const content = log.type === 'request'
                                            ? formatJson(log.request)
                                            : log.type === 'error'
                                                ? log.error
                                                : formatJson(log.response);

                                        return (
                                            <div
                                                key={log.id}
                                                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
                                            >
                                                {/* Log Header */}
                                                <div
                                                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExpanded ? (
                                                            <ChevronDown size={16} className="text-slate-400" />
                                                        ) : (
                                                            <ChevronRight size={16} className="text-slate-400" />
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                                                    log.type === 'request'
                                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                        : log.type === 'error'
                                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                }`}
                                                            >
                                                                {log.type}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-mono">
                                                                {new Date(log.timestamp).toLocaleTimeString()}
                                                            </span>
                                                            <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                                                {log.model}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {log.duration && (
                                                        <span className="text-xs text-slate-500">
                                                            {(log.duration / 1000).toFixed(2)}s
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: 'auto' }}
                                                        exit={{ height: 0 }}
                                                        className="border-t border-slate-700"
                                                    >
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(content || '', log.id);
                                                                }}
                                                                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors z-10"
                                                                title="Copy JSON"
                                                            >
                                                                {copiedId === log.id ? (
                                                                    <Check size={12} className="text-emerald-400" />
                                                                ) : (
                                                                    <Copy size={12} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                            <pre className="p-4 bg-slate-950/50 text-xs text-slate-300 font-mono overflow-x-auto custom-scrollbar max-h-96">
                                                                {content}
                                                            </pre>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default RequestResponseLog;
