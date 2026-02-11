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
    typeof value === 'object' && value !== null
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

const sanitizeConfig = (value: unknown): GitConfig => {
    const defaults = getDefaultConfig();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        autoCommit: typeof value.autoCommit === 'boolean' ? value.autoCommit : defaults.autoCommit,
        defaultCommitMessage: typeof value.defaultCommitMessage === 'string' ? value.defaultCommitMessage : undefined,
        authorName: typeof value.authorName === 'string' ? value.authorName : undefined,
        authorEmail: typeof value.authorEmail === 'string' ? value.authorEmail : undefined,
    };
};

const sanitizeCommit = (value: unknown): GitCommit | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.sessionId !== 'string'
        || typeof value.messageId !== 'number'
        || typeof value.filePath !== 'string'
        || typeof value.code !== 'string'
        || typeof value.commitMessage !== 'string'
        || typeof value.committedAt !== 'number'
        || typeof value.success !== 'boolean') {
        return null;
    }

    return {
        id: value.id,
        sessionId: value.sessionId,
        messageId: value.messageId,
        filePath: value.filePath,
        code: value.code,
        commitMessage: value.commitMessage,
        committedAt: value.committedAt,
        success: value.success,
        error: typeof value.error === 'string' ? value.error : undefined,
    };
};

const parseStoredCommits = (raw: string): GitCommit[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeCommit(entry))
        .filter((entry): entry is GitCommit => entry !== null);
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
                commit.success = result.success;
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
            const commits = parseStoredCommits(stored);
            return commits.slice(-limit).reverse();
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
            const stored = localStorage.getItem(this.COMMITS_KEY);
            const commits = stored ? parseStoredCommits(stored) : [];
            commits.push(commit);
            // Keep only last 100 commits
            if (commits.length > 100) {
                commits.shift();
            }
            localStorage.setItem(this.COMMITS_KEY, JSON.stringify(commits));
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
