/**
 * MCP JSON-RPC Client
 *
 * Implements JSON-RPC 2.0 over stdio communication with MCP servers.
 * Manages spawned child processes and handles request/response flow.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  MCPServerConfig,
  MCPServerStatus,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPTool,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCErrorResponse,
  JSONRPCMessage,
  JSONRPCParams,
  PendingRequest,
  MCPMethod,
  JSONValue,
} from './mcp-types';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const isJsonRpcId = (value: unknown): value is string | number | null => {
  return value === null || typeof value === 'string' || typeof value === 'number';
};

const hasOwnProperty = (value: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const isJsonRpcParams = (value: unknown): value is JSONRPCParams => {
  return Array.isArray(value) || isRecord(value);
};

export const parseJsonRpcMessageLine = (
  line: string,
): { message: JSONRPCMessage } | { error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    return { error: `Invalid JSON: ${getErrorMessage(error, 'unknown parse error')}` };
  }

  if (!isRecord(parsed)) {
    return { error: 'JSON-RPC payload must be an object' };
  }
  if (parsed.jsonrpc !== '2.0') {
    return { error: 'JSON-RPC payload must include jsonrpc: "2.0"' };
  }

  if (hasOwnProperty(parsed, 'error')) {
    if (!isRecord(parsed.error)) {
      return { error: 'JSON-RPC error response has invalid error payload' };
    }
    if (typeof parsed.error.code !== 'number' || !Number.isFinite(parsed.error.code)) {
      return { error: 'JSON-RPC error response is missing numeric error.code' };
    }
    if (typeof parsed.error.message !== 'string') {
      return { error: 'JSON-RPC error response is missing string error.message' };
    }
    if (!isJsonRpcId(parsed.id)) {
      return { error: 'JSON-RPC error response has invalid id' };
    }

    const message: JSONRPCErrorResponse = {
      jsonrpc: '2.0',
      error: {
        code: parsed.error.code,
        message: parsed.error.message,
        ...(hasOwnProperty(parsed.error, 'data') ? { data: parsed.error.data as JSONValue } : {}),
      },
      id: parsed.id,
    };
    return { message };
  }

  if (hasOwnProperty(parsed, 'result')) {
    if (!isJsonRpcId(parsed.id)) {
      return { error: 'JSON-RPC response has invalid id' };
    }
    const message: JSONRPCResponse = {
      jsonrpc: '2.0',
      result: parsed.result as JSONValue,
      id: parsed.id,
    };
    return { message };
  }

  if (typeof parsed.method !== 'string') {
    return { error: 'JSON-RPC request/notification is missing method' };
  }
  if (hasOwnProperty(parsed, 'id') && !isJsonRpcId(parsed.id)) {
    return { error: 'JSON-RPC request has invalid id' };
  }

  const message: JSONRPCRequest = {
    jsonrpc: '2.0',
    method: parsed.method,
    ...(isJsonRpcParams(parsed.params) ? { params: parsed.params } : {}),
    ...(hasOwnProperty(parsed, 'id') ? { id: parsed.id as string | number | null } : {}),
  };
  return { message };
};

/**
 * MCP Client for communicating with MCP servers via stdio
 */
