/**
 * @jest-environment jsdom
 */
import {
  DEFAULT_USAGE_STATS,
  parseStoredModelEndpoints,
  parseStoredSystemPresets,
  parseStoredUsageStats,
  readStoredIntegerWithFallback,
  readStoredStringWithFallback,
} from '../src/renderer/pages/settingsStorage';
import { readCloudSyncAuthSnapshot, readHasConfiguredMcpServers } from '../src/renderer/hooks/useChatLifecycleState';
import { hasLikelyActiveTeamWorkspace } from '../src/renderer/lib/useChatLazyServices';
import { parseStoredPromptSnippets } from '../src/renderer/hooks/usePrompts';
import { parseStoredExcludedIndices } from '../src/renderer/hooks/useChatContextOptimizer';
import { parseStoredBenchmarks } from '../src/renderer/hooks/useChatPerfBenchmarks';
import { parseBookmarkedMessageIndices } from '../src/renderer/hooks/useChatGestureInteractions';

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

  test('guards startup hook storage decoders and prompt snippets', () => {
    localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
      token: 't',
      accountId: 'a',
      encryptionSalt: 's',
    }));
    expect(readCloudSyncAuthSnapshot()).toBe(true);

    localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
      token: {},
      accountId: 'a',
      encryptionSalt: 's',
    }));
    expect(readCloudSyncAuthSnapshot()).toBe(false);

    localStorage.setItem('mcp_servers', JSON.stringify([
      { id: 'server-1', name: 'Server 1' },
      { name: 'invalid' },
    ]));
    expect(readHasConfiguredMcpServers()).toBe(true);
    localStorage.setItem('mcp_servers', JSON.stringify([{ name: 'invalid' }]));
    expect(readHasConfiguredMcpServers()).toBe(false);

    localStorage.setItem('team_workspaces_active_v1', 'workspace-1');
    localStorage.setItem('team_workspaces_v1', JSON.stringify([
      {
        id: 'workspace-1',
        modelPolicy: {
          allowedProviders: ['local'],
          allowedModelIds: ['model-1'],
        },
      },
      { id: 2 },
    ]));
    expect(hasLikelyActiveTeamWorkspace()).toBe(true);
    localStorage.setItem('team_workspaces_v1', JSON.stringify([{ id: 'workspace-2' }]));
    expect(hasLikelyActiveTeamWorkspace()).toBe(false);

    const prompts = parseStoredPromptSnippets(JSON.stringify([
      { id: '1', alias: '/code', title: 'Code', content: 'Prompt' },
      { id: '2', alias: '/bad', title: 'Bad', content: 5 },
    ]));
    expect(prompts).toEqual([{ id: '1', alias: '/code', title: 'Code', content: 'Prompt' }]);
    expect(parseStoredPromptSnippets('{bad-json')).toBeNull();
  });

  test('guards context/perf/bookmark stored payload parsing', () => {
    expect(Array.from(parseStoredExcludedIndices('[1,2,"x",-1]'))).toEqual([1, 2]);
    expect(Array.from(parseStoredExcludedIndices('{bad}'))).toEqual([]);

    localStorage.setItem('benchmarks', JSON.stringify([
      {
        timestamp: 1,
        modelId: 'model',
        mode: 'single',
        inputChars: 20,
        inputToRenderMs: 100,
        inputToFirstTokenMs: 80,
      },
      {
        timestamp: 2,
        modelId: 'bad',
        mode: 'invalid',
        inputChars: 20,
        inputToRenderMs: 100,
      },
    ]));
    const benchmarks = parseStoredBenchmarks('benchmarks');
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0].mode).toBe('single');

    expect(Array.from(parseBookmarkedMessageIndices('[1,2,-1,"x"]'))).toEqual([1, 2]);
    expect(Array.from(parseBookmarkedMessageIndices('{bad}'))).toEqual([]);
  });

  test('guards mcp, webhook, onboarding, and secondary ux service storage payloads', () => {
    localStorage.setItem('mcp_servers', JSON.stringify([
      {
        id: 'server-1',
        name: 'Server One',
        command: 'npx',
        args: ['-y', 'tool'],
        env: { A: '1', B: 2 },
      },
      { id: 'bad' },
    ]));
    localStorage.setItem('app_webhooks', JSON.stringify([
      { id: 'hook-1', name: 'Hook', url: 'https://example.com', enabled: true, events: ['conversation_complete'] },
      { id: 'hook-2', name: 'Invalid', url: 3, enabled: true, events: [] },
    ]));
    localStorage.setItem('onboarding_tutorials', JSON.stringify([
      {
        id: 'tutorial-1',
        name: 'Tutorial',
        description: 'Desc',
        completed: false,
        steps: [{ id: 'step-1', title: 'Step', description: 'Do it' }],
      },
      { id: 'bad', steps: [] },
    ]));
    localStorage.setItem('feature_discovery', JSON.stringify([
      {
        id: 'feature-1',
        featureName: 'Feature',
        description: 'Desc',
        shown: false,
        dismissed: false,
      },
      { id: 'bad' },
    ]));
    localStorage.setItem('contextual_help', JSON.stringify([
      { id: 'tooltip-1', target: '#a', title: 'A', content: 'Help' },
      { id: 'tooltip-2', target: '#b', title: 'B' },
    ]));
    localStorage.setItem('workspace_view_config', JSON.stringify({
      mode: 'grid',
      groupBy: 'category',
      sortBy: 'title',
      sortOrder: 'asc',
      showPinned: true,
      showArchived: false,
      itemsPerPage: 12,
    }));
    localStorage.setItem('accessibility_config', JSON.stringify({
      reducedMotion: true,
      highContrast: true,
      fontSize: 'large',
      touchTargetSize: 'xlarge',
      screenReader: true,
      keyboardNavigation: true,
      focusVisible: true,
      ariaLabels: true,
      colorBlindMode: 'deuteranopia',
    }));
    localStorage.setItem('accessibility_shortcuts', JSON.stringify([
      { key: 'k', action: 'focus-input', description: 'Focus input', ctrl: true },
      { key: 5, action: 'bad', description: 'bad' },
    ]));

    jest.isolateModules(() => {
      const { mcpClient } = require('../src/renderer/services/mcp') as typeof import('../src/renderer/services/mcp');
      const { webhookService } = require('../src/renderer/services/webhooks') as typeof import('../src/renderer/services/webhooks');
      const { onboardingService } = require('../src/renderer/services/onboarding') as typeof import('../src/renderer/services/onboarding');
      const { contextualHelpService } = require('../src/renderer/services/contextualHelp') as typeof import('../src/renderer/services/contextualHelp');
      const { workspaceViewsService } = require('../src/renderer/services/workspaceViews') as typeof import('../src/renderer/services/workspaceViews');
      const { accessibilityService } = require('../src/renderer/services/accessibility') as typeof import('../src/renderer/services/accessibility');

      expect(mcpClient.getServers()).toHaveLength(1);
      expect(mcpClient.getServers()[0]?.id).toBe('server-1');

      expect(webhookService.getWebhooks()).toHaveLength(1);
      expect(webhookService.getWebhooks()[0]?.id).toBe('hook-1');

      expect(onboardingService.getTutorials()).toHaveLength(1);
      expect(onboardingService.getTutorials()[0]?.id).toBe('tutorial-1');
      expect(onboardingService.getFeatureDiscoveries()).toHaveLength(1);
      expect(onboardingService.getFeatureDiscoveries()[0]?.id).toBe('feature-1');

      expect(contextualHelpService.getAllTooltips()).toHaveLength(1);
      expect(contextualHelpService.getAllTooltips()[0]?.id).toBe('tooltip-1');

      const viewConfig = workspaceViewsService.getConfig();
      expect(viewConfig.mode).toBe('grid');
      expect(viewConfig.itemsPerPage).toBe(12);

      const accessibilityConfig = accessibilityService.getConfig();
      expect(accessibilityConfig.fontSize).toBe('large');
      expect(accessibilityConfig.colorBlindMode).toBe('deuteranopia');
      expect(accessibilityService.getKeyboardShortcuts()).toHaveLength(1);
    });
  });
});
