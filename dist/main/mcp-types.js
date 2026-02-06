"use strict";
/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Based on JSON-RPC 2.0 over stdio communication protocol
 * Reference: https://modelcontextprotocol.io/docs/specification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPErrorCode = exports.MCPMethod = void 0;
// ============================================================================
// Method Names (for type safety)
// ============================================================================
exports.MCPMethod = {
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
};
// ============================================================================
// Error Codes (JSON-RPC 2.0 + MCP specific)
// ============================================================================
exports.MCPErrorCode = {
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
};
//# sourceMappingURL=mcp-types.js.map