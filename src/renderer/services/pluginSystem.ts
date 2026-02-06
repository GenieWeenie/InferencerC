/**
 * Plugin System Service
 *
 * Full plugin system with API for extending InferencerC functionality
 */

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    entryPoint: string; // Path to plugin entry file
    permissions: PluginPermission[];
    apiVersion: string; // Required API version
    icon?: string;
    homepage?: string;
    repository?: string;
}

export interface PluginPermission {
    type: 'read-conversations' | 'write-conversations' | 'access-files' | 'execute-code' | 'network-access' | 'storage';
    scope?: string; // Optional scope restriction
}

export interface Plugin {
    manifest: PluginManifest;
    enabled: boolean;
    installedAt: number;
    lastUpdated?: number;
    instance?: PluginInstance;
}

export interface PluginInstance {
    pluginId: string;
    api: PluginAPI;
    context: PluginContext;
}

export interface PluginContext {
    sessionId?: string;
    conversationHistory?: unknown[];
    currentModel?: string;
    userPreferences?: Record<string, unknown>;
}

export interface PluginAPI {
    // Conversation API
    getConversations: () => Promise<Array<{ id: string; title: string }>>;
    getConversation: (sessionId: string) => Promise<unknown | null>;
    sendMessage: (message: string, options?: Record<string, unknown>) => Promise<unknown>;
    
    // Storage API
    storage: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        delete: (key: string) => Promise<void>;
        clear: () => Promise<void>;
    };
    
    // UI API
    ui: {
        showNotification: (message: string, type?: 'info' | 'success' | 'error') => void;
        showDialog: (title: string, message: string) => Promise<boolean>;
        addMenuItem: (label: string, action: () => void) => string;
        removeMenuItem: (id: string) => void;
    };
    
    // File API
    files: {
        read: (path: string) => Promise<string>;
        write: (path: string, content: string) => Promise<void>;
        exists: (path: string) => Promise<boolean>;
    };
    
    // Network API
    network: {
        fetch: (url: string, options?: RequestInit) => Promise<Response>;
    };
}

export interface PluginHook {
    name: string;
    handler: (...args: unknown[]) => unknown | Promise<unknown>;
    priority?: number;
}

export class PluginSystemService {
    private static instance: PluginSystemService;
    private plugins: Map<string, Plugin> = new Map();
    private hooks: Map<string, PluginHook[]> = new Map();
    private readonly STORAGE_KEY = 'plugins';
    private readonly PLUGINS_DIR = 'plugins'; // Relative to app data

    private constructor() {
        this.loadPlugins();
    }

    static getInstance(): PluginSystemService {
        if (!PluginSystemService.instance) {
            PluginSystemService.instance = new PluginSystemService();
        }
        return PluginSystemService.instance;
    }

