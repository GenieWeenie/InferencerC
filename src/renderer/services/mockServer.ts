/**
 * Mock Server Service
 *
 * Built-in mock server for testing API requests
 */

export interface MockEndpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    response: MockResponse;
    enabled: boolean;
    delay?: number; // Response delay in ms
    statusCode?: number;
    createdAt: number;
}

export interface MockResponse {
    status: number;
    headers?: Record<string, string>;
    body: unknown;
}

export interface MockRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
}

export interface MockMatch {
    endpoint: MockEndpoint;
    matched: boolean;
    params?: Record<string, string>;
}

const HTTP_METHODS = new Set<MockEndpoint['method']>(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

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

export class MockServerService {
    private static instance: MockServerService;
    private readonly STORAGE_KEY = 'mock_endpoints';
    private isEnabled = false;
    private interceptors: Array<(request: MockRequest) => Promise<MockResponse | null>> = [];

    private constructor() {
        this.loadMockEndpoints();
    }

    private sanitizeResponse(value: unknown): MockResponse | null {
        if (!isRecord(value) || typeof value.status !== 'number' || !Number.isFinite(value.status)) {
            return null;
        }
        const headers = isRecord(value.headers)
            ? Object.fromEntries(
                Object.entries(value.headers).filter(([, headerValue]) => typeof headerValue === 'string')
            )
            : undefined;
        return {
            status: value.status,
            headers: headers && Object.keys(headers).length > 0 ? headers : undefined,
            body: value.body,
        };
    }

    private sanitizeEndpoint(value: unknown): MockEndpoint | null {
        if (!isRecord(value)) {
            return null;
        }
        if (
            typeof value.id !== 'string'
            || !HTTP_METHODS.has(value.method as MockEndpoint['method'])
            || typeof value.path !== 'string'
            || typeof value.enabled !== 'boolean'
            || typeof value.createdAt !== 'number'
            || !Number.isFinite(value.createdAt)
        ) {
            return null;
        }
        const response = this.sanitizeResponse(value.response);
        if (!response) {
            return null;
        }
        return {
            id: value.id,
            method: value.method as MockEndpoint['method'],
            path: value.path,
            response,
            enabled: value.enabled,
            delay: typeof value.delay === 'number' && Number.isFinite(value.delay) ? value.delay : undefined,
            statusCode: typeof value.statusCode === 'number' && Number.isFinite(value.statusCode) ? value.statusCode : undefined,
            createdAt: value.createdAt,
        };
    }

    private parseStoredEndpoints(raw: string): MockEndpoint[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const endpoints: MockEndpoint[] = [];
        for (let index = 0; index < parsed.length; index++) {
            const endpoint = this.sanitizeEndpoint(parsed[index]);
            if (endpoint) {
                endpoints.push(endpoint);
            }
        }
        return endpoints;
    }

    static getInstance(): MockServerService {
        if (!MockServerService.instance) {
            MockServerService.instance = new MockServerService();
        }
        return MockServerService.instance;
    }

    /**
     * Enable/disable mock server
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        localStorage.setItem('mock_server_enabled', String(enabled));
    }

    /**
     * Check if mock server is enabled
     */
    isMockServerEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Create a mock endpoint
     */
    createEndpoint(endpoint: Omit<MockEndpoint, 'id' | 'createdAt'>): MockEndpoint {
        const newEndpoint: MockEndpoint = {
            ...endpoint,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };

        this.saveEndpoint(newEndpoint);
        return newEndpoint;
    }

    /**
     * Get all endpoints
     */
    getAllEndpoints(): MockEndpoint[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return this.parseStoredEndpoints(stored);
        } catch (error) {
            console.error('Failed to load mock endpoints:', error);
            return [];
        }
    }

    /**
     * Get an endpoint by ID
     */
    getEndpoint(id: string): MockEndpoint | null {
        const endpoints = this.getAllEndpoints();
        return endpoints.find(e => e.id === id) || null;
    }

    /**
     * Update an endpoint
     */
    updateEndpoint(id: string, updates: Partial<MockEndpoint>): boolean {
        const endpoint = this.getEndpoint(id);
        if (!endpoint) return false;

        const updated = this.sanitizeEndpoint({ ...endpoint, ...updates });
        if (!updated) {
            return false;
        }
        this.saveEndpoint(updated);
        return true;
    }

    /**
     * Delete an endpoint
     */
    deleteEndpoint(id: string): boolean {
        const endpoints = this.getAllEndpoints();
        const filtered = endpoints.filter(e => e.id !== id);
        if (filtered.length === endpoints.length) return false;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Match a request to an endpoint
     */
    matchRequest(request: MockRequest): MockMatch | null {
        if (!this.isEnabled) return null;

        const endpoints = this.getAllEndpoints()
            .filter(e => e.enabled && e.method === request.method);

        for (const endpoint of endpoints) {
            const match = this.matchPath(endpoint.path, request.url);
            if (match) {
                return {
                    endpoint,
                    matched: true,
                    params: match.params,
                };
            }
        }

        return null;
    }

    /**
     * Match URL path pattern
     */
    private matchPath(pattern: string, url: string): { params: Record<string, string> } | null {
        // Simple pattern matching with :param support
        const patternParts = pattern.split('/');
        const urlParts = new URL(url).pathname.split('/').filter(p => p);

        if (patternParts.length !== urlParts.length) {
            return null;
        }

        const params: Record<string, string> = {};

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const urlPart = urlParts[i];

            if (patternPart.startsWith(':')) {
                // Parameter
                const paramName = patternPart.slice(1);
                params[paramName] = urlPart;
            } else if (patternPart !== urlPart) {
                // Exact match required
                return null;
            }
        }

        return { params };
    }

    /**
     * Get mock response for a request
     */
    async getMockResponse(request: MockRequest): Promise<MockResponse | null> {
        const match = this.matchRequest(request);
        if (!match) return null;

        const { endpoint } = match;

        // Apply delay if specified
        if (endpoint.delay) {
            await new Promise(resolve => setTimeout(resolve, endpoint.delay));
        }

        // Process response body (could support template variables)
        let body = endpoint.response.body;
        if (match.params && typeof body === 'string') {
            // Replace :param in response body
            Object.entries(match.params).forEach(([key, value]) => {
                body = (body as string).replace(new RegExp(`:${key}`, 'g'), value);
            });
        }

        return {
            status: endpoint.statusCode || endpoint.response.status,
            headers: endpoint.response.headers || { 'Content-Type': 'application/json' },
            body,
        };
    }

    /**
     * Save an endpoint
     */
    private saveEndpoint(endpoint: MockEndpoint): void {
        const endpoints = this.getAllEndpoints();
        const index = endpoints.findIndex(e => e.id === endpoint.id);
        if (index >= 0) {
            endpoints[index] = endpoint;
        } else {
            endpoints.push(endpoint);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(endpoints));
    }

    /**
     * Load mock endpoints
     */
    private loadMockEndpoints(): void {
        const stored = localStorage.getItem('mock_server_enabled');
        if (stored) {
            this.isEnabled = stored === 'true';
        }
    }

    /**
     * Create a preset mock endpoint
     */
    createPresetEndpoint(preset: 'chat-completion' | 'error' | 'success'): MockEndpoint {
        const presets: Record<string, Omit<MockEndpoint, 'id' | 'createdAt'>> = {
            'chat-completion': {
                method: 'POST',
                path: '/v1/chat/completions',
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: {
                        id: 'chatcmpl-mock',
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: 'mock-model',
                        choices: [{
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: 'This is a mock response from the mock server.',
                            },
                            finish_reason: 'stop',
                        }],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 20,
                            total_tokens: 30,
                        },
                    },
                },
                enabled: true,
                statusCode: 200,
            },
            'error': {
                method: 'POST',
                path: '/v1/error',
                response: {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: {
                        error: {
                            message: 'Mock error response',
                            type: 'mock_error',
                        },
                    },
                },
                enabled: true,
                statusCode: 500,
            },
            'success': {
                method: 'GET',
                path: '/v1/success',
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: {
                        success: true,
                        message: 'Mock success response',
                    },
                },
                enabled: true,
                statusCode: 200,
            },
        };

        return this.createEndpoint(presets[preset]);
    }

    /**
     * Export endpoints as JSON
     */
    exportEndpoints(): string {
        return JSON.stringify(this.getAllEndpoints(), null, 2);
    }

    /**
     * Import endpoints from JSON
     */
    importEndpoints(json: string): { success: boolean; count: number; error?: string } {
        const parsed = parseJson(json);
        if (!Array.isArray(parsed)) {
            return {
                success: false,
                count: 0,
                error: 'Invalid JSON',
            };
        }

        let importedCount = 0;
        parsed.forEach((entry) => {
            const endpoint = this.sanitizeEndpoint(entry);
            if (!endpoint) {
                return;
            }
            this.saveEndpoint(endpoint);
            importedCount += 1;
        });
        return { success: true, count: importedCount };
    }
}

export const mockServerService = MockServerService.getInstance();
