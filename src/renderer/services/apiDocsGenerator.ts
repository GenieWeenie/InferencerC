/**
 * API Documentation Generator Service
 *
 * Auto-generate API docs from conversations
 */

import { ChatMessage } from '../../shared/types';
import { HistoryService } from './history';

export interface APIDocumentation {
    id: string;
    sessionId: string;
    title: string;
    description: string;
    endpoints: APIEndpoint[];
    models: APIModel[];
    examples: APIExample[];
    generatedAt: number;
}

export interface APIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    description: string;
    parameters?: APIParameter[];
    requestBody?: APIRequestBody;
    responses: APIResponse[];
    examples?: APIExample[];
}

export interface APIParameter {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: unknown;
}

export interface APIRequestBody {
    contentType: string;
    schema: Record<string, unknown>;
    example?: unknown;
}

export interface APIResponse {
    statusCode: number;
    description: string;
    schema?: Record<string, unknown>;
    example?: unknown;
}

export interface APIModel {
    name: string;
    description: string;
    properties: Record<string, { type: string; description: string }>;
}

export interface APIExample {
    title: string;
    request: { method: string; url: string; headers?: Record<string, string>; body?: unknown };
    response: { status: number; body: unknown };
}

interface OpenAPIResponseContent {
    description: string;
    content?: {
        'application/json': {
            schema?: Record<string, unknown>;
            example?: unknown;
        };
    };
}

interface OpenAPIOperation {
    summary: string;
    parameters?: Array<{
        name: string;
        in: 'query';
        required: boolean;
        schema: { type: string };
        description: string;
    }>;
    requestBody?: {
        content: Record<string, { schema: Record<string, unknown>; example?: unknown }>;
    };
    responses: Record<string, OpenAPIResponseContent>;
}

interface OpenAPIModelSchema {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
}

interface OpenAPIDocument {
    openapi: '3.0.0';
    info: {
        title: string;
        description: string;
        version: string;
    };
    paths: Record<string, Record<string, OpenAPIOperation>>;
    components: {
        schemas: Record<string, OpenAPIModelSchema>;
    };
}

