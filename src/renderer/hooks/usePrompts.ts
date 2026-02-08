import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface PromptSnippet {
    id: string;
    alias: string; // The slash command trigger (e.g., "code")
    title: string; // Description
    content: string;
}

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

export const usePrompts = () => {
    const [prompts, setPrompts] = useState<PromptSnippet[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('user_prompts');
        if (saved) {
            setPrompts(JSON.parse(saved));
        } else {
            setPrompts(DEFAULT_PROMPTS);
            localStorage.setItem('user_prompts', JSON.stringify(DEFAULT_PROMPTS));
        }
    }, []);

    const savePrompt = (alias: string, title: string, content: string) => {
        const newPrompt: PromptSnippet = {
            id: uuidv4(),
            alias,
            title,
            content
        };
        const updated = [...prompts, newPrompt];
        setPrompts(updated);
        localStorage.setItem('user_prompts', JSON.stringify(updated));
    };

    const updatePrompt = (id: string, alias: string, title: string, content: string) => {
        const updated = prompts.map(p =>
            p.id === id ? { ...p, alias, title, content } : p
        );
        setPrompts(updated);
        localStorage.setItem('user_prompts', JSON.stringify(updated));
    };

    const deletePrompt = (id: string) => {
        const updated = prompts.filter(p => p.id !== id);
        setPrompts(updated);
        localStorage.setItem('user_prompts', JSON.stringify(updated));
    };

    return {
        prompts,
        savePrompt,
        updatePrompt,
        deletePrompt
    };
};
