/**
 * Plugin System Service
 *
 * Full plugin system with API for extending InferencerC functionality
 */
import type { CommandCategory } from '../lib/commandRegistry';
import type { ChatMessage } from '../../shared/types';

const VALID_PERMISSIONS = new Set<PluginPermission['type']>([
    'read-conversations',
    'write-conversations',
    'access-files',
    'execute-code',
    'network-access',
    'storage',
]);

const VALID_COMMAND_CATEGORIES = new Set<CommandCategory>([
    'Navigation',
    'Actions',
    'Editing',
    'Settings',
    'Models',
    'Sessions',
    'Export',
    'View',
    'Help',
]);
const PLUGIN_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const output: string[] = [];
    for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'string') {
            continue;
        }
        const item = value[i].trim();
        if (!item || output.includes(item)) {
            continue;
        }
        output.push(item);
    }
    return output;
};

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
    commands?: PluginCommandDefinition[];
    exportFormats?: PluginExportFormatDefinition[];
    uiExtensions?: PluginUIExtension[];
}

export interface PluginPermission {
    type: 'read-conversations' | 'write-conversations' | 'access-files' | 'execute-code' | 'network-access' | 'storage';
    scope?: string; // Optional scope restriction
}

export interface PluginCommandDefinition {
    id: string;
    label: string;
    description?: string;
    keywords?: string[];
    category?: CommandCategory;
}

export type PluginExportStrategy = 'plain-text' | 'jsonl' | 'markdown-transcript';

export interface PluginExportFormatDefinition {
    id: string;
    label: string;
    description: string;
    fileExtension: string;
    mimeType: string;
    strategy?: PluginExportStrategy;
}

export interface PluginUIExtension {
    id: string;
    type: 'settings-section' | 'chat-panel' | 'toolbar-action';
    title: string;
    description?: string;
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
    pluginId?: string;
    priority?: number;
}

export interface RegisteredPluginCommand {
    runtimeId: string;
    pluginId: string;
    pluginName: string;
    command: PluginCommandDefinition;
}

export interface RegisteredPluginExportFormat {
    runtimeId: string;
    pluginId: string;
    pluginName: string;
    format: PluginExportFormatDefinition;
}

export interface PluginExportResult {
    content: string;
    mimeType: string;
    fileExtension: string;
}

type PluginEventType = 'installed' | 'updated' | 'uninstalled' | 'enabled' | 'disabled';

export interface PluginChangeEvent {
    type: PluginEventType;
    pluginId: string;
}

type PluginEventListener = (event: PluginChangeEvent) => void;

