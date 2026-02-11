/**
 * @jest-environment jsdom
 */

describe('runtime parse guards', () => {
    beforeEach(() => {
        jest.resetModules();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('resolves prompt-chaining JSON array paths safely', () => {
        const { PromptChainingService } = require('../promptChaining') as typeof import('../promptChaining');
        const context = {
            input: 'hello',
            stepResults: new Map([
                ['analyze', {
                    stepId: 'analyze',
                    input: '',
                    output: '{"items":[{"name":"alice"}]}',
                    startedAt: 0,
                    completedAt: 1,
                    retryCount: 0,
                }],
            ]),
            variables: {},
        };

        expect(PromptChainingService.resolveVariables('{{analyze.items.0.name}}', context)).toBe('alice');
    });

    it('falls back to raw prompt-chaining output when step JSON is malformed', () => {
        const { PromptChainingService } = require('../promptChaining') as typeof import('../promptChaining');
        const context = {
            input: 'hello',
            stepResults: new Map([
                ['analyze', {
                    stepId: 'analyze',
                    input: '',
                    output: 'not-json',
                    startedAt: 0,
                    completedAt: 1,
                    retryCount: 0,
                }],
            ]),
            variables: {},
        };

        expect(PromptChainingService.resolveVariables('{{analyze.items.0.name}}', context)).toBe('not-json');
    });

    it('falls back to rule-based smart suggestions when AI JSON payload is malformed', async () => {
        const { smartSuggestionsService } = require('../smartSuggestions') as typeof import('../smartSuggestions');
        const suggestions = await smartSuggestionsService.generateAISuggestions(
            [{ role: 'user', content: 'How do I fix this code error?' }],
            async () => ({ content: '```json\n{"invalid":true}\n```' })
        );

        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
    });

    it('returns empty refactoring suggestions when AI payload does not contain an array', async () => {
        const { refactoringAssistantService } = require('../refactoringAssistant') as typeof import('../refactoringAssistant');
        const suggestions = await refactoringAssistantService.suggestRefactorings(
            'const value = 1;',
            'typescript',
            async () => ({ content: '{"not":"an-array"}' })
        );

        expect(suggestions).toEqual([]);
    });

    it('surfaces readable blockchain retrieval errors for invalid persisted payloads', async () => {
        localStorage.setItem('blockchain_config', JSON.stringify({ enabled: true, network: 'local' }));
        localStorage.setItem('blockchain_tx-1', JSON.stringify({
            blockNumber: 1,
            transactionHash: 'tx-1',
            sessionId: 'session-1',
            encryptedData: 'not-json',
            timestamp: 1,
            blockHash: 'block-1',
        }));

        const { blockchainIntegrationService } = require('../blockchainIntegration') as typeof import('../blockchainIntegration');
        await expect(blockchainIntegrationService.retrieveConversation('tx-1'))
            .rejects
            .toThrow('Stored blockchain conversation is unreadable');
    });

    it('returns empty analytics usage stats for malformed persisted analytics payloads', () => {
        localStorage.setItem('inferencer-analytics', '{bad-json');
        const { readAnalyticsUsageStats } = require('../analyticsStore') as typeof import('../analyticsStore');
        expect(readAnalyticsUsageStats()).toEqual([]);
    });

    it('drops malformed activity log entries while preserving valid rows', () => {
        localStorage.setItem('api_activity_log_entries', JSON.stringify([
            { id: 'ok', timestamp: 1, type: 'request', model: 'lm-studio' },
            { id: 123, timestamp: 'bad', type: 'request', model: 'lm-studio' },
        ]));

        const { activityLogService } = require('../activityLog') as typeof import('../activityLog');
        const entries = activityLogService.getEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0]?.id).toBe('ok');
    });
});
