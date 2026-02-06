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
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load Git config:', error);
        }

        return {
            enabled: false,
            autoCommit: false,
        };
    }

    /**
     * Update Git configuration
     */
    updateConfig(config: Partial<GitConfig>): void {
        const current = this.getConfig();
        const updated = { ...current, ...config };
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
            const commits: GitCommit[] = JSON.parse(stored);
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
            const commits: GitCommit[] = stored ? JSON.parse(stored) : [];
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
