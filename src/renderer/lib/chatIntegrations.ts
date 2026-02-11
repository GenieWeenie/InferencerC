import type { IntegrationAvailability } from '../components/chat/ChatHeaderCluster';

const parseStorageConfig = (key: string): Record<string, any> | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null;
    } catch {
        return null;
    }
};

export const readIntegrationAvailability = (): IntegrationAvailability => {
    const notionDatabaseConfigured = Boolean(localStorage.getItem('notion_database_id'));
    const slackConfig = parseStorageConfig('slack_config');
    const discordConfig = parseStorageConfig('discord_config');
    const emailConfig = parseStorageConfig('email_config');
    const calendarConfig = parseStorageConfig('calendar_config');

    return {
        notion: notionDatabaseConfigured,
        slack: Boolean(slackConfig?.webhookUrl || slackConfig?.apiToken),
        discord: Boolean(discordConfig?.webhookUrl),
        email: Boolean(emailConfig?.defaultRecipient),
        calendar: Boolean(calendarConfig?.provider),
    };
};
