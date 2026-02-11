import React from 'react';
import type { PromptSnippet } from './usePrompts';
import { applyPromptSnippetAtSlash } from '../lib/chatUiModels';

interface UseChatSlashPromptsParams {
    prompts: PromptSnippet[];
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
}

export const useChatSlashPrompts = ({
    prompts,
    input,
    setInput,
}: UseChatSlashPromptsParams) => {
    const [slashMatch, setSlashMatch] = React.useState<{ query: string; index: number } | null>(null);
    const [activePromptIndex, setActivePromptIndex] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const filteredPrompts = React.useMemo(() => {
        if (!slashMatch) return [];
        return prompts.filter((prompt) =>
            prompt.alias.toLowerCase().startsWith(slashMatch.query.toLowerCase())
        );
    }, [slashMatch, prompts]);

    const insertPrompt = React.useCallback((prompt: PromptSnippet) => {
        if (!slashMatch || !textareaRef.current) return;

        const cursorEnd = textareaRef.current.selectionEnd ?? input.length;
        const nextInput = applyPromptSnippetAtSlash(input, cursorEnd, slashMatch.index, prompt.content);
        setInput(nextInput);
        setSlashMatch(null);

        setTimeout(() => {
            textareaRef.current?.focus();
        }, 10);
    }, [input, setInput, slashMatch]);

    return {
        slashMatch,
        setSlashMatch,
        activePromptIndex,
        setActivePromptIndex,
        textareaRef,
        filteredPrompts,
        insertPrompt,
    };
};
