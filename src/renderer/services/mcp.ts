/**
 * MCP (Model Context Protocol) Client Service
 * 
 * This service manages connections to MCP servers and handles tool calls.
 * MCP servers can provide tools for filesystem access, git, databases, etc.
 */

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

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

const MCP_STATUSES = new Set<MCPServer['status']>([
    'disconnected',
    'connecting',
    'connected',
    'error',
]);

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    const normalized: string[] = [];
    value.forEach((entry) => {
        const stringValue = sanitizeNonEmptyString(entry);
        if (!stringValue || seen.has(stringValue)) {
            return;
        }
        seen.add(stringValue);
        normalized.push(stringValue);
    });
    return normalized;
};

const sanitizeEnvRecord = (value: unknown): Record<string, string> | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    const normalized: Record<string, string> = {};
    Object.entries(value).forEach(([key, entry]) => {
        const normalizedKey = sanitizeNonEmptyString(key);
        const normalizedValue = sanitizeNonEmptyString(entry);
        if (!normalizedKey || !normalizedValue) {
            return;
        }
        normalized[normalizedKey] = normalizedValue;
    });
    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export interface FolderChangedEventPayload {
    path: string;
    type: string;
    file: string;
}

export interface AppUpdateInfo {
    version: string;
    [key: string]: unknown;
}

export interface AppUpdateCheckResult {
    available: boolean;
    version?: string;
    error?: string;
    message?: string;
}

export interface McpExecuteToolRequest {
    serverId: string;
    toolName: string;
    arguments: Record<string, unknown>;
}

interface McpExecuteToolContentEntry {
    type?: string;
    text?: string;
    [key: string]: unknown;
}

interface McpExecuteToolPayload {
    content?: string | McpExecuteToolContentEntry[];
    isError?: boolean;
    [key: string]: unknown;
}

interface McpExecuteToolResponse {
    success?: boolean;
    error?: string;
    result?: McpExecuteToolPayload;
    content?: string;
    isError?: boolean;
    [key: string]: unknown;
}

interface ModelDownloadRequest {
    modelId: string;
    fileName: string;
    url: string;
    size: number;
}

export interface MCPServer {
    id: string;
    name: string;
    description?: string;
    command: string; // e.g., "npx", "python", "node"
    args: string[]; // e.g., ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    env?: Record<string, string>;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    errorMessage?: string;
}

export interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
    serverId: string; // Which server provides this tool
}

export interface MCPToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    serverId: string;
}

export interface MCPToolResult {
    toolCallId: string;
    content: string;
    isError?: boolean;
}

interface MCPConnectResponse {
    success: boolean;
    error?: string;
    tools?: MCPTool[];
}

interface MCPToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties?: Record<string, unknown>;
            required?: string[];
        };
    };
}

export interface ElectronAPIBridge {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    selectFolder: () => Promise<{ success: boolean; path?: string }>;
    watchFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
    stopWatchingFolder: (folderPath: string) => Promise<{ success: boolean }>;
    readFolderFiles: (
        folderPath: string,
        extensions?: string[]
    ) => Promise<{ success: boolean; files?: Array<{ path: string; content: string; relativePath: string }>; error?: string }>;
    executeCode: (code: string, language: string) => Promise<{ success: boolean; output: string; exitCode: number }>;
    onFolderChanged: (
        callback: (event: unknown, data: FolderChangedEventPayload) => void
    ) => (() => void) | undefined;
    getAppVersion: () => Promise<string>;
    checkForUpdates: () => Promise<AppUpdateCheckResult>;
    quitAndInstall: () => Promise<void>;
    onUpdateDownloaded: (
        callback: (event: unknown, info: AppUpdateInfo) => void
    ) => (() => void) | undefined;
    gitCommit?: (options: { filePath: string; content: string; message: string }) => Promise<{
        success?: boolean;
        commitHash?: string;
        error?: string;
    }>;
    secureStorageIsAvailable?: () => Promise<boolean>;
    secureStorageSetItem?: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
    secureStorageGetItem?: (key: string) => Promise<{ success: boolean; value?: string | null; error?: string }>;
    secureStorageRemoveItem?: (key: string) => Promise<{ success: boolean; error?: string }>;
    checkBackendHealth?: () => Promise<{ online: boolean }>;
    mcpConnect?: (server: MCPServer) => Promise<MCPConnectResponse>;
    mcpDisconnect?: (id: string) => Promise<void>;
    mcpExecuteTool?: (toolCall: McpExecuteToolRequest) => Promise<McpExecuteToolResponse>;
    downloadModel?: (options: ModelDownloadRequest) => Promise<void>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPIBridge;
    }
}

// Storage key for MCP servers configuration
const MCP_SERVERS_KEY = 'mcp_servers';

/**
 * MCP Client manages connections to multiple MCP servers
 */
