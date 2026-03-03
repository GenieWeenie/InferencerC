/**
 * Pure helper functions extracted from React hooks for testability.
 *
 * Each function here was previously inline in a hook. They have zero
 * React dependencies and can be tested in isolation.
 */

import type { ChatMessage } from '../../shared/types';

// ---------------------------------------------------------------------------
// From useChatStreaming.ts
// ---------------------------------------------------------------------------

export const deriveSessionTitleFromMessages = (messages: ChatMessage[]): string => {
    const firstUserMessage = messages.find(
        (message) => message.role === 'user' && typeof message.content === 'string' && message.content.trim().length > 0
    );
    if (!firstUserMessage || typeof firstUserMessage.content !== 'string') {
        return 'New Chat';
    }
    const content = firstUserMessage.content;
    return content.slice(0, 30) + (content.length > 30 ? '...' : '');
};

// ---------------------------------------------------------------------------
// From useChatSendOrchestrator.ts
// ---------------------------------------------------------------------------

type SupportedImageMimeType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

const SUPPORTED_IMAGE_MIME_TYPES = new Set<SupportedImageMimeType>([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
]);

export const toSupportedImageMimeType = (mimeType: string): SupportedImageMimeType => {
    if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType as SupportedImageMimeType)) {
        return mimeType as SupportedImageMimeType;
    }
    return 'image/png';
};

export interface TextAttachment {
    id: string;
    name: string;
    content: string;
}

export const formatAttachmentsForContext = (attachments: TextAttachment[]): string => {
    return attachments
        .map((a) => `[FILE: ${a.name}]\n${a.content}\n[/FILE]`)
        .join('\n');
};

// ---------------------------------------------------------------------------
// From useChatSessionIntegrations.ts
// ---------------------------------------------------------------------------

export const mapSessionMessagesForExternalShare = (
    sessionMessages: Array<{ role: string; content?: string }>
): Array<{ role: string; content: string }> => {
    return sessionMessages.map((message) => ({
        role: message.role,
        content: message.content || '',
    }));
};

export const extractCodeBlock = (
    content: string
): { code: string; language: string } | null => {
    const match = content.match(/```(\w+)?\n([\s\S]*?)```/);
    if (!match) return null;
    return { code: match[2], language: match[1] || 'javascript' };
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

// ---------------------------------------------------------------------------
// From useChatExpertMode.ts
// ---------------------------------------------------------------------------

export interface ExpertModeConfig {
    systemPrompt: string;
    temperature: number;
    topP: number;
}

const EXPERT_MODE_CONFIGS: Record<string, ExpertModeConfig> = {
    coding: {
        systemPrompt: 'You are an expert software engineer. You write clean, efficient, and well-documented code. Always invoke standard libraries where possible.',
        temperature: 0.2,
        topP: 0.1,
    },
    creative: {
        systemPrompt: 'You are a creative writer. Use vivid imagery, engaging hooks, and varied sentence structures.',
        temperature: 0.9,
        topP: 0.95,
    },
    math: {
        systemPrompt: 'You are a mathematician. Solve problems step-by-step, showing all work. Use LaTeX for math notation.',
        temperature: 0.1,
        topP: 0.1,
    },
    reasoning: {
        systemPrompt: 'You are a logic expert. Analyze every problem deeply. Break it down into first principles.',
        temperature: 0.2,
        topP: 0.2,
    },
};

const DEFAULT_EXPERT_CONFIG: ExpertModeConfig = {
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    topP: 0.9,
};

export const getExpertModeConfig = (mode: string | null): ExpertModeConfig => {
    if (!mode) return DEFAULT_EXPERT_CONFIG;
    return EXPERT_MODE_CONFIGS[mode] ?? DEFAULT_EXPERT_CONFIG;
};

// ---------------------------------------------------------------------------
// From useChatRuntimeServices.ts
// ---------------------------------------------------------------------------

export interface CloudSyncBadge {
    label: string;
    className: string;
    title: string;
}

export const deriveCloudSyncBadge = (
    cloudSyncStatus: { lastSyncedAt?: number } | null,
    isCloudSyncAuthenticated: boolean,
    now: number = Date.now()
): CloudSyncBadge => {
    if (!isCloudSyncAuthenticated) {
        return {
            label: 'Cloud Off',
            className: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
            title: 'Cloud sync is not authenticated',
        };
    }

    if (!cloudSyncStatus?.lastSyncedAt) {
        return {
            label: 'Cloud Ready',
            className: 'bg-cyan-900/40 hover:bg-cyan-800/40 text-cyan-300 border-cyan-700/60',
            title: 'Cloud sync is authenticated and ready',
        };
    }

    const ageMs = now - cloudSyncStatus.lastSyncedAt;
    if (ageMs < 5 * 60 * 1000) {
        return {
            label: 'Cloud Synced',
            className: 'bg-emerald-900/40 hover:bg-emerald-800/40 text-emerald-300 border-emerald-700/60',
            title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
        };
    }

    return {
        label: 'Cloud Stale',
        className: 'bg-amber-900/40 hover:bg-amber-800/40 text-amber-300 border-amber-700/60',
        title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
    };
};

// ---------------------------------------------------------------------------
// From useChatPageEffects.ts
// ---------------------------------------------------------------------------

export const shouldWarnBeforeUnload = (
    input: string,
    history: Array<{ isLoading?: boolean }>
): boolean => {
    if (input.trim() !== '') return true;
    if (history.length > 0 && history[history.length - 1].isLoading) return true;
    return false;
};

// ---------------------------------------------------------------------------
// From useChatWebFetch.ts
// ---------------------------------------------------------------------------

export const formatWebFetchContent = (url: string, content: string): string => {
    return `[CONTEXT FROM WEB: ${url}]\n\n${content}`;
};

// ---------------------------------------------------------------------------
// From useChat.ts
// ---------------------------------------------------------------------------

export const isComplianceLogEvent = (value: unknown): value is { category: string; action: string } => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    return typeof record.category === 'string' && typeof record.action === 'string';
};
