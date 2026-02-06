/**
 * API Client Service
 *
 * Centralized API client for making requests to inference servers
 */

export interface APIRequest {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    body?: unknown;
}

export interface APIResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    duration: number;
}

export interface APIError {
    message: string;
    status?: number;
    statusText?: string;
    body?: unknown;
}

export class APIClientService {
    private static instance: APIClientService;

    private constructor() {}

    static getInstance(): APIClientService {
        if (!APIClientService.instance) {
            APIClientService.instance = new APIClientService();
        }
        return APIClientService.instance;
    }

    /**
     * Make an API request
     */
    async makeRequest(request: APIRequest): Promise<APIResponse> {
        const startTime = Date.now();

        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                body: request.body ? JSON.stringify(request.body) : undefined,
            });

            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            let body: unknown;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                body = await response.json();
            } else if (contentType?.includes('text/')) {
                body = await response.text();
            } else {
                body = await response.arrayBuffer();
            }

            const duration = Date.now() - startTime;

            return {
                status: response.status,
                statusText: response.statusText,
                headers,
                body,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            throw {
                message: error instanceof Error ? error.message : 'Unknown error',
                duration,
            } as APIError;
        }
    }

    /**
     * Build chat completion request
     */
    buildChatCompletionRequest(
        modelId: string,
        messages: Array<{ role: string; content: string }>,
        options?: {
            temperature?: number;
            topP?: number;
            maxTokens?: number;
            stream?: boolean;
            responseFormat?: 'text' | 'json_object';
        }
    ): APIRequest {
        const openRouterApiKey = localStorage.getItem('openRouterApiKey');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let url = 'http://localhost:3000/v1/chat/completions';
        let actualModelId = modelId;

        if (modelId.startsWith('openrouter/') && openRouterApiKey) {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            actualModelId = modelId.replace('openrouter/', '');
            headers['Authorization'] = `Bearer ${openRouterApiKey}`;
            headers['HTTP-Referer'] = 'http://localhost:5173';
            headers['X-Title'] = 'WinInferencer';
        }

        const body: Record<string, unknown> = {
            model: actualModelId,
            messages,
            ...(options?.temperature !== undefined && { temperature: options.temperature }),
            ...(options?.topP !== undefined && { top_p: options.topP }),
            ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
            ...(options?.stream !== undefined && { stream: options.stream }),
            ...(options?.responseFormat === 'json_object' && { response_format: { type: 'json_object' } }),
        };

        return {
            url,
            method: 'POST',
            headers,
            body,
        };
    }

    /**
     * Test API connection
     */
    async testConnection(url: string, apiKey?: string): Promise<{ success: boolean; error?: string }> {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            return {
                success: response.ok,
                error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }
}

export const apiClientService = APIClientService.getInstance();
