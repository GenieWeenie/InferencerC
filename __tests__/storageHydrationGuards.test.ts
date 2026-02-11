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
import { parseRecoveryStateFromRaw } from '../src/renderer/lib/recoveryStateStorage';

class MockLocalStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    if (index < 0 || index >= this.store.size) {
      return null;
    }
    return Array.from(this.store.keys())[index] ?? null;
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
      { id: ' 1 ', name: ' Local ', url: ' http://localhost:1234/v1 ', type: 'lm-studio' },
      { id: '1', name: 'Duplicate', url: 'http://localhost:2234/v1', type: 'lm-studio' },
      { id: 2, name: 'Bad', url: 'http://localhost', type: 'lm-studio' },
    ]));
    expect(parsedEndpoints).toHaveLength(1);
    expect(parsedEndpoints?.[0]).toEqual({
      id: '1',
      name: 'Local',
      url: 'http://localhost:1234/v1',
      type: 'lm-studio',
    });

    expect(parseStoredSystemPresets('{not-json')).toBeNull();
    const parsedPresets = parseStoredSystemPresets(JSON.stringify([
      { id: 'a', name: ' Preset ', prompt: ' Hello ' },
      { id: 'a', name: 'Duplicate', prompt: 'Ignored' },
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
    localStorage.setItem('font_size_invalid_zero', '0');
    localStorage.setItem('layout_mode', 'compact');
    expect(readStoredIntegerWithFallback('font_size', 13)).toBe(17);
    expect(readStoredIntegerWithFallback('font_size_invalid_zero', 13)).toBe(13);
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
      token: '   ',
      accountId: 'a',
      encryptionSalt: 's',
    }));
    expect(readCloudSyncAuthSnapshot()).toBe(false);

    localStorage.setItem('mcp_servers', JSON.stringify([
      { id: '   ', name: 'invalid-id' },
      { name: 'invalid' },
      { id: 'server-1', name: 'Server 1' },
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
      { id: '1', alias: ' /code ', title: ' Code ', content: ' Prompt ' },
      { id: '2', alias: '/CODE', title: 'Duplicate alias', content: 'ignored' },
      { id: '2', alias: '/bad', title: 'Bad', content: 5 },
    ]));
    expect(prompts).toEqual([{ id: '1', alias: '/code', title: 'Code', content: 'Prompt' }]);
    expect(parseStoredPromptSnippets('{bad-json')).toBeNull();
  });

  test('guards context/perf/bookmark stored payload parsing', () => {
    expect(Array.from(parseStoredExcludedIndices('[1,2,"x",-1,9007199254740992]'))).toEqual([1, 2]);
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
        modelId: 'model-2',
        mode: 'single',
        inputChars: 10,
        inputToRenderMs: 100,
        inputToFirstTokenMs: 'invalid',
      },
      {
        timestamp: 3,
        modelId: 'bad',
        mode: 'invalid',
        inputChars: 20,
        inputToRenderMs: 100,
      },
    ]));
    const benchmarks = parseStoredBenchmarks('benchmarks');
    expect(benchmarks).toHaveLength(2);
    expect(benchmarks[0].mode).toBe('single');
    expect(benchmarks[1].inputToFirstTokenMs).toBeNull();

    expect(Array.from(parseBookmarkedMessageIndices('[1,2,-1,2,2.5,"x"]'))).toEqual([1, 2]);
    expect(Array.from(parseBookmarkedMessageIndices('{bad}'))).toEqual([]);

    expect(parseRecoveryStateFromRaw(JSON.stringify({
      sessionId: ' session-1 ',
      timestamp: 5.9,
      draftMessage: '',
      pendingResponse: true,
    }))).toEqual({
      sessionId: 'session-1',
      timestamp: 5,
      pendingResponse: true,
    });
    expect(parseRecoveryStateFromRaw('{"sessionId":"","timestamp":5}')).toBeNull();
    expect(parseRecoveryStateFromRaw('{bad}')).toBeNull();
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

  test('guards refactoring/codegen/sentiment/category/tag/review storage payloads', () => {
    localStorage.setItem('refactoring_results', JSON.stringify([
      {
        originalCode: 'const a = 1;',
        refactoredCode: 'const value = 1;',
        suggestions: [{
          id: 's-1',
          type: 'rename',
          description: 'Rename variable',
          code: 'a',
          refactoredCode: 'value',
          confidence: 0.8,
          impact: 'medium',
          explanation: 'Improves readability',
        }],
        appliedSuggestions: ['s-1'],
        language: 'typescript',
        refactoredAt: 1,
      },
      { originalCode: 5 },
    ]));
    localStorage.setItem('code_generations', JSON.stringify([
      {
        code: '  export const x = 1;  ',
        language: ' typescript ',
        explanation: '  Simple export  ',
        dependencies: ['react', ' react ', '', 3],
        usage: '  import { x }  ',
        generatedAt: 2,
      },
      {
        code: 'valid but bad timestamp',
        language: 'typescript',
        generatedAt: 'bad',
      },
      { code: 'bad' },
    ]));
    localStorage.setItem('sentiment_analysis', JSON.stringify([
      {
        sessionId: 'session-1',
        overallSentiment: 0.4,
        sentimentLabel: 'positive',
        messageSentiments: [{
          messageIndex: 0,
          sentiment: 0.4,
          label: 'positive',
          confidence: 0.7,
          emotions: {
            joy: 0.4,
            sadness: 0.1,
            anger: 0.1,
            fear: 0.1,
            surprise: 0.1,
            disgust: 0.1,
            neutral: 0.1,
          },
        }],
        userSentiment: 0.5,
        assistantSentiment: 0.3,
        sentimentTrend: 'stable',
        emotions: {
          joy: 0.4,
          sadness: 0.1,
          anger: 0.1,
          fear: 0.1,
          surprise: 0.1,
          disgust: 0.1,
          neutral: 0.1,
        },
        analyzedAt: 3,
      },
      { sessionId: 'bad', overallSentiment: 'x' },
    ]));
    localStorage.setItem('custom_categories', JSON.stringify([
      { id: 'custom-1', name: 'Custom', keywords: ['alpha', 3], color: '#111' },
      { id: 2, name: 'Bad' },
    ]));
    localStorage.setItem('conversation_categories', JSON.stringify([
      {
        sessionId: 'session-1',
        primaryCategory: 'custom-1',
        secondaryCategories: ['coding'],
        confidence: 0.8,
        autoTagged: true,
        taggedAt: 4,
      },
      { sessionId: 2 },
    ]));
    localStorage.setItem('custom_tags', JSON.stringify([
      { id: 'tag-1', name: 'Alpha', color: '#fff', category: 'custom-1' },
      { id: 2, name: 'Bad' },
    ]));
    localStorage.setItem('conversation_tags', JSON.stringify([
      {
        sessionId: 'session-1',
        tags: ['alpha', 3],
        autoGenerated: true,
        taggedAt: 5,
      },
      { sessionId: 'bad', tags: 'bad' },
    ]));
    localStorage.setItem('code_reviews', JSON.stringify([
      {
        code: 'eval(foo)',
        language: 'javascript',
        issues: [{
          type: 'error',
          severity: 'critical',
          message: 'Danger',
          category: 'security',
        }],
        score: 20,
        summary: 'Has issues',
        reviewedAt: 6,
      },
      { code: 'bad' },
    ]));

    jest.isolateModules(() => {
      const { refactoringAssistantService } = require('../src/renderer/services/refactoringAssistant') as typeof import('../src/renderer/services/refactoringAssistant');
      const { codeGenerationService } = require('../src/renderer/services/codeGeneration') as typeof import('../src/renderer/services/codeGeneration');
      const { sentimentAnalysisService } = require('../src/renderer/services/sentimentAnalysis') as typeof import('../src/renderer/services/sentimentAnalysis');
      const { autoCategorizationService } = require('../src/renderer/services/autoCategorization') as typeof import('../src/renderer/services/autoCategorization');
      const { autoTaggingService } = require('../src/renderer/services/autoTagging') as typeof import('../src/renderer/services/autoTagging');
      const { codeReviewService } = require('../src/renderer/services/codeReview') as typeof import('../src/renderer/services/codeReview');

      expect(refactoringAssistantService.getHistory()).toHaveLength(1);
      expect(refactoringAssistantService.getHistory()[0]?.appliedSuggestions).toEqual(['s-1']);

      expect(codeGenerationService.getGenerationHistory()).toHaveLength(1);
      expect(codeGenerationService.getGenerationHistory()[0]?.dependencies).toEqual(['react']);
      expect(codeGenerationService.getGenerationHistory()[0]?.language).toBe('typescript');
      expect(codeGenerationService.getGenerationHistory()[0]?.explanation).toBe('Simple export');
      expect(codeGenerationService.getGenerationHistory()[0]?.usage).toBe('import { x }');

      expect(sentimentAnalysisService.getSentiment('session-1')?.sentimentLabel).toBe('positive');
      expect(sentimentAnalysisService.getSentiment('missing')).toBeNull();

      expect(autoCategorizationService.getAllCategories().some((category) => category.id === 'custom-1')).toBe(true);
      expect(autoCategorizationService.getCategorization('session-1')?.primaryCategory).toBe('custom-1');
      expect(autoCategorizationService.getConversationsByCategory('custom-1')).toEqual(['session-1']);

      expect(autoTaggingService.getCustomTags()).toHaveLength(1);
      expect(autoTaggingService.getTags('session-1')?.tags).toEqual(['alpha']);
      expect(autoTaggingService.getConversationsByTag('alpha')).toEqual(['session-1']);

      expect(codeReviewService.getReviewHistory()).toHaveLength(1);
      expect(codeReviewService.getReviewHistory()[0]?.issues).toHaveLength(1);
    });
  });

  test('guards blockchain/git/trigger/federated/scheduled/docs storage payloads', () => {
    localStorage.setItem('blockchain_config', JSON.stringify({
      enabled: 'yes',
      network: 'bad-network',
      gasPrice: 'high',
    }));
    localStorage.setItem('blockchain_transactions', JSON.stringify([
      {
        hash: '0x1',
        from: '0xabc',
        to: '0xdef',
        value: '0',
        gasUsed: 21000,
        status: 'confirmed',
        timestamp: 1,
      },
      { hash: 1 },
    ]));
    localStorage.setItem('git_config', JSON.stringify({
      enabled: true,
      autoCommit: 'yes',
      authorName: 'Dev',
    }));
    localStorage.setItem('git_commits', JSON.stringify([
      {
        id: 'commit-1',
        sessionId: 'session-1',
        messageId: 1,
        filePath: 'src/a.ts',
        code: 'const a = 1;',
        commitMessage: 'feat: add a',
        committedAt: 2,
        success: true,
      },
      { id: 'bad' },
    ]));
    localStorage.setItem('trigger_rules', JSON.stringify([
      {
        id: 'rule-1',
        name: 'Rule',
        conditions: [{ type: 'keyword', operator: 'contains', value: 'error' }],
        actions: [{ type: 'send-notification', config: { title: 'Alert' } }],
        enabled: true,
        priority: 1,
        triggerCount: 0,
        createdAt: 3,
      },
      { id: 'bad' },
    ]));
    localStorage.setItem('trigger_executions', JSON.stringify([
      {
        ruleId: 'rule-1',
        triggeredAt: 4,
        conditionsMatched: [{ type: 'keyword', operator: 'contains', value: 'error' }],
        actionsExecuted: [{ type: 'send-notification', config: { title: 'Alert' } }],
        success: true,
      },
      { ruleId: 5 },
    ]));
    localStorage.setItem('federated_learning_config', JSON.stringify({
      enabled: true,
      participationMode: 'unsupported',
      trainingRounds: 'bad',
    }));
    localStorage.setItem('federated_updates', JSON.stringify([
      {
        round: 1,
        modelWeights: 'abc',
        sampleCount: 100,
        metrics: { loss: 0.2, accuracy: 0.8 },
        timestamp: 5,
      },
      { round: 'bad' },
    ]));
    localStorage.setItem('scheduled_conversations', JSON.stringify([
      {
        id: 'schedule-1',
        name: 'Morning',
        prompt: 'Check status',
        modelId: 'model-1',
        scheduledTime: 1000,
        recurrence: { type: 'daily' },
        enabled: true,
        nextRun: 2000,
        runCount: 0,
        createdAt: 6,
      },
      { id: 'bad' },
    ]));
    localStorage.setItem('scheduled_runs', JSON.stringify([
      {
        scheduleId: 'schedule-1',
        executedAt: 3000,
        result: { success: true, messageId: 'm1' },
      },
      { scheduleId: 1 },
    ]));
    localStorage.setItem('documentation_results', JSON.stringify([
      {
        code: 'function x() {}',
        language: 'javascript',
        documentedCode: '/** x */\\nfunction x() {}',
        documentation: 'Docs',
        format: 'jsdoc',
        generatedAt: 7,
      },
      { code: 8 },
    ]));

    jest.isolateModules(() => {
      const { blockchainIntegrationService } = require('../src/renderer/services/blockchainIntegration') as typeof import('../src/renderer/services/blockchainIntegration');
      const { gitIntegrationService } = require('../src/renderer/services/gitIntegration') as typeof import('../src/renderer/services/gitIntegration');
      const { triggerActionsService } = require('../src/renderer/services/triggerActions') as typeof import('../src/renderer/services/triggerActions');
      const { federatedLearningService } = require('../src/renderer/services/federatedLearning') as typeof import('../src/renderer/services/federatedLearning');
      const { scheduledConversationsService } = require('../src/renderer/services/scheduledConversations') as typeof import('../src/renderer/services/scheduledConversations');
      const { documentationGeneratorService } = require('../src/renderer/services/documentationGenerator') as typeof import('../src/renderer/services/documentationGenerator');

      const blockchainConfig = blockchainIntegrationService.getConfig();
      expect(blockchainConfig.enabled).toBe(false);
      expect(blockchainConfig.network).toBe('local');
      expect(blockchainIntegrationService.getTransactionHistory()).toHaveLength(1);

      const gitConfig = gitIntegrationService.getConfig();
      expect(gitConfig.enabled).toBe(true);
      expect(gitConfig.autoCommit).toBe(false);
      expect(gitConfig.authorName).toBe('Dev');
      expect(gitIntegrationService.getCommitHistory()).toHaveLength(1);

      expect(triggerActionsService.getAllRules()).toHaveLength(1);
      expect(triggerActionsService.getExecutionHistory()).toHaveLength(1);

      const federatedConfig = federatedLearningService.getConfig();
      expect(federatedConfig.enabled).toBe(true);
      expect(federatedConfig.participationMode).toBe('disabled');
      expect(federatedConfig.trainingRounds).toBe(10);
      expect(federatedLearningService.getLocalUpdates()).toHaveLength(1);

      expect(scheduledConversationsService.getAllSchedules()).toHaveLength(1);
      expect(scheduledConversationsService.getRunHistory('schedule-1')).toHaveLength(1);
      scheduledConversationsService.stopScheduler();

      expect(documentationGeneratorService.getHistory()).toHaveLength(1);
    });
  });

  test('guards layout/gestures/versioning/chaining/summaries/agents storage payloads', () => {
    localStorage.setItem('layout_config', JSON.stringify({
      panels: [
        { id: 'main', type: 'sidebar', position: 'left', size: 80, visible: true, order: 0 },
        { id: 'bad', type: 'unknown', position: 'left', size: 20, visible: true, order: 1 },
      ],
      currentPreset: 'preset-1',
      customPresets: [
        {
          id: 'preset-1',
          name: 'Custom',
          description: 'Custom preset',
          panels: [{ id: 'main', type: 'sidebar', position: 'left', size: 80, visible: true, order: 0 }],
          createdAt: 1,
        },
        { id: 'bad' },
      ],
    }));
    localStorage.setItem('gesture_config', JSON.stringify({
      enablePinchZoom: true,
      enableSwipeNavigation: 'yes',
      enableLongPress: true,
      pinchSensitivity: 99,
      swipeSensitivity: -5,
      longPressDuration: 20,
    }));
    localStorage.setItem('versioned_prompts', JSON.stringify([
      {
        id: 'vp-1',
        name: 'Prompt',
        description: 'Desc',
        category: 'general',
        versions: [
          {
            id: 'v-1',
            promptId: 'vp-1',
            version: 1,
            content: 'Hello',
            createdAt: 1,
            isActive: true,
            tags: ['alpha', 2],
            metrics: {
              useCount: 1,
              avgResponseTime: 100,
              avgTokensUsed: 50,
              successRate: 1,
              userRatings: [5, 'bad'],
              avgRating: 5,
            },
          },
        ],
        activeVersionId: 'v-1',
        createdAt: 1,
        updatedAt: 1,
        tags: ['alpha', 2],
      },
      { id: 2 },
    ]));
    localStorage.setItem('prompt_chains', JSON.stringify([
      {
        id: 'chain-custom-1',
        name: 'Custom Chain',
        description: 'Desc',
        version: 1,
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'prompt',
            prompt: 'Hello {{input}}',
          },
        ],
        outputStep: 'step-1',
        createdAt: 1,
        updatedAt: 1,
        usageCount: 0,
        tags: ['alpha', 3],
      },
      { id: 'bad-chain' },
    ]));
    localStorage.setItem('conversation_summaries', JSON.stringify([
      {
        id: 'summary-1',
        sessionId: 'session-1',
        summary: 'Summary',
        keyPoints: ['One', 2],
        topics: ['Topic', 3],
        messageCount: 12,
        generatedAt: 2,
      },
      { id: 'bad-summary' },
    ]));
    localStorage.setItem('ai_agents', JSON.stringify([
      {
        id: 'agent-1',
        name: 'Agent',
        description: 'Desc',
        role: 'helper',
        capabilities: ['analyze', 2],
        model: 'model-1',
        systemPrompt: 'You are helpful',
        isActive: true,
        taskQueue: [
          {
            id: 'task-1',
            agentId: 'agent-1',
            type: 'analysis',
            description: 'Analyze',
            parameters: { depth: 'high' },
            status: 'pending',
            createdAt: 3,
          },
          { id: 'bad-task' },
        ],
        completedTasks: [],
        createdAt: 1,
        lastActive: 2,
      },
      { id: 'bad-agent' },
    ]));

    jest.isolateModules(() => {
      const { layoutCustomizationService } = require('../src/renderer/services/layoutCustomization') as typeof import('../src/renderer/services/layoutCustomization');
      const { gestureService } = require('../src/renderer/services/gestures') as typeof import('../src/renderer/services/gestures');
      const promptVersioningModule = require('../src/renderer/services/promptVersioning') as typeof import('../src/renderer/services/promptVersioning');
      const promptChainingModule = require('../src/renderer/services/promptChaining') as typeof import('../src/renderer/services/promptChaining');
      const summarizationModule = require('../src/renderer/services/summarization') as typeof import('../src/renderer/services/summarization');
      const { aiAgentsService } = require('../src/renderer/services/aiAgents') as typeof import('../src/renderer/services/aiAgents');

      const layout = layoutCustomizationService.getLayout();
      expect(layout.panels).toHaveLength(1);
      expect(layout.customPresets).toHaveLength(1);

      const gestureConfig = gestureService.getConfig();
      expect(gestureConfig.enableSwipeNavigation).toBe(true);
      expect(gestureConfig.pinchSensitivity).toBe(5);
      expect(gestureConfig.swipeSensitivity).toBe(0.1);
      expect(gestureConfig.longPressDuration).toBe(250);

      const promptService = promptVersioningModule.default;
      const prompts = promptService.getAllPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]?.tags).toEqual(['alpha']);
      expect(prompts[0]?.versions[0]?.metrics?.userRatings).toEqual([5]);

      const chainService = promptChainingModule.default;
      const customChain = chainService.getChain('chain-custom-1');
      expect(customChain?.tags).toEqual(['alpha']);
      expect(customChain?.steps).toHaveLength(1);

      const summarizationService = summarizationModule.default;
      expect(summarizationService.getCachedSummary('session-1')?.topics).toEqual(['Topic']);
      expect(summarizationService.getCachedSummary('missing')).toBeNull();

      const agents = aiAgentsService.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0]?.capabilities).toEqual(['analyze']);
      expect(agents[0]?.taskQueue).toHaveLength(1);
    });
  });

  test('guards testcase/autoresponse/variables/topic/bci/macro storage payloads', () => {
    localStorage.setItem('test_case_generations', JSON.stringify([
      {
        testCode: '  it(\"works\", () => {});  ',
        language: ' typescript ',
        framework: ' vitest ',
        testCases: [
          { name: ' works ', description: ' basic ', code: ' it(\"works\") ' },
          { name: 'bad', description: '', code: 'noop' },
        ],
        setupCode: '  beforeEach(() => {})  ',
        teardownCode: '  afterEach(() => {})  ',
        generatedAt: 1,
      },
      {
        testCode: 'valid-code',
        language: 'typescript',
        testCases: [],
        generatedAt: 'bad',
      },
      { testCode: 3 },
    ]));
    localStorage.setItem('auto_responses', JSON.stringify([
      {
        id: 'resp-1',
        name: 'Greeting',
        triggers: [
          { type: 'contains', value: 'hello', caseSensitive: false },
          { type: 'bad', value: 'oops' },
        ],
        response: 'Hi there',
        enabled: true,
        priority: 1,
        matchCount: 2,
        createdAt: 2,
      },
      { id: 'resp-bad' },
    ]));
    localStorage.setItem('prompt_custom_variables', JSON.stringify({
      team_name: 'Inferencer',
      ' team_alias ': '  inferencer-labs  ',
      '   ': 'bad-key',
      bad_number: 7,
    }));
    localStorage.setItem('topic_models', JSON.stringify([
      {
        sessionId: 'session-1',
        topics: [
          {
            id: 'topic-1',
            name: 'Code',
            keywords: ['code', 2],
            weight: 0.8,
            messageIndices: [0, 1, 'x'],
            frequency: 2,
          },
        ],
        primaryTopic: {
          id: 'topic-1',
          name: 'Code',
          keywords: ['code'],
          weight: 0.8,
          messageIndices: [0, 1],
          frequency: 2,
        },
        topicDistribution: { 'topic-1': 0.8, bad: 'x' },
        analyzedAt: 3,
      },
      { sessionId: 2 },
    ]));
    localStorage.setItem('bci_config', JSON.stringify({
      enabled: true,
      deviceType: 'unsupported',
      samplingRate: 5000,
      sensitivity: -1,
      thoughtThreshold: 7,
    }));
    localStorage.setItem('bci_patterns', JSON.stringify([
      { pattern: 'focus', meaning: 'User focused', confidence: 0.9 },
      { pattern: 'bad', meaning: 1, confidence: 0.5 },
    ]));
    localStorage.setItem('macros', JSON.stringify([
      {
        id: 'macro-1',
        name: 'Macro',
        actions: [
          { type: 'type', timestamp: 0, data: { text: 'Hello' } },
          { type: 'unknown', timestamp: 1, data: {} },
        ],
        createdAt: 4,
        playCount: 1,
      },
      { id: 'macro-bad' },
    ]));
    localStorage.setItem('macro_playbacks', JSON.stringify([
      {
        macroId: 'macro-1',
        startedAt: 5,
        completedAt: 6,
        success: true,
        actionsExecuted: 1,
      },
      { macroId: 2 },
    ]));

    jest.isolateModules(() => {
      const { testCaseGenerationService } = require('../src/renderer/services/testCaseGeneration') as typeof import('../src/renderer/services/testCaseGeneration');
      const { autoResponsesService } = require('../src/renderer/services/autoResponses') as typeof import('../src/renderer/services/autoResponses');
      const promptVariablesModule = require('../src/renderer/services/promptVariables') as typeof import('../src/renderer/services/promptVariables');
      const { topicModelingService } = require('../src/renderer/services/topicModeling') as typeof import('../src/renderer/services/topicModeling');
      const { bciService } = require('../src/renderer/services/brainComputerInterface') as typeof import('../src/renderer/services/brainComputerInterface');
      const { macroRecordingService } = require('../src/renderer/services/macroRecording') as typeof import('../src/renderer/services/macroRecording');

      expect(testCaseGenerationService.getTestCaseHistory()).toHaveLength(1);
      expect(testCaseGenerationService.getTestCaseHistory()[0]?.framework).toBe('vitest');
      expect(testCaseGenerationService.getTestCaseHistory()[0]?.testCode).toBe('it(\"works\", () => {});');
      expect(testCaseGenerationService.getTestCaseHistory()[0]?.testCases).toEqual([
        { name: 'works', description: 'basic', code: 'it(\"works\")' },
      ]);

      const responses = autoResponsesService.getAllResponses();
      expect(responses).toHaveLength(1);
      expect(responses[0]?.triggers).toHaveLength(1);
      expect(autoResponsesService.checkAutoResponse('hello there')?.id).toBe('resp-1');

      const promptVariablesService = promptVariablesModule.default;
      const customVars = promptVariablesService.getCustomVariables();
      expect(customVars.get('team_name')).toBe('Inferencer');
      expect(customVars.get('team_alias')).toBe('inferencer-labs');
      expect(customVars.has('bad_number')).toBe(false);

      const importResult = promptVariablesService.importVariables(JSON.stringify({
        ' new_key ': '  new value  ',
        '   ': 'bad',
        non_string: 3,
      }));
      expect(importResult.imported).toBe(1);
      expect(importResult.errors).toEqual(expect.arrayContaining([
        'Skipped entry with empty variable name',
        'Skipped "non_string": value must be a string',
      ]));
      expect(promptVariablesService.getCustomVariables().get('new_key')).toBe('new value');

      expect(topicModelingService.getAllTopicModels()).toHaveLength(1);
      expect(topicModelingService.getTopicModel('session-1')?.topics[0]?.keywords).toEqual(['code']);
      expect(topicModelingService.getTopicModel('session-1')?.topics[0]?.messageIndices).toEqual([0, 1]);

      const bciConfig = bciService.getConfig();
      expect(bciConfig.deviceType).toBe('simulated');
      expect(bciConfig.samplingRate).toBe(2000);
      expect(bciConfig.sensitivity).toBe(0);
      expect(bciConfig.thoughtThreshold).toBe(1);
      expect(bciService.getLearnedPatterns()).toHaveLength(1);

      expect(macroRecordingService.getAllMacros()).toHaveLength(1);
      expect(macroRecordingService.getAllMacros()[0]?.actions).toHaveLength(1);
      expect(macroRecordingService.getPlaybackHistory()).toHaveLength(1);
    });
  });

  test('guards crash recovery, api docs, and rag embedding cache hydration', async () => {
    const validEmbedding = Array.from({ length: 128 }, () => 0.125);
    localStorage.setItem('app_recovery_state', JSON.stringify({
      sessionId: '   ',
      timestamp: 1,
      draftMessage: 'draft',
    }));
    localStorage.setItem('api_documentations', JSON.stringify([
      {
        id: 'doc-1',
        sessionId: 'session-1',
        title: 'Stored API',
        description: 'Stored description',
        endpoints: [
          {
            method: 'GET',
            path: '/status',
            description: 'Status endpoint',
            responses: [{ statusCode: 200, description: 'OK' }],
          },
        ],
        models: [],
        examples: [],
        generatedAt: 10,
      },
      { id: 'bad-doc' },
    ]));
    localStorage.setItem('rag_embedding_cache_v1', JSON.stringify({
      valid: validEmbedding,
      invalidShort: [0.2, 0.3],
      invalidType: ['x'],
    }));

    let crashRecoveryService: typeof import('../src/renderer/services/crashRecovery').crashRecoveryService;
    let apiDocsGeneratorService: typeof import('../src/renderer/services/apiDocsGenerator').apiDocsGeneratorService;
    let ragDocumentChatService: typeof import('../src/renderer/services/ragDocumentChat').ragDocumentChatService;
    let HistoryService: typeof import('../src/renderer/services/history').HistoryService;

    jest.isolateModules(() => {
      ({ crashRecoveryService } = require('../src/renderer/services/crashRecovery') as typeof import('../src/renderer/services/crashRecovery'));
      ({ apiDocsGeneratorService } = require('../src/renderer/services/apiDocsGenerator') as typeof import('../src/renderer/services/apiDocsGenerator'));
      ({ ragDocumentChatService } = require('../src/renderer/services/ragDocumentChat') as typeof import('../src/renderer/services/ragDocumentChat'));
      ({ HistoryService } = require('../src/renderer/services/history') as typeof import('../src/renderer/services/history'));
    });

    expect(crashRecoveryService.getRecoveryState()).toBeNull();
    crashRecoveryService.saveRecoveryState({
      sessionId: 'session-1',
      timestamp: Date.now(),
      draftMessage: '',
      pendingResponse: true,
    });
    expect(crashRecoveryService.getRecoveryState()?.pendingResponse).toBe(true);

    expect(apiDocsGeneratorService.getAllDocumentations()).toHaveLength(1);
    expect(apiDocsGeneratorService.getAllDocumentations()[0]?.title).toBe('Stored API');

    HistoryService.saveSession({
      id: 'session-api',
      title: 'API Session',
      lastModified: Date.now(),
      modelId: 'model-1',
      messages: [
        { role: 'user', content: 'Create API docs for service health endpoint' },
      ],
    });

    const generated = await apiDocsGeneratorService.generateDocs('session-api', async () => ({
      content: JSON.stringify({
        title: 'Generated API',
        description: 'Generated docs',
        endpoints: [
          {
            method: 'GET',
            path: '/health',
            description: 'Health check',
            responses: [{ statusCode: 200, description: 'OK' }],
          },
          {
            method: 'INVALID',
            path: 'health',
            description: 'Bad endpoint',
            responses: [{ statusCode: 200, description: 'OK' }],
          },
        ],
        examples: [
          {
            title: 'Health Request',
            request: { method: 'GET', url: '/health' },
            response: { status: 200, body: { ok: true } },
          },
          {
            title: 'Bad Example',
            request: { method: 1, url: '/health' },
            response: { status: 200, body: {} },
          },
        ],
      }),
    }));

    expect(generated).not.toBeNull();
    expect(generated?.endpoints).toHaveLength(1);
    expect(generated?.endpoints[0]?.path).toBe('/health');
    expect(generated?.examples).toHaveLength(1);

    const cacheStats = ragDocumentChatService.getEmbeddingCacheStats();
    expect(cacheStats.entries).toBe(1);

    localStorage.setItem('app_session_chunk-fallback', JSON.stringify({
      id: 'chunk-fallback',
      title: 'Chunk fallback',
      lastModified: 1,
      modelId: 'model-1',
      messages: [
        { role: 'assistant', content: '', _contentChunked: true },
      ],
    }));
    localStorage.setItem('app_message_content_chunk-fallback_0', '{bad-json');
    const chunkFallbackSession = HistoryService.getSession('chunk-fallback');
    expect(chunkFallbackSession?.messages[0]?.content).toBe('{bad-json');
  });

  test('guards enterprise compliance storage hydration for sso/session/retention/audit logs', () => {
    const now = Date.now();
    localStorage.setItem('enterprise_sso_config_v1', JSON.stringify({
      saml: { enabled: true, entryPoint: ' https://sso.example.com ', issuer: ' issuer ', certificate: 7, relayState: ' rel ' },
      oidc: { enabled: true, issuerUrl: ' https://issuer.example.com ', authorizationEndpoint: ' https://issuer.example.com/auth ', tokenEndpoint: ' https://issuer.example.com/token ', clientId: ' client ', scopes: ['openid', 'email', 'openid', 2] },
      allowPasswordFallback: 'yes',
    }));
    localStorage.setItem('enterprise_retention_policy_v1', JSON.stringify({
      enabled: true,
      retentionDays: -2,
      anonymizePII: false,
      purgeIntervalHours: 0,
    }));
    localStorage.setItem('enterprise_audit_logs_v1', JSON.stringify([
      {
        id: 'log-1',
        timestamp: now,
        category: 'enterprise.sso',
        action: 'login',
        result: 'success',
        actor: { id: 'user-1', name: 'Alice', role: 'admin' },
        details: { ipAddress: '127.0.0.1' },
        piiFields: ['ipAddress', 2],
      },
      { id: 'bad-log', timestamp: 'x' },
    ]));
    localStorage.setItem('enterprise_sso_session_v1', JSON.stringify({
      sessionId: ' session-1 ',
      protocol: 'saml2',
      userId: ' user-1 ',
      email: ' USER@EXAMPLE.COM ',
      displayName: ' Alice ',
      issuedAt: now - 1000,
      expiresAt: now + 60_000,
    }));

    jest.isolateModules(() => {
      const { enterpriseComplianceService } = require('../src/renderer/services/enterpriseCompliance') as typeof import('../src/renderer/services/enterpriseCompliance');

      const ssoConfig = enterpriseComplianceService.getSSOConfig();
      expect(ssoConfig.saml.entryPoint).toBe('https://sso.example.com');
      expect(ssoConfig.saml.issuer).toBe('issuer');
      expect(ssoConfig.oidc.scopes).toEqual(['openid', 'email']);
      expect(ssoConfig.allowPasswordFallback).toBe(true);

      const retentionPolicy = enterpriseComplianceService.getRetentionPolicy();
      expect(retentionPolicy.retentionDays).toBe(1);
      expect(retentionPolicy.purgeIntervalHours).toBe(1);
      expect(retentionPolicy.anonymizePII).toBe(false);

      const logs = enterpriseComplianceService.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.piiFields).toEqual(['ipAddress']);

      const session = enterpriseComplianceService.getSSOSession();
      expect(session?.sessionId).toBe('session-1');
      expect(session?.email).toBe('user@example.com');
      expect(session?.displayName).toBe('Alice');
    });
  });

  test('guards cloud sync config/state hydration and collaboration payload decoding', async () => {
    localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
      enabled: 'yes',
      baseUrl: ' https://sync.example.com/ ',
      token: ' token-1 ',
      accountId: ' acct-1 ',
      email: ' user@example.com ',
      encryptionSalt: ' c2FsdA== ',
      deviceId: '',
      syncSettings: 'true',
      syncTemplates: false,
      selectedConversationIds: ['session-1', 2, ' session-2 ', 'session-1'],
    }));
    localStorage.setItem('cloud_sync_state_v1_acct-1', JSON.stringify({
      accountId: 9,
      lastSyncedAt: 'bad',
      conversations: {
        'session-1': { serverVersion: 2, lastSyncedHash: 'hash-1' },
        'session-bad': { serverVersion: 'x', lastSyncedHash: 'bad' },
      },
      settings: { serverVersion: 4, lastSyncedHash: 'settings-hash' },
      templates: { serverVersion: 'x', lastSyncedHash: 'templates-hash' },
    }));
    localStorage.setItem('collaboration_config', JSON.stringify({
      enabled: true,
      baseUrl: ' https://collab.example.com/ ',
      displayName: '  Dev User  ',
      pollTimeoutMs: 999999,
      autoJoin: 'yes',
    }));

    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ participantId: 3, eventCursor: 1, session: {} }),
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    });

    try {
      let cloudSyncService: typeof import('../src/renderer/services/cloudSync').cloudSyncService;
      let realTimeCollaborationService: typeof import('../src/renderer/services/realTimeCollaboration').realTimeCollaborationService;

      jest.isolateModules(() => {
        ({ cloudSyncService } = require('../src/renderer/services/cloudSync') as typeof import('../src/renderer/services/cloudSync'));
        ({ realTimeCollaborationService } = require('../src/renderer/services/realTimeCollaboration') as typeof import('../src/renderer/services/realTimeCollaboration'));
      });

      const cloudConfig = cloudSyncService.getConfig();
      expect(cloudConfig.baseUrl).toBe('https://sync.example.com');
      expect(cloudConfig.accountId).toBe('acct-1');
      expect(cloudConfig.selectedConversationIds).toEqual(['session-1', 'session-2']);
      expect(cloudConfig.syncSettings).toBe(true);

      const syncStatus = cloudSyncService.getSyncStatus();
      expect(syncStatus).not.toBeNull();
      expect(syncStatus?.syncedConversationCount).toBe(1);
      expect(syncStatus?.syncedSettings).toBe(true);
      expect(syncStatus?.syncedTemplates).toBe(false);

      const collaborationConfig = realTimeCollaborationService.getConfig();
      expect(collaborationConfig.baseUrl).toBe('https://collab.example.com');
      expect(collaborationConfig.displayName).toBe('Dev User');
      expect(collaborationConfig.pollTimeoutMs).toBe(30000);
      expect(collaborationConfig.autoJoin).toBe(false);

      await expect(realTimeCollaborationService.createSession('Team')).rejects.toThrow('Invalid collaboration create-session response');
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true,
        writable: true,
      });
    }
  });

  test('guards plugin storage hydration and uses shared recovery-state sanitizer across services', () => {
    localStorage.setItem('plugins', JSON.stringify([
      {
        manifest: {
          id: 'safe.plugin',
          name: ' Safe Plugin ',
          version: ' 1.0.0 ',
          description: ' Plugin desc ',
          author: ' Dev ',
          entryPoint: ' plugin.js ',
          permissions: [{ type: 'storage', scope: ' cache ' }],
          apiVersion: ' 1.0.0 ',
          commands: [{ id: ' run ', label: ' Run ', keywords: ['alpha', 'alpha'] }],
        },
        enabled: true,
        installedAt: 12.9,
        lastUpdated: 'bad',
      },
      {
        manifest: {
          id: 'bad:plugin',
          name: 'Bad',
          version: '1.0.0',
          description: 'Bad',
          author: 'Bad',
          entryPoint: 'bad.js',
          permissions: [],
          apiVersion: '1.0.0',
        },
        enabled: true,
        installedAt: 1,
      },
    ]));
    localStorage.setItem('app_recovery_state', JSON.stringify({
      sessionId: '   ',
      timestamp: Date.now(),
      draftMessage: 'draft',
    }));

    jest.isolateModules(() => {
      const { pluginSystemService } = require('../src/renderer/services/pluginSystem') as typeof import('../src/renderer/services/pluginSystem');
      const { crashRecoveryService } = require('../src/renderer/services/crashRecovery') as typeof import('../src/renderer/services/crashRecovery');
      const { HistoryService } = require('../src/renderer/services/history') as typeof import('../src/renderer/services/history');

      const plugins = pluginSystemService.getAllPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.manifest.id).toBe('safe.plugin');
      expect(plugins[0]?.manifest.name).toBe('Safe Plugin');
      expect(plugins[0]?.manifest.permissions[0]?.scope).toBe('cache');
      expect(plugins[0]?.manifest.commands?.[0]?.keywords).toEqual(['alpha']);
      expect(plugins[0]?.installedAt).toBe(12);

      expect(crashRecoveryService.getRecoveryState()).toBeNull();
      expect(HistoryService.getRecoveryState()).toBeNull();

      crashRecoveryService.saveRecoveryState({
        sessionId: ' session-1 ',
        timestamp: 10.7,
        draftMessage: '',
        pendingResponse: true,
      });
      expect(HistoryService.getRecoveryState()).toEqual({
        sessionId: 'session-1',
        timestamp: 10,
        draftMessage: undefined,
        pendingResponse: true,
      });

      HistoryService.saveRecoveryState({
        sessionId: ' session-2 ',
        timestamp: 23.2,
        draftMessage: 'hello',
        pendingResponse: false,
      });
      expect(crashRecoveryService.getRecoveryState()).toEqual({
        sessionId: 'session-2',
        timestamp: 23,
        draftMessage: 'hello',
        pendingResponse: false,
      });
    });
  });
});
