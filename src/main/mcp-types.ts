/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Based on JSON-RPC 2.0 over stdio communication protocol
 * Reference: https://modelcontextprotocol.io/docs/specification
 */

// ============================================================================
// JSON-RPC 2.0 Base Types
// ============================================================================

/**
 * JSON-RPC 2.0 Request
 */
export interface JSONRPCRequest {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, any> | any[];
    id?: string | number | null;
}

/**
 * JSON-RPC 2.0 Response (Success)
 */
export interface JSONRPCResponse {
    jsonrpc: '2.0';
    result: any;
    id: string | number | null;
}

/**
 * JSON-RPC 2.0 Error Object
 */
export interface JSONRPCError {
    code: number;
    message: string;
    data?: any;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JSONRPCErrorResponse {
    jsonrpc: '2.0';
    error: JSONRPCError;
    id: string | number | null;
}

/**
 * JSON-RPC 2.0 Notification (no id, no response expected)
 */
export interface JSONRPCNotification {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, any> | any[];
}

/**
 * Union of all JSON-RPC message types
 */
export type JSONRPCMessage =
    | JSONRPCRequest
    | JSONRPCResponse
    | JSONRPCErrorResponse
    | JSONRPCNotification;

// ============================================================================
// MCP Protocol Types
// ============================================================================

/**
 * MCP Server Implementation Information
 */
export interface MCPImplementation {
    name: string;
    version: string;
}

/**
 * MCP Server Capabilities
 */
export interface MCPServerCapabilities {
    tools?: {
        listChanged?: boolean; // Server can send tools/list_changed notification
    };
    resources?: {
        subscribe?: boolean; // Server supports resource subscriptions
        listChanged?: boolean;
    };
    prompts?: {
        listChanged?: boolean;
    };
    logging?: {}; // Server supports logging
}

/**
 * MCP Client Capabilities
 */
export interface MCPClientCapabilities {
    roots?: {
        listChanged?: boolean; // Client can send roots/list_changed notification
    };
    sampling?: {}; // Client supports sampling
}

/**
 * MCP Initialize Request Parameters
 */
export interface MCPInitializeParams {
    protocolVersion: string; // e.g., "2024-11-05"
    capabilities: MCPClientCapabilities;
    clientInfo: MCPImplementation;
}

/**
 * MCP Initialize Result
 */
export interface MCPInitializeResult {
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
    serverInfo: MCPImplementation;
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * JSON Schema for tool input
 */
export interface MCPToolInputSchema {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
    name: string;
    description?: string;
    inputSchema: MCPToolInputSchema;
}

/**
 * Tools List Request (no params needed)
 */
export interface MCPToolsListParams {}

/**
 * Tools List Result
 */
export interface MCPToolsListResult {
    tools: MCPTool[];
}

/**
 * Tool Call Request Parameters
 */
export interface MCPToolCallParams {
    name: string;
    arguments?: Record<string, any>;
}

/**
 * Tool Content Item (text or image or resource)
 */
export type MCPToolContent =
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: { uri: string; text?: string; blob?: string; mimeType?: string } };

/**
 * Tool Call Result
 */
export interface MCPToolCallResult {
    content: MCPToolContent[];
    isError?: boolean;
}

// ============================================================================
// Resource Types
// ============================================================================

/**
 * MCP Resource Definition
 */
export interface MCPResource {
    uri: string; // Unique identifier (e.g., file://, http://)
    name: string;
    description?: string;
    mimeType?: string;
}

/**
 * Resources List Request Parameters
 */
export interface MCPResourcesListParams {
    cursor?: string; // For pagination
}

/**
 * Resources List Result
 */
export interface MCPResourcesListResult {
    resources: MCPResource[];
    nextCursor?: string;
}

/**
 * Resource Read Request Parameters
 */
export interface MCPResourceReadParams {
    uri: string;
}

/**
 * Resource Read Result
 */
export interface MCPResourceReadResult {
    contents: MCPToolContent[];
}

// ============================================================================
// Prompt Types
// ============================================================================

/**
 * MCP Prompt Argument
 */
export interface MCPPromptArgument {
    name: string;
    description?: string;
    required?: boolean;
}

/**
 * MCP Prompt Definition
 */
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: MCPPromptArgument[];
}

