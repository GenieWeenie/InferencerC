"use strict";
/**
 * MCP JSON-RPC Client
 *
 * Implements JSON-RPC 2.0 over stdio communication with MCP servers.
 * Manages spawned child processes and handles request/response flow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClientManager = exports.MCPClient = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const mcp_types_1 = require("./mcp-types");
/**
 * MCP Client for communicating with MCP servers via stdio
 */
class MCPClient extends events_1.EventEmitter {
    process = null;
    config;
    status = 'disconnected';
    pendingRequests = new Map();
    requestIdCounter = 0;
    buffer = '';
    initializeResult = null;
    tools = [];
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Get current connection status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Get available tools (after initialization)
     */
    getTools() {
        return this.tools;
    }
    /**
     * Get server info (after initialization)
     */
    getServerInfo() {
        return this.initializeResult?.serverInfo;
    }
    /**
     * Spawn the MCP server process and initialize the connection
     */
    async connect() {
        if (this.status === 'connected' || this.status === 'connecting') {
            return { success: false, error: 'Already connected or connecting' };
        }
        this.status = 'connecting';
        this.emit('statusChange', this.status);
        try {
            // Spawn the MCP server process
            this.process = (0, child_process_1.spawn)(this.config.command, this.config.args, {
                env: { ...process.env, ...this.config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            // Handle stdout (JSON-RPC messages)
            this.process.stdout?.on('data', (data) => {
                this.handleStdout(data);
            });
            // Handle stderr (errors and logs)
            this.process.stderr?.on('data', (data) => {
                const errorText = data.toString();
                this.emit('stderr', errorText);
            });
            // Handle process exit
            this.process.on('exit', (code, signal) => {
                this.handleProcessExit(code, signal);
            });
            // Handle process errors
            this.process.on('error', (error) => {
                this.handleProcessError(error);
            });
            // Wait a bit for process to start
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Perform MCP handshake
            const initResult = await this.initialize();
            // List available tools
            const toolsResult = await this.listTools();
            this.tools = toolsResult.tools;
            this.status = 'connected';
            this.emit('statusChange', this.status);
            return { success: true, tools: this.tools };
        }
        catch (error) {
            this.status = 'error';
            this.emit('statusChange', this.status);
            this.cleanup();
            return { success: false, error: error.message || 'Failed to connect to MCP server' };
        }
    }
    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        this.cleanup();
        this.status = 'disconnected';
        this.emit('statusChange', this.status);
    }
    /**
     * Initialize the MCP connection (handshake)
     */
    async initialize() {
        const params = {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: {
                    listChanged: false,
                },
            },
            clientInfo: {
                name: 'InferencerC',
                version: '1.0.0',
            },
        };
        const result = await this.sendRequest(mcp_types_1.MCPMethod.INITIALIZE, params);
        this.initializeResult = result;
        return result;
    }
    /**
     * List available tools from the MCP server
     */
    async listTools() {
        if (this.status !== 'connected' && this.status !== 'connecting') {
            throw new Error('Not connected to MCP server');
        }
        const result = await this.sendRequest(mcp_types_1.MCPMethod.TOOLS_LIST, {});
        return result;
    }
    /**
     * Execute a tool call
     */
    async callTool(toolName, args) {
        if (this.status !== 'connected') {
            throw new Error('Not connected to MCP server');
        }
        const params = {
            name: toolName,
            arguments: args,
        };
        const result = await this.sendRequest(mcp_types_1.MCPMethod.TOOLS_CALL, params);
        return result;
    }
    /**
     * Send a JSON-RPC request and wait for response
     */
    async sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            const id = ++this.requestIdCounter;
            const request = {
                jsonrpc: '2.0',
                method,
                params,
                id,
            };
            // Store pending request
            const pending = {
                id,
                method,
                resolve,
                reject,
                timestamp: Date.now(),
            };
            this.pendingRequests.set(id, pending);
            // Send request
            const requestJson = JSON.stringify(request) + '\n';
            if (!this.process || !this.process.stdin) {
                reject(new Error('Process not available'));
                return;
            }
            try {
                this.process.stdin.write(requestJson, (error) => {
                    if (error) {
                        this.pendingRequests.delete(id);
                        reject(error);
                    }
                });
            }
            catch (error) {
                this.pendingRequests.delete(id);
                reject(error);
            }
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request timeout: ${method}`));
                }
            }, 30000);
        });
    }
    /**
     * Handle stdout data (newline-delimited JSON)
     */
    handleStdout(data) {
        this.buffer += data.toString();
        // Process complete lines (newline-delimited JSON)
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (line.length === 0) {
                continue;
            }
            try {
                const message = JSON.parse(line);
                this.handleMessage(message);
            }
            catch (error) {
                this.emit('error', new Error(`Failed to parse JSON-RPC message: ${error.message}`));
            }
        }
    }
    /**
     * Handle incoming JSON-RPC message
     */
    handleMessage(message) {
        // Check if it's a response (has 'result' or 'error' field)
        if ('result' in message || 'error' in message) {
            this.handleResponse(message);
        }
        else {
            // It's a notification or request from server
            this.handleNotification(message);
        }
    }
    /**
     * Handle JSON-RPC response
     */
    handleResponse(response) {
        const { id } = response;
        if (id === null) {
            return; // Notification response (shouldn't happen)
        }
        const pending = this.pendingRequests.get(id);
        if (!pending) {
            return; // Unknown response
        }
        this.pendingRequests.delete(id);
        if ('error' in response) {
            pending.reject(new Error(response.error.message));
        }
        else {
            pending.resolve(response.result);
        }
    }
    /**
     * Handle JSON-RPC notification from server
     */
    handleNotification(message) {
        this.emit('notification', message);
    }
    /**
     * Handle process exit
     */
    handleProcessExit(code, signal) {
        const exitInfo = { code, signal };
        this.emit('exit', exitInfo);
        if (this.status === 'connected' || this.status === 'connecting') {
            this.status = 'error';
            this.emit('statusChange', this.status);
        }
        this.cleanup();
    }
    /**
     * Handle process error
     */
    handleProcessError(error) {
        this.emit('error', error);
        if (this.status !== 'disconnected') {
            this.status = 'error';
            this.emit('statusChange', this.status);
        }
        this.cleanup();
    }
    /**
     * Cleanup process and pending requests
     */
    cleanup() {
        // Reject all pending requests
        this.pendingRequests.forEach((pending, id) => {
            pending.reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();
        // Kill process if still running
        if (this.process) {
            try {
                if (!this.process.killed) {
                    this.process.kill();
                }
            }
            catch (error) {
                // Ignore errors during cleanup
            }
            this.process = null;
        }
        // Reset state
        this.buffer = '';
        this.initializeResult = null;
        this.tools = [];
    }
}
exports.MCPClient = MCPClient;
/**
 * Manages multiple MCP client instances
 */
class MCPClientManager {
    clients = new Map();
    /**
     * Connect to an MCP server
     */
    async connect(config) {
        // Check if already connected
        if (this.clients.has(config.id)) {
            const existing = this.clients.get(config.id);
            if (existing.getStatus() === 'connected') {
                return { success: false, error: 'Already connected' };
            }
            // Clean up stale client
            await existing.disconnect();
            this.clients.delete(config.id);
        }
        // Create new client
        const client = new MCPClient(config);
        this.clients.set(config.id, client);
        // Connect
        const result = await client.connect();
        if (!result.success) {
            this.clients.delete(config.id);
        }
        return result;
    }
    /**
     * Disconnect from an MCP server
     */
    async disconnect(serverId) {
        const client = this.clients.get(serverId);
        if (!client) {
            return { success: false, error: 'Server not found' };
        }
        await client.disconnect();
        this.clients.delete(serverId);
        return { success: true };
    }
    /**
     * Execute a tool call on a specific server
     */
    async callTool(serverId, toolName, args) {
        const client = this.clients.get(serverId);
        if (!client) {
            throw new Error('Server not found');
        }
        if (client.getStatus() !== 'connected') {
            throw new Error('Server not connected');
        }
        return client.callTool(toolName, args);
    }
    /**
     * Get a client by server ID
     */
    getClient(serverId) {
        return this.clients.get(serverId);
    }
    /**
     * Get all connected clients
     */
    getAllClients() {
        return this.clients;
    }
    /**
     * Disconnect all servers
     */
    async disconnectAll() {
        const disconnectPromises = Array.from(this.clients.values()).map((client) => client.disconnect());
        await Promise.all(disconnectPromises);
        this.clients.clear();
    }
}
exports.MCPClientManager = MCPClientManager;
//# sourceMappingURL=mcp-client.js.map