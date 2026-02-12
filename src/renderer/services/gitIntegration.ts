/**
 * Git Integration Service
 *
 * Commit code directly from conversations
 */

import { ChatMessage } from '../../shared/types';

export interface GitConfig {
    enabled: boolean;
    autoCommit: boolean;
    defaultCommitMessage?: string;
    authorName?: string;
    authorEmail?: string;
}

export interface GitCommit {
    id: string;
    sessionId: string;
    messageId: number;
    filePath: string;
    code: string;
    commitMessage: string;
    committedAt: number;
    success: boolean;
    error?: string;
}

export interface GitRepository {
    path: string;
    branch: string;
    status: 'clean' | 'dirty' | 'unknown';
    lastCommit?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getDefaultConfig = (): GitConfig => ({
    enabled: false,
    autoCommit: false,
});

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
};

const sanitizePositiveInteger = (value: unknown): number | null => {
    const normalized = sanitizeFiniteNonNegativeInteger(value);
    if (normalized === null || normalized <= 0) {
        return null;
    }
    return normalized;
};

const sanitizeConfig = (value: unknown): GitConfig => {
    const defaults = getDefaultConfig();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        autoCommit: typeof value.autoCommit === 'boolean' ? value.autoCommit : defaults.autoCommit,
        defaultCommitMessage: sanitizeNonEmptyString(value.defaultCommitMessage) || undefined,
        authorName: sanitizeNonEmptyString(value.authorName) || undefined,
        authorEmail: sanitizeNonEmptyString(value.authorEmail) || undefined,
    };
};

const sanitizeCommit = (value: unknown): GitCommit | null => {
    if (!isRecord(value) || typeof value.success !== 'boolean') {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const filePath = sanitizeNonEmptyString(value.filePath);
    const commitMessage = sanitizeNonEmptyString(value.commitMessage);
    const messageId = sanitizeFiniteNonNegativeInteger(value.messageId);
    const committedAt = sanitizeFiniteNonNegativeInteger(value.committedAt);
    if (!id
        || !filePath
        || !commitMessage
        || messageId === null
        || committedAt === null
        || typeof value.sessionId !== 'string'
        || typeof value.code !== 'string') {
        return null;
    }
    const sessionId = value.sessionId.trim();

    return {
        id,
        sessionId,
        messageId,
        filePath,
        code: value.code,
        commitMessage,
        committedAt,
        success: value.success,
        error: sanitizeNonEmptyString(value.error) || undefined,
    };
};

const parseStoredCommits = (raw: string): GitCommit[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const commits = parsed
        .map((entry) => sanitizeCommit(entry))
        .filter((entry): entry is GitCommit => entry !== null);
    const seenIds = new Set<string>();
    return commits.filter((entry) => {
        if (seenIds.has(entry.id)) {
            return false;
        }
        seenIds.add(entry.id);
        return true;
    });
};

export class GitIntegrationService {
    private static instance: GitIntegrationService;
    private readonly STORAGE_KEY = 'git_config';
    private readonly COMMITS_KEY = 'git_commits';

    private constructor() {
        this.loadConfig();
    }

    static getInstance(): GitIntegrationService {
        if (!GitIntegrationService.instance) {
            GitIntegrationService.instance = new GitIntegrationService();
        }
        return GitIntegrationService.instance;
    }

    /**
     * Load Git configuration
     */
    private loadConfig(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                // Config loaded
            }
        } catch (error) {
            console.error('Failed to load Git config:', error);
        }
    }

    /**
     * Get Git configuration
     */
    getConfig(): GitConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return sanitizeConfig(parseJson(stored));
            }
        } catch (error) {
            console.error('Failed to load Git config:', error);
        }

        return getDefaultConfig();
    }

    /**
     * Update Git configuration
     */
    updateConfig(config: Partial<GitConfig>): void {
        const current = this.getConfig();
        const updated = sanitizeConfig({ ...current, ...config });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }

    /**
     * Detect Git repository
     */
    async detectRepository(path: string): Promise<GitRepository | null> {
        // In a real implementation, this would use Electron IPC to check for .git directory
        // For now, return mock data
        return {
            path,
            branch: 'main',
            status: 'clean',
        };
    }

    /**
     * Commit code to Git
     */
    async commitCode(
        filePath: string,
        code: string,
        commitMessage: string,
        sessionId?: string,
        messageId?: number
    ): Promise<GitCommit> {
        const commit: GitCommit = {
            id: crypto.randomUUID(),
            sessionId: sessionId || '',
            messageId: messageId || 0,
            filePath,
            code,
            commitMessage,
            committedAt: Date.now(),
            success: false,
        };

        try {
            // Use Electron IPC to execute git commands
            if (window.electronAPI?.gitCommit) {
                const result = await window.electronAPI.gitCommit({
                    filePath,
                    content: code,
                    message: commitMessage,
                });
                commit.success = Boolean(result.success);
                commit.error = result.error;
            } else {
                // Mock commit for development
                commit.success = true;
            }

            this.saveCommit(commit);
            return commit;
        } catch (error) {
            commit.success = false;
            commit.error = error instanceof Error ? error.message : 'Unknown error';
            this.saveCommit(commit);
            return commit;
        }
    }

    /**
     * Get commit history
     */
    getCommitHistory(limit: number = 20): GitCommit[] {
        try {
            const stored = localStorage.getItem(this.COMMITS_KEY);
            if (!stored) return [];
            const sanitizedLimit = sanitizePositiveInteger(limit) ?? 20;
            const commits = parseStoredCommits(stored);
            return commits.slice(-sanitizedLimit).reverse();
        } catch (error) {
            console.error('Failed to load commit history:', error);
            return [];
        }
    }

    /**
     * Save commit record
     */
    private saveCommit(commit: GitCommit): void {
        try {
            const sanitizedCommit = sanitizeCommit(commit);
            if (!sanitizedCommit) {
                return;
            }
            const stored = localStorage.getItem(this.COMMITS_KEY);
            const commits = stored ? parseStoredCommits(stored) : [];
            const index = commits.findIndex((entry) => entry.id === sanitizedCommit.id);
            if (index >= 0) {
                commits[index] = sanitizedCommit;
            } else {
                commits.push(sanitizedCommit);
            }
            const deduped: GitCommit[] = [];
            const seenIds = new Set<string>();
            for (let currentIndex = commits.length - 1; currentIndex >= 0; currentIndex--) {
                const entry = commits[currentIndex];
                if (seenIds.has(entry.id)) {
                    continue;
                }
                seenIds.add(entry.id);
                deduped.push(entry);
            }
            deduped.reverse();
            // Keep only last 100 commits
            if (deduped.length > 100) {
                deduped.splice(0, deduped.length - 100);
            }
            localStorage.setItem(this.COMMITS_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save commit:', error);
        }
    }

    /**
     * Generate commit message from conversation
     */
    generateCommitMessage(messages: ChatMessage[]): string {
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (lastUserMessage?.content) {
            // Extract a short description from the user's message
            const content = lastUserMessage.content.substring(0, 72);
            return `Add: ${content}${content.length >= 72 ? '...' : ''}`;
        }
        return 'Add: Code changes';
    }
}

export const gitIntegrationService = GitIntegrationService.getInstance();
