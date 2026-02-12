import { useState } from 'react';

export interface PromptSnippet {
    id: string;
    alias: string; // The slash command trigger (e.g., "code")
    title: string; // Description
    content: string;
}

const PROMPTS_STORAGE_KEY = 'user_prompts';

const DEFAULT_PROMPTS: PromptSnippet[] = [
    {
        id: '1',
        alias: 'sys-code',
        title: 'System: Expert Coder',
        content: "You are an expert software engineer. You write clean, efficient, and well-documented code. Please use standard libraries where possible."
    },
    {
        id: '2',
        alias: 'sys-creative',
        title: 'System: Creative/Novel',
        content: "You are a creative novelist. Use vivid imagery, varied sentence structures, and 'show, don't tell' techniques."
    },
    {
        id: '3',
        alias: 'exp-step',
        title: 'Explain Step-by-Step',
        content: "Please explain the solution step-by-step, explaining the reasoning behind each step."
    },
    {
        id: '4',
        alias: 'debug',
        title: 'Debug Error',
        content: "Here is an error message I am receiving. Please analyze it, explain the root cause, and provide a fix:\n\n"
    }
];

const createPromptId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `prompt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizePromptSnippet = (value: unknown): PromptSnippet | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const alias = sanitizeNonEmptyString(value.alias);
    const title = sanitizeNonEmptyString(value.title);
    const content = sanitizeNonEmptyString(value.content);
    if (!id || !alias || !title || !content) {
        return null;
    }
    return {
        id,
        alias,
        title,
        content,
    };
};

const normalizePromptMutationInput = (alias: string, title: string, content: string): {
    alias: string;
    aliasKey: string;
    title: string;
    content: string;
} | null => {
    const normalizedAlias = sanitizeNonEmptyString(alias)?.replace(/^\//, '');
    const normalizedTitle = sanitizeNonEmptyString(title);
    const normalizedContent = sanitizeNonEmptyString(content);
    if (!normalizedAlias || !normalizedTitle || !normalizedContent) {
        return null;
    }
    return {
        alias: normalizedAlias,
        aliasKey: normalizedAlias.toLowerCase(),
        title: normalizedTitle,
        content: normalizedContent,
    };
};

export const parseStoredPromptSnippets = (raw: string): PromptSnippet[] | null => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return null;
    }
    const prompts: PromptSnippet[] = [];
    const seenIds = new Set<string>();
    const seenAliases = new Set<string>();
    parsed.forEach((entry) => {
        const snippet = sanitizePromptSnippet(entry);
        if (!snippet) {
            return;
        }
        const aliasKey = snippet.alias.toLowerCase();
        if (seenIds.has(snippet.id) || seenAliases.has(aliasKey)) {
            return;
        }
        seenIds.add(snippet.id);
        seenAliases.add(aliasKey);
        prompts.push(snippet);
    });
    return prompts;
};

const loadInitialPrompts = (): PromptSnippet[] => {
    try {
        const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
        if (saved) {
            const parsed = parseStoredPromptSnippets(saved);
            if (parsed && parsed.length > 0) {
                return parsed;
            }
        }
    } catch {
        // Fall back to defaults when storage is unavailable or malformed.
    }

    try {
        localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROMPTS));
    } catch {
        // Non-fatal: UI can still operate with in-memory defaults.
    }

    return DEFAULT_PROMPTS;
};

const persistPrompts = (prompts: PromptSnippet[]) => {
    try {
        localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
    } catch {
        // Non-fatal: keep runtime state even if persistence fails.
    }
};

export const usePrompts = () => {
    const [prompts, setPrompts] = useState<PromptSnippet[]>(loadInitialPrompts);

    const savePrompt = (alias: string, title: string, content: string) => {
        setPrompts((prev) => {
            const normalized = normalizePromptMutationInput(alias, title, content);
            if (!normalized) {
                return prev;
            }
            if (prev.some((snippet) => snippet.alias.toLowerCase() === normalized.aliasKey)) {
                return prev;
            }
            const newPrompt: PromptSnippet = {
                id: createPromptId(),
                alias: normalized.alias,
                title: normalized.title,
                content: normalized.content,
            };
            const updated = [...prev, newPrompt];
            persistPrompts(updated);
            return updated;
        });
    };

    const updatePrompt = (id: string, alias: string, title: string, content: string) => {
        setPrompts((prev) => {
            const normalized = normalizePromptMutationInput(alias, title, content);
            if (!normalized) {
                return prev;
            }
            const targetIndex = prev.findIndex((prompt) => prompt.id === id);
            if (targetIndex < 0) {
                return prev;
            }

            const hasDuplicateAlias = prev.some((prompt, index) => (
                index !== targetIndex && prompt.alias.toLowerCase() === normalized.aliasKey
            ));
            if (hasDuplicateAlias) {
                return prev;
            }

            const nextPrompt: PromptSnippet = {
                ...prev[targetIndex],
                alias: normalized.alias,
                title: normalized.title,
                content: normalized.content,
            };
            const unchanged = (
                prev[targetIndex].alias === nextPrompt.alias
                && prev[targetIndex].title === nextPrompt.title
                && prev[targetIndex].content === nextPrompt.content
            );
            if (unchanged) {
                return prev;
            }

            const updated = prev.map((prompt, index) => (
                index === targetIndex ? nextPrompt : prompt
            ));
            persistPrompts(updated);
            return updated;
        });
    };

    const deletePrompt = (id: string) => {
        setPrompts((prev) => {
            const updated = prev.filter(p => p.id !== id);
            if (updated.length === prev.length) {
                return prev;
            }
            persistPrompts(updated);
            return updated;
        });
    };

    return {
        prompts,
        savePrompt,
        updatePrompt,
        deletePrompt
    };
};