export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: MCPServerConfig;
  private status: MCPServerStatus = 'disconnected';
  private pendingRequests: Map<string | number, PendingRequest> = new Map();
  private requestIdCounter = 0;
  private buffer = '';
  private initializeResult: MCPInitializeResult | null = null;
  private tools: MCPTool[] = [];

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Get current connection status
   */
  getStatus(): MCPServerStatus {
    return this.status;
  }

  /**
   * Get available tools (after initialization)
   */
  getTools(): MCPTool[] {
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
  async connect(): Promise<{ success: boolean; error?: string; tools?: MCPTool[] }> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return { success: false, error: 'Already connected or connecting' };
    }

    this.status = 'connecting';
    this.emit('statusChange', this.status);

    try {
      // Spawn the MCP server process
      this.process = spawn(this.config.command, this.config.args, {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle stdout (JSON-RPC messages)
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleStdout(data);
      });

      // Handle stderr (errors and logs)
      this.process.stderr?.on('data', (data: Buffer) => {
        const errorText = data.toString();
        this.emit('stderr', errorText);
      });

      // Handle process exit
      this.process.on('exit', (code: number | null, signal: string | null) => {
        this.handleProcessExit(code, signal);
      });

      // Handle process errors
      this.process.on('error', (error: Error) => {
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
    } catch (error: unknown) {
      this.status = 'error';
      this.emit('statusChange', this.status);
      this.cleanup();
      return { success: false, error: getErrorMessage(error, 'Failed to connect to MCP server') };
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    this.cleanup();
    this.status = 'disconnected';
    this.emit('statusChange', this.status);
  }

  /**
   * Initialize the MCP connection (handshake)
   */
  private async initialize(): Promise<MCPInitializeResult> {
    const params: MCPInitializeParams = {
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

    const result = await this.sendRequest<MCPInitializeResult>(MCPMethod.INITIALIZE, params);
    this.initializeResult = result;
    return result;
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<MCPToolsListResult> {
    if (this.status !== 'connected' && this.status !== 'connecting') {
      throw new Error('Not connected to MCP server');
    }

    const result = await this.sendRequest<MCPToolsListResult>(MCPMethod.TOOLS_LIST, {});
    return result;
  }

  /**
   * Execute a tool call
   */
  async callTool(toolName: string, args?: Record<string, JSONValue>): Promise<MCPToolCallResult> {
    if (this.status !== 'connected') {
      throw new Error('Not connected to MCP server');
    }

    const params: MCPToolCallParams = {
      name: toolName,
      arguments: args,
    };

    const result = await this.sendRequest<MCPToolCallResult>(MCPMethod.TOOLS_CALL, params);
    return result;
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private async sendRequest<T = JSONValue>(method: string, params?: JSONRPCParams): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestIdCounter;

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id,
      };

      // Store pending request
      const pending: PendingRequest = {
        id,
        method,
        resolve: (value: unknown) => resolve(value as T),
        reject: (error: Error) => reject(error),
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
      } catch (error) {
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
  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();

    // Process complete lines (newline-delimited JSON)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.length === 0) {
        continue;
      }

      const parsed = parseJsonRpcMessageLine(line);
      if ('error' in parsed) {
        this.emit('error', new Error(`Failed to parse JSON-RPC message: ${parsed.error}`));
        continue;
      }
      this.handleMessage(parsed.message);
    }
  }

  /**
   * Handle incoming JSON-RPC message
   */
  private handleMessage(message: JSONRPCMessage): void {
    // Check if it's a response (has 'result' or 'error' field)
    if ('result' in message || 'error' in message) {
      this.handleResponse(message as JSONRPCResponse | JSONRPCErrorResponse);
    } else {
      // It's a notification or request from server
      this.handleNotification(message);
    }
  }

  /**
   * Handle JSON-RPC response
   */
  private handleResponse(response: JSONRPCResponse | JSONRPCErrorResponse): void {
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
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle JSON-RPC notification from server
   */
  private handleNotification(message: JSONRPCMessage): void {
    this.emit('notification', message);
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(code: number | null, signal: string | null): void {
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
  private handleProcessError(error: Error): void {
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
  private cleanup(): void {
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
      } catch (error) {
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

/**
 * Manages multiple MCP client instances
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<{ success: boolean; error?: string; tools?: MCPTool[] }> {
    // Check if already connected
    if (this.clients.has(config.id)) {
      const existing = this.clients.get(config.id)!;
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
  async disconnect(serverId: string): Promise<{ success: boolean; error?: string }> {
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
  async callTool(
    serverId: string,
    toolName: string,
    args?: Record<string, JSONValue>
  ): Promise<MCPToolCallResult> {
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
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  /**
   * Get all connected clients
   */
  getAllClients(): Map<string, MCPClient> {
    return this.clients;
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) => client.disconnect());
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }
}