    /**
     * Load plugins from storage
     */
    private loadPlugins(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const pluginData: Plugin[] = JSON.parse(stored);
                pluginData.forEach(plugin => {
                    this.plugins.set(plugin.manifest.id, plugin);
                });
            }
        } catch (error) {
            console.error('Failed to load plugins:', error);
        }
    }

    /**
     * Save plugins to storage
     */
    private savePlugins(): void {
        try {
            const plugins = Array.from(this.plugins.values());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plugins));
        } catch (error) {
            console.error('Failed to save plugins:', error);
        }
    }

    /**
     * Install a plugin
     */
    async installPlugin(manifest: PluginManifest): Promise<Plugin> {
        const plugin: Plugin = {
            manifest,
            enabled: false,
            installedAt: Date.now(),
        };

        this.plugins.set(manifest.id, plugin);
        this.savePlugins();

        return plugin;
    }

    /**
     * Uninstall a plugin
     */
    uninstallPlugin(pluginId: string): boolean {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        if (plugin.instance) {
            this.unloadPlugin(pluginId);
        }

        this.plugins.delete(pluginId);
        this.savePlugins();
        return true;
    }

    /**
     * Enable a plugin
     */
    async enablePlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        if (!plugin.instance) {
            await this.loadPlugin(pluginId);
        }

        plugin.enabled = true;
        this.savePlugins();
        return true;
    }

    /**
     * Disable a plugin
     */
    disablePlugin(pluginId: string): boolean {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        if (plugin.instance) {
            this.unloadPlugin(pluginId);
        }

        plugin.enabled = false;
        this.savePlugins();
        return true;
    }

    /**
     * Load a plugin instance
     */
    private async loadPlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.instance) return;

        try {
            // Create plugin API
            const api = this.createPluginAPI(plugin.manifest);

            // Create plugin context
            const context: PluginContext = {};

            // Load plugin code (in a real implementation, this would load from file system)
            // For now, we'll create a mock instance
            plugin.instance = {
                pluginId,
                api,
                context,
            };
        } catch (error) {
            console.error(`Failed to load plugin ${pluginId}:`, error);
        }
    }

    /**
     * Unload a plugin instance
     */
    private unloadPlugin(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || !plugin.instance) return;

        // Cleanup hooks
        this.hooks.forEach((hooks, hookName) => {
            this.hooks.set(
                hookName,
                hooks.filter(h => !h.handler.toString().includes(pluginId))
            );
        });

        plugin.instance = undefined;
    }

    /**
     * Create plugin API
     */
    private createPluginAPI(manifest: PluginManifest): PluginAPI {
        return {
            getConversations: async () => {
                // Check permission
                if (!this.hasPermission(manifest, 'read-conversations')) {
                    throw new Error('Permission denied: read-conversations');
                }
                // Implementation would fetch from HistoryService
                return [];
            },
            getConversation: async (sessionId: string) => {
                if (!this.hasPermission(manifest, 'read-conversations')) {
                    throw new Error('Permission denied: read-conversations');
                }
                return null;
            },
            sendMessage: async (message: string) => {
                if (!this.hasPermission(manifest, 'write-conversations')) {
                    throw new Error('Permission denied: write-conversations');
                }
                return { success: true };
            },
            storage: {
                get: async (key: string) => {
                    const stored = localStorage.getItem(`plugin:${manifest.id}:${key}`);
                    return stored ? JSON.parse(stored) : null;
                },
                set: async (key: string, value: unknown) => {
                    localStorage.setItem(`plugin:${manifest.id}:${key}`, JSON.stringify(value));
                },
                delete: async (key: string) => {
                    localStorage.removeItem(`plugin:${manifest.id}:${key}`);
                },
                clear: async () => {
                    const keys = Object.keys(localStorage);
                    keys.forEach(key => {
                        if (key.startsWith(`plugin:${manifest.id}:`)) {
                            localStorage.removeItem(key);
                        }
                    });
                },
            },
            ui: {
                showNotification: (message: string, type = 'info') => {
                    // Would use toast service
                    console.log(`[${manifest.name}] ${type}: ${message}`);
                },
                showDialog: async (title: string, message: string) => {
                    return window.confirm(`${title}\n\n${message}`);
                },
                addMenuItem: (label: string, action: () => void) => {
                    const id = crypto.randomUUID();
                    // Would register menu item
                    return id;
                },
                removeMenuItem: (id: string) => {
                    // Would remove menu item
                },
            },
            files: {
                read: async (path: string) => {
                    if (!this.hasPermission(manifest, 'access-files')) {
                        throw new Error('Permission denied: access-files');
                    }
                    // Would use Electron IPC
                    return '';
                },
                write: async (path: string, content: string) => {
                    if (!this.hasPermission(manifest, 'access-files')) {
                        throw new Error('Permission denied: access-files');
                    }
                    // Would use Electron IPC
                },
                exists: async (path: string) => {
                    if (!this.hasPermission(manifest, 'access-files')) {
                        throw new Error('Permission denied: access-files');
                    }
                    return false;
                },
            },
            network: {
                fetch: async (url: string, options?: RequestInit) => {
                    if (!this.hasPermission(manifest, 'network-access')) {
                        throw new Error('Permission denied: network-access');
                    }
                    return fetch(url, options);
                },
            },
        };
    }

    /**
     * Check if plugin has permission
     */
    private hasPermission(manifest: PluginManifest, permission: PluginPermission['type']): boolean {
        return manifest.permissions.some(p => p.type === permission);
    }

    /**
     * Register a plugin hook
     */
    registerHook(hookName: string, hook: PluginHook): void {
        const hooks = this.hooks.get(hookName) || [];
        hooks.push(hook);
        hooks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.hooks.set(hookName, hooks);
    }

    /**
     * Execute hooks
     */
    async executeHooks(hookName: string, ...args: unknown[]): Promise<unknown[]> {
        const hooks = this.hooks.get(hookName) || [];
        const results: unknown[] = [];

        for (const hook of hooks) {
            try {
                const result = await hook.handler(...args);
                results.push(result);
            } catch (error) {
                console.error(`Hook ${hookName} failed:`, error);
            }
        }

        return results;
    }

    /**
     * Get all plugins
     */
    getAllPlugins(): Plugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get enabled plugins
     */
    getEnabledPlugins(): Plugin[] {
        return Array.from(this.plugins.values()).filter(p => p.enabled);
    }

    /**
     * Get a plugin by ID
     */
    getPlugin(pluginId: string): Plugin | undefined {
        return this.plugins.get(pluginId);
    }

    /**
     * Validate plugin manifest
     */
    validateManifest(manifest: unknown): manifest is PluginManifest {
        if (typeof manifest !== 'object' || manifest === null) return false;

        const m = manifest as Record<string, unknown>;
        return (
            typeof m.id === 'string' &&
            typeof m.name === 'string' &&
            typeof m.version === 'string' &&
            typeof m.description === 'string' &&
            typeof m.author === 'string' &&
            typeof m.entryPoint === 'string' &&
            Array.isArray(m.permissions)
        );
    }
}

export const pluginSystemService = PluginSystemService.getInstance();
