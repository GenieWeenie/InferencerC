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

const sanitizeClampedNumber = (value: unknown, fallback: number, min: number, max: number): number => {
    const numericValue = sanitizeFiniteNumber(value, fallback);
    if (numericValue < min) {
        return min;
    }
    if (numericValue > max) {
        return max;
    }
    return numericValue;
};

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

const sanitizeRequiredString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

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

const CHAT_MESSAGE_ROLES = new Set<ChatMessage['role']>(['system', 'user', 'assistant', 'tool']);

const sanitizeHistoryMessages = (value: unknown): ChatMessage[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const sanitized: ChatMessage[] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }
        const candidate = entry as Partial<ChatMessage>;
        const role = candidate.role;
        if (!CHAT_MESSAGE_ROLES.has(role as ChatMessage['role'])) {
            continue;
        }
        sanitized.push({
            role: role as ChatMessage['role'],
            content: sanitizeString(candidate.content, ''),
        });
    }
    return sanitized;
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
    const normalizedSessionId = sanitizeRequiredString(params.sessionId);
    if (!normalizedSessionId) {
        return null;
    }

    const normalizedCurrentModel = sanitizeRequiredString(params.currentModel);
    if (!normalizedCurrentModel) {
        return null;
    }

    const normalizedResponseFormat = params.responseFormat === 'json_object' ? 'json_object' : 'text';
    const normalizedExpertMode = typeof params.expertMode === 'string'
        ? (params.expertMode.trim() ? params.expertMode.trim() : null)
        : null;

    return {
        timestamp: sanitizePositiveInteger(params.timestamp, Date.now()),
        sessionId: normalizedSessionId,
        history: sanitizeHistoryMessages(params.history),
        currentModel: normalizedCurrentModel,
        systemPrompt: sanitizeString(params.systemPrompt, ''),
        temperature: sanitizeClampedNumber(params.temperature, 0.7, 0, 2),
        topP: sanitizeClampedNumber(params.topP, 1, 0, 1),
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
