/**
 * Request Builder Component
 *
 * Visual interface for building API requests
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Trash2, Save, FileText, Settings, Code, ChevronDown, ChevronRight
} from 'lucide-react';
import { APIRequest } from '../services/apiClient';
import { toast } from 'sonner';

interface RequestBuilderProps {
    initialRequest?: APIRequest;
    onBuild: (request: APIRequest) => void;
    onSave?: (request: APIRequest, name: string) => void;
}

const isAPIRequestMethod = (value: string): value is APIRequest['method'] => {
    return value === 'GET' || value === 'POST' || value === 'PUT' || value === 'DELETE';
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeHeaders = (value: unknown): Record<string, string> => {
    if (!isRecord(value)) {
        return {};
    }
    const headers: Record<string, string> = {};
    Object.entries(value).forEach(([key, entryValue]) => {
        if (typeof entryValue === 'string') {
            headers[key] = entryValue;
        }
    });
    return headers;
};

const sanitizeAPIRequest = (value: unknown): APIRequest | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (typeof value.url !== 'string' || typeof value.method !== 'string' || !isAPIRequestMethod(value.method)) {
        return null;
    }
    return {
        url: value.url,
        method: value.method,
        headers: sanitizeHeaders(value.headers),
        body: value.body,
    };
};

const parseSavedRequests = (raw: string): Array<{ name: string; request: APIRequest }> => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }
    const saved: Array<{ name: string; request: APIRequest }> = [];
    parsed.forEach((entry) => {
        if (!isRecord(entry) || typeof entry.name !== 'string') {
            return;
        }
        const request = sanitizeAPIRequest(entry.request);
        if (!request) {
            return;
        }
        saved.push({ name: entry.name, request });
    });
    return saved;
};

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
    initialRequest,
    onBuild,
    onSave,
}) => {
    const [request, setRequest] = useState<APIRequest>(initialRequest || {
        url: '',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {},
    });

    const [savedRequests, setSavedRequests] = useState<Array<{ name: string; request: APIRequest }>>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['url', 'method', 'headers', 'body']));

    React.useEffect(() => {
        loadSavedRequests();
    }, []);

    const loadSavedRequests = () => {
        try {
            const stored = localStorage.getItem('saved_api_requests');
            if (stored) {
                setSavedRequests(parseSavedRequests(stored));
            }
        } catch (error) {
            console.error('Failed to load saved requests:', error);
        }
    };

    const saveRequest = () => {
        if (!saveName.trim()) {
            toast.error('Please enter a name');
            return;
        }

        const newSaved = [...savedRequests, { name: saveName, request }];
        setSavedRequests(newSaved);
        localStorage.setItem('saved_api_requests', JSON.stringify(newSaved));

        if (onSave) {
            onSave(request, saveName);
        }

        setShowSaveDialog(false);
        setSaveName('');
        toast.success('Request saved!');
    };

    const loadRequest = (saved: { name: string; request: APIRequest }) => {
        setRequest(saved.request);
        toast.success(`Loaded: ${saved.name}`);
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

    const addHeader = () => {
        setRequest({
            ...request,
            headers: { ...request.headers, '': '' },
        });
    };

    const updateHeader = (oldKey: string, newKey: string, value: string) => {
        const newHeaders = { ...request.headers };
        delete newHeaders[oldKey];
        newHeaders[newKey] = value;
        setRequest({ ...request, headers: newHeaders });
    };

    const removeHeader = (key: string) => {
        const newHeaders = { ...request.headers };
        delete newHeaders[key];
        setRequest({ ...request, headers: newHeaders });
    };

    const updateBodyField = (path: string[], value: unknown) => {
        const newBody = { ...(request.body as Record<string, unknown>) };
        let current: Record<string, unknown> = newBody;

        for (let i = 0; i < path.length - 1; i++) {
            const pathKey = path[i];
            const nextValue = current[pathKey];
            if (!isRecord(nextValue)) {
                current[pathKey] = {};
            }
            current = current[pathKey] as Record<string, unknown>;
        }

        current[path[path.length - 1]] = value;
        setRequest({ ...request, body: newBody });
    };

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={18} />
                    Request Builder
                </h3>
                <div className="flex items-center gap-2">
                    {savedRequests.length > 0 && (
                        <select
                            onChange={(e) => {
                                const saved = savedRequests.find(s => s.name === e.target.value);
                                if (saved) loadRequest(saved);
                            }}
                            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                            defaultValue=""
                        >
                            <option value="">Load saved...</option>
                            {savedRequests.map((s, i) => (
                                <option key={i} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => setShowSaveDialog(true)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-2"
                    >
                        <Save size={14} />
                        Save
                    </button>
                    <button
                        onClick={() => onBuild(request)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                        Build Request
                    </button>
                </div>
            </div>

            {/* Method & URL */}
            <div>
                <button
                    onClick={() => toggleSection('method')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                >
                    {expandedSections.has('method') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Settings size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">Method & URL</span>
                </button>
                {expandedSections.has('method') && (
                    <div className="flex gap-2">
                        <select
                            value={request.method}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (isAPIRequestMethod(value)) {
                                    setRequest({ ...request, method: value });
                                }
                            }}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                        <input
                            type="text"
                            value={request.url}
                            onChange={(e) => setRequest({ ...request, url: e.target.value })}
                            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono"
                            placeholder="https://api.example.com/endpoint"
                        />
                    </div>
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
                                    onChange={(e) => updateHeader(key, e.target.value, value)}
                                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                    placeholder="Header name"
                                />
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => updateHeader(key, key, e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                    placeholder="Header value"
                                />
                                <button
                                    onClick={() => removeHeader(key)}
                                    className="px-2 text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addHeader}
                            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Add Header
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            {request.method !== 'GET' && (
                <div>
                    <button
                        onClick={() => toggleSection('body')}
                        className="flex items-center gap-2 w-full text-left mb-2"
                    >
                        {expandedSections.has('body') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <Code size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Body</span>
                    </button>
                    {expandedSections.has('body') && (
                        <div className="bg-slate-950 border border-slate-700 rounded p-4">
                            <BodyEditor
                                body={request.body as Record<string, unknown>}
                                onChange={(newBody) => setRequest({ ...request, body: newBody })}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96">
                        <h4 className="text-lg font-bold text-white mb-4">Save Request</h4>
                        <input
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white mb-4"
                            placeholder="Request name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRequest();
                                if (e.key === 'Escape') setShowSaveDialog(false);
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveRequest}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Body Editor Component
const BodyEditor: React.FC<{
    body: Record<string, unknown>;
    onChange: (body: Record<string, unknown>) => void;
    path?: string[];
}> = ({ body, onChange, path = [] }) => {
    const addField = () => {
        const newBody = { ...body, '': '' };
        onChange(newBody);
    };

    const updateField = (key: string, value: unknown) => {
        const newBody = { ...body };
        newBody[key] = value;
        onChange(newBody);
    };

    const removeField = (key: string) => {
        const newBody = { ...body };
        delete newBody[key];
        onChange(newBody);
    };

    return (
        <div className="space-y-2">
            {Object.entries(body).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-start">
                    <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                            const newBody = { ...body };
                            delete newBody[key];
                            newBody[e.target.value] = value;
                            onChange(newBody);
                        }}
                        className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                        placeholder="Key"
                    />
                    {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                        <div className="flex-1 border border-slate-700 rounded p-2">
                            <BodyEditor
                                body={value as Record<string, unknown>}
                                onChange={(newValue) => updateField(key, newValue)}
                                path={[...path, key]}
                            />
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={String(value)}
                            onChange={(e) => {
                                // Try to parse as number or boolean
                                let parsed: unknown = e.target.value;
                                if (e.target.value === 'true') parsed = true;
                                else if (e.target.value === 'false') parsed = false;
                                else if (!isNaN(Number(e.target.value))) parsed = Number(e.target.value);
                                updateField(key, parsed);
                            }}
                            className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                            placeholder="Value"
                        />
                    )}
                    <button
                        onClick={() => removeField(key)}
                        className="px-2 text-red-400 hover:text-red-300"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            <button
                onClick={addField}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
                <Plus size={14} />
                Add Field
            </button>
        </div>
    );
};
