import type { Model } from '../../shared/types';
import { resolvePreferredModelId } from './modelSelectionStorage';

export interface OpenRouterModelRecord {
    id: string;
    name?: string;
    context_length?: number;
    contextLength?: number;
}

interface OpenRouterModelsResponse {
    data?: OpenRouterModelRecord[];
}

export const parseOpenRouterModelsResponse = (payload: unknown): OpenRouterModelRecord[] => {
    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const data = (payload as OpenRouterModelsResponse).data;
    if (!Array.isArray(data)) {
        return [];
    }

    return data.filter((model): model is OpenRouterModelRecord =>
        Boolean(model && typeof model.id === 'string')
    );
};

export const resolveInitialModelSelection = (
    previousModelId: string,
    availableModels: Model[],
    persistedModelId: string | null
): string => {
    if (previousModelId) {
        return previousModelId;
    }
    return resolvePreferredModelId(availableModels, persistedModelId) || '';
};
