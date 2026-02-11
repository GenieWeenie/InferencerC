import type { WebhookConfig } from '../../services/webhooks';

export type SettingsTabId =
    | 'api'
    | 'endpoints'
    | 'presets'
    | 'usage'
    | 'mcp'
    | 'downloader'
    | 'appearance'
    | 'webhooks'
    | 'privacy'
    | 'analytics'
    | 'integrations'
    | 'accessibility'
    | 'onboarding'
    | 'plugins';

export interface SettingsUpdateInfo {
    version: string;
    [key: string]: unknown;
}

export interface SettingsWebhookDraft {
    name: string;
    url: string;
    enabled: boolean;
    events: string[];
}

export type SettingsWebhook = WebhookConfig;
