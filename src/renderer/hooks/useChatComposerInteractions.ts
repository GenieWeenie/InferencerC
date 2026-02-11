import React from 'react';
import { toast } from 'sonner';
import { compressImage } from '../lib/chatDisplayUtils';
import {
    analyzeComposerInput,
    collectPastedImageFiles,
    describeDroppedFiles,
    resolveComposerKeyAction,
} from '../lib/chatComposerHandlers';
import type { PromptSnippet } from './usePrompts';
import type { ProjectContext } from '../services/projectContext';

interface UseChatComposerInteractionsParams {
    setShowBottomControls: React.Dispatch<React.SetStateAction<boolean>>;
    setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
    setSlashMatch: React.Dispatch<React.SetStateAction<{ query: string; index: number } | null>>;
    setActivePromptIndex: React.Dispatch<React.SetStateAction<number>>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    setPrefill: React.Dispatch<React.SetStateAction<string | null>>;
    setShowUrlInput: React.Dispatch<React.SetStateAction<boolean>>;
    setShowGithubInput: React.Dispatch<React.SetStateAction<boolean>>;
    setUrlInput: React.Dispatch<React.SetStateAction<string>>;
    setGithubUrl: React.Dispatch<React.SetStateAction<string>>;
    setIncludeContextInMessages: React.Dispatch<React.SetStateAction<boolean>>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    slashMatch: { query: string; index: number } | null;
    filteredPrompts: PromptSnippet[];
    activePromptIndex: number;
    executeWebFetch: () => void | Promise<void>;
    executeGithubFetch: () => void | Promise<void>;
    sendMessageWithContext: () => void | Promise<void>;
    insertPrompt: (prompt: PromptSnippet) => void;
    addAttachment: (file: { name: string; content: string }) => void;
    addImageAttachment: (file: { name: string; mimeType: string; base64: string; thumbnailUrl: string }) => void;
    projectContext: ProjectContext | null;
    enableProjectContextFeature: () => void;
    loadProjectContextService: () => Promise<any>;
}

