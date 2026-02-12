import type { ChatSession } from '../../shared/types';
import { sanitizeModelId } from './modelSelectionStorage';

export interface SessionLoadSettings {
    modelId?: string;
    expertMode?: string | null;
    thinkingEnabled?: boolean;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    batchSize?: number;
}

const sanitizeOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    return value;
};

const sanitizeOptionalFiniteNumber = (value: unknown): number | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return value;
};

const sanitizeOptionalPositiveInteger = (value: unknown): number | undefined => {
    const numericValue = sanitizeOptionalFiniteNumber(value);
    if (numericValue === undefined || numericValue <= 0) {
        return undefined;
    }
    return Math.floor(numericValue);
};

export const mapSessionSettingsForLoad = (session: ChatSession): SessionLoadSettings => {
    const normalizedExpertMode = session.expertMode === null
        ? null
        : (
            typeof session.expertMode === 'string'
                ? (session.expertMode.trim().length > 0 ? session.expertMode.trim() : null)
                : undefined
        );

    return {
        modelId: sanitizeModelId(session.modelId) ?? undefined,
        expertMode: normalizedExpertMode,
        thinkingEnabled: typeof session.thinkingEnabled === 'boolean' ? session.thinkingEnabled : undefined,
        systemPrompt: sanitizeOptionalString(session.systemPrompt),
        temperature: sanitizeOptionalFiniteNumber(session.temperature),
        topP: sanitizeOptionalFiniteNumber(session.topP),
        maxTokens: sanitizeOptionalPositiveInteger(session.maxTokens),
        batchSize: sanitizeOptionalPositiveInteger(session.batchSize),
    };
};
