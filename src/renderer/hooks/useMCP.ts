import { useState, useEffect, useCallback, useRef } from 'react';
import type { MCPTool, MCPToolCall, MCPToolResult } from '../services/mcp';

type MCPClient = typeof import('../services/mcp')['mcpClient'];

interface UseMCPOptions {
    enabled?: boolean;
    deferUntilIdle?: boolean;
}

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

export const parseToolCallPayload = (value: unknown): { name: string; args: Record<string, unknown> } | null => {
    if (!isRecord(value) || typeof value.name !== 'string') {
        return null;
    }
    const name = value.name.trim();
    if (!name) {
        return null;
    }
    const resolveArguments = (candidate: unknown): Record<string, unknown> | null => {
        if (isRecord(candidate)) {
            return candidate;
        }
        if (typeof candidate === 'string') {
            const parsed = parseJson(candidate);
            if (isRecord(parsed)) {
                return parsed;
            }
        }
        return null;
    };

    const args = resolveArguments(value.arguments)
        || resolveArguments(value.parameters)
        || {};
    return { name, args };
};

export const parseToolCallPayloadFromRaw = (raw: string): { name: string; args: Record<string, unknown> } | null => {
    const parsed = parseJson(raw);
    if (!parsed) {
        return null;
    }
    return parseToolCallPayload(parsed);
};

const getSchemaSummary = (schema: unknown): string => {
    if (typeof schema !== 'object' || schema === null) {
        return 'unknown';
    }
    const record = schema as { description?: unknown; type?: unknown };
    if (typeof record.description === 'string' && record.description.trim().length > 0) {
        return record.description;
    }
    if (typeof record.type === 'string' && record.type.trim().length > 0) {
        return record.type;
    }
    return 'unknown';
};

/**
 * Hook for integrating MCP tools into the chat experience
 */
