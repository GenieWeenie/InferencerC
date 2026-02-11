import React from 'react';
import { toast } from 'sonner';
import { loadApiClientService } from '../lib/chatLazyServices';

interface ModelLike {
    id: string;
}

interface McpToolLike {
    name: string;
    serverId?: string;
    inputSchema?: {
        properties?: Record<string, unknown>;
    };
}

interface UseChatExternalActionsParams {
    availableModels: ModelLike[];
    currentModel: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    appendMessage: (message: { role: string; content: string }) => void;
    githubUrl: string;
    setGithubUrl: React.Dispatch<React.SetStateAction<string>>;
    mcpAvailable: boolean;
    mcpTools: McpToolLike[];
    executeMcpTool: (payload: {
        id: string;
        name: string;
        arguments: Record<string, unknown>;
        serverId?: string;
    }) => Promise<{ isError: boolean; content: string }>;
}

export interface ChatCompletionParams {
    prompt: string;
    systemPrompt?: string;
    modelId?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
}

interface ChatCompletionResponseBody {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
    usage?: {
        total_tokens?: number;
    };
}

const parseChatCompletionBody = (body: unknown): ChatCompletionResponseBody | null => {
    if (!body || typeof body !== 'object') {
        return null;
    }
    return body as ChatCompletionResponseBody;
};

export const useChatExternalActions = ({
    availableModels,
    currentModel,
    temperature,
    topP,
    maxTokens,
    appendMessage,
    githubUrl,
    setGithubUrl,
    mcpAvailable,
    mcpTools,
    executeMcpTool,
}: UseChatExternalActionsParams) => {
    const [isFetchingGithub, setIsFetchingGithub] = React.useState(false);

    const executeChatCompletion = React.useCallback(async (params: ChatCompletionParams): Promise<{ content: string; tokensUsed?: number }> => {
        const testMessages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (params.systemPrompt) {
            testMessages.push({ role: 'system', content: params.systemPrompt });
        }
        testMessages.push({ role: 'user', content: params.prompt });

        const selectedModelId = params.modelId || currentModel || availableModels[0]?.id;
        if (!selectedModelId) {
            throw new Error('No model selected');
        }

        const selectedTemperature = params.temperature ?? temperature;
        const selectedTopP = params.topP ?? topP;
        const selectedMaxTokens = params.maxTokens ?? maxTokens;
        const apiClientService = await loadApiClientService();

        const request = await apiClientService.buildChatCompletionRequest(
            selectedModelId,
            testMessages,
            {
                temperature: selectedTemperature,
                topP: selectedTopP,
                maxTokens: selectedMaxTokens,
                stream: false,
            }
        );
        const response = await apiClientService.makeRequest(request);

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`API error (${response.status}): ${response.statusText}`);
        }

        const data = parseChatCompletionBody(response.body);
        const content = data?.choices?.[0]?.message?.content || '';
        const tokensUsed = data?.usage?.total_tokens;

        return { content, tokensUsed };
    }, [availableModels, currentModel, maxTokens, temperature, topP]);

    const executeGithubFetch = React.useCallback(async () => {
        if (!githubUrl.trim()) return;

        setIsFetchingGithub(true);
        try {
            const { githubService } = await import('../services/github');
            const parsed = githubService.parseGitHubUrl(githubUrl.trim());
            if (!parsed) {
                toast.error('Invalid GitHub URL. Use format: owner/repo/path or full GitHub URL');
                return;
            }

            const result = await githubService.fetchFileContent(
                parsed.owner,
                parsed.repo,
                parsed.path,
                parsed.ref
            );

            if (result.success && result.content) {
                const content = `[CONTEXT FROM GITHUB: ${parsed.owner} /${parsed.repo}/${parsed.path}]\n\n\`\`\`${parsed.path.split('.').pop() || 'text'}\n${result.content}\n\`\`\``;
                appendMessage({ role: 'user', content });
                toast.success('GitHub file added to conversation context.');
                setGithubUrl('');
            } else {
                toast.error(result.error || 'Failed to fetch file');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to fetch from GitHub';
            toast.error(message);
        } finally {
            setIsFetchingGithub(false);
        }
    }, [appendMessage, githubUrl, setGithubUrl]);

    const handleInsertToFile = React.useCallback(async (code: string, language: string, filePath: string) => {
        if (!mcpAvailable || mcpTools.length === 0) {
            toast.error('No connected MCP tools available for file writing');
            return;
        }

        const writeTool = mcpTools.find((tool) => {
            const name = tool.name.toLowerCase();
            if (!name.includes('write')) return false;
            if (!name.includes('file') && !name.includes('document')) return false;

            const props = tool.inputSchema?.properties || {};
            return (
                Object.prototype.hasOwnProperty.call(props, 'path') ||
                Object.prototype.hasOwnProperty.call(props, 'filePath') ||
                Object.prototype.hasOwnProperty.call(props, 'filepath') ||
                Object.prototype.hasOwnProperty.call(props, 'uri')
            );
        });

        if (!writeTool) {
            toast.error('No MCP write_file-compatible tool found');
            return;
        }

        const props = writeTool.inputSchema?.properties || {};
        const hasProp = (key: string) => Object.prototype.hasOwnProperty.call(props, key);
        const args: Record<string, unknown> = {};

        if (hasProp('path')) args.path = filePath;
        else if (hasProp('filePath')) args.filePath = filePath;
        else if (hasProp('filepath')) args.filepath = filePath;
        else if (hasProp('uri')) args.uri = filePath;

        if (hasProp('content')) args.content = code;
        else if (hasProp('text')) args.text = code;
        else args.content = code;

        if (hasProp('language')) args.language = language;
        if (hasProp('append')) args.append = false;

        const result = await executeMcpTool({
            id: crypto.randomUUID(),
            name: writeTool.name,
            arguments: args,
            serverId: writeTool.serverId,
        });

        if (result.isError) {
            toast.error(`MCP write failed: ${result.content}`);
            return;
        }

        toast.success(`Inserted code into ${filePath}`);
    }, [executeMcpTool, mcpAvailable, mcpTools]);

    return {
        isFetchingGithub,
        executeGithubFetch,
        executeChatCompletion,
        handleInsertToFile,
    };
};