/**
 * Prompts List Request Parameters
 */
export interface MCPPromptsListParams {
    cursor?: string;
}

/**
 * Prompts List Result
 */
export interface MCPPromptsListResult {
    prompts: MCPPrompt[];
    nextCursor?: string;
}

/**
 * Prompt Get Request Parameters
 */
export interface MCPPromptGetParams {
    name: string;
    arguments?: Record<string, string>;
}

/**
 * Prompt Message
 */
export interface MCPPromptMessage {
    role: 'user' | 'assistant';
    content: MCPToolContent[];
}

/**
 * Prompt Get Result
 */
export interface MCPPromptGetResult {
    description?: string;
    messages: MCPPromptMessage[];
}

// ============================================================================
// Logging Types
// ============================================================================

export type MCPLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/**
 * Logging Message Notification Parameters
 */
export interface MCPLoggingMessageParams {
    level: MCPLogLevel;
    logger?: string;
    data: any;
}

/**
 * Set Logging Level Request Parameters
 */
export interface MCPSetLogLevelParams {
    level: MCPLogLevel;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Tools List Changed Notification (no params)
 */
export interface MCPToolsListChangedParams {}

/**
 * Resources List Changed Notification (no params)
 */
export interface MCPResourcesListChangedParams {}

/**
 * Prompts List Changed Notification (no params)
 */
export interface MCPPromptsListChangedParams {}

// ============================================================================
// Method Names (for type safety)
// ============================================================================

export const MCPMethod = {
    // Lifecycle
    INITIALIZE: 'initialize',
    PING: 'ping',

    // Tools
    TOOLS_LIST: 'tools/list',
    TOOLS_CALL: 'tools/call',

    // Resources
    RESOURCES_LIST: 'resources/list',
    RESOURCES_READ: 'resources/read',
    RESOURCES_SUBSCRIBE: 'resources/subscribe',
    RESOURCES_UNSUBSCRIBE: 'resources/unsubscribe',

    // Prompts
    PROMPTS_LIST: 'prompts/list',
    PROMPTS_GET: 'prompts/get',

    // Logging
    LOGGING_SET_LEVEL: 'logging/setLevel',

    // Notifications
    NOTIFICATIONS_TOOLS_LIST_CHANGED: 'notifications/tools/list_changed',
    NOTIFICATIONS_RESOURCES_LIST_CHANGED: 'notifications/resources/list_changed',
    NOTIFICATIONS_PROMPTS_LIST_CHANGED: 'notifications/prompts/list_changed',
    NOTIFICATIONS_MESSAGE: 'notifications/message',
} as const;

// ============================================================================
// Error Codes (JSON-RPC 2.0 + MCP specific)
// ============================================================================

export const MCPErrorCode = {
    // JSON-RPC 2.0 standard errors
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,

    // MCP specific errors (custom range -32000 to -32099)
    SERVER_NOT_INITIALIZED: -32000,
    TOOL_NOT_FOUND: -32001,
    RESOURCE_NOT_FOUND: -32002,
    PROMPT_NOT_FOUND: -32003,
    INVALID_TOOL_ARGUMENTS: -32004,
} as const;

// ============================================================================
// Helper Types for MCP Client Implementation
// ============================================================================

/**
 * MCP Server Configuration (used by Electron main process)
 */
export interface MCPServerConfig {
    id: string;
    name: string;
    description?: string;
    command: string; // e.g., "npx", "python", "node"
    args: string[]; // e.g., ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    env?: Record<string, string>; // Environment variables
}

/**
 * MCP Server Connection State
 */
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP Server Instance (runtime state)
 */
export interface MCPServerInstance {
    config: MCPServerConfig;
    status: MCPServerStatus;
    serverInfo?: MCPImplementation;
    capabilities?: MCPServerCapabilities;
    tools?: MCPTool[];
    errorMessage?: string;
}

/**
 * Pending JSON-RPC Request (for tracking responses)
 */
export interface PendingRequest {
    id: string | number;
    method: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
}
