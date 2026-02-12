import type { SettingsModelEndpoint } from '../components/settings/SettingsEndpointsTab';
import type { SettingsSystemPreset } from '../components/settings/SettingsPresetsTab';
import type { UsageStatsRecord } from '../services/analyticsStore';

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

const OPENROUTER_ESTIMATED_COST_PER_1K_TOKENS = 0.002;

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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

export const parseStoredModelEndpoints = (raw: string): SettingsModelEndpoint[] | null => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return null;
    }
    const endpoints: SettingsModelEndpoint[] = [];
    const seenIds = new Set<string>();
    for (let index = 0; index < parsed.length; index++) {
        const endpoint = parsed[index];
        if (!isRecord(endpoint)) {
            continue;
        }
        const id = sanitizeNonEmptyString(endpoint.id);
        const name = sanitizeNonEmptyString(endpoint.name);
        const url = sanitizeNonEmptyString(endpoint.url);
        if (!id || !name || !url) {
            continue;
        }
        if (seenIds.has(id)) {
            continue;
        }
        if (!ENDPOINT_TYPES.has(endpoint.type as SettingsModelEndpoint['type'])) {
            continue;
        }
        seenIds.add(id);
        endpoints.push({
            id,
            name,
            url,
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
    const seenIds = new Set<string>();
    for (let index = 0; index < parsed.length; index++) {
        const preset = parsed[index];
        if (!isRecord(preset)) {
            continue;
        }
        const id = sanitizeNonEmptyString(preset.id);
        const name = sanitizeNonEmptyString(preset.name);
        const prompt = sanitizeNonEmptyString(preset.prompt);
        if (!id || !name || !prompt || seenIds.has(id)) {
            continue;
        }
        seenIds.add(id);
        presets.push({
            id,
            name,
            prompt,
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

export const buildOpenRouterUsageStats = (usageHistory: UsageStatsRecord[]): UsageStats => {
    const openRouterUsage = usageHistory.filter((entry) => entry.modelId.startsWith('openrouter/'));
    const totalTokens = openRouterUsage.reduce((sum, entry) => sum + entry.tokenCount, 0);
    const sessionCount = new Set(openRouterUsage.map((entry) => entry.sessionId)).size;
    const estimatedCost = (totalTokens / 1000) * OPENROUTER_ESTIMATED_COST_PER_1K_TOKENS;

    return {
        totalTokens,
        estimatedCost,
        sessionCount,
    };
};

export const readStoredIntegerWithFallback = (key: string, fallback: number): number => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = Number(raw.trim());
        if (!Number.isFinite(parsed)) {
            return fallback;
        }
        const normalized = Math.round(parsed);
        return normalized >= 1 ? normalized : fallback;
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

export const readStoredBooleanWithFallback = (key: string, fallback: boolean): boolean => {
    try {
        const raw = localStorage.getItem(key);
        if (typeof raw !== 'string') {
            return fallback;
        }

        const normalized = raw.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
        return fallback;
    } catch {
        return fallback;
    }
};
