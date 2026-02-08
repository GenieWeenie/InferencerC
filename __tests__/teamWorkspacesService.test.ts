import type { ChatMessage, Model } from '../src/shared/types';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('TeamWorkspacesService', () => {
  let teamWorkspacesService: typeof import('../src/renderer/services/teamWorkspaces').teamWorkspacesService;
  let TemplateService: typeof import('../src/renderer/services/templates').TemplateService;
  let analyticsService: typeof import('../src/renderer/services/analytics').analyticsService;

  beforeEach(() => {
    jest.resetModules();

    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });

    ({ teamWorkspacesService } = require('../src/renderer/services/teamWorkspaces'));
    ({ TemplateService } = require('../src/renderer/services/templates'));
    ({ analyticsService } = require('../src/renderer/services/analytics'));

    analyticsService.clearAnalytics();
    teamWorkspacesService.setIdentity({ userId: 'admin-user', displayName: 'Admin User' });
  });

  test('creates workspace and invite links, then accepts invite with role', () => {
    const workspace = teamWorkspacesService.createWorkspace('Engineering', 'Core team');
    const invite = teamWorkspacesService.generateInvite(workspace.id, 'viewer');

    expect(invite.inviteLink).toContain(invite.token);

    teamWorkspacesService.setIdentity({ userId: 'viewer-user', displayName: 'Viewer User' });
    const joined = teamWorkspacesService.acceptInvite(invite.token);

    const viewer = joined.members.find(member => member.id === 'viewer-user');
    expect(viewer?.role).toBe('viewer');
  });

  test('enforces role-based permissions for workspace admin actions', () => {
    const workspace = teamWorkspacesService.createWorkspace('Security');
    const invite = teamWorkspacesService.generateInvite(workspace.id, 'viewer');

    teamWorkspacesService.setIdentity({ userId: 'viewer-user', displayName: 'Viewer User' });
    teamWorkspacesService.acceptInvite(invite.token);

    expect(() => {
      teamWorkspacesService.generateInvite(workspace.id, 'member');
    }).toThrow('Insufficient workspace permissions');

    expect(() => {
      teamWorkspacesService.updateModelPolicy(workspace.id, { allowedProviders: ['openrouter'] });
    }).toThrow('Insufficient workspace permissions');
  });

  test('maintains shared template library for a workspace', () => {
    const workspace = teamWorkspacesService.createWorkspace('Templates');

    const messages: ChatMessage[] = [{ role: 'user', content: 'Template seed message' }];
    const template = TemplateService.createTemplate(
      'Workspace Template',
      'Shared prompt template',
      'general',
      messages,
      'You are helpful',
      { temperature: 0.4 },
      ['workspace']
    );

    teamWorkspacesService.setSharedTemplates(workspace.id, [template.id]);
    const shared = teamWorkspacesService.getSharedTemplates(workspace.id);

    expect(shared.map(item => item.id)).toContain(template.id);
  });

  test('filters available models using workspace provider/model policy', () => {
    const workspace = teamWorkspacesService.createWorkspace('Policy');

    const models: Model[] = [
      {
        id: 'openrouter/deepseek-chat',
        name: 'OpenRouter Model',
        pathOrUrl: 'https://openrouter.ai',
        type: 'remote-endpoint',
        status: 'loaded',
        adapter: 'mock',
      },
      {
        id: 'local-lmstudio',
        name: 'Local Model',
        pathOrUrl: 'http://localhost:1234',
        type: 'remote-endpoint',
        status: 'loaded',
        adapter: 'mock',
      },
    ];

    teamWorkspacesService.updateModelPolicy(workspace.id, { allowedProviders: ['openrouter'] });
    let filtered = teamWorkspacesService.filterAllowedModels(models);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('openrouter/deepseek-chat');

    teamWorkspacesService.updateModelPolicy(workspace.id, {
      allowedProviders: [],
      allowedModelIds: ['local-lmstudio'],
    });
    filtered = teamWorkspacesService.filterAllowedModels(models);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('local-lmstudio');
  });

  test('computes workspace-level usage analytics from conversation collection', () => {
    const workspace = teamWorkspacesService.createWorkspace('Analytics');
    teamWorkspacesService.setConversationCollection(workspace.id, ['session-a', 'session-b']);

    analyticsService.trackMessage('session-a', 'model-a', 12);
    analyticsService.trackMessage('session-b', 'model-b', 20);
    analyticsService.trackMessage('other-session', 'model-c', 99);

    const summary = teamWorkspacesService.getWorkspaceUsageSummary(workspace.id);

    expect(summary.totalMessages).toBe(2);
    expect(summary.totalTokens).toBe(32);
    expect(summary.totalSessions).toBe(2);
    expect(summary.topModels[0].modelId).toBe('model-b');
  });
});
