/**
 * @jest-environment jsdom
 */

describe('persisted data parse guards', () => {
    beforeEach(() => {
        jest.resetModules();
        localStorage.clear();
    });

    it('ignores malformed workflow entries while keeping valid ones', () => {
        localStorage.setItem('workflows', JSON.stringify([
            {
                id: 'wf-valid',
                name: 'Valid Workflow',
                enabled: true,
                priority: 1,
                conditions: [{ type: 'keyword', operator: 'contains', value: 'hello' }],
                actions: [{ type: 'send-notification', value: 'notify' }],
            },
            {
                id: 'wf-invalid',
                name: 'Invalid Workflow',
                enabled: true,
                priority: 1,
                conditions: [{ type: 'keyword', operator: 'contains', value: 42 }],
                actions: [{ type: 'send-notification', value: 'notify' }],
            },
        ]));

        jest.isolateModules(() => {
            const { workflowsService } = require('../workflows') as typeof import('../workflows');
            const workflows = workflowsService.getAllWorkflows();
            expect(workflows).toHaveLength(1);
            expect(workflows[0]?.id).toBe('wf-valid');
        });
    });

    it('drops malformed A/B test records from storage', () => {
        localStorage.setItem('ab_tests', JSON.stringify([
            {
                id: 'test-valid',
                name: 'Valid Test',
                input: 'What is 2+2?',
                createdAt: 1,
                status: 'draft',
                variants: [
                    { id: 'variant-a', name: 'A', prompt: 'Answer clearly.' },
                ],
            },
            {
                id: 'test-invalid',
                name: 'Invalid Test',
                input: 'Bad',
                createdAt: 1,
                status: 'draft',
                variants: [{ id: 'variant-b', name: 'B', prompt: 123 }],
            },
        ]));

        jest.isolateModules(() => {
            const { abTestingService } = require('../abTesting') as typeof import('../abTesting');
            const tests = abTestingService.getAllTests();
            expect(tests).toHaveLength(1);
            expect(tests[0]?.id).toBe('test-valid');
        });
    });

    it('sanitizes workspace storage and ignores invalid records', () => {
        localStorage.setItem('team_workspaces_v1', JSON.stringify([
            {
                id: 'workspace-valid',
                name: 'Workspace',
                createdAt: 1,
                updatedAt: 2,
                members: [],
                invites: [],
                sharedTemplateIds: [],
                conversationIds: [],
                modelPolicy: {
                    allowedProviders: ['lm-studio'],
                    allowedModelIds: ['model-a'],
                },
            },
            {
                id: 123,
                name: 'bad',
            },
        ]));

        jest.isolateModules(() => {
            const { teamWorkspacesService } = require('../teamWorkspaces') as typeof import('../teamWorkspaces');
            const workspaces = teamWorkspacesService.getWorkspaces();
            expect(workspaces).toHaveLength(1);
            expect(workspaces[0]?.id).toBe('workspace-valid');
            expect(workspaces[0]?.modelPolicy.allowedProviders).toEqual(['lm-studio']);
        });
    });

    it('loads template defaults when persisted payload is malformed', () => {
        localStorage.setItem('conversation_templates', '{invalid-json');
        localStorage.setItem('template_categories', JSON.stringify([{ id: 5 }]));

        jest.isolateModules(() => {
            const templateModule = require('../templates') as typeof import('../templates');
            const allTemplates = templateModule.default.getAllTemplates();
            expect(allTemplates.length).toBeGreaterThan(0);
            expect(templateModule.default.getTemplate('template-code-review')).toBeDefined();
        });
    });

    it('falls back to safe cloud sync config defaults for malformed persisted values', () => {
        localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
            enabled: 'yes',
            baseUrl: 123,
            syncSettings: 'on',
            syncTemplates: 1,
            selectedConversationIds: [1, 'session-1'],
        }));

        jest.isolateModules(() => {
            const { cloudSyncService } = require('../cloudSync') as typeof import('../cloudSync');
            const config = cloudSyncService.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.baseUrl).toBe('http://localhost:3000');
            expect(config.syncSettings).toBe(true);
            expect(config.syncTemplates).toBe(true);
            expect(config.selectedConversationIds).toEqual(['session-1']);
        });
    });
});
