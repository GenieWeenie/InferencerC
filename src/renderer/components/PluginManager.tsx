/**
 * Plugin Manager Component
 *
 * UI for managing installed plugins and marketplace discovery.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Plus,
    Trash2,
    Package,
    Shield,
    Search,
    Star,
    BadgeCheck,
    ArrowUpCircle,
    RefreshCw,
    ShoppingBag,
} from 'lucide-react';
import {
    pluginSystemService,
    Plugin,
} from '../services/pluginSystem';
import {
    pluginMarketplaceService,
    MarketplacePluginEntry,
    PluginUpdateInfo,
} from '../services/pluginMarketplace';
import { toast } from 'sonner';

interface PluginManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

export const parsePluginManifestJson = (raw: string): Record<string, unknown> | null => {
    try {
        const parsed: unknown = JSON.parse(raw);
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const PluginManager: React.FC<PluginManagerProps> = ({
    isOpen,
    onClose,
}) => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [showInstallDialog, setShowInstallDialog] = useState(false);
    const [manifestJson, setManifestJson] = useState('');
    const [activeView, setActiveView] = useState<'installed' | 'marketplace'>('installed');
    const [searchQuery, setSearchQuery] = useState('');
    const [catalog, setCatalog] = useState<MarketplacePluginEntry[]>([]);
    const previousUpdateCountRef = useRef(0);

    const refreshPlugins = () => {
        setPlugins(pluginSystemService.getAllPlugins());
    };

    const refreshCatalog = () => {
        setCatalog(pluginMarketplaceService.getCatalog());
    };

    useEffect(() => {
        if (!isOpen) return;

        refreshPlugins();
        refreshCatalog();
        const unsubscribe = pluginSystemService.subscribe(() => {
            refreshPlugins();
        });

        const interval = window.setInterval(() => {
            refreshCatalog();
        }, 60_000);

        return () => {
            window.clearInterval(interval);
            unsubscribe();
            previousUpdateCountRef.current = 0;
        };
    }, [isOpen]);

    const updates = useMemo(() => {
        return pluginMarketplaceService.getAvailableUpdates(plugins);
    }, [plugins, catalog]);

    const updatesByPluginId = useMemo(() => {
        const map = new Map<string, PluginUpdateInfo>();
        updates.forEach(update => map.set(update.pluginId, update));
        return map;
    }, [updates]);

    useEffect(() => {
        if (!isOpen) return;

        if (updates.length > previousUpdateCountRef.current && updates.length > 0) {
            toast.info(`${updates.length} plugin update${updates.length > 1 ? 's are' : ' is'} available`);
        }
        previousUpdateCountRef.current = updates.length;
    }, [updates, isOpen]);

    const marketplaceResults = useMemo(() => {
        return pluginMarketplaceService.searchCatalog(searchQuery);
    }, [searchQuery, catalog]);

    const handleInstallFromManifest = async () => {
        try {
            const manifest = parsePluginManifestJson(manifestJson);
            if (!manifest) {
                toast.error('Manifest JSON must be an object');
                return;
            }
            if (!pluginSystemService.validateManifest(manifest)) {
                toast.error('Invalid plugin manifest');
                return;
            }

            const manifestId = String(manifest.id);
            const exists = pluginSystemService.getPlugin(manifestId);
            if (exists) {
                await pluginSystemService.updatePlugin(manifest);
                toast.success('Plugin updated from manifest');
            } else {
                await pluginSystemService.installPlugin(manifest);
                toast.success('Plugin installed from manifest');
            }

            refreshPlugins();
            setShowInstallDialog(false);
            setManifestJson('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to parse manifest JSON');
        }
    };

    const handleMarketplaceInstall = async (entry: MarketplacePluginEntry) => {
        try {
            const installed = pluginSystemService.getPlugin(entry.manifest.id);

            if (!installed) {
                await pluginSystemService.installPlugin(entry.manifest);
            } else if (installed.manifest.version !== entry.manifest.version) {
                await pluginSystemService.updatePlugin(entry.manifest);
            }

            await pluginSystemService.enablePlugin(entry.manifest.id);
            refreshPlugins();
            toast.success(`${entry.manifest.name} installed`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to install plugin');
        }
    };

    const handleUpdatePlugin = async (update: PluginUpdateInfo) => {
        try {
            await pluginSystemService.updatePlugin(update.entry.manifest);
            refreshPlugins();
            toast.success(`Updated ${update.entry.manifest.name} to v${update.latestVersion}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update plugin');
        }
    };

    const handleUpdateAll = async () => {
        for (const update of updates) {
            await handleUpdatePlugin(update);
        }
    };

    const handleToggle = async (pluginId: string, enabled: boolean) => {
        if (enabled) {
            await pluginSystemService.enablePlugin(pluginId);
        } else {
            pluginSystemService.disablePlugin(pluginId);
        }
        refreshPlugins();
        toast.success(`Plugin ${enabled ? 'enabled' : 'disabled'}`);
    };

    const handleUninstall = (pluginId: string) => {
        if (confirm('Uninstall this plugin?')) {
            pluginSystemService.uninstallPlugin(pluginId);
            refreshPlugins();
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
                    className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-purple-400" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">Plugin Manager</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Marketplace + installed plugins</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowInstallDialog(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Manifest Install
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between gap-4">
                        <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setActiveView('installed')}
                                className={`px-3 py-2 text-sm ${activeView === 'installed' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                            >
                                Installed ({plugins.length})
                            </button>
                            <button
                                onClick={() => setActiveView('marketplace')}
                                className={`px-3 py-2 text-sm ${activeView === 'marketplace' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                            >
                                Marketplace ({catalog.length})
                            </button>
                        </div>

                        {updates.length > 0 && (
                            <div className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {updates.length} update{updates.length > 1 ? 's' : ''} available
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {activeView === 'installed' && (
                            <>
                                {updates.length > 0 && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-amber-200">
                                                <ArrowUpCircle size={16} />
                                                <span className="font-medium">Automatic update notifications</span>
                                            </div>
                                            <button
                                                onClick={handleUpdateAll}
                                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-100 text-sm"
                                            >
                                                Update all
                                            </button>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {updates.map(update => (
                                                <div key={update.pluginId} className="flex items-center justify-between text-sm text-amber-100/90">
                                                    <span>{update.entry.manifest.name} {update.currentVersion} {'->'} {update.latestVersion}</span>
                                                    <button
                                                        onClick={() => handleUpdatePlugin(update)}
                                                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {plugins.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No plugins installed</p>
                                        <p className="text-sm mt-2">Open Marketplace to install plugins with one click.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {plugins.map((plugin) => (
                                            <InstalledPluginCard
                                                key={plugin.manifest.id}
                                                plugin={plugin}
                                                updateInfo={updatesByPluginId.get(plugin.manifest.id)}
                                                onToggle={(enabled) => handleToggle(plugin.manifest.id, enabled)}
                                                onUninstall={() => handleUninstall(plugin.manifest.id)}
                                                onUpdate={handleUpdatePlugin}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeView === 'marketplace' && (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search plugins, publishers, tags..."
                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500"
                                        />
                                    </div>
                                    <button
                                        onClick={refreshCatalog}
                                        className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                                        title="Refresh marketplace"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>

                                {marketplaceResults.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No marketplace plugins match your search.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {marketplaceResults.map(entry => (
                                            <MarketplacePluginCard
                                                key={entry.id}
                                                entry={entry}
                                                installed={pluginSystemService.getPlugin(entry.manifest.id)}
                                                onInstall={() => handleMarketplaceInstall(entry)}
                                                onUpdate={() => {
                                                    const update = updatesByPluginId.get(entry.manifest.id);
                                                    if (update) {
                                                        handleUpdatePlugin(update);
                                                    } else {
                                                        handleMarketplaceInstall(entry);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {showInstallDialog && (
                        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 flex items-center justify-center p-6">
                            <div className="w-full max-w-2xl bg-slate-800 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Install or Update Plugin from Manifest</h3>
                                <textarea
                                    value={manifestJson}
                                    onChange={(e) => setManifestJson(e.target.value)}
                                    className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-700 rounded text-white font-mono text-sm mb-4"
                                    placeholder={`{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "description": "Adds a custom workflow",
  "author": "Your Name",
  "entryPoint": "index.js",
  "apiVersion": "1.0.0",
  "permissions": [{"type":"storage"}],
  "commands": [{"id":"run","label":"Run Plugin Command"}]
}`}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowInstallDialog(false)}
                                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleInstallFromManifest}
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

const InstalledPluginCard: React.FC<{
    plugin: Plugin;
    updateInfo?: PluginUpdateInfo;
    onToggle: (enabled: boolean) => void;
    onUninstall: () => void;
    onUpdate: (update: PluginUpdateInfo) => void;
}> = ({ plugin, updateInfo, onToggle, onUninstall, onUpdate }) => {
    return (
        <div className={`bg-slate-800 border rounded-lg p-4 ${plugin.enabled ? 'border-green-500/50' : 'border-slate-700'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-white">{plugin.manifest.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">v{plugin.manifest.version}</span>
                        {plugin.enabled && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Active</span>
                        )}
                        {updateInfo && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                                Update: v{updateInfo.latestVersion}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{plugin.manifest.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
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
                    {updateInfo && (
                        <button
                            onClick={() => onUpdate(updateInfo)}
                            className="px-2.5 py-1.5 text-xs rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
                        >
                            Update
                        </button>
                    )}
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

const MarketplacePluginCard: React.FC<{
    entry: MarketplacePluginEntry;
    installed?: Plugin;
    onInstall: () => void;
    onUpdate: () => void;
}> = ({ entry, installed, onInstall, onUpdate }) => {
    const hasUpdate = Boolean(installed && installed.manifest.version !== entry.manifest.version);

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-white">{entry.manifest.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">v{entry.manifest.version}</span>
                        {entry.featured && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">Featured</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{entry.manifest.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            {entry.publisher.verified && <BadgeCheck size={12} className="text-emerald-400" />}
                            {entry.publisher.name}
                            {entry.publisher.verified && <span className="text-emerald-300">Verified</span>}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Star size={12} className="text-amber-400" />
                            {entry.rating.toFixed(1)} ({entry.reviewCount} reviews)
                        </span>
                        <span>{entry.downloads.toLocaleString()} downloads</span>
                        <span className="text-slate-400">{entry.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3 flex-wrap">
                        {entry.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded bg-slate-700/60">#{tag}</span>
                        ))}
                    </div>
                    {entry.reviews[0] && (
                        <blockquote className="text-xs text-slate-300/90 border-l-2 border-slate-600 pl-2">
                            "{entry.reviews[0].comment}" - {entry.reviews[0].author}
                        </blockquote>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!installed && (
                        <button
                            onClick={onInstall}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                        >
                            One-click Install
                        </button>
                    )}
                    {installed && !hasUpdate && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                            Installed
                        </span>
                    )}
                    {installed && hasUpdate && (
                        <button
                            onClick={onUpdate}
                            className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-sm"
                        >
                            Update to v{entry.manifest.version}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
