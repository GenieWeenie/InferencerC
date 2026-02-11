import type React from 'react';
import { useCallback } from 'react';

interface UseChatExpertModeParams {
    setExpertMode: React.Dispatch<React.SetStateAction<string | null>>;
    setShowExpertMenu: React.Dispatch<React.SetStateAction<boolean>>;
    setSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
    setTemperature: React.Dispatch<React.SetStateAction<number>>;
    setTopP: React.Dispatch<React.SetStateAction<number>>;
}

export const useChatExpertMode = ({
    setExpertMode,
    setShowExpertMenu,
    setSystemPrompt,
    setTemperature,
    setTopP,
}: UseChatExpertModeParams) => {
    const handleExpertSelect = useCallback((mode: string | null) => {
        setExpertMode(mode);
        setShowExpertMenu(false);

        if (mode === 'coding') {
            setSystemPrompt('You are an expert software engineer. You write clean, efficient, and well-documented code. Always invoke standard libraries where possible.');
            setTemperature(0.2);
            setTopP(0.1);
            return;
        }

        if (mode === 'creative') {
            setSystemPrompt('You are a creative writer. Use vivid imagery, engaging hooks, and varied sentence structures.');
            setTemperature(0.9);
            setTopP(0.95);
            return;
        }

        if (mode === 'math') {
            setSystemPrompt('You are a mathematician. Solve problems step-by-step, showing all work. Use LaTeX for math notation.');
            setTemperature(0.1);
            setTopP(0.1);
            return;
        }

        if (mode === 'reasoning') {
            setSystemPrompt('You are a logic expert. Analyze every problem deeply. Break it down into first principles.');
            setTemperature(0.2);
            setTopP(0.2);
            return;
        }

        setSystemPrompt('You are a helpful assistant.');
        setTemperature(0.7);
        setTopP(0.9);
    }, [setExpertMode, setShowExpertMenu, setSystemPrompt, setTemperature, setTopP]);

    return {
        handleExpertSelect,
    };
};
