/**
 * Webhook Service
 * Triggers webhooks after conversations complete
 */

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[]; // 'conversation_complete', 'message_sent', etc.
}

export interface WebhookPayload {
  event: string;
  timestamp: number;
  sessionId: string;
  sessionTitle: string;
  modelId: string;
  messageCount: number;
  messages?: Array<{ role: string; content: string }>;
  metadata?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  };
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

class WebhookService {
  private webhooks: WebhookConfig[] = [];
  private readonly STORAGE_KEY = 'app_webhooks';

  constructor() {
    this.loadWebhooks();
  }

  private sanitizeWebhook(value: unknown): WebhookConfig | null {
    if (!isRecord(value)) {
      return null;
    }
    if (
      typeof value.id !== 'string'
      || typeof value.name !== 'string'
      || typeof value.url !== 'string'
      || typeof value.enabled !== 'boolean'
      || !Array.isArray(value.events)
    ) {
      return null;
    }
    return {
      id: value.id,
      name: value.name,
      url: value.url,
      enabled: value.enabled,
      events: value.events.filter((event): event is string => typeof event === 'string'),
    };
  }

  /**
   * Load webhooks from localStorage
   */
  private loadWebhooks(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = parseJson(stored);
        if (!Array.isArray(parsed)) {
          this.webhooks = [];
          return;
        }
        this.webhooks = parsed
          .map((entry) => this.sanitizeWebhook(entry))
          .filter((entry): entry is WebhookConfig => entry !== null);
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      this.webhooks = [];
    }
  }

  /**
   * Save webhooks to localStorage
   */
  private saveWebhooks(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.webhooks));
    } catch (error) {
      console.error('Failed to save webhooks:', error);
    }
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): WebhookConfig[] {
    return this.webhooks;
  }

  /**
   * Add a new webhook
   */
  addWebhook(config: Omit<WebhookConfig, 'id'>): string {
    const id = crypto.randomUUID();
    const webhook: WebhookConfig = {
      ...config,
      id,
    };
    this.webhooks.push(webhook);
    this.saveWebhooks();
    return id;
  }

  /**
   * Update a webhook
   */
  updateWebhook(id: string, updates: Partial<WebhookConfig>): boolean {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.webhooks[index] = { ...this.webhooks[index], ...updates };
    this.saveWebhooks();
    return true;
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    const index = this.webhooks.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.webhooks.splice(index, 1);
    this.saveWebhooks();
    return true;
  }

  /**
   * Trigger webhooks for a specific event
   */
  async triggerWebhooks(
    event: string,
    payload: Omit<WebhookPayload, 'event' | 'timestamp'>
  ): Promise<void> {
    const enabledWebhooks = this.webhooks.filter(
      w => w.enabled && w.events.includes(event)
    );

    if (enabledWebhooks.length === 0) return;

    const fullPayload: WebhookPayload = {
      ...payload,
      event,
      timestamp: Date.now(),
    };

    // Fire all webhooks in parallel (don't wait for responses)
    enabledWebhooks.forEach(webhook => {
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'InferencerC/3.0',
        },
        body: JSON.stringify(fullPayload),
      }).catch(error => {
        console.error(`Webhook ${webhook.name} failed:`, error);
        // Silently fail - don't interrupt user flow
      });
    });
  }
}

export const webhookService = new WebhookService();
