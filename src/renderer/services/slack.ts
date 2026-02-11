/**
 * Slack Integration Service
 *
 * Send conversations to Slack channels via webhooks or API
 */

export interface SlackConfig {
    webhookUrl?: string; // Slack Incoming Webhook URL
    apiToken?: string; // Slack Bot Token (for API)
    defaultChannel?: string; // Default channel ID or name
}

type SlackTextObject = {
    type: 'plain_text' | 'mrkdwn';
    text: string;
};

type SlackBlock =
    | {
        type: 'header';
        text: SlackTextObject;
    }
    | {
        type: 'section';
        text: SlackTextObject;
    }
    | {
        type: 'divider';
    }
    | Record<string, unknown>;

interface SlackWebhookPayload {
    text: string;
    blocks?: SlackBlock[];
    channel?: string;
}

interface SlackApiPayload extends SlackWebhookPayload {
    channel?: string;
    thread_ts?: string;
}

interface SlackApiResponse {
    ok: boolean;
    error?: string;
    ts?: string;
}

export interface SlackMessage {
    text: string;
    blocks?: SlackBlock[]; // Slack Block Kit blocks
    channel?: string;
    thread_ts?: string; // Reply to thread
}

export interface SlackResult {
    success: boolean;
    messageTs?: string; // Message timestamp (for threading)
    error?: string;
}

class SlackService {
    private config: SlackConfig | null = null;
    private readonly STORAGE_KEY = 'slack_config';

    constructor() {
        this.loadConfig();
    }

    /**
     * Load configuration from localStorage
     */
    private loadConfig(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.config = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load Slack config:', error);
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
            console.error('Failed to save Slack config:', error);
        }
    }

    /**
     * Set configuration
     */
    setConfig(config: SlackConfig): void {
        this.config = config;
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    getConfig(): SlackConfig | null {
        return this.config;
    }

    /**
     * Check if Slack is configured
     */
    isConfigured(): boolean {
        return !!(this.config?.webhookUrl || this.config?.apiToken);
    }

    /**
     * Send a message to Slack using webhook
     */
    async sendMessage(message: SlackMessage): Promise<SlackResult> {
        if (!this.config?.webhookUrl) {
            return { success: false, error: 'Slack webhook URL not configured' };
        }

        try {
            const payload: SlackWebhookPayload = {
                text: message.text,
            };

            if (message.blocks) {
                payload.blocks = message.blocks;
            }

            if (message.channel) {
                payload.channel = message.channel;
            }

            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: `Slack API error: ${errorText}` };
            }

            // Webhooks don't return message timestamp, but we can try to parse response
            await response.text();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send to Slack',
            };
        }
    }

    /**
     * Send a conversation to Slack
     */
    async sendConversation(
        title: string,
        messages: Array<{ role: string; content: string }>,
        channel?: string
    ): Promise<SlackResult> {
        if (!this.isConfigured()) {
            return { success: false, error: 'Slack not configured' };
        }

        // Format conversation for Slack
        const text = `*${title}*\n\n${messages.map(m => {
            const role = m.role === 'user' ? '👤 User' : '🤖 Assistant';
            return `*${role}:*\n${m.content}`;
        }).join('\n\n---\n\n')}`;

        // Create blocks for better formatting
        const blocks: SlackBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: title,
                },
            },
            {
                type: 'divider',
            },
        ];

        messages.forEach((m, index) => {
            const role = m.role === 'user' ? '👤 User' : '🤖 Assistant';
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${role}* (Message ${index + 1})`,
                },
            });
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: m.content,
                },
            });
            if (index < messages.length - 1) {
                blocks.push({ type: 'divider' });
            }
        });

        return this.sendMessage({
            text,
            blocks,
            channel: channel || this.config?.defaultChannel,
        });
    }

    /**
     * Send using Slack API (more features, requires bot token)
     */
    async sendViaAPI(message: SlackMessage): Promise<SlackResult> {
        if (!this.config?.apiToken) {
            return { success: false, error: 'Slack API token not configured' };
        }

        try {
            const payload: SlackApiPayload = {
                channel: message.channel || this.config.defaultChannel,
                text: message.text,
            };

            if (message.blocks) {
                payload.blocks = message.blocks;
            }

            if (message.thread_ts) {
                payload.thread_ts = message.thread_ts;
            }

            const response = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data: unknown = await response.json();
            const parsed = (data && typeof data === 'object') ? (data as SlackApiResponse) : null;

            if (!parsed?.ok) {
                return { success: false, error: parsed?.error || 'Slack API error' };
            }

            return {
                success: true,
                messageTs: parsed.ts,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send to Slack',
            };
        }
    }
}

export const slackService = new SlackService();