const HTTP_METHODS = new Set<APIEndpoint['method']>(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeParameter = (value: unknown): APIParameter | null => {
    if (!isRecord(value)
        || typeof value.name !== 'string'
        || typeof value.type !== 'string'
        || typeof value.required !== 'boolean'
        || typeof value.description !== 'string') {
        return null;
    }

    const name = value.name.trim();
    const type = value.type.trim();
    if (!name || !type) {
        return null;
    }

    return {
        name,
        type,
        required: value.required,
        description: value.description.trim(),
        example: value.example,
    };
};

const sanitizeRequestBody = (value: unknown): APIRequestBody | undefined => {
    if (!isRecord(value)
        || typeof value.contentType !== 'string'
        || !isRecord(value.schema)) {
        return undefined;
    }

    const contentType = value.contentType.trim();
    if (!contentType) {
        return undefined;
    }

    return {
        contentType,
        schema: { ...value.schema },
        example: value.example,
    };
};

const sanitizeResponse = (value: unknown): APIResponse | null => {
    if (!isRecord(value)
        || !isFiniteNumber(value.statusCode)
        || typeof value.description !== 'string') {
        return null;
    }

    const statusCode = Math.floor(value.statusCode);
    if (statusCode < 100 || statusCode > 599) {
        return null;
    }

    return {
        statusCode,
        description: value.description.trim(),
        schema: isRecord(value.schema) ? { ...value.schema } : undefined,
        example: value.example,
    };
};

const sanitizeModel = (value: unknown): APIModel | null => {
    if (!isRecord(value)
        || typeof value.name !== 'string'
        || typeof value.description !== 'string'
        || !isRecord(value.properties)) {
        return null;
    }

    const name = value.name.trim();
    if (!name) {
        return null;
    }

    const properties: Record<string, { type: string; description: string }> = {};
    Object.entries(value.properties).forEach(([key, propertyValue]) => {
        if (!isRecord(propertyValue)
            || typeof propertyValue.type !== 'string'
            || typeof propertyValue.description !== 'string') {
            return;
        }
        const propertyName = key.trim();
        const propertyType = propertyValue.type.trim();
        if (!propertyName || !propertyType) {
            return;
        }
        properties[propertyName] = {
            type: propertyType,
            description: propertyValue.description.trim(),
        };
    });

    return {
        name,
        description: value.description.trim(),
        properties,
    };
};

const sanitizeExample = (value: unknown): APIExample | null => {
    if (!isRecord(value)
        || typeof value.title !== 'string'
        || !isRecord(value.request)
        || !isRecord(value.response)
        || typeof value.request.method !== 'string'
        || typeof value.request.url !== 'string'
        || !isFiniteNumber(value.response.status)) {
        return null;
    }

    const title = value.title.trim();
    const method = value.request.method.trim();
    const url = value.request.url.trim();
    const status = Math.floor(value.response.status);
    if (!title || !method || !url || status < 100 || status > 599) {
        return null;
    }

    let headers: Record<string, string> | undefined;
    if (isRecord(value.request.headers)) {
        headers = {};
        Object.entries(value.request.headers).forEach(([header, headerValue]) => {
            if (typeof headerValue === 'string') {
                headers![header] = headerValue;
            }
        });
    }

    return {
        title,
        request: {
            method,
            url,
            headers,
            body: value.request.body,
        },
        response: {
            status,
            body: value.response.body,
        },
    };
};

const sanitizeEndpoint = (value: unknown): APIEndpoint | null => {
    if (!isRecord(value)
        || typeof value.method !== 'string'
        || typeof value.path !== 'string'
        || typeof value.description !== 'string'
        || !Array.isArray(value.responses)) {
        return null;
    }

    const method = value.method.toUpperCase();
    if (!HTTP_METHODS.has(method as APIEndpoint['method'])) {
        return null;
    }

    const path = value.path.trim();
    if (!path || !path.startsWith('/')) {
        return null;
    }

    const responses = value.responses
        .map((entry) => sanitizeResponse(entry))
        .filter((entry): entry is APIResponse => entry !== null);
    if (responses.length === 0) {
        return null;
    }

    const parameters = Array.isArray(value.parameters)
        ? value.parameters
            .map((entry) => sanitizeParameter(entry))
            .filter((entry): entry is APIParameter => entry !== null)
        : undefined;
    const examples = Array.isArray(value.examples)
        ? value.examples
            .map((entry) => sanitizeExample(entry))
            .filter((entry): entry is APIExample => entry !== null)
        : undefined;

    return {
        method: method as APIEndpoint['method'],
        path,
        description: value.description.trim(),
        parameters: parameters && parameters.length > 0 ? parameters : undefined,
        requestBody: sanitizeRequestBody(value.requestBody),
        responses,
        examples: examples && examples.length > 0 ? examples : undefined,
    };
};

const sanitizeDocumentationPayload = (
    value: unknown,
    fallbackTitle: string
): Omit<APIDocumentation, 'id' | 'sessionId' | 'generatedAt'> | null => {
    if (!isRecord(value)) {
        return null;
    }

    const title = typeof value.title === 'string' && value.title.trim()
        ? value.title.trim()
        : fallbackTitle;

    const endpoints = Array.isArray(value.endpoints)
        ? value.endpoints
            .map((entry) => sanitizeEndpoint(entry))
            .filter((entry): entry is APIEndpoint => entry !== null)
        : [];
    const models = Array.isArray(value.models)
        ? value.models
            .map((entry) => sanitizeModel(entry))
            .filter((entry): entry is APIModel => entry !== null)
        : [];
    const examples = Array.isArray(value.examples)
        ? value.examples
            .map((entry) => sanitizeExample(entry))
            .filter((entry): entry is APIExample => entry !== null)
        : [];

    return {
        title,
        description: typeof value.description === 'string' ? value.description.trim() : '',
        endpoints,
        models,
        examples,
    };
};

const sanitizeStoredDocumentation = (value: unknown): APIDocumentation | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.sessionId !== 'string'
        || !isFiniteNumber(value.generatedAt)) {
        return null;
    }

    const payload = sanitizeDocumentationPayload(value, '');
    if (!payload || !payload.title) {
        return null;
    }

    const id = value.id.trim();
    const sessionId = value.sessionId.trim();
    if (!id || !sessionId) {
        return null;
    }

    return {
        id,
        sessionId,
        generatedAt: Math.max(0, Math.floor(value.generatedAt)),
        ...payload,
    };
};

