import {
    LONG_MESSAGE_CHARACTER_THRESHOLD,
    LONG_MESSAGE_LINE_THRESHOLD,
    buildCollapsedMessagePreview,
    isLongMessageContent,
} from '../chatMessageCollapse';

describe('chatMessageCollapse', () => {
    it('detects long content by character count', () => {
        const content = 'a'.repeat(LONG_MESSAGE_CHARACTER_THRESHOLD);
        expect(isLongMessageContent(content)).toBe(true);
    });

    it('detects long content by line count', () => {
        const content = new Array(LONG_MESSAGE_LINE_THRESHOLD).fill('line').join('\n');
        expect(isLongMessageContent(content)).toBe(true);
    });

    it('returns false for short content', () => {
        expect(isLongMessageContent('short reply')).toBe(false);
    });

    it('builds a truncated preview for long content', () => {
        const content = new Array(20).fill('preview line').join('\n');
        const preview = buildCollapsedMessagePreview(content, 3, 200);

        expect(preview).toContain('preview line');
        expect(preview.endsWith('\n...')).toBe(true);
    });
});
