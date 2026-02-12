export const LONG_MESSAGE_LINE_THRESHOLD = 22;
export const LONG_MESSAGE_CHARACTER_THRESHOLD = 1200;

export const isLongMessageContent = (content: string): boolean => {
    const normalized = content.trim();
    if (!normalized) {
        return false;
    }
    if (normalized.length >= LONG_MESSAGE_CHARACTER_THRESHOLD) {
        return true;
    }
    const lineCount = normalized.split(/\r?\n/).length;
    return lineCount >= LONG_MESSAGE_LINE_THRESHOLD;
};

export const buildCollapsedMessagePreview = (
    content: string,
    maxLines = 8,
    maxCharacters = 560
): string => {
    const normalized = content.trim();
    if (!normalized) {
        return '';
    }
    const previewLines = normalized.split(/\r?\n/).slice(0, Math.max(1, maxLines));
    let preview = previewLines.join('\n');
    if (preview.length > maxCharacters) {
        preview = preview.slice(0, maxCharacters).trimEnd();
    }
    if (preview.length < normalized.length) {
        return `${preview}\n...`;
    }
    return preview;
};
