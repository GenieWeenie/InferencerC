/**
 * Developer Documentation Service
 *
 * Canonical in-app documentation content for API reference,
 * integration guides, plugin tutorials, and troubleshooting.
 */

export type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface EndpointParameter {
    name: string;
    in: 'path' | 'query' | 'body';
    required: boolean;
    type: string;
    description: string;
}

export interface APIReferenceEndpoint {
    method: EndpointMethod;
    path: string;
    description: string;
    parameters: EndpointParameter[];
    requestExample?: string;
    responseExample: string;
}

export interface IntegrationGuide {
    id: 'github' | 'notion' | 'slack' | 'discord';
    name: string;
    summary: string;
    prerequisites: string[];
    setupSteps: string[];
    verification: string;
    commonErrors: string[];
}

export interface TroubleshootingEntry {
    id: string;
    title: string;
    symptoms: string;
    likelyCause: string;
    resolution: string[];
}

export interface PluginTutorial {
    title: string;
    samplePluginPath: string;
    steps: string[];
    manifestExample: string;
    entryPointExample: string;
}

const API_REFERENCE_ENDPOINTS: APIReferenceEndpoint[] = [
    {
        method: 'POST',
        path: '/v1/chat/completions',
        description: 'Create a chat completion with the configured local or remote model adapter.',
        parameters: [
            {
                name: 'model',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Configured model identifier from /v1/models',
            },
            {
                name: 'messages',
                in: 'body',
                required: true,
                type: 'array',
                description: 'OpenAI-style chat messages array',
            },
            {
                name: 'stream',
                in: 'body',
                required: false,
                type: 'boolean',
                description: 'Enable server-sent event stream when adapter supports it',
            },
        ],
        requestExample: `curl -X POST http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "mock-model",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'`,
        responseExample: `{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "choices": [{ "index": 0, "message": { "role": "assistant", "content": "Hi." } }],
  "usage": { "prompt_tokens": 8, "completion_tokens": 3, "total_tokens": 11 }
}`,
    },
    {
        method: 'GET',
        path: '/v1/models',
        description: 'List configured models available to the server.',
        parameters: [],
        requestExample: 'curl http://localhost:3000/v1/models',
        responseExample: `{
  "object": "list",
  "data": [{ "id": "mock-model", "name": "Mock Model", "adapter": "mock" }]
}`,
    },
    {
        method: 'GET',
        path: '/v1/models/search',
        description: 'Search Hugging Face repositories for model candidates.',
        parameters: [
            {
                name: 'q',
                in: 'query',
                required: true,
                type: 'string',
                description: 'Search query text',
            },
        ],
        requestExample: 'curl "http://localhost:3000/v1/models/search?q=llama"',
        responseExample: `[
  { "id": "meta-llama/Llama-3.2-3B-Instruct-GGUF", "downloads": 12345 }
]`,
    },
    {
        method: 'GET',
        path: '/v1/models/files',
        description: 'List downloadable files for a Hugging Face model repository.',
        parameters: [
            {
                name: 'repoId',
                in: 'query',
                required: true,
                type: 'string',
                description: 'Repository identifier, for example owner/model-name',
            },
        ],
        requestExample: 'curl "http://localhost:3000/v1/models/files?repoId=TheBloke/Mistral-7B-GGUF"',
        responseExample: `[
  { "name": "mistral-7b-instruct.Q4_K_M.gguf", "size": 4362076160 }
]`,
    },
    {
        method: 'POST',
        path: '/v1/models/download',
        description: 'Start a background download for a selected model file.',
        parameters: [
            {
                name: 'repoId',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Hugging Face repository identifier',
            },
            {
                name: 'fileName',
                in: 'body',
                required: true,
                type: 'string',
                description: 'GGUF file name in the repository',
            },
            {
                name: 'name',
                in: 'body',
                required: false,
                type: 'string',
                description: 'Optional display name for the download',
            },
        ],
        requestExample: `curl -X POST http://localhost:3000/v1/models/download \\
  -H "Content-Type: application/json" \\
  -d '{"repoId":"TheBloke/Mistral-7B-GGUF","fileName":"model.Q4_K_M.gguf"}'`,
        responseExample: `{
  "downloadId": "download-1710000000000"
}`,
    },
    {
        method: 'GET',
        path: '/v1/downloads',
        description: 'Return all active and completed model downloads.',
        parameters: [],
        requestExample: 'curl http://localhost:3000/v1/downloads',
        responseExample: `[
  { "id": "download-1710000000000", "status": "downloading", "progress": 42 }
]`,
    },
    {
        method: 'GET',
        path: '/v1/stats',
        description: 'Fetch runtime usage and performance statistics.',
        parameters: [],
        requestExample: 'curl http://localhost:3000/v1/stats',
        responseExample: `{
  "requests": 129,
  "averageLatencyMs": 842,
  "tokenUsage": { "prompt": 102345, "completion": 44210 }
}`,
    },
    {
        method: 'POST',
        path: '/v1/tools/web-fetch',
        description: 'Fetch and sanitize page content for use as chat context.',
        parameters: [
            {
                name: 'url',
                in: 'body',
                required: true,
                type: 'string',
                description: 'Absolute URL to fetch',
            },
        ],
        requestExample: `curl -X POST http://localhost:3000/v1/tools/web-fetch \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
        responseExample: `{
  "content": "...plain text extraction..."
}`,
    },
];

const INTEGRATION_GUIDES: IntegrationGuide[] = [
    {
        id: 'github',
        name: 'GitHub',
        summary: 'Fetch repository files into context and publish code blocks as gists.',
        prerequisites: [
            'GitHub personal access token with gist scope',
            'InferencerC Settings -> API Keys -> GitHub key configured',
        ],
        setupSteps: [
            'Create or copy a GitHub token from GitHub Developer Settings.',
            'Open InferencerC Settings and save the token in GitHub API key field.',
            'Use the GitHub toggle in chat to fetch owner/repo/path content.',
            'Use the GitHub button on assistant code blocks to create gists.',
        ],
        verification: 'Run a fetch using owner/repo/path and confirm a context block is inserted into chat.',
        commonErrors: [
            '404 file not found: confirm branch/ref and path.',
            '403 rate limit/access denied: verify token validity and scopes.',
        ],
    },
    {
        id: 'notion',
        name: 'Notion',
        summary: 'Save complete conversations as structured Notion pages.',
        prerequisites: [
            'Notion internal integration token',
            'Database ID for a writable Notion database',
            'Integration invited to the target database',
        ],
        setupSteps: [
            'Create a Notion integration and copy the internal API token.',
            'Share the destination database with the integration.',
            'Paste token and database ID into InferencerC Settings.',
            'Use the Notion action from chat export controls.',
        ],
        verification: 'Export a conversation and confirm page title, metadata, and messages appear in Notion.',
        commonErrors: [
            'Not configured error: token or database ID missing in Settings.',
            'Permission error: integration was not shared with the database.',
        ],
    },
    {
        id: 'slack',
        name: 'Slack',
        summary: 'Send formatted conversation summaries to channels via webhook or bot token.',
        prerequisites: [
            'Slack incoming webhook URL or bot token',
            'Optional default channel configured for API posting',
        ],
        setupSteps: [
            'Create an incoming webhook (or Slack app bot token).',
            'Save webhook URL or token in InferencerC Settings.',
            'Open a conversation and choose Send to Slack.',
            'Optional: specify channel when using API token mode.',
        ],
        verification: 'Trigger a Slack export and confirm message blocks render in the target channel.',
        commonErrors: [
            'Webhook not configured: save webhook URL in Settings.',
            'invalid_auth or channel_not_found when using bot token.',
        ],
    },
    {
        id: 'discord',
        name: 'Discord',
        summary: 'Share conversation transcripts to Discord channels through webhooks.',
        prerequisites: [
            'Discord webhook URL with message permissions',
            'Optional custom webhook name/avatar',
        ],
        setupSteps: [
            'Create a channel webhook in Discord server settings.',
            'Store webhook URL in InferencerC Settings.',
            'Use Send to Discord in chat actions for a conversation.',
            'For long threads, InferencerC auto-splits into follow-up messages.',
        ],
        verification: 'Send a conversation and confirm first embed plus continuation chunks appear.',
        commonErrors: [
            'Webhook URL not configured in Settings.',
            '400 payload/size errors if message text is manually oversized.',
        ],
    },
];

const TROUBLESHOOTING_GUIDE: TroubleshootingEntry[] = [
    {
        id: 'api-connection-failed',
        title: 'API requests fail with connection errors',
        symptoms: 'Playground requests return network errors or timeout quickly.',
        likelyCause: 'Local inference server is not running on port 3000 or blocked by firewall.',
        resolution: [
            'Start development server with npm run dev.',
            'Verify http://localhost:3000/v1/models responds.',
            'Confirm no port collision with another local process.',
        ],
    },
    {
        id: 'chat-model-not-found',
        title: 'Chat endpoint returns model not found',
        symptoms: 'POST /v1/chat/completions responds with model not found in configuration.',
        likelyCause: 'Requested model id does not match a configured model in app settings.',
        resolution: [
            'Open model settings and verify available model IDs.',
            'Use GET /v1/models to inspect exact identifiers.',
            'Update request payload model field to a valid id.',
        ],
    },
    {
        id: 'integration-auth-errors',
        title: 'GitHub/Notion/Slack/Discord authentication errors',
        symptoms: 'Integration actions return 401, 403, or not configured errors.',
        likelyCause: 'API tokens are missing, expired, or missing required scopes.',
        resolution: [
            'Re-save credentials in Settings and retry.',
            'Regenerate token with required scopes/permissions.',
            'For Notion, re-share the database with the integration account.',
        ],
    },
    {
        id: 'plugin-install-rejected',
        title: 'Plugin install fails validation',
        symptoms: 'Plugin manager rejects manifest during install or update.',
        likelyCause: 'Manifest is missing required fields or has unsupported permission types.',
        resolution: [
            'Validate manifest contains id, name, version, entryPoint, apiVersion, permissions.',
            'Use only supported permissions (storage, network-access, access-files, read/write-conversations).',
            'Test with the sample plugin at examples/plugins/sample-hello-plugin.',
        ],
    },
    {
        id: 'context-limit-warning',
        title: 'Context window warning appears frequently',
        symptoms: 'Context optimizer repeatedly warns at 80%+ usage.',
        likelyCause: 'Long conversation history plus large output reservation.',
        resolution: [
            'Use Apply Suggested Trim in Context Optimizer.',
            'Enable auto-summarize and lower max output tokens if needed.',
            'Exclude older low-relevance messages from context.',
        ],
    },
];

const PLUGIN_TUTORIAL: PluginTutorial = {
    title: 'Build Your First Plugin',
    samplePluginPath: 'examples/plugins/sample-hello-plugin',
    steps: [
        'Create a folder with manifest.json and an entry point file.',
        'Define a valid manifest with permissions, commands, and apiVersion 1.0.0.',
        'Install the manifest from Plugin Manager or marketplace update flow.',
        'Enable the plugin and verify command hooks appear in command palette.',
        'Use plugin storage namespace plugin:<id>:* for settings/state.',
    ],
    manifestExample: `{
  "id": "sample.hello-plugin",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "Adds a simple command and export format.",
  "author": "InferencerC Docs",
  "entryPoint": "index.js",
  "apiVersion": "1.0.0",
  "permissions": [{ "type": "storage" }],
  "commands": [
    {
      "id": "hello-command",
      "label": "Say Hello",
      "description": "Displays a hello notification",
      "category": "Actions",
      "keywords": ["hello", "sample"]
    }
  ],
  "exportFormats": [
    {
      "id": "hello-jsonl",
      "label": "Hello JSONL",
      "description": "Export transcript as JSONL",
      "fileExtension": "jsonl",
      "mimeType": "application/x-ndjson",
      "strategy": "jsonl"
    }
  ]
}`,
    entryPointExample: `export default function register(api) {
  api.ui.showNotification('Hello Plugin loaded', 'success');

  return {
    name: 'sample.hello-plugin',
    commands: {
      'hello-command': async () => {
        api.ui.showNotification('Hello from plugin command!', 'info');
      }
    }
  };
}`,
};

export class DeveloperDocsService {
    getApiReference(): APIReferenceEndpoint[] {
        return API_REFERENCE_ENDPOINTS;
    }

    getIntegrationGuides(): IntegrationGuide[] {
        return INTEGRATION_GUIDES;
    }

    getTroubleshootingGuide(): TroubleshootingEntry[] {
        return TROUBLESHOOTING_GUIDE;
    }

    getPluginTutorial(): PluginTutorial {
        return PLUGIN_TUTORIAL;
    }
}

export const developerDocsService = new DeveloperDocsService();