export class PluginSystemService {
    private static instance: PluginSystemService;
    private plugins: Map<string, Plugin> = new Map();
    private hooks: Map<string, PluginHook[]> = new Map();
    private listeners: Set<PluginEventListener> = new Set();
    private registeredCommands: Map<string, RegisteredPluginCommand> = new Map();
    private registeredExportFormats: Map<string, RegisteredPluginExportFormat> = new Map();
    private memoryStorage: Map<string, string> = new Map();
    private readonly STORAGE_KEY = 'plugins';

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
            const stored = this.storageGet(this.STORAGE_KEY);
            if (stored) {
                const parsed = parseJson(stored);
                if (!Array.isArray(parsed)) {
                    return;
                }

                parsed.forEach((entry) => {
                    const hydrated = this.sanitizePersistedPlugin(entry);
                    if (!hydrated) {
                        return;
                    }
                    this.plugins.set(hydrated.manifest.id, hydrated);
                    if (hydrated.enabled) {
                        this.registerPluginContributions(hydrated);
                    }
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
            const seenIds = new Set<string>();
            const plugins = Array.from(this.plugins.values())
                .map((entry) => this.sanitizePersistedPlugin(entry))
                .filter((entry): entry is Plugin => {
                    if (!entry) {
                        return false;
                    }
                    if (seenIds.has(entry.manifest.id)) {
                        return false;
                    }
                    seenIds.add(entry.manifest.id);
                    return true;
                })
                .map(({ instance: _instance, ...plugin }) => plugin);
            this.storageSet(this.STORAGE_KEY, JSON.stringify(plugins));
        } catch (error) {
            console.error('Failed to save plugins:', error);
        }
    }

    private sanitizePersistedPlugin(value: unknown): Plugin | null {
        if (!isRecord(value) || !this.validateManifest(value.manifest)) {
            return null;
        }
        const manifest = this.normalizeManifest(value.manifest as PluginManifest);
        return {
            manifest,
            enabled: typeof value.enabled === 'boolean' ? value.enabled : false,
            installedAt: this.normalizeTimestamp(value.installedAt),
            lastUpdated: isFiniteNumber(value.lastUpdated)
                ? this.normalizeTimestamp(value.lastUpdated)
                : undefined,
        };
    }

    private hasUsableLocalStorage(): boolean {
        const candidate = (globalThis as Record<string, unknown>).localStorage as Record<string, unknown> | undefined;
        return Boolean(
            candidate &&
            typeof candidate.getItem === 'function' &&
            typeof candidate.setItem === 'function' &&
            typeof candidate.removeItem === 'function' &&
            typeof candidate.key === 'function'
        );
    }

    private storageGet(key: string): string | null {
        if (this.hasUsableLocalStorage()) {
            return (globalThis.localStorage as Storage).getItem(key);
        }
        return this.memoryStorage.has(key) ? this.memoryStorage.get(key)! : null;
    }

    private storageSet(key: string, value: string): void {
        if (this.hasUsableLocalStorage()) {
            (globalThis.localStorage as Storage).setItem(key, value);
            return;
        }
        this.memoryStorage.set(key, value);
    }

    private storageRemove(key: string): void {
        if (this.hasUsableLocalStorage()) {
            (globalThis.localStorage as Storage).removeItem(key);
            return;
        }
        this.memoryStorage.delete(key);
    }

    private storageKeys(): string[] {
        if (this.hasUsableLocalStorage()) {
            const storage = globalThis.localStorage as Storage;
            const keys: string[] = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key) keys.push(key);
            }
            return keys;
        }
        return Array.from(this.memoryStorage.keys());
    }

    /**
     * Subscribe to plugin lifecycle updates
     */
    subscribe(listener: PluginEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emitChange(type: PluginEventType, pluginId: string): void {
        this.listeners.forEach(listener => listener({ type, pluginId }));
    }

    private normalizeManifest(manifest: PluginManifest): PluginManifest {
        const permissions = (manifest.permissions || [])
            .filter((permission) => VALID_PERMISSIONS.has(permission.type))
            .map((permission) => ({
                type: permission.type,
                scope: typeof permission.scope === 'string' && permission.scope.trim()
                    ? permission.scope.trim()
                    : undefined,
            }));

        const commands = (manifest.commands || [])
            .filter((command) => typeof command.id === 'string' && typeof command.label === 'string')
            .map((command) => ({
                ...command,
                id: command.id.trim(),
                label: command.label.trim(),
                description: typeof command.description === 'string' ? command.description.trim() : undefined,
                keywords: sanitizeStringArray(command.keywords),
                category: VALID_COMMAND_CATEGORIES.has(command.category || 'Actions')
                    ? command.category
                    : 'Actions',
            }))
            .filter((command) => Boolean(command.id && command.label));

        const exportFormats = (manifest.exportFormats || [])
            .filter((format) => typeof format.id === 'string'
                && typeof format.label === 'string'
                && typeof format.description === 'string'
                && typeof format.fileExtension === 'string'
                && typeof format.mimeType === 'string')
            .map((format) => ({
                ...format,
                id: format.id.trim(),
                label: format.label.trim(),
                description: format.description.trim(),
                fileExtension: format.fileExtension.trim(),
                mimeType: format.mimeType.trim(),
            }))
            .filter((format) => Boolean(format.id && format.label && format.fileExtension && format.mimeType));

        const uiExtensions = (manifest.uiExtensions || [])
            .filter((extension) => extension
                && typeof extension.id === 'string'
                && typeof extension.type === 'string'
                && typeof extension.title === 'string')
            .map((extension) => ({
                ...extension,
                id: extension.id.trim(),
                title: extension.title.trim(),
                description: typeof extension.description === 'string' ? extension.description.trim() : undefined,
            }))
            .filter((extension) => Boolean(extension.id && extension.title));

        return {
            ...manifest,
            id: manifest.id.trim(),
            name: manifest.name.trim(),
            version: manifest.version.trim(),
            description: manifest.description.trim(),
            author: manifest.author.trim(),
            entryPoint: manifest.entryPoint.trim(),
            apiVersion: manifest.apiVersion?.trim() || '1.0.0',
            permissions,
            commands,
            exportFormats,
            uiExtensions,
        };
    }

    private normalizeTimestamp(value: unknown, fallback: number = Date.now()): number {
        return isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : fallback;
    }

    private buildPluginStoragePrefix(pluginId: string): string {
        return `plugin:${pluginId}:`;
    }

    private buildPluginStorageKey(pluginId: string, key: string): string {
        return `${this.buildPluginStoragePrefix(pluginId)}${key}`;
    }

    private decodePluginStorageKey(storageKey: string): { pluginId: string; userKey: string } | null {
        if (!storageKey.startsWith('plugin:')) {
            return null;
        }
        const rest = storageKey.slice('plugin:'.length);
        const separatorIndex = rest.indexOf(':');
        if (separatorIndex <= 0) {
            return null;
        }
        const pluginId = rest.slice(0, separatorIndex).trim();
        const userKey = rest.slice(separatorIndex + 1);
        if (!PLUGIN_ID_PATTERN.test(pluginId) || !userKey) {
            return null;
        }
        return { pluginId, userKey };
    }

    /**
     * Install a plugin
     */
    async installPlugin(manifest: PluginManifest): Promise<Plugin> {
        if (!this.validateManifest(manifest)) {
            throw new Error('Invalid plugin manifest');
        }
        if (this.plugins.has(manifest.id)) {
            throw new Error(`Plugin "${manifest.id}" is already installed`);
        }

        const plugin: Plugin = {
            manifest: this.normalizeManifest(manifest),
            enabled: false,
            installedAt: Date.now(),
        };

        this.plugins.set(manifest.id, plugin);
        this.savePlugins();
        this.emitChange('installed', manifest.id);

        return plugin;
    }

    /**
     * Update an installed plugin
     */
    async updatePlugin(manifest: PluginManifest): Promise<Plugin> {
        const plugin = this.plugins.get(manifest.id);
        if (!plugin) {
            throw new Error(`Plugin "${manifest.id}" is not installed`);
        }
        if (!this.validateManifest(manifest)) {
            throw new Error('Invalid plugin manifest');
        }

        const wasEnabled = plugin.enabled;
        if (plugin.instance) {
            this.unloadPlugin(plugin.manifest.id);
        }
        this.unregisterPluginContributions(plugin.manifest.id);

        plugin.manifest = this.normalizeManifest(manifest);
        plugin.lastUpdated = Date.now();

        if (wasEnabled) {
            await this.loadPlugin(plugin.manifest.id);
            this.registerPluginContributions(plugin);
        }

        this.savePlugins();
        this.emitChange('updated', plugin.manifest.id);
        return plugin;
    }

    /**
     * Uninstall a plugin
     */
    uninstallPlugin(pluginId: string): boolean {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        this.unregisterPluginContributions(pluginId);
        if (plugin.instance) {
            this.unloadPlugin(pluginId);
        }

        this.plugins.delete(pluginId);
        this.storageKeys().forEach(key => {
            const decoded = this.decodePluginStorageKey(key);
            if (decoded?.pluginId === pluginId) {
                this.storageRemove(key);
            }
        });
        this.savePlugins();
        this.emitChange('uninstalled', pluginId);
        return true;
    }

    /**
     * Enable a plugin
     */
    async enablePlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        if (plugin.enabled) return true;

        if (!plugin.instance) {
            await this.loadPlugin(pluginId);
        }

        plugin.enabled = true;
        this.registerPluginContributions(plugin);
        this.savePlugins();
        this.emitChange('enabled', pluginId);
        return true;
    }

    /**
     * Disable a plugin
     */
    disablePlugin(pluginId: string): boolean {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;

        this.unregisterPluginContributions(pluginId);
        if (plugin.instance) {
            this.unloadPlugin(pluginId);
        }

        plugin.enabled = false;
        this.savePlugins();
        this.emitChange('disabled', pluginId);
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
                hooks.filter(h => h.pluginId !== pluginId)
            );
        });

        plugin.instance = undefined;
    }

    private registerPluginContributions(plugin: Plugin): void {
        const pluginId = plugin.manifest.id;
        (plugin.manifest.commands || []).forEach(command => {
            const runtimeId = this.toRuntimeCommandId(pluginId, command.id);
            this.registeredCommands.set(runtimeId, {
                runtimeId,
                pluginId,
                pluginName: plugin.manifest.name,
                command: {
                    ...command,
                    category: VALID_COMMAND_CATEGORIES.has(command.category || 'Actions')
                        ? command.category
                        : 'Actions',
                },
            });
        });

        (plugin.manifest.exportFormats || []).forEach(format => {
            const runtimeId = this.toRuntimeExportId(pluginId, format.id);
            this.registeredExportFormats.set(runtimeId, {
                runtimeId,
                pluginId,
                pluginName: plugin.manifest.name,
                format,
            });
        });
    }

    private unregisterPluginContributions(pluginId: string): void {
        Array.from(this.registeredCommands.entries()).forEach(([runtimeId, command]) => {
            if (command.pluginId === pluginId) {
                this.registeredCommands.delete(runtimeId);
            }
        });
        Array.from(this.registeredExportFormats.entries()).forEach(([runtimeId, format]) => {
            if (format.pluginId === pluginId) {
                this.registeredExportFormats.delete(runtimeId);
            }
        });
    }

    private toRuntimeCommandId(pluginId: string, commandId: string): string {
        return `plugin:${pluginId}:command:${commandId}`;
    }

    private toRuntimeExportId(pluginId: string, formatId: string): string {
        return `plugin:${pluginId}:export:${formatId}`;
    }

    getRegisteredCommands(): RegisteredPluginCommand[] {
        return Array.from(this.registeredCommands.values())
            .sort((a, b) => a.pluginName.localeCompare(b.pluginName) || a.command.label.localeCompare(b.command.label));
    }

    async executeRegisteredCommand(runtimeId: string, payload?: Record<string, unknown>): Promise<void> {
        const command = this.registeredCommands.get(runtimeId);
        if (!command) {
            throw new Error(`Unknown plugin command: ${runtimeId}`);
        }
        const hookName = `plugin:command:${runtimeId}`;
        const hookResults = await this.executeHooks(hookName, payload || {});

        if (hookResults.length === 0) {
            const plugin = this.plugins.get(command.pluginId);
            plugin?.instance?.api.ui.showNotification(
                `Command "${command.command.label}" executed.`,
                'success'
            );
        }
    }

    getRegisteredExportFormats(): RegisteredPluginExportFormat[] {
        return Array.from(this.registeredExportFormats.values())
            .sort((a, b) => a.pluginName.localeCompare(b.pluginName) || a.format.label.localeCompare(b.format.label));
    }

    isRegisteredExportFormat(runtimeId: string): boolean {
        return this.registeredExportFormats.has(runtimeId);
    }

    async exportWithRegisteredFormat(
        runtimeId: string,
        messages: ChatMessage[],
        options?: { title?: string; includeMetadata?: boolean }
    ): Promise<PluginExportResult> {
        const contribution = this.registeredExportFormats.get(runtimeId);
        if (!contribution) {
            throw new Error(`Unknown plugin export format: ${runtimeId}`);
        }

        const hookName = `plugin:export:${runtimeId}`;
        const hookResults = await this.executeHooks(hookName, {
            messages,
            title: options?.title,
            includeMetadata: options?.includeMetadata,
        });

        const hookContent = hookResults.find((result): result is string => typeof result === 'string');
        const content = hookContent ?? this.renderBuiltInExport(contribution.format, messages, options);

        return {
            content,
            mimeType: contribution.format.mimeType,
            fileExtension: contribution.format.fileExtension,
        };
    }

    private renderBuiltInExport(
        format: PluginExportFormatDefinition,
        messages: ChatMessage[],
        options?: { title?: string; includeMetadata?: boolean }
    ): string {
        const strategy = format.strategy || 'plain-text';
        const title = options?.title || 'Conversation Export';
        const includeMetadata = options?.includeMetadata !== false;

        if (strategy === 'jsonl') {
            return messages
                .map(message => JSON.stringify({
                    role: message.role,
                    content: message.content,
                    generationTime: message.generationTime,
                }))
                .join('\n');
        }

        if (strategy === 'markdown-transcript') {
            const lines: string[] = [`# ${title}`, ''];
            if (includeMetadata) {
                lines.push(`Exported: ${new Date().toISOString()}`);
                lines.push(`Messages: ${messages.length}`);
                lines.push('');
            }
            messages.forEach(message => {
                lines.push(`## ${message.role}`);
                lines.push('');
                lines.push(message.content);
                lines.push('');
            });
            return lines.join('\n');
        }

        const lines: string[] = [];
        if (includeMetadata) {
            lines.push(title);
            lines.push(`Exported: ${new Date().toISOString()}`);
            lines.push(`Messages: ${messages.length}`);
            lines.push('');
        }
        messages.forEach(message => {
            lines.push(`[${message.role.toUpperCase()}]`);
            lines.push(message.content);
            lines.push('');
        });
        return lines.join('\n');
    }

    /**
     * Create plugin API
     */
    private createPluginAPI(manifest: PluginManifest): PluginAPI {
        return {
            getConversations: async () => {
                // Check permission
                this.assertPermission(manifest, 'read-conversations');
                // Implementation would fetch from HistoryService
                return [];
            },
            getConversation: async (sessionId: string) => {
                this.assertPermission(manifest, 'read-conversations');
                return null;
            },
            sendMessage: async (message: string) => {
                this.assertPermission(manifest, 'write-conversations');
                return { success: true };
            },
            storage: {
                get: async (key: string) => {
                    this.assertPermission(manifest, 'storage');
                    const stored = this.storageGet(this.buildPluginStorageKey(manifest.id, key));
                    if (!stored) {
                        return null;
                    }
                    return parseJson(stored);
                },
                set: async (key: string, value: unknown) => {
                    this.assertPermission(manifest, 'storage');
                    this.storageSet(this.buildPluginStorageKey(manifest.id, key), JSON.stringify(value));
                },
                delete: async (key: string) => {
                    this.assertPermission(manifest, 'storage');
                    this.storageRemove(this.buildPluginStorageKey(manifest.id, key));
                },
                clear: async () => {
                    this.assertPermission(manifest, 'storage');
                    const keys = this.storageKeys();
                    keys.forEach(key => {
                        const decoded = this.decodePluginStorageKey(key);
                        if (decoded?.pluginId === manifest.id) {
                            this.storageRemove(key);
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
                    this.assertPermission(manifest, 'access-files', path);
                    // Would use Electron IPC
                    return '';
                },
                write: async (path: string, content: string) => {
                    this.assertPermission(manifest, 'access-files', path);
                    // Would use Electron IPC
                },
                exists: async (path: string) => {
                    this.assertPermission(manifest, 'access-files', path);
                    return false;
                },
            },
            network: {
                fetch: async (url: string, options?: RequestInit) => {
                    this.assertPermission(manifest, 'network-access', url);
                    return fetch(url, options);
                },
            },
        };
    }

    /**
     * Check if plugin has permission
     */
    private assertPermission(
        manifest: PluginManifest,
        permission: PluginPermission['type'],
        target?: string
    ): void {
        const granted = manifest.permissions.find(p => p.type === permission);
        if (!granted) {
            throw new Error(`Permission denied: ${permission}`);
        }

        if (permission === 'access-files') {
            if (!granted.scope) {
                throw new Error('Permission denied: access-files requires explicit scope');
            }
            if (target && !this.isPathInScope(target, granted.scope)) {
                throw new Error(`Permission denied: path "${target}" is outside plugin scope`);
            }
        }

        if (permission === 'network-access') {
            if (!granted.scope) {
                throw new Error('Permission denied: network-access requires explicit scope');
            }
            if (target && !this.isUrlInScope(target, granted.scope)) {
                throw new Error(`Permission denied: network target "${target}" is outside plugin scope`);
            }
        }
    }

    private isPathInScope(path: string, rawScope: string): boolean {
        const normalizedPath = path.replace(/\\/g, '/');
        const scopes = rawScope.split(',').map(entry => entry.trim().replace(/\\/g, '/')).filter(Boolean);
        return scopes.some(scope => normalizedPath.startsWith(scope));
    }

    private isUrlInScope(targetUrl: string, rawScope: string): boolean {
        let targetHost = '';
        try {
            targetHost = new URL(targetUrl).hostname.toLowerCase();
        } catch {
            return false;
        }

        const scopes = rawScope.split(',').map(entry => entry.trim().toLowerCase()).filter(Boolean);
        return scopes.some(scope => {
            if (scope.startsWith('*.')) {
                const base = scope.slice(2);
                return targetHost === base || targetHost.endsWith(`.${base}`);
            }
            if (scope.includes('://')) {
                try {
                    return new URL(scope).hostname.toLowerCase() === targetHost;
                } catch {
                    return false;
                }
            }
            return scope === targetHost;
        });
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
        const permissions = Array.isArray(m.permissions) ? m.permissions : [];
        const commands = Array.isArray(m.commands) ? m.commands : [];
        const exportFormats = Array.isArray(m.exportFormats) ? m.exportFormats : [];

        return (
            typeof m.id === 'string' &&
            m.id.trim().length > 0 &&
            PLUGIN_ID_PATTERN.test(m.id.trim()) &&
            typeof m.name === 'string' &&
            m.name.trim().length > 0 &&
            typeof m.version === 'string' &&
            m.version.trim().length > 0 &&
            typeof m.description === 'string' &&
            m.description.trim().length > 0 &&
            typeof m.author === 'string' &&
            m.author.trim().length > 0 &&
            typeof m.entryPoint === 'string' &&
            m.entryPoint.trim().length > 0 &&
            (typeof m.apiVersion === 'string' || typeof m.apiVersion === 'undefined') &&
            permissions.every(permission => {
                if (!permission || typeof permission !== 'object') return false;
                const typedPermission = permission as Record<string, unknown>;
                return (
                    typeof typedPermission.type === 'string' &&
                    VALID_PERMISSIONS.has(typedPermission.type as PluginPermission['type']) &&
                    (typeof typedPermission.scope === 'undefined' || typeof typedPermission.scope === 'string')
                );
            }) &&
            commands.every(command => {
                if (!command || typeof command !== 'object') return false;
                const typedCommand = command as Record<string, unknown>;
                return (
                    typeof typedCommand.id === 'string' &&
                    typedCommand.id.trim().length > 0 &&
                    typeof typedCommand.label === 'string' &&
                    typedCommand.label.trim().length > 0 &&
                    (typeof typedCommand.description === 'undefined' || typeof typedCommand.description === 'string') &&
                    (typeof typedCommand.category === 'undefined' || VALID_COMMAND_CATEGORIES.has(typedCommand.category as CommandCategory)) &&
                    (typeof typedCommand.keywords === 'undefined'
                        || (Array.isArray(typedCommand.keywords)
                            && typedCommand.keywords.every((keyword) => typeof keyword === 'string')))
                );
            }) &&
            exportFormats.every(format => {
                if (!format || typeof format !== 'object') return false;
                const typedFormat = format as Record<string, unknown>;
                return (
                    typeof typedFormat.id === 'string' &&
                    typedFormat.id.trim().length > 0 &&
                    typeof typedFormat.label === 'string' &&
                    typedFormat.label.trim().length > 0 &&
                    typeof typedFormat.description === 'string' &&
                    typedFormat.description.trim().length > 0 &&
                    typeof typedFormat.fileExtension === 'string' &&
                    typedFormat.fileExtension.trim().length > 0 &&
                    typeof typedFormat.mimeType === 'string' &&
                    typedFormat.mimeType.trim().length > 0 &&
                    (typeof typedFormat.strategy === 'undefined' ||
                        typedFormat.strategy === 'plain-text' ||
                        typedFormat.strategy === 'jsonl' ||
                        typedFormat.strategy === 'markdown-transcript')
                );
            })
        );
    }
}

export const pluginSystemService = PluginSystemService.getInstance();
