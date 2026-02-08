/**
 * Export Web Worker
 *
 * Handles heavy export operations off the main thread:
 * - Markdown generation
 * - JSON serialization
 * - HTML generation
 *
 * Note: PDF and DOCX generation require DOM/library access
 * and are handled separately in the main thread.
 */

import { ChatMessage } from '../../shared/types';

export type ExportFormat = 'html' | 'markdown' | 'json';

interface ExportRequest {
    type: 'export';
    id: string;
    format: ExportFormat;
    messages: ChatMessage[];
    options: ExportOptions;
}

interface ExportOptions {
    title?: string;
    includeMetadata?: boolean;
    includeTimestamps?: boolean;
    includeImages?: boolean;
    theme?: 'light' | 'dark';
}

interface ExportResponse {
    type: 'export';
    id: string;
    success: boolean;
    content?: string;
    mimeType?: string;
    error?: string;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Export to HTML
 */
function exportToHTML(messages: ChatMessage[], options: ExportOptions): string {
    const isDark = options.theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(options.title || 'Conversation Export')}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: ${bgColor};
            color: ${textColor};
            padding: 40px 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .metadata {
            color: ${isDark ? '#94a3b8' : '#64748b'};
            font-size: 14px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${borderColor};
        }

        .message {
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid ${borderColor};
        }

        .message.user {
            background: ${isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'};
            border-left: 4px solid #3b82f6;
        }

        .message.assistant {
            background: ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'};
            border-left: 4px solid #10b981;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .message-role {
            font-weight: 600;
            font-size: 14px;
            text-transform: capitalize;
        }

        .message.user .message-role {
            color: #3b82f6;
        }

        .message.assistant .message-role {
            color: #10b981;
        }

        .message-time {
            color: ${isDark ? '#94a3b8' : '#64748b'};
            font-size: 12px;
        }

        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        code {
            background: ${isDark ? '#1e293b' : '#f1f5f9'};
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${escapeHtml(options.title || 'Conversation Export')}</h1>
        <div class="metadata">
            ${options.includeMetadata
            ? `
            <div>Exported: ${new Date().toLocaleString()}</div>
            <div>Messages: ${messages.length}</div>
            `
            : ''
        }
        </div>
        <div class="messages">
`;

    messages.forEach((message) => {
        html += `
            <div class="message ${message.role}">
                <div class="message-header">
                    <div class="message-role">${message.role}</div>
                    ${options.includeTimestamps && message.generationTime
                ? `<div class="message-time">${message.generationTime}ms</div>`
                : ''
            }
                </div>
                <div class="message-content">${escapeHtml(message.content)}</div>
            </div>
`;
    });

    html += `
        </div>
    </div>
</body>
</html>`;

    return html;
}

/**
 * Export to Markdown
 */
function exportToMarkdown(messages: ChatMessage[], options: ExportOptions): string {
    let markdown = `# ${options.title || 'Conversation Export'}\n\n`;

    if (options.includeMetadata) {
        markdown += `**Exported:** ${new Date().toLocaleString()}  \n`;
        markdown += `**Messages:** ${messages.length}\n\n`;
        markdown += '---\n\n';
    }

    messages.forEach((message, index) => {
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        markdown += `## ${role}\n\n`;

        if (options.includeTimestamps && message.generationTime) {
            markdown += `*Generation time: ${message.generationTime}ms*\n\n`;
        }

        markdown += `${message.content}\n\n`;

        if (index < messages.length - 1) {
            markdown += '---\n\n';
        }
    });

    return markdown;
}

/**
 * Export to JSON
 */
function exportToJSON(messages: ChatMessage[], options: ExportOptions): string {
    const data = {
        metadata: options.includeMetadata
            ? {
                title: options.title || 'Conversation Export',
                exportedAt: new Date().toISOString(),
                messageCount: messages.length,
            }
            : undefined,
        messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            generationTime: options.includeTimestamps ? msg.generationTime : undefined,
            attachments: msg.attachments,
            images: options.includeImages ? msg.images : undefined,
        })),
    };

    return JSON.stringify(data, null, 2);
}

// Message handler
self.onmessage = (event: MessageEvent<ExportRequest>) => {
    const { type, id, format, messages, options } = event.data;

    const response: ExportResponse = {
        type,
        id,
        success: false,
    };

    try {
        switch (format) {
            case 'html':
                response.content = exportToHTML(messages, options);
                response.mimeType = 'text/html;charset=utf-8';
                response.success = true;
                break;

            case 'markdown':
                response.content = exportToMarkdown(messages, options);
                response.mimeType = 'text/markdown;charset=utf-8';
                response.success = true;
                break;

            case 'json':
                response.content = exportToJSON(messages, options);
                response.mimeType = 'application/json;charset=utf-8';
                response.success = true;
                break;

            default:
                throw new Error(`Unsupported format in worker: ${format}`);
        }
    } catch (error) {
        response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    self.postMessage(response);
};

// Indicate worker is ready
self.postMessage({ type: 'ready', id: 'init', success: true });
