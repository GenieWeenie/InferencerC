export interface ToolDefinition {
    name: string;
    description: string;
    parameters: any; // JSON Schema
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
    {
        name: 'web-fetch',
        description: 'Fetch content from a URL to answer questions about specific web pages',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The URL to fetch' }
            },
            required: ['url']
        }
    },
    {
        name: 'calculator',
        description: 'Perform mathematical calculations. Use this for precise math.',
        parameters: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: 'Math expression to evaluate' }
            },
            required: ['expression']
        }
    },
    {
        name: 'file-search',
        description: 'Search for files in the workspace by name or content',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search term or glob pattern' },
                type: { type: 'string', enum: ['file', 'content'], description: 'Search by filename or content' }
            },
            required: ['query']
        }
    }
];
