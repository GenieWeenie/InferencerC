/**
 * Export Service
 *
 * Handles exporting conversations to various formats:
 * - PDF: Professional document export with formatting
 * - DOCX: Microsoft Word format for editing
 * - HTML: Standalone HTML file (supports Web Worker)
 * - Markdown: Plain markdown format (supports Web Worker)
 * - JSON: Raw data export (supports Web Worker)
 *
 * HTML, Markdown, and JSON exports can be processed in a Web Worker
 * to avoid blocking the main thread for large conversations.
 */

import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { ChatMessage } from '../../shared/types';
import { ConversationTreeManager } from './conversationTree';
import { workerManager } from '../services/workerManager';

export type ExportFormat = 'pdf' | 'docx' | 'html' | 'markdown' | 'json';

// Formats that can be processed in a Web Worker
type WorkerExportFormat = 'html' | 'markdown' | 'json';

export interface ExportOptions {
    format: ExportFormat;
    title?: string;
    includeMetadata?: boolean;
    includeTimestamps?: boolean;
    includeImages?: boolean;
    theme?: 'light' | 'dark';
    useWorker?: boolean; // Use Web Worker for supported formats
}

export interface ExportResult {
    success: boolean;
    fileName: string;
    blob?: Blob;
    error?: string;
}

export class ExportService {
    /**
     * Export conversation to the specified format
     */
    /**
     * Check if a format can be processed in a Web Worker
     */
    static canUseWorker(format: ExportFormat): format is WorkerExportFormat {
        return format === 'html' || format === 'markdown' || format === 'json';
    }

    static async exportConversation(
        messages: ChatMessage[],
        options: ExportOptions
    ): Promise<ExportResult> {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const title = options.title || 'Conversation';
        const fileName = `${title}_${timestamp}.${options.format}`;

        try {
            let blob: Blob;

            // Use Web Worker for supported formats if enabled (default: true)
            const useWorker = options.useWorker !== false && this.canUseWorker(options.format);

            if (useWorker && typeof Worker !== 'undefined') {
                try {
                    const { content, mimeType } = await workerManager.export(
                        options.format as WorkerExportFormat,
                        messages,
                        {
                            title: options.title,
                            includeMetadata: options.includeMetadata,
                            includeTimestamps: options.includeTimestamps,
                            includeImages: options.includeImages,
                            theme: options.theme,
                        }
                    );
                    blob = new Blob([content], { type: mimeType });
                } catch (workerError) {
                    console.warn('Worker export failed, falling back to main thread:', workerError);
                    // Fall through to main thread processing
                    blob = await this.exportOnMainThread(messages, options);
                }
            } else {
                blob = await this.exportOnMainThread(messages, options);
            }

            // Trigger download
            this.downloadBlob(blob, fileName);

            return {
                success: true,
                fileName,
                blob,
            };
        } catch (error) {
            console.error('Export failed:', error);
            return {
                success: false,
                fileName,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Export on main thread (fallback or for formats that require DOM)
     */
    private static async exportOnMainThread(
        messages: ChatMessage[],
        options: ExportOptions
    ): Promise<Blob> {
        switch (options.format) {
            case 'pdf':
                return this.exportToPDF(messages, options);
            case 'docx':
                return this.exportToDOCX(messages, options);
            case 'html':
                return this.exportToHTML(messages, options);
            case 'markdown':
                return this.exportToMarkdown(messages, options);
            case 'json':
                return this.exportToJSON(messages, options);
            default:
                throw new Error(`Unsupported format: ${options.format}`);
        }
    }

    /**
     * Export to PDF using jsPDF
     */
    private static async exportToPDF(
        messages: ChatMessage[],
        options: ExportOptions
    ): Promise<Blob> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;
        let yPosition = margin;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(options.title || 'Conversation Export', margin, yPosition);
        yPosition += 10;

        // Metadata
        if (options.includeMetadata) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPosition);
            yPosition += 6;
            doc.text(`Messages: ${messages.length}`, margin, yPosition);
            yPosition += 10;
        }

        // Messages
        doc.setTextColor(0, 0, 0);
        messages.forEach((message, index) => {
            // Check if we need a new page
            if (yPosition > pageHeight - margin - 20) {
                doc.addPage();
                yPosition = margin;
            }

            // Role header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const roleColor = message.role === 'user' ? [59, 130, 246] : [16, 185, 129];
            doc.setTextColor(roleColor[0], roleColor[1], roleColor[2]);
            doc.text(
                message.role.charAt(0).toUpperCase() + message.role.slice(1),
                margin,
                yPosition
            );
            yPosition += 7;

            // Timestamp
            if (options.includeTimestamps && message.generationTime) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`(${message.generationTime}ms)`, margin, yPosition);
                yPosition += 5;
            }

            // Message content
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);

