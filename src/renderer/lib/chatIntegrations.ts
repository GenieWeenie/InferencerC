import type { IntegrationAvailability } from '../components/chat/ChatHeaderCluster';

type StorageConfig = Record<string, unknown>;

const parseStorageConfig = (key: string): StorageConfig | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        return parsed as StorageConfig;
    } catch {
        return null;
    }
};

const hasStringField = (config: StorageConfig | null, field: string): boolean => {
    if (!config) return false;
    const value = config[field];
    return typeof value === 'string' && value.trim().length > 0;
};

export const readIntegrationAvailability = (): IntegrationAvailability => {
    const notionDatabaseConfigured = Boolean(localStorage.getItem('notion_database_id'));
    const slackConfig = parseStorageConfig('slack_config');
    const discordConfig = parseStorageConfig('discord_config');
    const emailConfig = parseStorageConfig('email_config');
    const calendarConfig = parseStorageConfig('calendar_config');

    return {
        notion: notionDatabaseConfigured,
        slack: hasStringField(slackConfig, 'webhookUrl') || hasStringField(slackConfig, 'apiToken'),
        discord: hasStringField(discordConfig, 'webhookUrl'),
        email: hasStringField(emailConfig, 'defaultRecipient'),
        calendar: hasStringField(calendarConfig, 'provider'),
    };
};
