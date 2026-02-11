import { classifyDroppedFile, getSlashCommandMatch, type DroppedFileKind } from './chatUiModels';

export interface DroppedFileDescriptor {
    file: File;
    kind: DroppedFileKind;
}

export interface ClipboardItemLike {
    type: string;
    getAsFile?: () => File | null;
}

export type ComposerKeyAction =
    | 'navigate-up'
    | 'navigate-down'
    | 'insert-prompt'
    | 'dismiss-slash'
    | 'send-message'
    | 'none';

export interface ComposerInputAnalysis {
    slashMatch: { query: string; index: number } | null;
    autoHeightPx: number;
}

export const describeDroppedFiles = (files: File[]): DroppedFileDescriptor[] => {
    const descriptors: DroppedFileDescriptor[] = [];
    for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        descriptors.push({ file, kind: classifyDroppedFile(file) });
    }
    return descriptors;
};

export const collectPastedImageFiles = (items: ClipboardItemLike[]): File[] => {
    const files: File[] = [];
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile?.();
        if (file) {
            files.push(file);
        }
    }
    return files;
};

export const analyzeComposerInput = (value: string, cursor: number, scrollHeight: number, maxHeight = 300): ComposerInputAnalysis => ({
    slashMatch: getSlashCommandMatch(value, cursor),
    autoHeightPx: Math.min(scrollHeight, maxHeight),
});

interface ResolveComposerKeyActionInput {
    key: string;
    shiftKey: boolean;
    slashMenuOpen: boolean;
    filteredPromptCount: number;
}

export const resolveComposerKeyAction = ({
    key,
    shiftKey,
    slashMenuOpen,
    filteredPromptCount,
}: ResolveComposerKeyActionInput): ComposerKeyAction => {
    if (slashMenuOpen && filteredPromptCount > 0) {
        if (key === 'ArrowUp') return 'navigate-up';
        if (key === 'ArrowDown') return 'navigate-down';
        if (key === 'Enter' || key === 'Tab') return 'insert-prompt';
        if (key === 'Escape') return 'dismiss-slash';
    }

    if (key === 'Enter' && !shiftKey) {
        return 'send-message';
    }

    return 'none';
};
