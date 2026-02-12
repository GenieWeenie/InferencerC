import type { ChatSession } from '../src/shared/types';
import { mapSessionSettingsForLoad } from '../src/renderer/lib/chatSessionLoadSettings';

describe('mapSessionSettingsForLoad', () => {
    const baseSession: ChatSession = {
        id: 'session-1',
        title: 'Session',
        lastModified: 1,
        modelId: 'local-lmstudio',
        messages: [],
    };

    it('sanitizes model and optional session settings for load-time application', () => {
        const settings = mapSessionSettingsForLoad({
            ...baseSession,
            modelId: '  model-a  ',
            expertMode: '  architect  ',
            thinkingEnabled: true,
            systemPrompt: 'Prompt',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 4096.9,
            batchSize: 4.7,
        });

        expect(settings).toEqual({
            modelId: 'model-a',
            expertMode: 'architect',
            thinkingEnabled: true,
            systemPrompt: 'Prompt',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 4096,
            batchSize: 4,
        });
    });

    it('drops invalid/malformed optional settings while preserving null expert mode', () => {
        const settings = mapSessionSettingsForLoad({
            ...baseSession,
            modelId: '   ',
            expertMode: '   ',
            thinkingEnabled: 'yes' as unknown as boolean,
            systemPrompt: 123 as unknown as string,
            temperature: Number.NaN,
            topP: Number.POSITIVE_INFINITY,
            maxTokens: -1,
            batchSize: 0,
        });

        expect(settings.modelId).toBeUndefined();
        expect(settings.expertMode).toBeNull();
        expect(settings.thinkingEnabled).toBeUndefined();
        expect(settings.systemPrompt).toBeUndefined();
        expect(settings.temperature).toBeUndefined();
        expect(settings.topP).toBeUndefined();
        expect(settings.maxTokens).toBeUndefined();
        expect(settings.batchSize).toBeUndefined();
    });
});
