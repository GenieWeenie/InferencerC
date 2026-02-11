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

const sanitizePromptSnippet = (value: unknown): PromptSnippet | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (
        typeof value.id !== 'string'
        || typeof value.alias !== 'string'
        || typeof value.title !== 'string'
        || typeof value.content !== 'string'
    ) {
        return null;
    }
    return {
        id: value.id,
        alias: value.alias,
        title: value.title,
        content: value.content,
    };
};

export const parseStoredPromptSnippets = (raw: string): PromptSnippet[] | null => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return null;
    }
    const prompts: PromptSnippet[] = [];
    parsed.forEach((entry) => {
        const snippet = sanitizePromptSnippet(entry);
        if (snippet) {
            prompts.push(snippet);
        }
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
            const newPrompt: PromptSnippet = {
                id: createPromptId(),
                alias,
                title,
                content
            };
            const updated = [...prev, newPrompt];
            persistPrompts(updated);
            return updated;
        });
    };

    const updatePrompt = (id: string, alias: string, title: string, content: string) => {
        setPrompts((prev) => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, alias, title, content } : p
            );
            persistPrompts(updated);
            return updated;
        });
    };

    const deletePrompt = (id: string) => {
        setPrompts((prev) => {
            const updated = prev.filter(p => p.id !== id);
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
