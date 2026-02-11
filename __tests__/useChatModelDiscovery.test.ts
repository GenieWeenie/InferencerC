import {
    parseOpenRouterModelsResponse,
    resolveInitialModelSelection,
} from '../src/renderer/lib/chatModelDiscovery';
import type { Model } from '../src/shared/types';

describe('useChatModelDiscovery helpers', () => {
    const baseModels: Model[] = [
        {
            id: 'model-a',
            name: 'Model A',
            pathOrUrl: 'http://localhost:1234/v1',
            type: 'local-folder',
            status: 'loaded',
            adapter: 'lmstudio',
        },
        {
            id: 'local-lmstudio',
            name: 'LM Studio',
            pathOrUrl: 'http://localhost:1234/v1',
            type: 'local-folder',
            status: 'loaded',
            adapter: 'lmstudio',
        },
    ];

    it('parses only valid OpenRouter model records', () => {
        expect(parseOpenRouterModelsResponse(null)).toEqual([]);
        expect(parseOpenRouterModelsResponse({ data: 'invalid' })).toEqual([]);

        const parsed = parseOpenRouterModelsResponse({
            data: [
                { id: 'openai/gpt-4.1', name: 'GPT 4.1' },
                { id: 123, name: 'Bad' },
                { name: 'Missing id' },
            ],
        });
        expect(parsed).toEqual([{ id: 'openai/gpt-4.1', name: 'GPT 4.1' }]);
    });

    it('keeps existing selected model when already present', () => {
        expect(resolveInitialModelSelection('model-a', baseModels, 'local-lmstudio')).toBe('model-a');
    });

    it('uses persisted model when no current model is selected', () => {
        expect(resolveInitialModelSelection('', baseModels, 'local-lmstudio')).toBe('local-lmstudio');
    });

    it('falls back to local-lmstudio then first model when persisted model is missing', () => {
        expect(resolveInitialModelSelection('', baseModels, 'missing-model')).toBe('local-lmstudio');

        const modelsWithoutLmStudio = baseModels.filter((model) => model.id !== 'local-lmstudio');
        expect(resolveInitialModelSelection('', modelsWithoutLmStudio, 'missing-model')).toBe('model-a');
    });
});