            const lines = doc.splitTextToSize(message.content, maxWidth);
            lines.forEach((line: string) => {
                if (yPosition > pageHeight - margin - 10) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin, yPosition);
                yPosition += 5;
            });

            // Spacing between messages
            yPosition += 8;
        });

        return doc.output('blob');
    }

    /**
     * Export to DOCX using docx library
     */
    private static async exportToDOCX(
        messages: ChatMessage[],
        options: ExportOptions
    ): Promise<Blob> {
        const children: Paragraph[] = [];

        // Title
        children.push(
            new Paragraph({
                text: options.title || 'Conversation Export',
                heading: HeadingLevel.TITLE,
                spacing: { after: 200 },
            })
        );

        // Metadata
        if (options.includeMetadata) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Exported: ${new Date().toLocaleString()}`,
                            size: 20,
                            color: '666666',
                        }),
                    ],
                    spacing: { after: 100 },
                })
            );
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Messages: ${messages.length}`,
                            size: 20,
                            color: '666666',
                        }),
                    ],
                    spacing: { after: 200 },
                })
            );
        }

        // Messages
        messages.forEach((message, index) => {
            // Role header
            const roleColor = message.role === 'user' ? '3B82F6' : '10B981';
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: message.role.charAt(0).toUpperCase() + message.role.slice(1),
                            bold: true,
                            size: 24,
                            color: roleColor,
                        }),
                    ],
                    spacing: { before: 200, after: 100 },
                })
            );

            // Timestamp
            if (options.includeTimestamps && message.generationTime) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `(${message.generationTime}ms)`,
                                size: 18,
                                color: '999999',
                                italics: true,
                            }),
                        ],
                        spacing: { after: 100 },
                    })
                );
            }

            // Message content
            const contentLines = message.content.split('\n');
            contentLines.forEach((line) => {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: line || ' ',
                                size: 22,
                            }),
                        ],
                        spacing: { after: 50 },
                    })
                );
            });

            // Spacing between messages
            children.push(
                new Paragraph({
                    text: '',
                    spacing: { after: 200 },
                })
            );
        });

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children,
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        return blob;
    }

    /**
     * Export to HTML
     */
    private static exportToHTML(
        messages: ChatMessage[],
        options: ExportOptions
    ): Blob {
        const isDark = options.theme === 'dark';
        const bgColor = isDark ? '#0f172a' : '#ffffff';
        const textColor = isDark ? '#e2e8f0' : '#1e293b';
        const borderColor = isDark ? '#334155' : '#e2e8f0';

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || 'Conversation Export'}</title>
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
        <h1>${options.title || 'Conversation Export'}</h1>
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
                <div class="message-content">${this.escapeHtml(message.content)}</div>
            </div>
`;
        });

        html += `
        </div>
    </div>
</body>
</html>`;

        return new Blob([html], { type: 'text/html;charset=utf-8' });
    }

    /**
     * Export to Markdown
     */
    private static exportToMarkdown(
        messages: ChatMessage[],
        options: ExportOptions
    ): Blob {
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

        return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    }

    /**
     * Export to JSON
     */
    private static exportToJSON(
        messages: ChatMessage[],
        options: ExportOptions
    ): Blob {
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

        const json = JSON.stringify(data, null, 2);
        return new Blob([json], { type: 'application/json;charset=utf-8' });
    }

    /**
     * Download blob as file
     */
    private static downloadBlob(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Escape HTML special characters
     */
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Export conversation tree branch to specified format
     */
    static async exportBranch(
        treeManager: ConversationTreeManager,
        branchId: string,
        options: ExportOptions
    ): Promise<ExportResult> {
        const messages = treeManager.getCurrentMessages();
        return this.exportConversation(messages, options);
    }

    /**
     * Get estimated file size for export (in KB)
     */
    static estimateFileSize(messages: ChatMessage[], format: ExportFormat): number {
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);

        switch (format) {
            case 'pdf':
                return Math.ceil(totalChars / 500); // Rough estimate
            case 'docx':
                return Math.ceil(totalChars / 400);
            case 'html':
                return Math.ceil((totalChars + 5000) / 1024); // HTML overhead
            case 'markdown':
                return Math.ceil(totalChars / 1024);
            case 'json':
                return Math.ceil((totalChars * 1.5) / 1024); // JSON overhead
            default:
                return 0;
        }
    }
}
