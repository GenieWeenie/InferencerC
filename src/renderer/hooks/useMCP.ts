import { useState, useEffect, useCallback } from 'react';
import { mcpClient, MCPTool, MCPToolCall, MCPToolResult } from '../services/mcp';

/**
 * Hook for integrating MCP tools into the chat experience
 */
export const useMCP = () => {
    const [tools, setTools] = useState<MCPTool[]>([]);
    const [connectedCount, setConnectedCount] = useState(0);
    const [isExecutingTool, setIsExecutingTool] = useState(false);
    const [lastToolResult, setLastToolResult] = useState<MCPToolResult | null>(null);

    // Subscribe to MCP client updates
    useEffect(() => {
        const update = () => {
            setTools(mcpClient.getTools());
            setConnectedCount(mcpClient.getConnectedCount());
        };
        update();
        return mcpClient.subscribe(update);
    }, []);

    /**
     * Get tools formatted for OpenAI API
     */
    const getToolsForAPI = useCallback(() => {
        return mcpClient.getToolsForAPI();
    }, []);

    /**
     * Parse tool calls from assistant message content
     * Supports both OpenAI function calling format and XML-style tool calls
     */
    const parseToolCalls = useCallback((content: string): MCPToolCall[] => {
        const toolCalls: MCPToolCall[] = [];

        // Try to parse XML-style tool calls: <tool_call>{"name": "...", "arguments": {...}}</tool_call>
        const xmlPattern = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
        let match;

        while ((match = xmlPattern.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.name) {
                    const tool = mcpClient.getTools().find(t => t.name === parsed.name);
                    if (tool) {
                        toolCalls.push({
                            id: crypto.randomUUID(),
                            name: parsed.name,
                            arguments: parsed.arguments || {},
                            serverId: tool.serverId
                        });
                    }
                }
            } catch (e) {
                console.warn('Failed to parse tool call:', e);
            }
        }

        // Also try function call format: ```tool\n{"name": "...", ...}\n```
        const codeBlockPattern = /```(?:tool|function)\s*\n(\{[\s\S]*?\})\s*\n```/g;

        while ((match = codeBlockPattern.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.name) {
                    const tool = mcpClient.getTools().find(t => t.name === parsed.name);
                    if (tool) {
                        toolCalls.push({
                            id: crypto.randomUUID(),
                            name: parsed.name,
                            arguments: parsed.arguments || parsed.parameters || {},
                            serverId: tool.serverId
                        });
                    }
                }
            } catch (e) {
                console.warn('Failed to parse tool call from code block:', e);
            }
        }

        return toolCalls;
    }, []);

    /**
     * Execute a tool call and return the result
     */
    const executeTool = useCallback(async (toolCall: MCPToolCall): Promise<MCPToolResult> => {
        setIsExecutingTool(true);
        try {
            const result = await mcpClient.executeTool(toolCall);
            setLastToolResult(result);
            return result;
        } finally {
            setIsExecutingTool(false);
        }
    }, []);

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

        return results.map(r => {
            const status = r.isError ? '❌ Error' : '✅ Success';
            return `<tool_result id="${r.toolCallId}" status="${status}">\n${r.content}\n</tool_result>`;
        }).join('\n\n');
    }, []);

    /**
     * Get a system prompt addition that describes available tools
     */
    const getToolSystemPrompt = useCallback((): string => {
        if (tools.length === 0) return '';

        const toolDescriptions = tools.map(t => {
            let desc = `- **${t.name}**: ${t.description || 'No description'}`;
            if (t.inputSchema?.properties) {
                const params = Object.entries(t.inputSchema.properties)
                    .map(([name, schema]: [string, any]) => `  - ${name}: ${schema.description || schema.type}`)
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

    /**
     * Check if MCP is available (any servers connected)
     */
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
        getToolSystemPrompt
    };
};

export default useMCP;
