/**
 * Response Inspector Component
 *
 * Deep inspection of API responses
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search, ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, Filter
} from 'lucide-react';
import { APIResponse } from '../services/apiClient';
import { toast } from 'sonner';

interface ResponseInspectorProps {
    response: APIResponse;
}

export const ResponseInspector: React.FC<ResponseInspectorProps> = ({
    response,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
    const [filteredKeys, setFilteredKeys] = useState<Set<string>>(new Set());
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);

    const togglePath = (path: string) => {
        const newExpanded = new Set(expandedPaths);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedPaths(newExpanded);
    };

    const copyValue = (value: unknown) => {
        const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const exportResponse = () => {
        const dataStr = JSON.stringify(response.body, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `response-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Response exported');
    };

    const renderValue = (value: unknown, path: string, depth: number = 0): React.ReactNode => {
        if (value === null) {
            return <span className="text-slate-500 italic">null</span>;
        }

        if (value === undefined) {
            return <span className="text-slate-500 italic">undefined</span>;
        }

        if (typeof value === 'string') {
            return (
                <div className="flex items-center gap-2">
                    <span className="text-green-400">"{value}"</span>
                    <button
                        onClick={() => copyValue(value)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    >
                        <Copy size={12} />
                    </button>
                </div>
            );
        }

        if (typeof value === 'number') {
            return <span className="text-blue-400">{value}</span>;
        }

        if (typeof value === 'boolean') {
            return <span className="text-purple-400">{value ? 'true' : 'false'}</span>;
        }

        if (Array.isArray(value)) {
            const isExpanded = expandedPaths.has(path);
            return (
                <div>
                    <button
                        onClick={() => togglePath(path)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-yellow-400">Array</span>
                        <span className="text-slate-500">({value.length} items)</span>
                    </button>
                    {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                            {value.map((item, index) => (
                                <div key={index} className="text-sm">
                                    <span className="text-slate-500">[{index}]</span>
                                    {renderValue(item, `${path}[${index}]`, depth + 1)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === 'object') {
            const isExpanded = expandedPaths.has(path);
            const keys = Object.keys(value);
            const filteredKeysList = filteredKeys.size > 0
                ? keys.filter(k => filteredKeys.has(k))
                : keys;

            return (
                <div>
                    <button
                        onClick={() => togglePath(path)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-cyan-400">Object</span>
                        <span className="text-slate-500">({keys.length} keys)</span>
                    </button>
                    {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-2">
                            {filteredKeysList.map((key) => {
                                const childPath = path === 'root' ? key : `${path}.${key}`;
                                const childValue = (value as Record<string, unknown>)[key];
                                return (
                                    <div key={key} className="text-sm">
                                        <span className="text-slate-300 font-medium">{key}:</span>{' '}
                                        {renderValue(childValue, childPath, depth + 1)}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return <span className="text-slate-400">{String(value)}</span>;
    };

    const searchInResponse = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredKeys(new Set());
            return;
        }

        const foundKeys = new Set<string>();
        const searchRecursive = (obj: unknown, path: string) => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        searchRecursive(item, `${path}[${index}]`);
                    });
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        const fullPath = path === 'root' ? key : `${path}.${key}`;
                        if (key.toLowerCase().includes(query.toLowerCase())) {
                            foundKeys.add(fullPath);
                        }
                        searchRecursive(value, fullPath);
                    });
                }
            }
        };

        searchRecursive(response.body, 'root');
        setFilteredKeys(foundKeys);
    };

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Eye size={18} />
                    Response Inspector
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportResponse}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-2"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Response Metadata */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900 rounded p-3">
                    <div className="text-xs text-slate-400 mb-1">Status</div>
                    <div className={`text-sm font-bold ${
                        response.status >= 200 && response.status < 300 ? 'text-green-400' : 'text-red-400'
                    }`}>
                        {response.status} {response.statusText}
                    </div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                    <div className="text-xs text-slate-400 mb-1">Duration</div>
                    <div className="text-sm font-bold text-blue-400">{response.duration}ms</div>
                </div>
                <div className="bg-slate-900 rounded p-3">
                    <div className="text-xs text-slate-400 mb-1">Size</div>
                    <div className="text-sm font-bold text-purple-400">
                        {JSON.stringify(response.body).length} bytes
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => searchInResponse(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                    placeholder="Search in response..."
                />
            </div>

            {/* Response Body */}
            <div className="bg-slate-950 border border-slate-700 rounded p-4 overflow-auto max-h-96">
                <div className="font-mono text-sm">
                    {renderValue(response.body, 'root')}
                </div>
            </div>

            {/* Headers */}
            <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Response Headers</h4>
                <div className="bg-slate-900 rounded p-3 space-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="text-xs font-mono">
                            <span className="text-slate-400">{key}:</span>{' '}
                            <span className="text-slate-300">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
