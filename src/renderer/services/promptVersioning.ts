/**
 * Prompt Versioning Service
 *
 * Tracks and manages different versions of prompts:
 * - Save prompt versions with metadata
 * - Compare versions side-by-side
 * - Track performance metrics per version
 * - Restore previous versions
 * - Version history and diff view
 */

import { ChatMessage } from '../../shared/types';

// A single version of a prompt
export interface PromptVersion {
    id: string;
    promptId: string;
    version: number;
    content: string;
    systemPrompt?: string;
    description?: string;
    createdAt: number;
    createdBy?: string;
    // Performance metrics
    metrics?: VersionMetrics;
    // Tags for organization
    tags: string[];
    // Is this the active version?
    isActive: boolean;
}

// Performance metrics for a version
export interface VersionMetrics {
    useCount: number;
    avgResponseTime: number;
    avgTokensUsed: number;
    successRate: number; // 0-1
    userRatings: number[]; // 1-5 ratings
    avgRating: number;
    lastUsed?: number;
}

// A prompt with all its versions
export interface VersionedPrompt {
    id: string;
    name: string;
    description: string;
    category: string;
    versions: PromptVersion[];
    activeVersionId: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}

// Diff result between two versions
export interface VersionDiff {
    versionA: string;
    versionB: string;
    contentDiff: DiffLine[];
    systemPromptDiff?: DiffLine[];
    metricsDiff?: {
        avgResponseTime: { a: number; b: number; change: number };
        avgTokensUsed: { a: number; b: number; change: number };
        successRate: { a: number; b: number; change: number };
        avgRating: { a: number; b: number; change: number };
    };
}

export interface DiffLine {
    type: 'add' | 'remove' | 'unchanged';
    content: string;
    lineNumber: { old?: number; new?: number };
}

const STORAGE_KEY = 'versioned_prompts';

export class PromptVersioningService {
    private static prompts: Map<string, VersionedPrompt> = new Map();
    private static initialized = false;

