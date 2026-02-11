import type { ChatRequestMessage } from './chatRequestMessageTypes';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

interface BuildChatCompletionRequestParams {
    modelId: string;
    openRouterApiKey: string | null;
    messages: ChatRequestMessage[];
    temperature: number;
    topP: number;
    maxTokens: number;
    batchSize: number;
    streamingEnabled: boolean;
    responseFormat: 'text' | 'json_object';
    enabledTools: Set<string>;
    availableTools: readonly ToolDefinition[];
}

export const buildChatCompletionRequest = ({
    modelId,
    openRouterApiKey,
    messages,
    temperature,
    topP,
    maxTokens,
    batchSize,
    streamingEnabled,
    responseFormat,
    enabledTools,
    availableTools,
}: BuildChatCompletionRequestParams) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let url = 'http://localhost:3000/v1/chat/completions';
    let actualModelId = modelId;

    if (modelId.startsWith('openrouter/') && openRouterApiKey) {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        actualModelId = modelId.replace('openrouter/', '');
        headers.Authorization = `Bearer ${openRouterApiKey}`;
        headers['HTTP-Referer'] = 'http://localhost:5173';
        headers['X-Title'] = 'WinInferencer';
    }

    const requestMessages: ChatRequestMessage[] = messages.map((message) => ({ ...message }));

    const requestBody: Record<string, unknown> = {
        model: actualModelId,
        messages: requestMessages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        n: batchSize,
        stream: streamingEnabled,
        response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    };

    if (responseFormat === 'json_object') {
        const systemMessage = requestMessages.find(
            (message) => message.role === 'system' && typeof message.content === 'string'
        );
        if (systemMessage && !systemMessage.content.toLowerCase().includes('json')) {
            systemMessage.content += ' You are a helpful assistant designed to output JSON.';
        }
    }

    const activeTools = availableTools
        .filter((tool) => enabledTools.has(tool.name))
        .map((tool) => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));

    if (activeTools.length > 0) {
        requestBody.tools = activeTools;
        requestBody.tool_choice = 'auto';
    }

    return {
        url,
        headers,
        actualModelId,
        requestBody,
    };
};

export const mapChatRequestErrorMessage = (modelId: string, errorMessage: string): string => {
    if (errorMessage.includes('Failed to fetch')) {
        if (modelId.startsWith('openrouter/')) {
            return 'Connection error. Check your internet or OpenRouter API key.';
        }
        return "Could not connect to LM Studio. Make sure it's running on port 3000.";
    }

    if (errorMessage.includes('429')) {
        return 'Rate limit exceeded (429). Please wait a moment.';
    }

    if (errorMessage.includes('401')) {
        return 'Unauthorized (401). Check your API key.';
    }

    if (errorMessage.includes('404')) {
        return `Model not found (404): ${modelId}`;
    }

    return errorMessage;
};
