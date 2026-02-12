import type { ChatMessage } from '../src/shared/types';
import { buildRecoveryStateSnapshot } from '../src/renderer/lib/chatRecoveryState';

describe('buildRecoveryStateSnapshot', () => {
    const history: ChatMessage[] = [{ role: 'user', content: 'hello' }];

    it('builds a deterministic sanitized recovery snapshot', () => {
        const snapshot = buildRecoveryStateSnapshot({
            timestamp: 100.9,
            sessionId: '  session-1  ',
            history,
            currentModel: 'model-a',
            systemPrompt: 'prompt',
            temperature: 0.4,
            topP: 0.95,
            maxTokens: 8192.4,
            batchSize: 3.8,
            expertMode: '  planner  ',
            thinkingEnabled: true,
            battleMode: false,
            secondaryModel: 'model-b',
            autoRouting: true,
            responseFormat: 'json_object',
            input: 'draft',
            prefill: 'prefill',
            enabledTools: new Set(['  mcp:search  ', 'mcp:search', '  ']),
        });

        expect(snapshot).toEqual({
            timestamp: 100,
            sessionId: 'session-1',
            history,
            currentModel: 'model-a',
            systemPrompt: 'prompt',
            temperature: 0.4,
            topP: 0.95,
            maxTokens: 8192,
            batchSize: 3,
            expertMode: 'planner',
            thinkingEnabled: true,
            battleMode: false,
            secondaryModel: 'model-b',
            autoRouting: true,
            responseFormat: 'json_object',
            input: 'draft',
            prefill: 'prefill',
            enabledTools: ['mcp:search'],
        });
    });

    it('returns null for blank session ids and applies safe fallbacks for invalid values', () => {
        expect(buildRecoveryStateSnapshot({
            timestamp: 1,
            sessionId: '   ',
            history,
            currentModel: 'model-a',
            systemPrompt: '',
            temperature: 0.7,
            topP: 1,
            maxTokens: 2048,
            batchSize: 1,
            expertMode: null,
            thinkingEnabled: false,
            battleMode: false,
            secondaryModel: '',
            autoRouting: false,
            responseFormat: 'text',
            input: '',
            prefill: null,
            enabledTools: new Set<string>(),
        })).toBeNull();

        const snapshot = buildRecoveryStateSnapshot({
            timestamp: Number.NaN,
            sessionId: 'session-2',
            history: null as unknown as ChatMessage[],
            currentModel: 123 as unknown as string,
            systemPrompt: null as unknown as string,
            temperature: Number.NaN,
            topP: Number.POSITIVE_INFINITY,
            maxTokens: 0,
            batchSize: -10,
            expertMode: '   ',
            thinkingEnabled: 'yes' as unknown as boolean,
            battleMode: 1 as unknown as boolean,
            secondaryModel: null as unknown as string,
            autoRouting: 0 as unknown as boolean,
            responseFormat: 'invalid' as unknown as 'text' | 'json_object',
            input: undefined as unknown as string,
            prefill: 42 as unknown as string | null,
            enabledTools: [1, '  alpha  ', '', 'alpha'] as unknown as Set<string>,
        });

        expect(snapshot?.history).toEqual([]);
        expect(snapshot?.currentModel).toBe('');
        expect(snapshot?.systemPrompt).toBe('');
        expect(snapshot?.temperature).toBe(0.7);
        expect(snapshot?.topP).toBe(1);
        expect(snapshot?.maxTokens).toBe(2048);
        expect(snapshot?.batchSize).toBe(1);
        expect(snapshot?.expertMode).toBeNull();
        expect(snapshot?.thinkingEnabled).toBe(true);
        expect(snapshot?.battleMode).toBe(true);
        expect(snapshot?.secondaryModel).toBe('');
        expect(snapshot?.autoRouting).toBe(false);
        expect(snapshot?.responseFormat).toBe('text');
        expect(snapshot?.input).toBe('');
        expect(snapshot?.prefill).toBeNull();
        expect(snapshot?.enabledTools).toEqual(['alpha']);
    });
});