    /**
     * Initialize the service
     */
    static init(): void {
        if (this.initialized) return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const prompts: VersionedPrompt[] = JSON.parse(stored);
                prompts.forEach(p => this.prompts.set(p.id, p));
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize prompt versioning service:', error);
            this.initialized = true;
        }
    }

    /**
     * Get all versioned prompts
     */
    static getAllPrompts(): VersionedPrompt[] {
        this.init();
        return Array.from(this.prompts.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get a specific prompt
     */
    static getPrompt(id: string): VersionedPrompt | undefined {
        this.init();
        return this.prompts.get(id);
    }

    /**
     * Create a new versioned prompt
     */
    static createPrompt(
        name: string,
        content: string,
        options: {
            description?: string;
            category?: string;
            systemPrompt?: string;
            tags?: string[];
        } = {}
    ): VersionedPrompt {
        this.init();

        const id = `vp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const firstVersion: PromptVersion = {
            id: versionId,
            promptId: id,
            version: 1,
            content,
            systemPrompt: options.systemPrompt,
            description: 'Initial version',
            createdAt: Date.now(),
            tags: [],
            isActive: true,
            metrics: {
                useCount: 0,
                avgResponseTime: 0,
                avgTokensUsed: 0,
                successRate: 1,
                userRatings: [],
                avgRating: 0,
            },
        };

        const prompt: VersionedPrompt = {
            id,
            name,
            description: options.description || '',
            category: options.category || 'general',
            versions: [firstVersion],
            activeVersionId: versionId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: options.tags || [],
        };

        this.prompts.set(id, prompt);
        this.persist();

        return prompt;
    }

    /**
     * Create a new version of an existing prompt
     */
    static createVersion(
        promptId: string,
        content: string,
        options: {
            description?: string;
            systemPrompt?: string;
            setActive?: boolean;
            tags?: string[];
        } = {}
    ): PromptVersion | null {
        this.init();

        const prompt = this.prompts.get(promptId);
        if (!prompt) return null;

        const latestVersion = Math.max(...prompt.versions.map(v => v.version));
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newVersion: PromptVersion = {
            id: versionId,
            promptId,
            version: latestVersion + 1,
            content,
            systemPrompt: options.systemPrompt,
            description: options.description || `Version ${latestVersion + 1}`,
            createdAt: Date.now(),
            tags: options.tags || [],
            isActive: options.setActive !== false,
            metrics: {
                useCount: 0,
                avgResponseTime: 0,
                avgTokensUsed: 0,
                successRate: 1,
                userRatings: [],
                avgRating: 0,
            },
        };

        // Deactivate other versions if this one is active
        if (newVersion.isActive) {
            prompt.versions.forEach(v => (v.isActive = false));
            prompt.activeVersionId = versionId;
        }

        prompt.versions.push(newVersion);
        prompt.updatedAt = Date.now();

        this.prompts.set(promptId, prompt);
        this.persist();

        return newVersion;
    }

    /**
     * Get a specific version
     */
    static getVersion(promptId: string, versionId: string): PromptVersion | undefined {
        this.init();
        const prompt = this.prompts.get(promptId);
        return prompt?.versions.find(v => v.id === versionId);
    }

    /**
     * Get all versions of a prompt
     */
    static getVersions(promptId: string): PromptVersion[] {
        this.init();
        const prompt = this.prompts.get(promptId);
        return prompt?.versions.sort((a, b) => b.version - a.version) || [];
    }

    /**
     * Get the active version of a prompt
     */
    static getActiveVersion(promptId: string): PromptVersion | undefined {
        this.init();
        const prompt = this.prompts.get(promptId);
        return prompt?.versions.find(v => v.id === prompt.activeVersionId);
    }

    /**
     * Set a version as active
     */
    static setActiveVersion(promptId: string, versionId: string): boolean {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return false;

        const version = prompt.versions.find(v => v.id === versionId);
        if (!version) return false;

        prompt.versions.forEach(v => (v.isActive = v.id === versionId));
        prompt.activeVersionId = versionId;
        prompt.updatedAt = Date.now();

        this.prompts.set(promptId, prompt);
        this.persist();

        return true;
    }

    /**
     * Record usage metrics for a version
     */
    static recordUsage(
        promptId: string,
        versionId: string,
        metrics: {
            responseTime: number;
            tokensUsed: number;
            success: boolean;
        }
    ): void {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return;

        const version = prompt.versions.find(v => v.id === versionId);
        if (!version || !version.metrics) return;

        const m = version.metrics;
        m.useCount++;
        m.lastUsed = Date.now();

        // Update running averages
        m.avgResponseTime =
            (m.avgResponseTime * (m.useCount - 1) + metrics.responseTime) / m.useCount;
        m.avgTokensUsed =
            (m.avgTokensUsed * (m.useCount - 1) + metrics.tokensUsed) / m.useCount;

        // Update success rate
        const totalSuccess = m.successRate * (m.useCount - 1) + (metrics.success ? 1 : 0);
        m.successRate = totalSuccess / m.useCount;

        this.prompts.set(promptId, prompt);
        this.persist();
    }

    /**
     * Add a user rating for a version
     */
    static addRating(promptId: string, versionId: string, rating: number): void {
        this.init();
        if (rating < 1 || rating > 5) return;

        const prompt = this.prompts.get(promptId);
        if (!prompt) return;

        const version = prompt.versions.find(v => v.id === versionId);
        if (!version || !version.metrics) return;

        version.metrics.userRatings.push(rating);
        version.metrics.avgRating =
            version.metrics.userRatings.reduce((a, b) => a + b, 0) /
            version.metrics.userRatings.length;

        this.prompts.set(promptId, prompt);
        this.persist();
    }

    /**
     * Compare two versions
     */
    static compareVersions(
        promptId: string,
        versionIdA: string,
        versionIdB: string
    ): VersionDiff | null {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return null;

        const versionA = prompt.versions.find(v => v.id === versionIdA);
        const versionB = prompt.versions.find(v => v.id === versionIdB);

        if (!versionA || !versionB) return null;

        // Create content diff
        const contentDiff = this.createDiff(versionA.content, versionB.content);

        // Create system prompt diff if both have one
        let systemPromptDiff: DiffLine[] | undefined;
        if (versionA.systemPrompt || versionB.systemPrompt) {
            systemPromptDiff = this.createDiff(
                versionA.systemPrompt || '',
                versionB.systemPrompt || ''
            );
        }

        // Calculate metrics diff if both have metrics
        let metricsDiff: VersionDiff['metricsDiff'];
        if (versionA.metrics && versionB.metrics) {
            metricsDiff = {
                avgResponseTime: {
                    a: versionA.metrics.avgResponseTime,
                    b: versionB.metrics.avgResponseTime,
                    change: versionB.metrics.avgResponseTime - versionA.metrics.avgResponseTime,
                },
                avgTokensUsed: {
                    a: versionA.metrics.avgTokensUsed,
                    b: versionB.metrics.avgTokensUsed,
                    change: versionB.metrics.avgTokensUsed - versionA.metrics.avgTokensUsed,
                },
                successRate: {
                    a: versionA.metrics.successRate,
                    b: versionB.metrics.successRate,
                    change: versionB.metrics.successRate - versionA.metrics.successRate,
                },
                avgRating: {
                    a: versionA.metrics.avgRating,
                    b: versionB.metrics.avgRating,
                    change: versionB.metrics.avgRating - versionA.metrics.avgRating,
                },
            };
        }

        return {
            versionA: versionIdA,
            versionB: versionIdB,
            contentDiff,
            systemPromptDiff,
            metricsDiff,
        };
    }

    /**
     * Create a simple line-by-line diff
     */
    private static createDiff(textA: string, textB: string): DiffLine[] {
        const linesA = textA.split('\n');
        const linesB = textB.split('\n');
        const diff: DiffLine[] = [];

        // Simple LCS-based diff
        const lcs = this.longestCommonSubsequence(linesA, linesB);

        let aIdx = 0;
        let bIdx = 0;
        let lcsIdx = 0;

        while (aIdx < linesA.length || bIdx < linesB.length) {
            if (lcsIdx < lcs.length && aIdx < linesA.length && linesA[aIdx] === lcs[lcsIdx]) {
                // Line is in both - unchanged
                diff.push({
                    type: 'unchanged',
                    content: linesA[aIdx],
                    lineNumber: { old: aIdx + 1, new: bIdx + 1 },
                });
                aIdx++;
                bIdx++;
                lcsIdx++;
            } else if (bIdx < linesB.length && (lcsIdx >= lcs.length || linesB[bIdx] !== lcs[lcsIdx])) {
                // Line only in B - added
                diff.push({
                    type: 'add',
                    content: linesB[bIdx],
                    lineNumber: { new: bIdx + 1 },
                });
                bIdx++;
            } else if (aIdx < linesA.length) {
                // Line only in A - removed
                diff.push({
                    type: 'remove',
                    content: linesA[aIdx],
                    lineNumber: { old: aIdx + 1 },
                });
                aIdx++;
            }
        }

        return diff;
    }

    /**
     * Find longest common subsequence of lines
     */
    private static longestCommonSubsequence(a: string[], b: string[]): string[] {
        const m = a.length;
        const n = b.length;
        const dp: number[][] = Array(m + 1)
            .fill(null)
            .map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find LCS
        const lcs: string[] = [];
        let i = m;
        let j = n;

        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                lcs.unshift(a[i - 1]);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    }

    /**
     * Delete a version (cannot delete active version unless it's the only one)
     */
    static deleteVersion(promptId: string, versionId: string): boolean {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return false;

        // Can't delete the active version if there are other versions
        if (prompt.activeVersionId === versionId && prompt.versions.length > 1) {
            return false;
        }

        // Can't delete the only version
        if (prompt.versions.length === 1) {
            return false;
        }

        prompt.versions = prompt.versions.filter(v => v.id !== versionId);
        prompt.updatedAt = Date.now();

        this.prompts.set(promptId, prompt);
        this.persist();

        return true;
    }

    /**
     * Delete an entire prompt and all its versions
     */
    static deletePrompt(promptId: string): boolean {
        this.init();
        const deleted = this.prompts.delete(promptId);
        if (deleted) {
            this.persist();
        }
        return deleted;
    }

    /**
     * Update prompt metadata
     */
    static updatePrompt(
        promptId: string,
        updates: Partial<Pick<VersionedPrompt, 'name' | 'description' | 'category' | 'tags'>>
    ): VersionedPrompt | null {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return null;

        Object.assign(prompt, updates, { updatedAt: Date.now() });
        this.prompts.set(promptId, prompt);
        this.persist();

        return prompt;
    }

    /**
     * Update version metadata
     */
    static updateVersion(
        promptId: string,
        versionId: string,
        updates: Partial<Pick<PromptVersion, 'description' | 'tags'>>
    ): PromptVersion | null {
        this.init();
        const prompt = this.prompts.get(promptId);
        if (!prompt) return null;

        const version = prompt.versions.find(v => v.id === versionId);
        if (!version) return null;

        Object.assign(version, updates);
        prompt.updatedAt = Date.now();

        this.prompts.set(promptId, prompt);
        this.persist();

        return version;
    }

    /**
     * Search prompts
     */
    static searchPrompts(query: string): VersionedPrompt[] {
        this.init();
        const q = query.toLowerCase();

        return this.getAllPrompts().filter(
            p =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q)) ||
                p.versions.some(v => v.content.toLowerCase().includes(q))
        );
    }

    /**
     * Get prompts by category
     */
    static getByCategory(category: string): VersionedPrompt[] {
        this.init();
        return this.getAllPrompts().filter(p => p.category === category);
    }

    /**
     * Get top performing versions across all prompts
     */
    static getTopPerformingVersions(limit: number = 10): PromptVersion[] {
        this.init();
        const allVersions: PromptVersion[] = [];

        this.prompts.forEach(p => {
            allVersions.push(...p.versions);
        });

        return allVersions
            .filter(v => v.metrics && v.metrics.useCount > 0)
            .sort((a, b) => {
                const scoreA = this.calculatePerformanceScore(a);
                const scoreB = this.calculatePerformanceScore(b);
                return scoreB - scoreA;
            })
            .slice(0, limit);
    }

    /**
     * Calculate a performance score for a version
     */
    private static calculatePerformanceScore(version: PromptVersion): number {
        if (!version.metrics) return 0;
        const m = version.metrics;

        // Weighted score based on multiple factors
        const ratingScore = m.avgRating / 5; // 0-1
        const successScore = m.successRate; // 0-1
        const usageScore = Math.min(m.useCount / 100, 1); // Cap at 100 uses

        return ratingScore * 0.4 + successScore * 0.4 + usageScore * 0.2;
    }

    /**
     * Export prompts
     */
    static exportPrompts(promptIds?: string[]): string {
        this.init();

        const prompts = promptIds
            ? this.getAllPrompts().filter(p => promptIds.includes(p.id))
            : this.getAllPrompts();

        return JSON.stringify(
            {
                version: '1.0',
                exportedAt: Date.now(),
                prompts,
            },
            null,
            2
        );
    }

    /**
     * Import prompts
     */
    static importPrompts(jsonData: string): { imported: number; errors: string[] } {
        this.init();
        const errors: string[] = [];
        let imported = 0;

        try {
            const data = JSON.parse(jsonData);

            if (!data.prompts || !Array.isArray(data.prompts)) {
                errors.push('Invalid export file format');
                return { imported, errors };
            }

            for (const prompt of data.prompts) {
                try {
                    if (!prompt.name || !prompt.versions || !prompt.activeVersionId) {
                        errors.push(`Skipped prompt: missing required fields`);
                        continue;
                    }

                    // Generate new IDs
                    const newId = `vp-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const idMap = new Map<string, string>();

                    const newVersions = prompt.versions.map((v: PromptVersion) => {
                        const newVersionId = `v-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        idMap.set(v.id, newVersionId);
                        return {
                            ...v,
                            id: newVersionId,
                            promptId: newId,
                            metrics: { ...v.metrics, useCount: 0, lastUsed: undefined },
                        };
                    });

                    const newPrompt: VersionedPrompt = {
                        ...prompt,
                        id: newId,
                        versions: newVersions,
                        activeVersionId: idMap.get(prompt.activeVersionId) || newVersions[0].id,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };

                    this.prompts.set(newId, newPrompt);
                    imported++;
                } catch (e) {
                    errors.push(`Failed to import: ${prompt.name || 'unknown'}`);
                }
            }

            if (imported > 0) {
                this.persist();
            }
        } catch (e) {
            errors.push('Failed to parse import file');
        }

        return { imported, errors };
    }

    /**
     * Persist to storage
     */
    private static persist(): void {
        try {
            const prompts = Array.from(this.prompts.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
        } catch (error) {
            console.error('Failed to persist versioned prompts:', error);
        }
    }

    /**
     * Reset all data
     */
    static reset(): void {
        this.prompts.clear();
        localStorage.removeItem(STORAGE_KEY);
    }
}

// Initialize on load
PromptVersioningService.init();

export default PromptVersioningService;
