/**
 * API Playground Component
 *
 * Interactive API testing interface
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Play, Code, Copy, Download, Settings, ChevronDown, ChevronRight,
    CheckCircle, XCircle, Clock, Globe
} from 'lucide-react';
import { apiClientService, APIRequest, APIResponse } from '../services/apiClient';
import { toast } from 'sonner';

interface APIPlaygroundProps {
    isOpen: boolean;
    onClose: () => void;
}

const isAPIRequestMethod = (value: string): value is APIRequest['method'] => {
    return value === 'GET' || value === 'POST' || value === 'PUT' || value === 'DELETE';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const APIPlayground: React.FC<APIPlaygroundProps> = ({
    isOpen,
    onClose,
}) => {
    const [request, setRequest] = useState<APIRequest>({
        url: 'http://localhost:3000/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            model: '',
            messages: [{ role: 'user', content: 'Hello!' }],
        },
    });

    const [response, setResponse] = useState<APIResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestJson, setRequestJson] = useState('');
    const [responseJson, setResponseJson] = useState('');
    const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['url', 'headers', 'body']));

    React.useEffect(() => {
        if (isOpen) {
            updateRequestJson();
        }
    }, [request, isOpen]);

    React.useEffect(() => {
        if (response) {
            setResponseJson(JSON.stringify(response.body, null, 2));
        }
    }, [response]);

    const updateRequestJson = () => {
        try {
            setRequestJson(JSON.stringify(request, null, 2));
        } catch {
            setRequestJson('');
        }
    };

    const handleJsonChange = (json: string) => {
        setRequestJson(json);
        try {
            const parsedUnknown: unknown = JSON.parse(json);
            if (isRecord(parsedUnknown)) {
                setRequest({
                    ...request,
                    ...(parsedUnknown as Partial<APIRequest>),
                });
            }
        } catch {
            // Invalid JSON, keep as is
        }
    };

    const handleSend = async () => {
        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const result = await apiClientService.makeRequest(request);
            setResponse(result);
            setActiveTab('response');
            toast.success(`Request completed in ${result.duration}ms`);
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err, 'Request failed');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
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
                    className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Code className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">API Playground</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSend}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Play size={16} />
                                Send Request
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
                    <div className="flex-1 overflow-hidden flex">
                        {/* Request Panel */}
                        <div className="flex-1 border-r border-slate-700 flex flex-col">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="font-semibold text-white">Request</h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={request.method}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (isAPIRequestMethod(value)) {
                                                setRequest({ ...request, method: value });
                                            }
                                        }}
                                        className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                    </select>
                                    <button
                                        onClick={() => copyToClipboard(requestJson)}
                                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                        title="Copy JSON"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* URL */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('url')}
                                        className="flex items-center gap-2 w-full text-left mb-2"
                                    >
                                        {expandedSections.has('url') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Globe size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-300">URL</span>
                                    </button>
                                    {expandedSections.has('url') && (
                                        <input
                                            type="text"
                                            value={request.url}
                                            onChange={(e) => setRequest({ ...request, url: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm font-mono"
                                            placeholder="https://api.example.com/endpoint"
                                        />
                                    )}
                                </div>

                                {/* Headers */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('headers')}
                                        className="flex items-center gap-2 w-full text-left mb-2"
                                    >
                                        {expandedSections.has('headers') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Settings size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-300">Headers</span>
                                    </button>
                                    {expandedSections.has('headers') && (
                                        <div className="space-y-2">
                                            {Object.entries(request.headers).map(([key, value], i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={key}
                                                        onChange={(e) => {
                                                            const newHeaders = { ...request.headers };
                                                            delete newHeaders[key];
                                                            newHeaders[e.target.value] = value;
                                                            setRequest({ ...request, headers: newHeaders });
                                                        }}
                                                        className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                                        placeholder="Header name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={value}
                                                        onChange={(e) => setRequest({
                                                            ...request,
                                                            headers: { ...request.headers, [key]: e.target.value },
                                                        })}
                                                        className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                                        placeholder="Header value"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newHeaders = { ...request.headers };
                                                            delete newHeaders[key];
                                                            setRequest({ ...request, headers: newHeaders });
                                                        }}
                                                        className="px-2 text-red-400 hover:text-red-300"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setRequest({
                                                    ...request,
                                                    headers: { ...request.headers, '': '' },
                                                })}
                                                className="text-sm text-blue-400 hover:text-blue-300"
                                            >
                                                + Add Header
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="flex-1 flex flex-col">
                                    <button
                                        onClick={() => toggleSection('body')}
                                        className="flex items-center gap-2 w-full text-left mb-2"
                                    >
                                        {expandedSections.has('body') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Code size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-300">Body (JSON)</span>
                                    </button>
                                    {expandedSections.has('body') && (
                                        <textarea
                                            value={requestJson}
                                            onChange={(e) => handleJsonChange(e.target.value)}
                                            className="flex-1 w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded text-white text-sm font-mono resize-none"
                                            placeholder='{"key": "value"}'
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Response Panel */}
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="font-semibold text-white">Response</h3>
                                {response && (
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                            response.status >= 200 && response.status < 300
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {response.status >= 200 && response.status < 300 ? (
                                                <CheckCircle size={12} />
                                            ) : (
                                                <XCircle size={12} />
                                            )}
                                            {response.status} {response.statusText}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Clock size={12} />
                                            {response.duration}ms
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(responseJson)}
                                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                            title="Copy Response"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                                    </div>
                                ) : error ? (
                                    <div className="text-red-400 font-mono text-sm">{error}</div>
                                ) : response ? (
                                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
                                        {responseJson}
                                    </pre>
                                ) : (
                                    <div className="text-slate-500 text-center py-12">
                                        Click "Send Request" to see response
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
