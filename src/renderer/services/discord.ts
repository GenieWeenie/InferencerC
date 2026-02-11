/**
 * Discord Integration Service
 *
 * Send conversations to Discord channels via webhooks
 */

export interface DiscordConfig {
    webhookUrl: string; // Discord Webhook URL
    username?: string; // Custom webhook username
    avatarUrl?: string; // Custom webhook avatar
}

export interface DiscordMessage {
    content?: string;
    embeds?: DiscordEmbed[];
    username?: string;
    avatar_url?: string;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number; // Decimal color (0xRRGGBB)
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: {
        text: string;
        icon_url?: string;
    };
    timestamp?: string; // ISO 8601 timestamp
}

export interface DiscordResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

interface DiscordWebhookPayload extends DiscordMessage {}

interface DiscordWebhookResponse {
    id?: string;
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

class DiscordService {
    private config: DiscordConfig | null = null;
    private readonly STORAGE_KEY = 'discord_config';

    constructor() {
        this.loadConfig();
    }

    private sanitizeConfig(value: unknown): DiscordConfig | null {
        if (!isRecord(value)) {
            return null;
        }
        if (typeof value.webhookUrl !== 'string' || value.webhookUrl.trim().length === 0) {
            return null;
        }
        return {
            webhookUrl: value.webhookUrl,
            username: typeof value.username === 'string' && value.username.trim().length > 0 ? value.username : undefined,
            avatarUrl: typeof value.avatarUrl === 'string' && value.avatarUrl.trim().length > 0 ? value.avatarUrl : undefined,
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
            console.error('Failed to load Discord config:', error);
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
            console.error('Failed to save Discord config:', error);
        }
    }

    /**
     * Set configuration
     */
    setConfig(config: DiscordConfig): void {
        this.config = this.sanitizeConfig(config);
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    getConfig(): DiscordConfig | null {
        return this.config;
    }

    /**
     * Check if Discord is configured
     */
    isConfigured(): boolean {
        return !!this.config?.webhookUrl;
    }

    /**
     * Send a message to Discord
     */
    async sendMessage(message: DiscordMessage): Promise<DiscordResult> {
        if (!this.config?.webhookUrl) {
            return { success: false, error: 'Discord webhook URL not configured' };
        }

        try {
            const payload: DiscordWebhookPayload = {
                ...message,
            };

            // Apply default username/avatar if set
            if (this.config.username && !payload.username) {
                payload.username = this.config.username;
            }
            if (this.config.avatarUrl && !payload.avatar_url) {
                payload.avatar_url = this.config.avatarUrl;
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
                return { success: false, error: `Discord API error: ${errorText}` };
            }

            const data: unknown = await response.json();
            const parsed = (data && typeof data === 'object') ? (data as DiscordWebhookResponse) : null;
            return {
                success: true,
                messageId: parsed?.id,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send to Discord',
            };
        }
    }

    /**
     * Send a conversation to Discord
     */
    async sendConversation(
        title: string,
        messages: Array<{ role: string; content: string }>,
        options?: {
            color?: number;
            includeMetadata?: boolean;
        }
    ): Promise<DiscordResult> {
        if (!this.isConfigured()) {
            return { success: false, error: 'Discord not configured' };
        }

        // Discord embeds have a 6000 character limit, so we may need to split
        const maxLength = 4000; // Leave room for formatting
        const chunks: string[] = [];
        let currentChunk = '';

        messages.forEach((m, index) => {
            const role = m.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
            const content = `\n${role}\n${m.content}\n`;
            
            if (currentChunk.length + content.length > maxLength && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = content;
            } else {
                currentChunk += content;
            }
        });

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        // Send first chunk as embed, rest as follow-up messages
        const firstEmbed: DiscordEmbed = {
            title: title,
            description: chunks[0] || 'No messages',
            color: options?.color || 0x5865F2, // Discord blurple
            footer: {
                text: `${messages.length} messages`,
            },
            timestamp: new Date().toISOString(),
        };

        const result = await this.sendMessage({
            embeds: [firstEmbed],
        });

        // Send remaining chunks as follow-up messages
        if (result.success && chunks.length > 1) {
            for (let i = 1; i < chunks.length; i++) {
                await this.sendMessage({
                    content: `**${title}** (continued)\n\n${chunks[i]}`,
                });
            }
        }

        return result;
    }

    /**
     * Send a simple text message
     */
    async sendText(text: string): Promise<DiscordResult> {
        return this.sendMessage({ content: text });
    }
}

export const discordService = new DiscordService();