const parseStoredDocumentations = (raw: string): APIDocumentation[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeStoredDocumentation(entry))
        .filter((entry): entry is APIDocumentation => entry !== null);
};

export class APIDocsGeneratorService {
    private static instance: APIDocsGeneratorService;
    private readonly STORAGE_KEY = 'api_documentations';

    private constructor() {}

    static getInstance(): APIDocsGeneratorService {
        if (!APIDocsGeneratorService.instance) {
            APIDocsGeneratorService.instance = new APIDocsGeneratorService();
        }
        return APIDocsGeneratorService.instance;
    }

    /**
     * Generate API documentation from conversation
     */
    async generateDocs(
        sessionId: string,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<APIDocumentation | null> {
        const session = HistoryService.getSession(sessionId);
        if (!session || !session.messages || session.messages.length === 0) {
            return null;
        }

        const systemPrompt = `You are an expert API documentation writer. Analyze conversations and extract API endpoint information, including methods, paths, parameters, request/response schemas, and examples. Return structured JSON documentation.`;

        const conversationText = session.messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n');

        const userPrompt = `Analyze this conversation and generate comprehensive API documentation:\n\n${conversationText}\n\nReturn a JSON object with the following structure:
{
  "title": "API Title",
  "description": "API Description",
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/endpoint",
      "description": "Endpoint description",
      "parameters": [...],
      "requestBody": {...},
      "responses": [...]
    }
  ],
  "models": [...],
  "examples": [...]
}`;

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            const parsed = this.parseDocumentation(result.content, sessionId, session.title);
            
            if (parsed) {
                this.saveDocumentation(parsed);
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to generate API docs:', error);
            return null;
        }
    }

    /**
     * Parse documentation from AI response
     */
    private parseDocumentation(
        content: string,
        sessionId: string,
        title: string
    ): APIDocumentation | null {
        try {
            // Try to extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return null;
            }

            const parsed = parseJson(jsonMatch[0]);
            const payload = sanitizeDocumentationPayload(parsed, title);
            if (!payload) {
                return null;
            }

            return {
                id: crypto.randomUUID(),
                sessionId,
                title: payload.title,
                description: payload.description,
                endpoints: payload.endpoints,
                models: payload.models,
                examples: payload.examples,
                generatedAt: Date.now(),
            };
        } catch (error) {
            console.error('Failed to parse documentation:', error);
            return null;
        }
    }

    /**
     * Export documentation as Markdown
     */
    exportAsMarkdown(docs: APIDocumentation): string {
        let markdown = `# ${docs.title}\n\n`;
        markdown += `${docs.description}\n\n`;
        markdown += `---\n\n`;

        // Endpoints
        markdown += `## Endpoints\n\n`;
        docs.endpoints.forEach(endpoint => {
            markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
            markdown += `${endpoint.description}\n\n`;

            if (endpoint.parameters && endpoint.parameters.length > 0) {
                markdown += `#### Parameters\n\n`;
                markdown += `| Name | Type | Required | Description |\n`;
                markdown += `|------|------|----------|-------------|\n`;
                endpoint.parameters.forEach(param => {
                    markdown += `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description} |\n`;
                });
                markdown += `\n`;
            }

            if (endpoint.requestBody) {
                markdown += `#### Request Body\n\n`;
                markdown += `\`\`\`json\n${JSON.stringify(endpoint.requestBody.example || endpoint.requestBody.schema, null, 2)}\n\`\`\`\n\n`;
            }

            if (endpoint.responses && endpoint.responses.length > 0) {
                markdown += `#### Responses\n\n`;
                endpoint.responses.forEach(response => {
                    markdown += `**${response.statusCode}** - ${response.description}\n\n`;
                    if (response.example) {
                        markdown += `\`\`\`json\n${JSON.stringify(response.example, null, 2)}\n\`\`\`\n\n`;
                    }
                });
            }

            markdown += `---\n\n`;
        });

        // Models
        if (docs.models && docs.models.length > 0) {
            markdown += `## Data Models\n\n`;
            docs.models.forEach(model => {
                markdown += `### ${model.name}\n\n`;
                markdown += `${model.description}\n\n`;
                markdown += `| Property | Type | Description |\n`;
                markdown += `|----------|------|-------------|\n`;
                Object.entries(model.properties).forEach(([prop, info]) => {
                    markdown += `| ${prop} | ${info.type} | ${info.description} |\n`;
                });
                markdown += `\n`;
            });
        }

        // Examples
        if (docs.examples && docs.examples.length > 0) {
            markdown += `## Examples\n\n`;
            docs.examples.forEach((example, index) => {
                markdown += `### Example ${index + 1}: ${example.title}\n\n`;
                markdown += `**Request:**\n\n`;
                markdown += `\`\`\`\n${example.request.method} ${example.request.url}\n\`\`\`\n\n`;
                if (example.request.body) {
                    markdown += `\`\`\`json\n${JSON.stringify(example.request.body, null, 2)}\n\`\`\`\n\n`;
                }
                markdown += `**Response:**\n\n`;
                markdown += `\`\`\`json\n${JSON.stringify(example.response.body, null, 2)}\n\`\`\`\n\n`;
            });
        }

        return markdown;
    }

