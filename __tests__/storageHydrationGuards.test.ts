import {
  DEFAULT_USAGE_STATS,
  parseStoredModelEndpoints,
  parseStoredSystemPresets,
  parseStoredUsageStats,
  readStoredIntegerWithFallback,
  readStoredStringWithFallback,
} from '../src/renderer/pages/settingsStorage';

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('storage hydration guards', () => {
  const localStorageMock = new MockLocalStorage();

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.resetModules();
    localStorageMock.clear();
  });

  test('parses settings storage safely', () => {
    const parsedEndpoints = parseStoredModelEndpoints(JSON.stringify([
      { id: '1', name: 'Local', url: 'http://localhost:1234/v1', type: 'lm-studio' },
      { id: 2, name: 'Bad', url: 'http://localhost', type: 'lm-studio' },
    ]));
    expect(parsedEndpoints).toHaveLength(1);
    expect(parsedEndpoints?.[0]?.id).toBe('1');

    expect(parseStoredSystemPresets('{not-json')).toBeNull();
    const parsedPresets = parseStoredSystemPresets(JSON.stringify([
      { id: 'a', name: 'Preset', prompt: 'Hello' },
      { id: 'b', name: 'Bad' },
    ]));
    expect(parsedPresets).toEqual([{ id: 'a', name: 'Preset', prompt: 'Hello' }]);

    const parsedUsage = parseStoredUsageStats(JSON.stringify({
      totalTokens: 100,
      estimatedCost: 'bad',
      sessionCount: 3,
    }));
    expect(parsedUsage).toEqual({
      totalTokens: 100,
      estimatedCost: 0,
      sessionCount: 3,
    });
    expect(parseStoredUsageStats('[]')).toBeNull();

    localStorage.setItem('font_size', '17');
    localStorage.setItem('layout_mode', 'compact');
    expect(readStoredIntegerWithFallback('font_size', 13)).toBe(17);
    expect(readStoredIntegerWithFallback('missing_font_size', 13)).toBe(13);
    expect(readStoredStringWithFallback('layout_mode', 'normal')).toBe('compact');
    expect(readStoredStringWithFallback('missing_layout_mode', 'normal')).toBe('normal');
    expect(DEFAULT_USAGE_STATS).toEqual({
      totalTokens: 0,
      estimatedCost: 0,
      sessionCount: 0,
    });
  });

  test('sanitizes keyboard shortcuts storage and import payloads', () => {
    localStorage.setItem('keyboard-shortcuts', JSON.stringify([
      {
        id: 'nav.commandPalette',
        customKeys: ['Ctrl', 'K'],
        enabled: true,
      },
      {
        id: 'custom.action',
        label: 'Custom Action',
        description: 'Custom shortcut',
        category: 'Tools',
        defaultKeys: ['Ctrl', 'Alt', 'M'],
        enabled: true,
      },
      {
        id: 'bad.shortcut',
        label: 'Bad',
        category: 'Tools',
      },
    ]));

    jest.isolateModules(() => {
      const { KeyboardShortcutsManager } = require('../src/renderer/lib/keyboardShortcuts') as typeof import('../src/renderer/lib/keyboardShortcuts');
      const manager = new KeyboardShortcutsManager();
      expect(manager.getShortcut('nav.commandPalette')?.customKeys).toEqual(['Ctrl', 'K']);
      expect(manager.getShortcut('custom.action')?.label).toBe('Custom Action');
      expect(manager.getShortcut('bad.shortcut')).toBeUndefined();

      expect(() => manager.importShortcuts('{invalid-json')).toThrow('Invalid shortcuts configuration');

      manager.importShortcuts(JSON.stringify([
        {
          id: 'chat.new',
          customKeys: ['Ctrl', 'Shift', 'N'],
          enabled: true,
        },
      ]));
      expect(manager.getShortcut('chat.new')?.customKeys).toEqual(['Ctrl', 'Shift', 'N']);
    });
  });

  test('guards integration config loaders against malformed payloads', () => {
    localStorage.setItem('api_access_config', JSON.stringify({
      enabled: 'yes',
      port: 'bad',
      rateLimit: { requestsPerMinute: 'x' },
    }));
    localStorage.setItem('slack_config', JSON.stringify({ webhookUrl: 123, apiToken: true }));
    localStorage.setItem('discord_config', JSON.stringify({ webhookUrl: '' }));
    localStorage.setItem('email_config', JSON.stringify({ defaultRecipient: 12 }));
    localStorage.setItem('calendar_config', JSON.stringify({ provider: 'bad-provider' }));

    jest.isolateModules(() => {
      const { apiAccessService } = require('../src/renderer/services/apiAccess') as typeof import('../src/renderer/services/apiAccess');
      const { slackService } = require('../src/renderer/services/slack') as typeof import('../src/renderer/services/slack');
      const { discordService } = require('../src/renderer/services/discord') as typeof import('../src/renderer/services/discord');
      const { emailService } = require('../src/renderer/services/email') as typeof import('../src/renderer/services/email');
      const { calendarService } = require('../src/renderer/services/calendar') as typeof import('../src/renderer/services/calendar');
      const { readIntegrationAvailability } = require('../src/renderer/lib/chatIntegrations') as typeof import('../src/renderer/lib/chatIntegrations');

      const apiConfig = apiAccessService.getConfig();
      expect(apiConfig.enabled).toBe(false);
      expect(apiConfig.port).toBe(3001);
      expect(apiConfig.rateLimit?.requestsPerMinute).toBe(60);

      expect(slackService.isConfigured()).toBe(false);
      expect(discordService.isConfigured()).toBe(false);
      expect(emailService.isConfigured()).toBe(false);
      expect(calendarService.isConfigured()).toBe(false);
      expect(readIntegrationAvailability()).toEqual({
        notion: false,
        slack: false,
        discord: false,
        email: false,
        calendar: false,
      });
    });
  });

  test('filters malformed mock server endpoint payloads', () => {
    localStorage.setItem('mock_endpoints', JSON.stringify([
      {
        id: 'valid-endpoint',
        method: 'POST',
        path: '/v1/chat/completions',
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { ok: true },
        },
        enabled: true,
        createdAt: 1,
      },
      {
        id: 'invalid-endpoint',
        method: 'POST',
        path: '/v1/chat/completions',
        response: { headers: {} },
        enabled: true,
        createdAt: 1,
      },
    ]));

    jest.isolateModules(() => {
      const { MockServerService } = require('../src/renderer/services/mockServer') as typeof import('../src/renderer/services/mockServer');
      const service = MockServerService.getInstance();
      expect(service.getAllEndpoints()).toHaveLength(1);
      expect(service.getAllEndpoints()[0]?.id).toBe('valid-endpoint');

      const imported = service.importEndpoints(JSON.stringify([
        {
          id: 'imported-valid',
          method: 'GET',
          path: '/v1/ok',
          response: { status: 200, body: { ok: true } },
          enabled: true,
          createdAt: 2,
        },
        {
          id: 'imported-invalid',
          method: 'GET',
          path: '/v1/bad',
          response: { body: 'missing-status' },
          enabled: true,
          createdAt: 3,
        },
      ]));
      expect(imported).toEqual({ success: true, count: 1 });
    });
  });
});
