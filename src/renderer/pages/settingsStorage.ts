import type { SettingsModelEndpoint } from '../components/settings/SettingsEndpointsTab';
import type { SettingsSystemPreset } from '../components/settings/SettingsPresetsTab';

const ENDPOINT_TYPES = new Set<SettingsModelEndpoint['type']>([
    'lm-studio',
    'openai-compatible',
    'ollama',
]);

export const DEFAULT_SYSTEM_PRESETS: SettingsSystemPreset[] = [
    { id: '1', name: 'Assistant', prompt: 'You are a helpful assistant.' },
    { id: '2', name: 'Coder', prompt: 'You are an expert software engineer. Write clean, efficient, well-documented code.' },
    { id: '3', name: 'Creative', prompt: 'You are a creative writer. Use vivid imagery and engaging language.' },
];

export type UsageStats = {
    totalTokens: number;
    estimatedCost: number;
    sessionCount: number;
};

export const DEFAULT_USAGE_STATS: UsageStats = {
    totalTokens: 0,
    estimatedCost: 0,
    sessionCount: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const parseStoredModelEndpoints = (raw: string): SettingsModelEndpoint[] | null => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return null;
    }
    const endpoints: SettingsModelEndpoint[] = [];
    for (let index = 0; index < parsed.length; index++) {
        const endpoint = parsed[index];
        if (!isRecord(endpoint)) {
            continue;
        }
        if (
            typeof endpoint.id !== 'string'
            || typeof endpoint.name !== 'string'
            || typeof endpoint.url !== 'string'
            || !ENDPOINT_TYPES.has(endpoint.type as SettingsModelEndpoint['type'])
        ) {
            continue;
        }
        endpoints.push({
            id: endpoint.id,
            name: endpoint.name,
            url: endpoint.url,
            type: endpoint.type as SettingsModelEndpoint['type'],
        });
    }
    return endpoints;
};

export const parseStoredSystemPresets = (raw: string): SettingsSystemPreset[] | null => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return null;
    }
    const presets: SettingsSystemPreset[] = [];
    for (let index = 0; index < parsed.length; index++) {
        const preset = parsed[index];
        if (!isRecord(preset)) {
            continue;
        }
        if (
            typeof preset.id !== 'string'
            || typeof preset.name !== 'string'
            || typeof preset.prompt !== 'string'
        ) {
            continue;
        }
        presets.push({
            id: preset.id,
            name: preset.name,
            prompt: preset.prompt,
        });
    }
    return presets;
};

export const parseStoredUsageStats = (raw: string): UsageStats | null => {
    const parsed = parseJson(raw);
    if (!isRecord(parsed)) {
        return null;
    }
    return {
        totalTokens: typeof parsed.totalTokens === 'number' && Number.isFinite(parsed.totalTokens) ? parsed.totalTokens : 0,
        estimatedCost: typeof parsed.estimatedCost === 'number' && Number.isFinite(parsed.estimatedCost) ? parsed.estimatedCost : 0,
        sessionCount: typeof parsed.sessionCount === 'number' && Number.isFinite(parsed.sessionCount) ? parsed.sessionCount : 0,
    };
};

export const readStoredIntegerWithFallback = (key: string, fallback: number): number => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            return fallback;
        }
        return Math.max(1, Math.round(parsed));
    } catch {
        return fallback;
    }
};

export const readStoredStringWithFallback = (key: string, fallback: string): string => {
    try {
        const raw = localStorage.getItem(key);
        return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
    } catch {
        return fallback;
    }
};
