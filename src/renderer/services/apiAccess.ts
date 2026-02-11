/**
 * API Access Service
 *
 * Provides REST API access to conversations for programmatic access
 * Note: This service manages API configuration. The actual server
 * would be implemented in the main process.
 */

export interface APIConfig {
    enabled: boolean;
    port: number; // Default: 3001 (to avoid conflict with chat server on 3000)
    apiKey?: string; // Optional API key for authentication
    allowedOrigins?: string[]; // CORS allowed origins
    rateLimit?: {
        requestsPerMinute: number;
    };
}

export interface APIEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    description: string;
}

export interface APIStatus {
    enabled: boolean;
    port: number;
    baseUrl: string;
    endpoints: APIEndpoint[];
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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    const normalized: string[] = [];
    value.forEach((entry) => {
        const stringValue = sanitizeNonEmptyString(entry);
        if (!stringValue || seen.has(stringValue)) {
            return;
        }
        seen.add(stringValue);
        normalized.push(stringValue);
    });
    return normalized;
};

class APIAccessService {
    private config: APIConfig | null = null;
    private readonly STORAGE_KEY = 'api_access_config';
    private readonly DEFAULT_PORT = 3001;

    constructor() {
        this.loadConfig();
    }

    private getDefaultConfig(): APIConfig {
        return {
            enabled: false,
            port: this.DEFAULT_PORT,
            rateLimit: {
                requestsPerMinute: 60,
            },
        };
    }

    private sanitizeConfig(value: unknown): APIConfig | null {
        if (!isRecord(value)) {
            return null;
        }

        const defaultConfig = this.getDefaultConfig();
        const portCandidate = typeof value.port === 'number' ? value.port : Number(value.port);
        const normalizedPort = Number.isFinite(portCandidate)
            ? Math.max(1, Math.min(65535, Math.round(portCandidate)))
            : defaultConfig.port;

        const allowedOrigins = sanitizeStringArray(value.allowedOrigins);
        const rateLimitValue = isRecord(value.rateLimit)
            ? (typeof value.rateLimit.requestsPerMinute === 'number'
                ? value.rateLimit.requestsPerMinute
                : Number(value.rateLimit.requestsPerMinute))
            : null;
        const rateLimit = rateLimitValue !== null && Number.isFinite(rateLimitValue)
            ? { requestsPerMinute: Math.max(1, Math.round(rateLimitValue)) }
            : defaultConfig.rateLimit;

        return {
            enabled: typeof value.enabled === 'boolean' ? value.enabled : defaultConfig.enabled,
            port: normalizedPort,
            apiKey: sanitizeNonEmptyString(value.apiKey) || undefined,
            allowedOrigins: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : undefined,
            rateLimit,
        };
    }

    /**
     * Load configuration from localStorage
     */
    private loadConfig(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = parseJson(stored);
                this.config = this.sanitizeConfig(parsed) || this.getDefaultConfig();
            } else {
                this.config = this.getDefaultConfig();
            }
        } catch (error) {
            console.error('Failed to load API config:', error);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Save configuration to localStorage
     */
    private saveConfig(): void {
        try {
            if (this.config) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to save API config:', error);
        }
    }

    /**
     * Set configuration
     */
    setConfig(config: Partial<APIConfig>): void {
        const merged = {
            ...(this.config || this.getDefaultConfig()),
            ...config,
        };
        this.config = this.sanitizeConfig(merged) || this.getDefaultConfig();
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    getConfig(): APIConfig {
        return this.config || this.getDefaultConfig();
    }

    /**
     * Check if API is enabled
     */
    isEnabled(): boolean {
        return this.config?.enabled === true;
    }

    /**
     * Get API status and available endpoints
     */
    getStatus(): APIStatus {
        const config = this.getConfig();
        const baseUrl = `http://localhost:${config.port}/api`;

        return {
            enabled: config.enabled || false,
            port: config.port || this.DEFAULT_PORT,
            baseUrl,
            endpoints: [
                {
                    path: '/conversations',
                    method: 'GET',
                    description: 'List all conversations',
                },
                {
                    path: '/conversations/:id',
                    method: 'GET',
                    description: 'Get a specific conversation',
                },
                {
                    path: '/conversations',
                    method: 'POST',
                    description: 'Create a new conversation',
                },
                {
                    path: '/conversations/:id',
                    method: 'PUT',
                    description: 'Update a conversation',
                },
                {
                    path: '/conversations/:id',
                    method: 'DELETE',
                    description: 'Delete a conversation',
                },
                {
                    path: '/conversations/:id/messages',
                    method: 'GET',
                    description: 'Get messages from a conversation',
                },
                {
                    path: '/conversations/:id/messages',
                    method: 'POST',
                    description: 'Add a message to a conversation',
                },
                {
                    path: '/health',
                    method: 'GET',
                    description: 'Health check endpoint',
                },
            ],
        };
    }

    /**
     * Generate API documentation
     */
    generateAPIDocs(): string {
        const status = this.getStatus();
        const config = this.getConfig();

        const docs = `# InferencerC REST API Documentation

## Base URL
\`${status.baseUrl}\`

${config.apiKey ? `## Authentication
All requests require an API key in the Authorization header:
\`Authorization: Bearer ${config.apiKey}\`
` : ''}

## Endpoints

${status.endpoints.map(endpoint => `
### ${endpoint.method} ${endpoint.path}
${endpoint.description}

**Example Request:**
\`\`\`bash
curl -X ${endpoint.method} ${status.baseUrl}${endpoint.path}${config.apiKey ? ' \\\n  -H "Authorization: Bearer YOUR_API_KEY"' : ''}
\`\`\`
`).join('\n')}

## Rate Limiting
${config.rateLimit ? `Rate limit: ${config.rateLimit.requestsPerMinute} requests per minute` : 'No rate limiting configured'}

## Response Format
All responses are in JSON format:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "error": null
}
\`\`\`
`;

        return docs;
    }

    /**
     * Export API configuration for server setup
     */
    exportConfig(): string {
        return JSON.stringify(this.getConfig(), null, 2);
    }
}

export const apiAccessService = new APIAccessService();
