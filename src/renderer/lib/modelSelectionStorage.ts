import type { Model } from '../../shared/types';

export const LAST_MODEL_STORAGE_KEY = 'app_last_model';

export const sanitizeModelId = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

export const readPersistedLastModelId = (): string | null => {
    try {
        return sanitizeModelId(localStorage.getItem(LAST_MODEL_STORAGE_KEY));
    } catch {
        return null;
    }
};

export const persistLastModelId = (modelId: string | null): void => {
    const normalized = sanitizeModelId(modelId);

    try {
        if (normalized) {
            localStorage.setItem(LAST_MODEL_STORAGE_KEY, normalized);
        } else {
            localStorage.removeItem(LAST_MODEL_STORAGE_KEY);
        }
    } catch {
        // Ignore storage failures for model preference persistence.
    }
};

export const resolvePreferredModelId = (
    models: Model[],
    persistedModelId: string | null
): string | null => {
    if (models.length === 0) {
        return null;
    }

    if (persistedModelId && models.some((model) => model.id === persistedModelId)) {
        return persistedModelId;
    }

    const localLmStudioModel = models.find((model) => model.id === 'local-lmstudio');
    if (localLmStudioModel) {
        return localLmStudioModel.id;
    }

    return models[0]?.id ?? null;
};
