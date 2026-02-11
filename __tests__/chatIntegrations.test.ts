import { readIntegrationAvailability } from '../src/renderer/lib/chatIntegrations';

describe('chatIntegrations', () => {
  const createStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('derives availability from stored integration configs', () => {
    localStorage.setItem('notion_database_id', 'db-123');
    localStorage.setItem('slack_config', JSON.stringify({ webhookUrl: 'https://hooks.slack.test' }));
    localStorage.setItem('discord_config', JSON.stringify({ webhookUrl: 'https://discord.test' }));
    localStorage.setItem('email_config', JSON.stringify({ defaultRecipient: 'test@example.com' }));
    localStorage.setItem('calendar_config', JSON.stringify({ provider: 'google' }));

    expect(readIntegrationAvailability()).toEqual({
      notion: true,
      slack: true,
      discord: true,
      email: true,
      calendar: true,
    });
  });

  it('fails closed for malformed or missing config values', () => {
    localStorage.setItem('slack_config', '{bad-json');
    localStorage.setItem('discord_config', JSON.stringify({}));

    expect(readIntegrationAvailability()).toEqual({
      notion: false,
      slack: false,
      discord: false,
      email: false,
      calendar: false,
    });
  });
});
