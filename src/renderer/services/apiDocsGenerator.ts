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

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                id: crypto.randomUUID(),
                sessionId,
                title: parsed.title || title,
                description: parsed.description || '',
                endpoints: parsed.endpoints || [],
                models: parsed.models || [],
                examples: parsed.examples || [],
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
        const openapi = {
            openapi: '3.0.0',
            info: {
                title: docs.title,
                description: docs.description,
                version: '1.0.0',
            },
            paths: {} as Record<string, any>,
            components: {
                schemas: {} as Record<string, any>,
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
                    acc[r.statusCode] = {
                        description: r.description,
                        content: r.example ? {
                            'application/json': {
                                schema: r.schema,
                                example: r.example,
                            },
                        } : undefined,
                    };
                    return acc;
                }, {} as Record<string, any>),
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
                }, {} as Record<string, any>),
            };
        });

        return JSON.stringify(openapi, null, 2);
    }

    /**
     * Save documentation
     */
    private saveDocumentation(docs: APIDocumentation): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const documentations: APIDocumentation[] = stored ? JSON.parse(stored) : [];
            const index = documentations.findIndex(d => d.sessionId === docs.sessionId);
            if (index >= 0) {
                documentations[index] = docs;
            } else {
                documentations.push(docs);
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
            const documentations: APIDocumentation[] = JSON.parse(stored);
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
            return JSON.parse(stored);
        } catch (error) {
            console.error('Failed to load documentations:', error);
            return [];
        }
    }
}

export const apiDocsGeneratorService = APIDocsGeneratorService.getInstance();
