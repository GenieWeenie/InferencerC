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
        code: 'export const x = 1;',
        language: 'typescript',
        explanation: 'Simple export',
        dependencies: ['react', 3],
        usage: 'import { x }',
        generatedAt: 2,
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
        testCode: 'it(\"works\", () => {});',
        language: 'typescript',
        framework: 'vitest',
        testCases: [{ name: 'works', description: 'basic', code: 'it(\"works\")' }],
        setupCode: 'beforeEach(() => {})',
        teardownCode: 'afterEach(() => {})',
        generatedAt: 1,
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

      const responses = autoResponsesService.getAllResponses();
      expect(responses).toHaveLength(1);
      expect(responses[0]?.triggers).toHaveLength(1);
      expect(autoResponsesService.checkAutoResponse('hello there')?.id).toBe('resp-1');

      const promptVariablesService = promptVariablesModule.default;
      const customVars = promptVariablesService.getCustomVariables();
      expect(customVars.get('team_name')).toBe('Inferencer');
      expect(customVars.has('bad_number')).toBe(false);

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
});
