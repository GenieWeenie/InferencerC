/** @jest-environment jsdom */
import {
    deriveSessionTitleFromMessages,
    toSupportedImageMimeType,
    formatAttachmentsForContext,
    mapSessionMessagesForExternalShare,
    extractCodeBlock,
    getErrorMessage,
    getExpertModeConfig,
    deriveCloudSyncBadge,
    shouldWarnBeforeUnload,
    formatWebFetchContent,
    isComplianceLogEvent,
} from '../src/renderer/lib/chatHookHelpers';

// ---------------------------------------------------------------------------
// deriveSessionTitleFromMessages
// ---------------------------------------------------------------------------

describe('deriveSessionTitleFromMessages', () => {
    it('returns "New Chat" for empty messages', () => {
        expect(deriveSessionTitleFromMessages([])).toBe('New Chat');
    });

    it('returns "New Chat" when no user message exists', () => {
        expect(deriveSessionTitleFromMessages([
            { role: 'assistant', content: 'Hello' },
        ])).toBe('New Chat');
    });

    it('returns first 30 chars of first user message', () => {
        expect(deriveSessionTitleFromMessages([
            { role: 'user', content: 'Short question' },
        ])).toBe('Short question');
    });

    it('truncates long messages with ellipsis', () => {
        const long = 'A'.repeat(50);
        const result = deriveSessionTitleFromMessages([
            { role: 'user', content: long },
        ]);
        expect(result).toBe('A'.repeat(30) + '...');
    });

    it('skips empty user messages', () => {
        expect(deriveSessionTitleFromMessages([
            { role: 'user', content: '   ' },
            { role: 'user', content: 'Real question' },
        ])).toBe('Real question');
    });
});

// ---------------------------------------------------------------------------
// toSupportedImageMimeType
// ---------------------------------------------------------------------------

describe('toSupportedImageMimeType', () => {
    it('passes through supported types', () => {
        expect(toSupportedImageMimeType('image/png')).toBe('image/png');
        expect(toSupportedImageMimeType('image/jpeg')).toBe('image/jpeg');
        expect(toSupportedImageMimeType('image/gif')).toBe('image/gif');
        expect(toSupportedImageMimeType('image/webp')).toBe('image/webp');
    });

    it('falls back to image/png for unsupported types', () => {
        expect(toSupportedImageMimeType('image/bmp')).toBe('image/png');
        expect(toSupportedImageMimeType('application/pdf')).toBe('image/png');
    });
});

// ---------------------------------------------------------------------------
// formatAttachmentsForContext
// ---------------------------------------------------------------------------

describe('formatAttachmentsForContext', () => {
    it('returns empty string for no attachments', () => {
        expect(formatAttachmentsForContext([])).toBe('');
    });

    it('formats single attachment', () => {
        const result = formatAttachmentsForContext([
            { id: '1', name: 'file.ts', content: 'const x = 1;' },
        ]);
        expect(result).toContain('[FILE: file.ts]');
        expect(result).toContain('const x = 1;');
        expect(result).toContain('[/FILE]');
    });

    it('joins multiple attachments with newline', () => {
        const result = formatAttachmentsForContext([
            { id: '1', name: 'a.ts', content: 'a' },
            { id: '2', name: 'b.ts', content: 'b' },
        ]);
        expect(result).toContain('[FILE: a.ts]');
        expect(result).toContain('[FILE: b.ts]');
    });
});

// ---------------------------------------------------------------------------
// mapSessionMessagesForExternalShare
// ---------------------------------------------------------------------------

describe('mapSessionMessagesForExternalShare', () => {
    it('maps messages with content', () => {
        const result = mapSessionMessagesForExternalShare([
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
        ]);
        expect(result).toEqual([
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
        ]);
    });

    it('defaults undefined content to empty string', () => {
        const result = mapSessionMessagesForExternalShare([
            { role: 'user' },
        ]);
        expect(result[0].content).toBe('');
    });
});

// ---------------------------------------------------------------------------
// extractCodeBlock
// ---------------------------------------------------------------------------

