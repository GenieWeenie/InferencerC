import {
    buildChatCompletionRequest,
    mapChatRequestErrorMessage,
    type ToolDefinition,
} from '../src/renderer/lib/chatStreamingRequest';

const baseParams = {
    modelId: 'local-model',
    openRouterApiKey: null as string | null,
    messages: [{ role: 'user', content: 'Hello' }],
    temperature: 0.7,
    topP: 1,
    maxTokens: 2048,
    batchSize: 1,
    streamingEnabled: true,
    responseFormat: 'text' as const,
    enabledTools: new Set<string>(),
    availableTools: [] as readonly ToolDefinition[],
};

// ---------------------------------------------------------------------------
// buildChatCompletionRequest
// ---------------------------------------------------------------------------

describe('buildChatCompletionRequest', () => {
    describe('default (local model)', () => {
        it('uses localhost URL and no Authorization header', () => {
            const result = buildChatCompletionRequest(baseParams);
            expect(result.url).toBe('http://localhost:3000/v1/chat/completions');
            expect(result.headers.Authorization).toBeUndefined();
            expect(result.actualModelId).toBe('local-model');
        });
    });

    describe('OpenRouter model', () => {
        it('uses OpenRouter URL, Authorization header, and strips openrouter/ prefix', () => {
            const result = buildChatCompletionRequest({
                ...baseParams,
                modelId: 'openrouter/gpt-4',
                openRouterApiKey: 'sk-test-key',
            });
            expect(result.url).toBe('https://openrouter.ai/api/v1/chat/completions');
            expect(result.headers.Authorization).toBe('Bearer sk-test-key');
            expect(result.headers['HTTP-Referer']).toBe('http://localhost:5173');
            expect(result.headers['X-Title']).toBe('WinInferencer');
            expect(result.actualModelId).toBe('gpt-4');
        });
    });

    describe('response format json_object', () => {
        it('adds response_format to body and appends JSON instruction when system message lacks "json"', () => {
            const result = buildChatCompletionRequest({
                ...baseParams,
                responseFormat: 'json_object',
                messages: [
                    { role: 'system', content: 'You are helpful.' },
                    { role: 'user', content: 'Hi' },
                ],
            });
            expect(result.requestBody.response_format).toEqual({ type: 'json_object' });
            const systemMsg = (result.requestBody.messages as { role: string; content: string }[]).find(
                (m) => m.role === 'system'
            );
            expect(systemMsg?.content).toContain('You are helpful.');
            expect(systemMsg?.content).toContain('You are a helpful assistant designed to output JSON.');
        });

        it('does not duplicate when system message already contains "json"', () => {
            const result = buildChatCompletionRequest({
                ...baseParams,
                responseFormat: 'json_object',
                messages: [
                    { role: 'system', content: 'Output valid JSON only.' },
                    { role: 'user', content: 'Hi' },
                ],
            });
            const systemMsg = (result.requestBody.messages as { role: string; content: string }[]).find(
                (m) => m.role === 'system'
            );
            expect(systemMsg?.content).toBe('Output valid JSON only.');
        });
    });

    describe('enabled tools', () => {
        it('adds tools and tool_choice to body when tools are enabled', () => {
            const tools: ToolDefinition[] = [
                { name: 'get_weather', description: 'Get weather', parameters: {} },
            ];
            const result = buildChatCompletionRequest({
                ...baseParams,
                enabledTools: new Set(['get_weather']),
                availableTools: tools,
            });
            expect(result.requestBody.tools).toEqual([
                {
                    type: 'function',
                    function: {
                        name: 'get_weather',
                        description: 'Get weather',
                        parameters: {},
                    },
                },
            ]);
            expect(result.requestBody.tool_choice).toBe('auto');
        });

        it('omits tools field when no tools are enabled', () => {
            const tools: ToolDefinition[] = [
                { name: 'get_weather', description: 'Get weather', parameters: {} },
            ];
            const result = buildChatCompletionRequest({
                ...baseParams,
                enabledTools: new Set(),
                availableTools: tools,
            });
            expect(result.requestBody.tools).toBeUndefined();
            expect(result.requestBody.tool_choice).toBeUndefined();
        });
    });
});

// ---------------------------------------------------------------------------
// mapChatRequestErrorMessage
// ---------------------------------------------------------------------------

describe('mapChatRequestErrorMessage', () => {
    it('returns OpenRouter connection error for Failed to fetch with openrouter model', () => {
        expect(
            mapChatRequestErrorMessage('openrouter/gpt-4', 'Failed to fetch')
        ).toBe('Connection error. Check your internet or OpenRouter API key.');
    });

    it('returns LM Studio connection error for Failed to fetch with local model', () => {
        expect(
            mapChatRequestErrorMessage('local-model', 'Failed to fetch')
        ).toBe("Could not connect to LM Studio. Make sure it's running on port 3000.");
    });

    it('returns rate limit message for 429', () => {
        expect(
            mapChatRequestErrorMessage('any-model', 'Error 429: Too Many Requests')
        ).toBe('Rate limit exceeded (429). Please wait a moment.');
    });

    it('returns unauthorized message for 401', () => {
        expect(
            mapChatRequestErrorMessage('any-model', '401 Unauthorized')
        ).toBe('Unauthorized (401). Check your API key.');
    });

    it('returns model not found with modelId for 404', () => {
        expect(
            mapChatRequestErrorMessage('openrouter/gpt-4', '404 Not Found')
        ).toBe('Model not found (404): openrouter/gpt-4');
    });

    it('returns original message for other errors', () => {
        const msg = 'Some other error occurred';
        expect(mapChatRequestErrorMessage('any-model', msg)).toBe(msg);
    });
});
