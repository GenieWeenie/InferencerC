/**
 * Notion Integration Service
 * Handles saving conversations to Notion pages
 */

export interface NotionPage {
  id: string;
  url: string;
  title: string;
}

class NotionService {
  private apiKey: string | null = null;
  private databaseId: string | null = null;
  private baseUrl = 'https://api.notion.com/v1';

  /**
   * Initialize with API key and database ID
   */
  setConfig(apiKey: string, databaseId: string): void {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
    localStorage.setItem('notion_api_key', apiKey);
    localStorage.setItem('notion_database_id', databaseId);
  }

  /**
   * Get stored API key
   */
  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('notion_api_key');
    }
    return this.apiKey;
  }

  /**
   * Get stored database ID
   */
  getDatabaseId(): string | null {
    if (!this.databaseId) {
      this.databaseId = localStorage.getItem('notion_database_id');
    }
    return this.databaseId;
  }

  /**
   * Clear configuration
   */
  clearConfig(): void {
    this.apiKey = null;
    this.databaseId = null;
    localStorage.removeItem('notion_api_key');
    localStorage.removeItem('notion_database_id');
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.getApiKey() && this.getDatabaseId());
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Notion API key not configured');
    }

    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };
  }

  /**
   * Convert markdown to Notion blocks
   */
  private markdownToNotionBlocks(content: string): any[] {
    const blocks: any[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.substring(2) } }],
          },
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.substring(3) } }],
          },
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.substring(4) } }],
          },
        });
      } else if (line.startsWith('```')) {
        // Code blocks - simplified handling
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: line.replace(/```/g, '') } }],
            language: 'plain text',
          },
        });
      } else {
        // Regular paragraph
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }],
          },
        });
      }
    }

    return blocks;
  }

  /**
   * Save a conversation to Notion
   * @param title Page title
   * @param messages Chat messages
   * @param metadata Optional metadata (model, date, etc.)
   */
  async saveConversation(
    title: string,
    messages: Array<{ role: string; content: string }>,
    metadata?: {
      model?: string;
      date?: string;
    }
  ): Promise<{ success: boolean; page?: NotionPage; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Notion not configured. Set API key and database ID in Settings.' };
    }

    try {
      const dbId = this.getDatabaseId();
      if (!dbId) {
        return { success: false, error: 'Notion database ID not configured' };
      }

      // Build page content
      const contentBlocks: any[] = [];

      // Add metadata if provided
      if (metadata) {
        if (metadata.model) {
          contentBlocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { type: 'text', text: { content: 'Model: ' }, annotations: { bold: true } },
                { type: 'text', text: { content: metadata.model } },
              ],
            },
          });
        }
        if (metadata.date) {
          contentBlocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { type: 'text', text: { content: 'Date: ' }, annotations: { bold: true } },
                { type: 'text', text: { content: metadata.date } },
              ],
            },
          });
        }
        contentBlocks.push({
          object: 'block',
          type: 'divider',
          divider: {},
        });
      }

      // Add messages
      messages.forEach((msg, index) => {
        const roleLabel = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
        contentBlocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: `${roleLabel} (Message ${index + 1})` } }],
          },
        });

        // Convert message content to blocks
        const messageBlocks = this.markdownToNotionBlocks(msg.content || '');
        contentBlocks.push(...messageBlocks);

        // Add divider between messages
        if (index < messages.length - 1) {
          contentBlocks.push({
            object: 'block',
            type: 'divider',
            divider: {},
          });
        }
      });

      // Create page in database
      const response = await fetch(`${this.baseUrl}/pages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            title: {
              title: [
                {
                  text: {
                    content: title,
                  },
                },
              ],
            },
          },
          children: contentBlocks.slice(0, 100), // Notion has a limit per request
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `HTTP ${response.status}` };
      }

      const page: any = await response.json();

      // If there are more blocks, append them
      if (contentBlocks.length > 100) {
        const remainingBlocks = contentBlocks.slice(100);
        // Split into chunks of 100
        for (let i = 0; i < remainingBlocks.length; i += 100) {
          const chunk = remainingBlocks.slice(i, i + 100);
          await fetch(`${this.baseUrl}/blocks/${page.id}/children`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ children: chunk }),
          });
        }
      }

      return {
        success: true,
        page: {
          id: page.id,
          url: page.url,
          title: title,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save to Notion' };
    }
  }
}

export const notionService = new NotionService();
