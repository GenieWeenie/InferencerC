import type { ChatMessage } from '../../shared/types';

export interface RecoveryStateSnapshot {
    timestamp: number;
    sessionId: string;
    history: ChatMessage[];
    currentModel: string;
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    batchSize: number;
    expertMode: string | null;
    thinkingEnabled: boolean;
    battleMode: boolean;
    secondaryModel: string;
    autoRouting: boolean;
    responseFormat: 'text' | 'json_object';
    input: string;
    prefill: string | null;
    enabledTools: string[];
}

const sanitizeFiniteNumber = (value: unknown, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const sanitizePositiveInteger = (value: unknown, fallback: number): number => {
    const numericValue = sanitizeFiniteNumber(value, fallback);
    if (numericValue <= 0) {
        return fallback;
    }
    return Math.floor(numericValue);
};

const sanitizeString = (value: unknown, fallback = ''): string => (
    typeof value === 'string' ? value : fallback
);

const sanitizeOptionalString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    return value;
};

const sanitizeEnabledTools = (value: unknown): string[] => {
    if (!(value instanceof Set) && !Array.isArray(value)) {
        return [];
    }
    const entries = value instanceof Set ? Array.from(value) : value;
    const nextTools: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < entries.length; i++) {
        if (typeof entries[i] !== 'string') {
            continue;
        }
        const normalized = entries[i].trim();
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        nextTools.push(normalized);
    }
    return nextTools;
};

export const buildRecoveryStateSnapshot = (params: {
    timestamp: number;
    sessionId: string;
    history: ChatMessage[];
    currentModel: string;
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    batchSize: number;
    expertMode: string | null;
    thinkingEnabled: boolean;
    battleMode: boolean;
    secondaryModel: string;
    autoRouting: boolean;
    responseFormat: 'text' | 'json_object';
    input: string;
    prefill: string | null;
    enabledTools: Set<string>;
}): RecoveryStateSnapshot | null => {
    const normalizedSessionId = params.sessionId.trim();
    if (!normalizedSessionId) {
        return null;
    }

    const normalizedResponseFormat = params.responseFormat === 'json_object' ? 'json_object' : 'text';
    const normalizedExpertMode = typeof params.expertMode === 'string'
        ? (params.expertMode.trim() ? params.expertMode.trim() : null)
        : null;

    return {
        timestamp: sanitizePositiveInteger(params.timestamp, Date.now()),
        sessionId: normalizedSessionId,
        history: Array.isArray(params.history) ? params.history : [],
        currentModel: sanitizeString(params.currentModel, ''),
        systemPrompt: sanitizeString(params.systemPrompt, ''),
        temperature: sanitizeFiniteNumber(params.temperature, 0.7),
        topP: sanitizeFiniteNumber(params.topP, 1),
        maxTokens: sanitizePositiveInteger(params.maxTokens, 2048),
        batchSize: sanitizePositiveInteger(params.batchSize, 1),
        expertMode: normalizedExpertMode,
        thinkingEnabled: Boolean(params.thinkingEnabled),
        battleMode: Boolean(params.battleMode),
        secondaryModel: sanitizeString(params.secondaryModel, ''),
        autoRouting: Boolean(params.autoRouting),
        responseFormat: normalizedResponseFormat,
        input: sanitizeString(params.input, ''),
        prefill: sanitizeOptionalString(params.prefill),
        enabledTools: sanitizeEnabledTools(params.enabledTools),
    };
};
