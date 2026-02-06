/**
 * Plugin Manager Component
 *
 * UI for managing plugins
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Trash2, Power, Settings, Package, Download, Upload,
    CheckCircle, AlertCircle, Code, Shield
} from 'lucide-react';
import {
    pluginSystemService,
    Plugin,
    PluginManifest,
} from '../services/pluginSystem';
import { toast } from 'sonner';

interface PluginManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({
    isOpen,
    onClose,
}) => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [showInstallDialog, setShowInstallDialog] = useState(false);
    const [manifestJson, setManifestJson] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadPlugins();
        }
    }, [isOpen]);

    const loadPlugins = () => {
        setPlugins(pluginSystemService.getAllPlugins());
    };

    const handleInstall = () => {
        try {
            const manifest = JSON.parse(manifestJson);
            if (pluginSystemService.validateManifest(manifest)) {
                pluginSystemService.installPlugin(manifest);
                loadPlugins();
                setShowInstallDialog(false);
                setManifestJson('');
                toast.success('Plugin installed!');
            } else {
                toast.error('Invalid plugin manifest');
            }
        } catch (error) {
            toast.error('Failed to parse manifest JSON');
        }
    };

    const handleToggle = async (pluginId: string, enabled: boolean) => {
        if (enabled) {
            await pluginSystemService.enablePlugin(pluginId);
        } else {
            pluginSystemService.disablePlugin(pluginId);
        }
        loadPlugins();
        toast.success(`Plugin ${enabled ? 'enabled' : 'disabled'}`);
    };

    const handleUninstall = (pluginId: string) => {
        if (confirm('Uninstall this plugin?')) {
            pluginSystemService.uninstallPlugin(pluginId);
            loadPlugins();
            toast.success('Plugin uninstalled');
        }
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
                    className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Plugin Manager</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowInstallDialog(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Install Plugin
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
                    <div className="flex-1 overflow-y-auto p-6">
                        {plugins.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No plugins installed</p>
                                <p className="text-sm mt-2">Install plugins to extend InferencerC functionality</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {plugins.map((plugin) => (
                                    <PluginCard
                                        key={plugin.manifest.id}
                                        plugin={plugin}
                                        onToggle={(enabled) => handleToggle(plugin.manifest.id, enabled)}
                                        onUninstall={() => handleUninstall(plugin.manifest.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Install Dialog */}
                    {showInstallDialog && (
                        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 flex items-center justify-center p-6">
                            <div className="w-full max-w-2xl bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Install Plugin</h3>
                                <textarea
                                    value={manifestJson}
                                    onChange={(e) => setManifestJson(e.target.value)}
                                    className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm mb-4"
                                    placeholder='{"id": "plugin-id", "name": "Plugin Name", "version": "1.0.0", ...}'
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowInstallDialog(false)}
                                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleInstall}
                                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                                    >
                                        Install
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Plugin Card Component
const PluginCard: React.FC<{
    plugin: Plugin;
    onToggle: (enabled: boolean) => void;
    onUninstall: () => void;
}> = ({ plugin, onToggle, onUninstall }) => {
    return (
        <div className={`bg-slate-800 border rounded-lg p-4 ${plugin.enabled ? 'border-green-500/50' : 'border-slate-700'}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{plugin.manifest.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                            v{plugin.manifest.version}
                        </span>
                        {plugin.enabled && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{plugin.manifest.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>By {plugin.manifest.author}</span>
                        {plugin.manifest.permissions.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Shield size={12} />
                                {plugin.manifest.permissions.length} permissions
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggle(!plugin.enabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${plugin.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${plugin.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <button
                        onClick={onUninstall}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
