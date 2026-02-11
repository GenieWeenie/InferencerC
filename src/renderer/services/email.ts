/**
 * Email Export Service
 *
 * Send conversations via email using mailto: links or email API
 */

export interface EmailConfig {
    defaultRecipient?: string;
    defaultSubject?: string;
    smtpConfig?: SMTPConfig; // For future SMTP support
}

export interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean; // TLS/SSL
    auth: {
        user: string;
        password: string;
    };
}

export interface EmailOptions {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
    attachments?: Array<{
        filename: string;
        content: string; // Base64 encoded
        contentType: string;
    }>;
}

export interface EmailResult {
    success: boolean;
    error?: string;
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

const sanitizePort = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }
    const normalized = Math.round(value);
    return normalized >= 1 && normalized <= 65535 ? normalized : null;
};

class EmailService {
    private config: EmailConfig | null = null;
    private readonly STORAGE_KEY = 'email_config';

    constructor() {
        this.loadConfig();
    }

    private sanitizeConfig(value: unknown): EmailConfig | null {
        if (!isRecord(value)) {
            return null;
        }

        let smtpConfig: SMTPConfig | undefined;
        if (isRecord(value.smtpConfig) && isRecord(value.smtpConfig.auth)) {
            const smtp = value.smtpConfig;
            const auth = smtp.auth;
            const host = sanitizeNonEmptyString(smtp.host);
            const port = sanitizePort(smtp.port);
            const user = sanitizeNonEmptyString(auth.user);
            const password = sanitizeNonEmptyString(auth.password);
            if (
                host
                && port !== null
                && typeof smtp.secure === 'boolean'
                && user
                && password
            ) {
                smtpConfig = {
                    host,
                    port,
                    secure: smtp.secure,
                    auth: {
                        user,
                        password,
                    },
                };
            }
        }

        const defaultRecipient = sanitizeNonEmptyString(value.defaultRecipient) || undefined;
        const defaultSubject = sanitizeNonEmptyString(value.defaultSubject) || undefined;
        if (!defaultRecipient && !defaultSubject && !smtpConfig) {
            return null;
        }

        return {
            defaultRecipient,
            defaultSubject,
            smtpConfig,
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
                this.config = this.sanitizeConfig(parsed);
            }
        } catch (error) {
            console.error('Failed to load email config:', error);
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
            console.error('Failed to save email config:', error);
        }
    }

    /**
     * Set configuration
     */
    setConfig(config: EmailConfig): void {
        this.config = this.sanitizeConfig(config);
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    getConfig(): EmailConfig | null {
        return this.config;
    }

    /**
     * Check if email is configured
     */
    isConfigured(): boolean {
        return !!this.config?.defaultRecipient;
    }

    /**
     * Send email using mailto: link (client-side only)
     */
    async sendEmail(options: EmailOptions): Promise<EmailResult> {
        try {
            // Format body for mailto
            const body = encodeURIComponent(options.body);
            const subject = encodeURIComponent(options.subject);
            const to = encodeURIComponent(options.to);

            // Create mailto link
            const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;

            // Open default email client
            window.location.href = mailtoLink;

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to open email client',
            };
        }
    }

    /**
     * Send conversation via email
     */
    async sendConversation(
        title: string,
        messages: Array<{ role: string; content: string }>,
        options?: {
            to?: string;
            subject?: string;
            format?: 'plain' | 'html';
        }
    ): Promise<EmailResult> {
        const recipient = options?.to || this.config?.defaultRecipient;
        if (!recipient) {
            return { success: false, error: 'Email recipient not specified' };
        }

        const subject = options?.subject || this.config?.defaultSubject || `Conversation: ${title}`;
        const format = options?.format || 'html';

        // Format conversation
        let body: string;
        if (format === 'html') {
            body = this.formatAsHTML(title, messages);
        } else {
            body = this.formatAsPlainText(title, messages);
        }

        return this.sendEmail({
            to: recipient,
            subject,
            body,
            html: format === 'html',
        });
    }

    /**
     * Format conversation as HTML
     */
    private formatAsHTML(title: string, messages: Array<{ role: string; content: string }>): string {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .conversation { max-width: 800px; margin: 0 auto; padding: 20px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #2c3e50; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
        .assistant { background-color: #f1f8e9; border-left: 4px solid #4caf50; }
        .role { font-weight: bold; margin-bottom: 8px; color: #555; }
        .content { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="conversation">
        <div class="title">${this.escapeHtml(title)}</div>
        ${messages.map(m => `
            <div class="message ${m.role}">
                <div class="role">${m.role === 'user' ? '👤 User' : '🤖 Assistant'}</div>
                <div class="content">${this.escapeHtml(m.content)}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `.trim();

        return html;
    }

    /**
     * Format conversation as plain text
     */
    private formatAsPlainText(title: string, messages: Array<{ role: string; content: string }>): string {
        const lines = [
            title,
            '='.repeat(title.length),
            '',
            ...messages.flatMap((m, i) => [
                `${m.role === 'user' ? '👤 User' : '🤖 Assistant'} (Message ${i + 1})`,
                '-'.repeat(40),
                m.content,
                '',
            ]),
        ];

        return lines.join('\n');
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

export const emailService = new EmailService();
