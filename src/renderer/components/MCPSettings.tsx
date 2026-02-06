import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, PowerOff, Server, Wrench, AlertCircle, Check, Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { mcpClient, MCPServer, MCPTool } from '../services/mcp';
import { toast } from 'sonner';

/**
 * MCP Settings Panel
 * Allows users to configure and connect to MCP servers
 */
const MCPSettings: React.FC = () => {
    const [servers, setServers] = useState<MCPServer[]>([]);
    const [tools, setTools] = useState<MCPTool[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedServer, setExpandedServer] = useState<string | null>(null);
    const [connecting, setConnecting] = useState<string | null>(null);

    // Form state for adding new server
    const [newServer, setNewServer] = useState({
        name: '',
        description: '',
        command: 'npx',
        args: ''
    });

    // Subscribe to MCP client updates
    useEffect(() => {
        const update = () => {
            setServers(mcpClient.getServers());
            setTools(mcpClient.getTools());
        };
        update();
        return mcpClient.subscribe(update);
    }, []);

    const handleAddServer = () => {
        if (!newServer.name.trim() || !newServer.command.trim()) {
            toast.error('Server name and command are required');
            return;
        }

        const argsArray = newServer.args
            .split(' ')
            .filter(a => a.trim())
            .map(a => a.trim());

        mcpClient.addServer({
            name: newServer.name,
            description: newServer.description,
            command: newServer.command,
            args: argsArray
        });

        setNewServer({ name: '', description: '', command: 'npx', args: '' });
        setShowAddForm(false);
        toast.success(`Added MCP server: ${newServer.name}`);
    };

    const handleConnect = async (id: string) => {
        setConnecting(id);
        try {
            await mcpClient.connectServer(id);
            toast.success('Connected to MCP server');
        } catch (e: any) {
            toast.error(`Failed to connect: ${e.message}`);
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (id: string) => {
        await mcpClient.disconnectServer(id);
        toast.info('Disconnected from MCP server');
    };

    const handleRemove = (id: string) => {
        mcpClient.removeServer(id);
        toast.success('Removed MCP server');
    };

    const getStatusIcon = (status: MCPServer['status']) => {
        switch (status) {
            case 'connected':
                return <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />;
            case 'connecting':
                return <Loader2 size={12} className="text-amber-400 animate-spin" />;
            case 'error':
                return <AlertCircle size={12} className="text-red-400" />;
            default:
                return <div className="w-2 h-2 rounded-full bg-slate-500" />;
        }
    };

    const serverTools = (serverId: string) => tools.filter(t => t.serverId === serverId);

    // Preset server configurations
    const presets = [
        {
            name: 'Filesystem',
            description: 'Read, write, and navigate files',
            command: 'npx',
            args: '-y @modelcontextprotocol/server-filesystem C:/'
        },
        {
            name: 'Git',
            description: 'Git repository operations',
            command: 'npx',
            args: '-y @modelcontextprotocol/server-git'
        },
        {
            name: 'SQLite',
            description: 'Query SQLite databases',
            command: 'npx',
            args: '-y @modelcontextprotocol/server-sqlite'
        },
        {
            name: 'Fetch',
            description: 'Fetch content from URLs',
            command: 'npx',
            args: '-y @modelcontextprotocol/server-fetch'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Server size={20} className="text-primary" />
                        MCP Servers
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Connect to Model Context Protocol servers to give AI tools and capabilities
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Add Server
                </button>
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Quick Add Presets</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {presets.map((preset, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                mcpClient.addServer({
                                    name: preset.name,
                                    description: preset.description,
                                    command: preset.command,
                                    args: preset.args.split(' ')
                                });
                                toast.success(`Added ${preset.name} server`);
                            }}
                            className="flex flex-col items-center gap-1 p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-colors text-center"
                        >
                            <Wrench size={16} className="text-slate-400" />
                            <span className="text-xs font-medium text-white">{preset.name}</span>
                            <span className="text-[10px] text-slate-500">{preset.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Add Server Form */}
            {showAddForm && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 animate-in slide-in-from-top-2 duration-200">
                    <h4 className="text-sm font-bold text-white mb-4">Add Custom MCP Server</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Server Name</label>
                                <input
                                    type="text"
                                    value={newServer.name}
                                    onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                                    placeholder="My MCP Server"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newServer.description}
                                    onChange={e => setNewServer({ ...newServer, description: e.target.value })}
                                    placeholder="What does this server do?"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Command</label>
                                <select
                                    value={newServer.command}
                                    onChange={e => setNewServer({ ...newServer, command: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                >
                                    <option value="npx">npx</option>
                                    <option value="node">node</option>
                                    <option value="python">python</option>
                                    <option value="uvx">uvx</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Arguments</label>
                                <input
                                    type="text"
                                    value={newServer.args}
                                    onChange={e => setNewServer({ ...newServer, args: e.target.value })}
                                    placeholder="-y @modelcontextprotocol/server-filesystem /path"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary font-mono"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddServer}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                            >
                                Add Server
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Server List */}
            <div className="space-y-3">
                {servers.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-slate-700/30 border-dashed">
                        <Server size={32} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400 text-sm">No MCP servers configured</p>
                        <p className="text-slate-500 text-xs mt-1">Add a server using the presets above or create a custom one</p>
                    </div>
                ) : (
                    servers.map(server => (
                        <div
                            key={server.id}
                            className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
                        >
                            {/* Server Header */}
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        {expandedServer === server.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    {getStatusIcon(server.status)}
                                    <div>
                                        <h4 className="font-medium text-white">{server.name}</h4>
                                        {server.description && (
                                            <p className="text-xs text-slate-400">{server.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {server.status === 'connected' && (
                                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                                            {serverTools(server.id).length} tools
                                        </span>
                                    )}
                                    {server.status === 'connected' ? (
                                        <button
                                            onClick={() => handleDisconnect(server.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Disconnect"
                                        >
                                            <PowerOff size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(server.id)}
                                            disabled={connecting === server.id}
                                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                                            title="Connect"
                                        >
                                            {connecting === server.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Power size={16} />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemove(server.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {server.status === 'error' && server.errorMessage && (
                                <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                                    {server.errorMessage}
                                </div>
                            )}

                            {/* Expanded Details */}
                            {expandedServer === server.id && (
                                <div className="border-t border-slate-700/50 p-4 bg-slate-900/30 animate-in slide-in-from-top-2 duration-150">
                                    <div className="mb-4">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Command</span>
                                        <div className="mt-1 font-mono text-sm text-slate-300 bg-slate-900 rounded-lg px-3 py-2">
                                            {server.command} {server.args.join(' ')}
                                        </div>
                                    </div>

                                    {server.status === 'connected' && serverTools(server.id).length > 0 && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Tools</span>
                                            <div className="mt-2 grid gap-2">
                                                {serverTools(server.id).map(tool => (
                                                    <div
                                                        key={tool.name}
                                                        className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30"
                                                    >
                                                        <Wrench size={14} className="text-primary mt-0.5" />
                                                        <div>
                                                            <span className="font-mono text-sm text-white">{tool.name}</span>
                                                            {tool.description && (
                                                                <p className="text-xs text-slate-400 mt-0.5">{tool.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Connection Status Summary */}
            {servers.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <div className="text-sm text-slate-400">
                        <span className="text-white font-medium">{mcpClient.getConnectedCount()}</span> of{' '}
                        <span className="text-white font-medium">{servers.length}</span> servers connected
                    </div>
                    <div className="text-sm text-slate-400">
                        <span className="text-primary font-medium">{tools.length}</span> tools available
                    </div>
                </div>
            )}
        </div>
    );
};

export default MCPSettings;