class MCPClient {
    private servers: Map<string, MCPServer> = new Map();
    private tools: Map<string, MCPTool> = new Map(); // tool name -> tool
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.loadServers();
    }

    private sanitizeServer(
        value: unknown,
        options?: {
            forceId?: string;
            forceStatus?: MCPServer['status'];
            forceErrorMessage?: string | undefined;
            fallbackStatus?: MCPServer['status'];
        }
    ): MCPServer | null {
        if (!isRecord(value)) {
            return null;
        }
        const id = options?.forceId || sanitizeNonEmptyString(value.id);
        const name = sanitizeNonEmptyString(value.name);
        const command = sanitizeNonEmptyString(value.command);
        const args = sanitizeStringArray(value.args);
        if (!id || !name || !command) {
            return null;
        }

        const statusFromValue = MCP_STATUSES.has(value.status as MCPServer['status'])
            ? value.status as MCPServer['status']
            : undefined;
        const status = options?.forceStatus
            || statusFromValue
            || options?.fallbackStatus
            || 'disconnected';

        return {
            id,
            name,
            description: sanitizeNonEmptyString(value.description) || undefined,
            command,
            args,
            env: sanitizeEnvRecord(value.env),
            status,
            errorMessage: options?.forceErrorMessage !== undefined
                ? options.forceErrorMessage
                : (sanitizeNonEmptyString(value.errorMessage) || undefined),
        };
    }

    private parseStoredServers(raw: string): MCPServer[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const seenIds = new Set<string>();
        const servers: MCPServer[] = [];
        parsed.forEach((entry) => {
            const sanitized = this.sanitizeServer(entry, { fallbackStatus: 'disconnected' });
            if (!sanitized || seenIds.has(sanitized.id)) {
                return;
            }
            seenIds.add(sanitized.id);
            servers.push(sanitized);
        });
        return servers;
    }

    /**
     * Load saved servers from localStorage
     */
    private loadServers(): void {
        try {
            const saved = localStorage.getItem(MCP_SERVERS_KEY);
            if (saved) {
                const servers = this.parseStoredServers(saved);
                servers.forEach(s => {
                    this.servers.set(s.id, { ...s, status: 'disconnected' });
                });
            }
        } catch (e) {
            console.error('Failed to load MCP servers:', e);
        }
    }

    /**
     * Save servers to localStorage
     */
    private saveServers(): void {
        try {
            const servers = Array.from(this.servers.values());
            localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers));
        } catch (e) {
            console.error('Failed to save MCP servers:', e);
        }
    }

    /**
     * Notify listeners of state changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(fn => fn());
    }

    /**
     * Subscribe to state changes
     */
    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    /**
     * Get all configured servers
     */
    getServers(): MCPServer[] {
        return Array.from(this.servers.values());
    }

    /**
     * Get all available tools from connected servers
     */
    getTools(): MCPTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Add a new MCP server configuration
     */
    addServer(server: Omit<MCPServer, 'id' | 'status'>): MCPServer {
        const candidate: MCPServer = {
            id: crypto.randomUUID(),
            status: 'disconnected',
            ...server
        };
        const newServer = this.sanitizeServer(candidate, { forceStatus: 'disconnected' });
        if (!newServer) {
            throw new Error('Invalid MCP server configuration');
        }
        this.servers.set(newServer.id, newServer);
        this.saveServers();
        this.notifyListeners();
        return newServer;
    }

    /**
     * Remove a server configuration
     */
    removeServer(id: string): void {
        this.disconnectServer(id);
        this.servers.delete(id);
        this.saveServers();
        this.notifyListeners();
    }

    /**
     * Update server configuration
     */
    updateServer(id: string, updates: Partial<MCPServer>): void {
        const server = this.servers.get(id);
        if (server) {
            const sanitized = this.sanitizeServer(
                { ...server, ...updates },
                {
                    forceId: server.id,
                    forceStatus: server.status,
                    forceErrorMessage: server.errorMessage,
                }
            );
            if (!sanitized) {
                return;
            }
            this.servers.set(id, sanitized);
            this.saveServers();
            this.notifyListeners();
        }
    }

    /**
     * Connect to an MCP server
     * In the renderer process, we'll use IPC to spawn the process in main
     */
    async connectServer(id: string): Promise<void> {
        const server = this.servers.get(id);
        if (!server) throw new Error(`Server ${id} not found`);

        server.status = 'connecting';
        server.errorMessage = undefined;
        this.notifyListeners();

        try {
            // Use Electron IPC to connect to the server from main process
            if (window.electronAPI?.mcpConnect) {
                const result = await window.electronAPI.mcpConnect(server);
                if (result.success) {
                    server.status = 'connected';
                    // Parse and store tools from result
                    if (result.tools) {
                        result.tools.forEach((tool: MCPTool) => {
                            this.tools.set(tool.name, { ...tool, serverId: id });
                        });
                    }
                } else {
                    throw new Error(result.error || 'Connection failed');
                }
            } else {
                // Fallback: Mock connection for development
                console.warn('MCP IPC not available, using mock connection');
                await new Promise(r => setTimeout(r, 1000));
                server.status = 'connected';

                // Add mock tools for testing
                this.tools.set('read_file', {
                    name: 'read_file',
                    description: 'Read the contents of a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Path to the file to read' }
                        },
                        required: ['path']
                    },
                    serverId: id
                });
                this.tools.set('write_file', {
                    name: 'write_file',
                    description: 'Write content to a file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Path to the file' },
                            content: { type: 'string', description: 'Content to write' }
                        },
                        required: ['path', 'content']
                    },
                    serverId: id
                });
                this.tools.set('list_directory', {
                    name: 'list_directory',
                    description: 'List contents of a directory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Path to the directory' }
                        },
                        required: ['path']
                    },
                    serverId: id
                });
            }

            this.notifyListeners();
        } catch (error: unknown) {
            server.status = 'error';
            server.errorMessage = getErrorMessage(error, 'Connection failed');
            this.notifyListeners();
            throw error;
        }
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnectServer(id: string): Promise<void> {
        const server = this.servers.get(id);
        if (!server) return;

        try {
            if (window.electronAPI?.mcpDisconnect) {
                await window.electronAPI.mcpDisconnect(id);
            }
        } catch (e) {
            console.error('Error disconnecting:', e);
        }

        // Remove tools from this server
        for (const [name, tool] of this.tools) {
            if (tool.serverId === id) {
                this.tools.delete(name);
            }
        }

        server.status = 'disconnected';
        this.notifyListeners();
    }

    /**
     * Execute a tool call
     */
    async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
        const tool = this.tools.get(toolCall.name);
        if (!tool) {
            return {
                toolCallId: toolCall.id,
                content: `Tool "${toolCall.name}" not found`,
                isError: true
            };
        }

        try {
            if (window.electronAPI?.mcpExecuteTool) {
                const response = await window.electronAPI.mcpExecuteTool({
                    serverId: tool.serverId,
                    toolName: toolCall.name,
                    arguments: toolCall.arguments
                });

                if (response?.success === false) {
                    return {
                        toolCallId: toolCall.id,
                        content: response.error || 'Tool execution failed',
                        isError: true
                    };
                }

                const payload = response?.result ?? response;
                let content = '';
                if (typeof payload?.content === 'string') {
                    content = payload.content;
                } else if (Array.isArray(payload?.content)) {
                    content = payload.content
                        .map((entry: unknown) => {
                            if (!entry) return '';
                            if (
                                typeof entry === 'object'
                                && entry !== null
                                && 'type' in entry
                                && 'text' in entry
                                && (entry as McpExecuteToolContentEntry).type === 'text'
                                && typeof (entry as McpExecuteToolContentEntry).text === 'string'
                            ) {
                                return (entry as McpExecuteToolContentEntry).text;
                            }
                            return JSON.stringify(entry);
                        })
                        .filter(Boolean)
                        .join('\n');
                } else {
                    content = JSON.stringify(payload);
                }

                return {
                    toolCallId: toolCall.id,
                    content,
                    isError: Boolean(payload?.isError)
                };
            } else {
                // Mock tool execution for development
                console.warn('MCP IPC not available, using mock execution');
                await new Promise(r => setTimeout(r, 500));

                // Mock responses
                if (toolCall.name === 'read_file') {
                    return {
                        toolCallId: toolCall.id,
                        content: `[Mock] Contents of ${toolCall.arguments.path}:\n\nThis is mock file content for development purposes.`
                    };
                } else if (toolCall.name === 'list_directory') {
                    return {
                        toolCallId: toolCall.id,
                        content: `[Mock] Contents of ${toolCall.arguments.path}:\n- file1.txt\n- file2.js\n- folder1/`
                    };
                } else if (toolCall.name === 'write_file') {
                    return {
                        toolCallId: toolCall.id,
                        content: `[Mock] Successfully wrote to ${toolCall.arguments.path}`
                    };
                }

                return {
                    toolCallId: toolCall.id,
                    content: `[Mock] Executed ${toolCall.name} with args: ${JSON.stringify(toolCall.arguments)}`
                };
            }
        } catch (error: unknown) {
            return {
                toolCallId: toolCall.id,
                content: `Error executing tool: ${getErrorMessage(error, 'Unknown error')}`,
                isError: true
            };
        }
    }

    /**
     * Format tools for OpenAI-compatible API
     */
    getToolsForAPI(): MCPToolDefinition[] {
        return Array.from(this.tools.values()).map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description || '',
                parameters: tool.inputSchema || { type: 'object', properties: {} }
            }
        }));
    }

    /**
     * Check if any servers are connected
     */
    hasConnectedServers(): boolean {
        return Array.from(this.servers.values()).some(s => s.status === 'connected');
    }

    /**
     * Get connected server count
     */
    getConnectedCount(): number {
        return Array.from(this.servers.values()).filter(s => s.status === 'connected').length;
    }
}

// Singleton instance
export const mcpClient = new MCPClient();