export const useMCP = (options: UseMCPOptions = {}) => {
    const { enabled = true, deferUntilIdle = true } = options;

    const [tools, setTools] = useState<MCPTool[]>([]);
    const [connectedCount, setConnectedCount] = useState(0);
    const [isExecutingTool, setIsExecutingTool] = useState(false);
    const [lastToolResult, setLastToolResult] = useState<MCPToolResult | null>(null);

    const clientRef = useRef<MCPClient | null>(null);
    const loadPromiseRef = useRef<Promise<MCPClient> | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const updateFromClient = useCallback(() => {
        const client = clientRef.current;
        if (!client) {
            setTools([]);
            setConnectedCount(0);
            return;
        }
        setTools(client.getTools());
        setConnectedCount(client.getConnectedCount());
    }, []);

    const attachClient = useCallback((client: MCPClient) => {
        clientRef.current = client;
        if (!unsubscribeRef.current) {
            unsubscribeRef.current = client.subscribe(updateFromClient);
        }
        updateFromClient();
    }, [updateFromClient]);

    const ensureClientLoaded = useCallback(async (): Promise<MCPClient> => {
        if (clientRef.current) {
            return clientRef.current;
        }

        if (!loadPromiseRef.current) {
            loadPromiseRef.current = import('../services/mcp')
                .then((mod) => {
                    attachClient(mod.mcpClient);
                    return mod.mcpClient;
                })
                .catch((error) => {
                    loadPromiseRef.current = null;
                    throw error;
                });
        }

        return loadPromiseRef.current;
    }, [attachClient]);

    useEffect(() => {
        if (!enabled) {
            setTools([]);
            setConnectedCount(0);
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let idleId: number | null = null;
        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const loadClient = () => {
            void ensureClientLoaded().catch((error) => {
                console.warn('Failed to initialize MCP client:', error);
            });
        };

        if (!deferUntilIdle) {
            loadClient();
        } else if (idleWindow.requestIdleCallback) {
            idleId = idleWindow.requestIdleCallback(loadClient, { timeout: 1800 });
        } else {
            timeoutId = setTimeout(loadClient, 400);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (idleId !== null && idleWindow.cancelIdleCallback) {
                idleWindow.cancelIdleCallback(idleId);
            }
        };
    }, [enabled, deferUntilIdle, ensureClientLoaded]);

    useEffect(() => {
        return () => {
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
        };
    }, []);

    /**
     * Get tools formatted for OpenAI API
     */
    const getToolsForAPI = useCallback(() => {
        return clientRef.current?.getToolsForAPI() || [];
    }, []);

    /**
     * Parse tool calls from assistant message content
     * Supports both OpenAI function calling format and XML-style tool calls
     */
    const parseToolCalls = useCallback((content: string): MCPToolCall[] => {
        const toolCalls: MCPToolCall[] = [];

        const xmlPattern = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
        let match;

        while ((match = xmlPattern.exec(content)) !== null) {
            const payload = parseToolCallPayloadFromRaw(match[1]);
            if (!payload) {
                continue;
            }
            const tool = tools.find((t) => t.name === payload.name);
            if (tool) {
                toolCalls.push({
                    id: crypto.randomUUID(),
                    name: payload.name,
                    arguments: payload.args,
                    serverId: tool.serverId,
                });
            }
        }

        const codeBlockPattern = /```(?:tool|function)\s*\n(\{[\s\S]*?\})\s*\n```/g;

        while ((match = codeBlockPattern.exec(content)) !== null) {
            const payload = parseToolCallPayloadFromRaw(match[1]);
            if (!payload) {
                continue;
            }
            const tool = tools.find((t) => t.name === payload.name);
            if (tool) {
                toolCalls.push({
                    id: crypto.randomUUID(),
                    name: payload.name,
                    arguments: payload.args,
                    serverId: tool.serverId,
                });
            }
        }

        return toolCalls;
    }, [tools]);

    /**
     * Execute a tool call and return the result
     */
    const executeTool = useCallback(async (toolCall: MCPToolCall): Promise<MCPToolResult> => {
        setIsExecutingTool(true);
        try {
            const client = await ensureClientLoaded();
            const result = await client.executeTool(toolCall);
            setLastToolResult(result);
            return result;
        } finally {
            setIsExecutingTool(false);
        }
    }, [ensureClientLoaded]);

    /**
     * Execute multiple tool calls in sequence
     */
    const executeToolCalls = useCallback(async (toolCalls: MCPToolCall[]): Promise<MCPToolResult[]> => {
        const results: MCPToolResult[] = [];

        for (const call of toolCalls) {
            const result = await executeTool(call);
            results.push(result);
        }

        return results;
    }, [executeTool]);

    /**
     * Format tool results for including in conversation
     */
    const formatToolResults = useCallback((results: MCPToolResult[]): string => {
        if (results.length === 0) return '';

        return results.map((r) => {
            const status = r.isError ? '❌ Error' : '✅ Success';
            return `<tool_result id="${r.toolCallId}" status="${status}">\n${r.content}\n</tool_result>`;
        }).join('\n\n');
    }, []);

    /**
     * Get a system prompt addition that describes available tools
     */
    const getToolSystemPrompt = useCallback((): string => {
        if (tools.length === 0) return '';

        const toolDescriptions = tools.map((t) => {
            let desc = `- **${t.name}**: ${t.description || 'No description'}`;
            if (t.inputSchema?.properties) {
                const params = Object.entries(t.inputSchema.properties)
                    .map(([name, schema]) => `  - ${name}: ${getSchemaSummary(schema)}`)
                    .join('\n');
                desc += `\n${params}`;
            }
            return desc;
        }).join('\n');

        return `
## Available Tools

You have access to the following tools. To use a tool, wrap your tool call in <tool_call> tags with JSON:

<tool_call>
{"name": "tool_name", "arguments": {"param": "value"}}
</tool_call>

### Tools:
${toolDescriptions}

When you use a tool, wait for the result before continuing. The result will be provided in <tool_result> tags.
`;
    }, [tools]);

    const isAvailable = connectedCount > 0;

    return {
        tools,
        connectedCount,
        isAvailable,
        isExecutingTool,
        lastToolResult,
        getToolsForAPI,
        parseToolCalls,
        executeTool,
        executeToolCalls,
        formatToolResults,
        getToolSystemPrompt,
    };
};

export default useMCP;