    /**
     * Export documentation as OpenAPI/Swagger
     */
    exportAsOpenAPI(docs: APIDocumentation): string {
        const openapi: OpenAPIDocument = {
            openapi: '3.0.0',
            info: {
                title: docs.title,
                description: docs.description,
                version: '1.0.0',
            },
            paths: {},
            components: {
                schemas: {},
            },
        };

        docs.endpoints.forEach(endpoint => {
            const path = endpoint.path;
            if (!openapi.paths[path]) {
                openapi.paths[path] = {};
            }

            const method = endpoint.method.toLowerCase();
            openapi.paths[path][method] = {
                summary: endpoint.description,
                parameters: endpoint.parameters?.map(p => ({
                    name: p.name,
                    in: 'query',
                    required: p.required,
                    schema: { type: p.type },
                    description: p.description,
                })),
                requestBody: endpoint.requestBody ? {
                    content: {
                        [endpoint.requestBody.contentType]: {
                            schema: endpoint.requestBody.schema,
                            example: endpoint.requestBody.example,
                        },
                    },
                } : undefined,
                responses: endpoint.responses.reduce((acc, r) => {
                    acc[String(r.statusCode)] = {
                        description: r.description,
                        content: r.example ? {
                            'application/json': {
                                schema: r.schema,
                                example: r.example,
                            },
                        } : undefined,
                    };
                    return acc;
                }, {} as Record<string, OpenAPIResponseContent>),
            };
        });

        docs.models.forEach(model => {
            openapi.components.schemas[model.name] = {
                type: 'object',
                properties: Object.entries(model.properties).reduce((acc, [prop, info]) => {
                    acc[prop] = {
                        type: info.type,
                        description: info.description,
                    };
                    return acc;
                }, {} as Record<string, { type: string; description: string }>),
            };
        });

        return JSON.stringify(openapi, null, 2);
    }

    /**
     * Save documentation
     */
    private saveDocumentation(docs: APIDocumentation): void {
        try {
            const sanitized = sanitizeStoredDocumentation(docs);
            if (!sanitized) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const documentations = stored ? parseStoredDocumentations(stored) : [];
            const index = documentations.findIndex(d => d.sessionId === sanitized.sessionId);
            if (index >= 0) {
                documentations[index] = sanitized;
            } else {
                documentations.push(sanitized);
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documentations));
        } catch (error) {
            console.error('Failed to save documentation:', error);
        }
    }

    /**
     * Get documentation for a session
     */
    getDocumentation(sessionId: string): APIDocumentation | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;
            const documentations = parseStoredDocumentations(stored);
            return documentations.find(d => d.sessionId === sessionId) || null;
        } catch (error) {
            console.error('Failed to load documentation:', error);
            return null;
        }
    }

    /**
     * Get all documentations
     */
    getAllDocumentations(): APIDocumentation[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return parseStoredDocumentations(stored);
        } catch (error) {
            console.error('Failed to load documentations:', error);
            return [];
        }
    }
}

export const apiDocsGeneratorService = APIDocsGeneratorService.getInstance();