describe('extractCodeBlock', () => {
    it('extracts code block with language', () => {
        const content = 'Here is code:\n```typescript\nconst x = 1;\n```\nDone.';
        const result = extractCodeBlock(content);
        expect(result).toEqual({ code: 'const x = 1;\n', language: 'typescript' });
    });

    it('defaults language to javascript when unspecified', () => {
        const content = '```\nfoo()\n```';
        const result = extractCodeBlock(content);
        expect(result).toEqual({ code: 'foo()\n', language: 'javascript' });
    });

    it('returns null when no code block exists', () => {
        expect(extractCodeBlock('just plain text')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// getErrorMessage
// ---------------------------------------------------------------------------

describe('getErrorMessage', () => {
    it('returns Error message', () => {
        expect(getErrorMessage(new Error('oops'), 'fallback')).toBe('oops');
    });

    it('returns fallback for non-Error', () => {
        expect(getErrorMessage('string error', 'fallback')).toBe('fallback');
    });

    it('returns fallback for null', () => {
        expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    });
});

// ---------------------------------------------------------------------------
// getExpertModeConfig
// ---------------------------------------------------------------------------

describe('getExpertModeConfig', () => {
    it('returns coding config', () => {
        const config = getExpertModeConfig('coding');
        expect(config.temperature).toBe(0.2);
        expect(config.topP).toBe(0.1);
        expect(config.systemPrompt).toContain('software engineer');
    });

    it('returns creative config', () => {
        const config = getExpertModeConfig('creative');
        expect(config.temperature).toBe(0.9);
    });

    it('returns math config', () => {
        const config = getExpertModeConfig('math');
        expect(config.temperature).toBe(0.1);
    });

    it('returns reasoning config', () => {
        const config = getExpertModeConfig('reasoning');
        expect(config.systemPrompt).toContain('logic expert');
    });

    it('returns default for null', () => {
        const config = getExpertModeConfig(null);
        expect(config.temperature).toBe(0.7);
    });

    it('returns default for unknown mode', () => {
        const config = getExpertModeConfig('unknown-mode');
        expect(config.temperature).toBe(0.7);
    });
});

// ---------------------------------------------------------------------------
// deriveCloudSyncBadge
// ---------------------------------------------------------------------------

describe('deriveCloudSyncBadge', () => {
    it('returns Cloud Off when not authenticated', () => {
        const badge = deriveCloudSyncBadge(null, false);
        expect(badge.label).toBe('Cloud Off');
    });

    it('returns Cloud Ready when authenticated but never synced', () => {
        const badge = deriveCloudSyncBadge(null, true);
        expect(badge.label).toBe('Cloud Ready');
    });

    it('returns Cloud Ready when lastSyncedAt is undefined', () => {
        const badge = deriveCloudSyncBadge({}, true);
        expect(badge.label).toBe('Cloud Ready');
    });

    it('returns Cloud Synced when recently synced (< 5 min)', () => {
        const now = Date.now();
        const badge = deriveCloudSyncBadge({ lastSyncedAt: now - 60_000 }, true, now);
        expect(badge.label).toBe('Cloud Synced');
    });

    it('returns Cloud Stale when synced over 5 min ago', () => {
        const now = Date.now();
        const badge = deriveCloudSyncBadge({ lastSyncedAt: now - 10 * 60_000 }, true, now);
        expect(badge.label).toBe('Cloud Stale');
    });
});

// ---------------------------------------------------------------------------
// shouldWarnBeforeUnload
// ---------------------------------------------------------------------------

describe('shouldWarnBeforeUnload', () => {
    it('returns true when input has text', () => {
        expect(shouldWarnBeforeUnload('unsaved text', [])).toBe(true);
    });

    it('returns true when last message is loading', () => {
        expect(shouldWarnBeforeUnload('', [{ isLoading: true }])).toBe(true);
    });

    it('returns false when input is empty and nothing loading', () => {
        expect(shouldWarnBeforeUnload('', [])).toBe(false);
    });

    it('returns false when whitespace-only input and no loading', () => {
        expect(shouldWarnBeforeUnload('   ', [{ isLoading: false }])).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// formatWebFetchContent
// ---------------------------------------------------------------------------

describe('formatWebFetchContent', () => {
    it('wraps content with URL context tag', () => {
        const result = formatWebFetchContent('https://example.com', 'page content');
        expect(result).toBe('[CONTEXT FROM WEB: https://example.com]\n\npage content');
    });
});

// ---------------------------------------------------------------------------
// isComplianceLogEvent
// ---------------------------------------------------------------------------

describe('isComplianceLogEvent', () => {
    it('returns true for valid compliance event', () => {
        expect(isComplianceLogEvent({ category: 'chat', action: 'send' })).toBe(true);
    });

    it('returns false for null', () => {
        expect(isComplianceLogEvent(null)).toBe(false);
    });

    it('returns false for missing category', () => {
        expect(isComplianceLogEvent({ action: 'send' })).toBe(false);
    });

    it('returns false for non-string action', () => {
        expect(isComplianceLogEvent({ category: 'chat', action: 42 })).toBe(false);
    });

    it('returns false for primitives', () => {
        expect(isComplianceLogEvent('string')).toBe(false);
        expect(isComplianceLogEvent(123)).toBe(false);
    });
});
