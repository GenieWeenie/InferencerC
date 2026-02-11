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

const sanitizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeEvents = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const events: string[] = [];
  value.forEach((entry) => {
    const event = sanitizeNonEmptyString(entry);
    if (!event || seen.has(event)) {
      return;
    }
    seen.add(event);
    events.push(event);
  });
  return events;
};

class WebhookService {
  private webhooks: WebhookConfig[] = [];
  private readonly STORAGE_KEY = 'app_webhooks';

  constructor() {
    this.loadWebhooks();
  }

  private sanitizeWebhook(value: unknown, forceId?: string): WebhookConfig | null {
    if (!isRecord(value)) {
      return null;
    }
    const id = forceId || sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const url = sanitizeNonEmptyString(value.url);
    if (!id || !name || !url || typeof value.enabled !== 'boolean') {
      return null;
    }
    const events = sanitizeEvents(value.events);
    if (events.length === 0) {
      return null;
    }
    return {
      id,
      name,
      url,
      enabled: value.enabled,
      events,
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
        const seenIds = new Set<string>();
        this.webhooks = parsed
          .map((entry) => this.sanitizeWebhook(entry))
          .filter((entry): entry is WebhookConfig => {
            if (!entry) {
              return false;
            }
            if (seenIds.has(entry.id)) {
              return false;
            }
            seenIds.add(entry.id);
            return true;
          });
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
    const webhook = this.sanitizeWebhook({
      ...config,
      id,
    });
    if (!webhook) {
      throw new Error('Invalid webhook configuration');
    }
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

    const updated = this.sanitizeWebhook({ ...this.webhooks[index], ...updates }, id);
    if (!updated) {
      return false;
    }
    this.webhooks[index] = updated;
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