export const useChatComposerInteractions = ({
    setShowBottomControls,
    setShowSuggestions,
    setIsDragging,
    setSlashMatch,
    setActivePromptIndex,
    setInput,
    setPrefill,
    setShowUrlInput,
    setShowGithubInput,
    setUrlInput,
    setGithubUrl,
    setIncludeContextInMessages,
    textareaRef,
    slashMatch,
    filteredPrompts,
    activePromptIndex,
    executeWebFetch,
    executeGithubFetch,
    sendMessageWithContext,
    insertPrompt,
    addAttachment,
    addImageAttachment,
    projectContext,
    enableProjectContextFeature,
    loadProjectContextService,
}: UseChatComposerInteractionsParams) => {
    const handleToggleBottomControls = React.useCallback(() => {
        setShowBottomControls((prev) => !prev);
    }, [setShowBottomControls]);

    const handleToggleSuggestions = React.useCallback(() => {
        setShowSuggestions((prev) => !prev);
    }, [setShowSuggestions]);

    const handleSendComposerMessage = React.useCallback(() => {
        sendMessageWithContext();
    }, [sendMessageWithContext]);

    const handleComposerDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, [setIsDragging]);

    const handleComposerDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, [setIsDragging]);

    const handleComposerDrop = React.useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;

        for (const { file, kind } of describeDroppedFiles(files)) {
            if (kind === 'image') {
                try {
                    const { base64, thumbnailUrl } = await compressImage(file);
                    addImageAttachment({
                        name: file.name,
                        mimeType: 'image/webp',
                        base64,
                        thumbnailUrl,
                    });
                } catch (error) {
                    console.error('Failed to read/compress image', file.name, error);
                    toast.error(`Failed to process image: ${file.name}`);
                }
                continue;
            }

            if (kind === 'text') {
                try {
                    const text = await file.text();
                    addAttachment({ name: file.name, content: text });
                } catch (error) {
                    console.error('Failed to read file', file.name, error);
                }
            }
        }
    }, [setIsDragging, addImageAttachment, addAttachment]);

    const handleComposerInputChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        const analysis = analyzeComposerInput(
            newValue,
            event.target.selectionEnd ?? newValue.length,
            event.target.scrollHeight
        );

        if (analysis.slashMatch) {
            setSlashMatch(analysis.slashMatch);
            setActivePromptIndex(0);
        } else {
            setSlashMatch(null);
        }

        setInput(newValue);
        event.target.style.height = 'auto';
        event.target.style.height = `${analysis.autoHeightPx}px`;
    }, [setSlashMatch, setActivePromptIndex, setInput]);

    const handleComposerInputPaste = React.useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageFiles = collectPastedImageFiles(Array.from(event.clipboardData.items));
        for (const file of imageFiles) {
            event.preventDefault();
            try {
                const { base64, thumbnailUrl } = await compressImage(file);
                addImageAttachment({
                    name: file.name || `pasted-${Date.now()}.png`,
                    mimeType: 'image/webp',
                    base64,
                    thumbnailUrl,
                });
                toast.success('Image pasted');
            } catch (error) {
                console.error('Paste failed', error);
                toast.error('Failed to paste image');
            }
        }
    }, [addImageAttachment]);

    const handleComposerInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const action = resolveComposerKeyAction({
            key: event.key,
            shiftKey: event.shiftKey,
            slashMenuOpen: Boolean(slashMatch),
            filteredPromptCount: filteredPrompts.length,
        });

        switch (action) {
            case 'navigate-up':
                event.preventDefault();
                setActivePromptIndex((prev) => Math.max(0, prev - 1));
                return;
            case 'navigate-down':
                event.preventDefault();
                setActivePromptIndex((prev) => Math.min(filteredPrompts.length - 1, prev + 1));
                return;
            case 'insert-prompt':
                event.preventDefault();
                insertPrompt(filteredPrompts[activePromptIndex]);
                return;
            case 'dismiss-slash':
                event.preventDefault();
                setSlashMatch(null);
                return;
            case 'send-message':
                event.preventDefault();
                sendMessageWithContext();
                return;
            default:
                return;
        }
    }, [slashMatch, filteredPrompts, setActivePromptIndex, insertPrompt, activePromptIndex, setSlashMatch, sendMessageWithContext]);

    const handleSelectSuggestion = React.useCallback((suggestion: string) => {
        setInput(suggestion);
        setShowSuggestions(false);
        textareaRef.current?.focus();
    }, [setInput, setShowSuggestions, textareaRef]);

    const handleCloseSuggestionsPanel = React.useCallback(() => {
        setShowSuggestions(false);
    }, [setShowSuggestions]);

    const handlePrefillChange = React.useCallback((value: string) => {
        setPrefill(value);
    }, [setPrefill]);

    const handleUrlInputChange = React.useCallback((value: string) => {
        setUrlInput(value);
    }, [setUrlInput]);

    const handleUrlInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            void executeWebFetch();
        }
    }, [executeWebFetch]);

    const handleGithubUrlChange = React.useCallback((value: string) => {
        setGithubUrl(value);
    }, [setGithubUrl]);

    const handleGithubInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            void executeGithubFetch();
        }
    }, [executeGithubFetch]);

    const handleToggleIncludeContextInMessages = React.useCallback(() => {
        setIncludeContextInMessages((prev) => !prev);
    }, [setIncludeContextInMessages]);

    const handleClearProjectContext = React.useCallback(() => {
        void loadProjectContextService()
            .then((projectContextService) => {
                projectContextService.clearContext();
                toast.success('Project context cleared');
            })
            .catch(() => {
                toast.error('Failed to clear project context');
            });
    }, [loadProjectContextService]);

    const handleStartWatchingProjectContext = React.useCallback(() => {
        void (async () => {
            enableProjectContextFeature();
            const projectContextService = await loadProjectContextService();
            const success = await projectContextService.startWatching();
            if (success) {
                toast.success('Started watching folder for changes');
            } else {
                toast.error('Failed to start watching');
            }
        })();
    }, [enableProjectContextFeature, loadProjectContextService]);

    const handleTogglePrefill = React.useCallback(() => {
        setPrefill((prev) => (prev === null ? '' : null));
    }, [setPrefill]);

    const handleToggleUrlInput = React.useCallback(() => {
        setShowUrlInput((prev) => !prev);
    }, [setShowUrlInput]);

    const handleToggleGithubInput = React.useCallback(() => {
        setShowGithubInput((prev) => !prev);
    }, [setShowGithubInput]);

    const handleProjectContextControlClick = React.useCallback(async () => {
        enableProjectContextFeature();
        const projectContextService = await loadProjectContextService();
        if (projectContext) {
            projectContextService.clearContext();
            toast.success('Project context cleared');
            return;
        }

        const success = await projectContextService.selectFolder();
        if (success) {
            toast.success('Project folder loaded');
            setTimeout(async () => {
                await projectContextService.startWatching();
            }, 500);
        } else {
            toast.error('Failed to select folder');
        }
    }, [enableProjectContextFeature, loadProjectContextService, projectContext]);

    return {
        handleToggleBottomControls,
        handleToggleSuggestions,
        handleSendComposerMessage,
        handleComposerDragOver,
        handleComposerDragLeave,
        handleComposerDrop,
        handleComposerInputChange,
        handleComposerInputPaste,
        handleComposerInputKeyDown,
        handleSelectSuggestion,
        handleCloseSuggestionsPanel,
        handlePrefillChange,
        handleUrlInputChange,
        handleUrlInputKeyDown,
        handleGithubUrlChange,
        handleGithubInputKeyDown,
        handleToggleIncludeContextInMessages,
        handleClearProjectContext,
        handleStartWatchingProjectContext,
        handleTogglePrefill,
        handleToggleUrlInput,
        handleToggleGithubInput,
        handleProjectContextControlClick,
    };
};
