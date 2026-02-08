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

class DiscordService {
    private config: DiscordConfig | null = null;
    private readonly STORAGE_KEY = 'discord_config';

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
        this.config = config;
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
            const payload: any = {
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

            const data = await response.json();
            return {
                success: true,
                messageId: data.id,
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
