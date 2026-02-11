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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return value;
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    value.forEach((entry) => {
        const normalized = sanitizeNonEmptyString(entry);
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        result.push(normalized);
    });
    return result;
};

const sanitizeMetrics = (value: unknown): VersionMetrics | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    const useCount = sanitizeFiniteNonNegativeNumber(value.useCount);
    const avgResponseTime = sanitizeFiniteNonNegativeNumber(value.avgResponseTime);
    const avgTokensUsed = sanitizeFiniteNonNegativeNumber(value.avgTokensUsed);
    const successRate = sanitizeFiniteNonNegativeNumber(value.successRate);
    const avgRating = sanitizeFiniteNonNegativeNumber(value.avgRating);
    if (
        useCount === null
        || avgResponseTime === null
        || avgTokensUsed === null
        || successRate === null
        || avgRating === null
    ) {
        return undefined;
    }
    const ratings = Array.isArray(value.userRatings)
        ? value.userRatings.filter((entry): entry is number => (
            typeof entry === 'number' && Number.isFinite(entry) && entry >= 1 && entry <= 5
        ))
        : [];

    return {
        useCount: Math.floor(useCount),
        avgResponseTime,
        avgTokensUsed,
        successRate: Math.min(1, successRate),
        userRatings: ratings,
        avgRating: Math.min(5, avgRating),
        lastUsed: sanitizeFiniteNonNegativeNumber(value.lastUsed) || undefined,
    };
};

const sanitizeVersion = (value: unknown): PromptVersion | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const promptId = sanitizeNonEmptyString(value.promptId);
    const version = sanitizeFiniteNonNegativeNumber(value.version);
    const content = sanitizeNonEmptyString(value.content);
    const createdAt = sanitizeFiniteNonNegativeNumber(value.createdAt);
    if (
        !id
        || !promptId
        || version === null
        || version < 1
        || !content
        || createdAt === null
        || typeof value.isActive !== 'boolean'
    ) {
        return null;
    }

    const metrics = sanitizeMetrics(value.metrics);

    return {
        id,
        promptId,
        version: Math.floor(version),
        content,
        systemPrompt: sanitizeNonEmptyString(value.systemPrompt) || undefined,
        description: sanitizeNonEmptyString(value.description) || undefined,
        createdAt: Math.floor(createdAt),
        createdBy: sanitizeNonEmptyString(value.createdBy) || undefined,
        metrics,
        tags: sanitizeStringArray(value.tags),
        isActive: value.isActive,
    };
};

const sanitizePrompt = (value: unknown): VersionedPrompt | null => {
    if (!isRecord(value) || !Array.isArray(value.versions)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const category = sanitizeNonEmptyString(value.category);
    const createdAt = sanitizeFiniteNonNegativeNumber(value.createdAt);
    const updatedAt = sanitizeFiniteNonNegativeNumber(value.updatedAt);
    if (!id || !name || !category || createdAt === null || updatedAt === null) {
        return null;
    }

    const versions = value.versions
        .map((entry) => sanitizeVersion(entry))
        .filter((entry): entry is PromptVersion => entry !== null);
    if (versions.length === 0) {
        return null;
    }
    const seenVersionIds = new Set<string>();
    const uniqueVersions = versions
        .filter((entry) => {
            if (seenVersionIds.has(entry.id)) {
                return false;
            }
            seenVersionIds.add(entry.id);
            return true;
        })
        .map((entry) => ({
            ...entry,
            promptId: id,
        }));

    const requestedActiveVersionId = sanitizeNonEmptyString(value.activeVersionId);
    const activeVersionId = requestedActiveVersionId && uniqueVersions.some((version) => version.id === requestedActiveVersionId)
        ? requestedActiveVersionId
        : uniqueVersions[0].id;

    uniqueVersions.forEach((version) => {
        version.isActive = version.id === activeVersionId;
    });

    return {
        id,
        name,
        description: typeof value.description === 'string' ? value.description.trim() : '',
        category,
        versions: uniqueVersions,
        activeVersionId,
        createdAt: Math.floor(createdAt),
        updatedAt: Math.max(Math.floor(createdAt), Math.floor(updatedAt)),
        tags: sanitizeStringArray(value.tags),
    };
};

const parseStoredPrompts = (raw: string): VersionedPrompt[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenIds = new Set<string>();
    return parsed
        .map((entry) => sanitizePrompt(entry))
        .filter((entry): entry is VersionedPrompt => {
            if (!entry) {
                return false;
            }
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
};

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
                const prompts = parseStoredPrompts(stored);
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
        const normalizedName = sanitizeNonEmptyString(name);
        const normalizedContent = sanitizeNonEmptyString(content);
        if (!normalizedName || !normalizedContent) {
            throw new Error('Prompt name and content are required');
        }
        const now = Date.now();

        const id = `vp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const firstVersion = sanitizeVersion({
            id: versionId,
            promptId: id,
            version: 1,
            content: normalizedContent,
            systemPrompt: sanitizeNonEmptyString(options.systemPrompt) || undefined,
            description: 'Initial version',
            createdAt: now,
            tags: sanitizeStringArray(options.tags),
            isActive: true,
            metrics: {
                useCount: 0,
                avgResponseTime: 0,
                avgTokensUsed: 0,
                successRate: 1,
                userRatings: [],
                avgRating: 0,
            },
        });
        if (!firstVersion) {
            throw new Error('Invalid prompt version configuration');
        }

        const prompt = sanitizePrompt({
            id,
            name: normalizedName,
            description: (typeof options.description === 'string' ? options.description.trim() : ''),
            category: sanitizeNonEmptyString(options.category) || 'general',
            versions: [firstVersion],
            activeVersionId: versionId,
            createdAt: now,
            updatedAt: now,
            tags: sanitizeStringArray(options.tags),
        });
        if (!prompt) {
            throw new Error('Invalid prompt configuration');
        }

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
        const normalizedPromptId = sanitizeNonEmptyString(promptId);
        const normalizedContent = sanitizeNonEmptyString(content);
        if (!normalizedPromptId || !normalizedContent) {
            return null;
        }

        const prompt = this.prompts.get(normalizedPromptId);
        if (!prompt) return null;

        const latestVersion = Math.max(...prompt.versions.map(v => v.version));
        const versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newVersion = sanitizeVersion({
            id: versionId,
            promptId: normalizedPromptId,
            version: latestVersion + 1,
            content: normalizedContent,
            systemPrompt: sanitizeNonEmptyString(options.systemPrompt) || undefined,
            description: sanitizeNonEmptyString(options.description) || `Version ${latestVersion + 1}`,
            createdAt: Date.now(),
            tags: sanitizeStringArray(options.tags),
            isActive: options.setActive !== false,
            metrics: {
                useCount: 0,
                avgResponseTime: 0,
                avgTokensUsed: 0,
                successRate: 1,
                userRatings: [],
                avgRating: 0,
            },
        });
        if (!newVersion) {
            return null;
        }
        const mergedPrompt = sanitizePrompt({
            ...prompt,
            versions: newVersion.isActive
                ? [...prompt.versions.map((entry) => ({ ...entry, isActive: false })), newVersion]
                : [...prompt.versions, newVersion],
            activeVersionId: newVersion.isActive ? versionId : prompt.activeVersionId,
            updatedAt: Date.now(),
            id: prompt.id,
            createdAt: prompt.createdAt,
        });
        if (!mergedPrompt) {
            return null;
        }

        this.prompts.set(mergedPrompt.id, mergedPrompt);
        this.persist();

        return mergedPrompt.versions.find((entry) => entry.id === newVersion.id) || null;
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
        const normalizedPromptId = sanitizeNonEmptyString(promptId);
        if (!normalizedPromptId) {
            return null;
        }
        const prompt = this.prompts.get(normalizedPromptId);
        if (!prompt) return null;

        const updatedPrompt = sanitizePrompt({
            ...prompt,
            name: typeof updates.name === 'string'
                ? (sanitizeNonEmptyString(updates.name) || prompt.name)
                : prompt.name,
            description: typeof updates.description === 'string'
                ? updates.description.trim()
                : prompt.description,
            category: typeof updates.category === 'string'
                ? (sanitizeNonEmptyString(updates.category) || prompt.category)
                : prompt.category,
            tags: typeof updates.tags !== 'undefined'
                ? sanitizeStringArray(updates.tags)
                : prompt.tags,
            updatedAt: Date.now(),
            id: prompt.id,
            createdAt: prompt.createdAt,
        });
        if (!updatedPrompt) {
            return null;
        }
        this.prompts.set(updatedPrompt.id, updatedPrompt);
        this.persist();

        return updatedPrompt;
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
        const normalizedPromptId = sanitizeNonEmptyString(promptId);
        const normalizedVersionId = sanitizeNonEmptyString(versionId);
        if (!normalizedPromptId || !normalizedVersionId) {
            return null;
        }
        const prompt = this.prompts.get(normalizedPromptId);
        if (!prompt) return null;

        const version = prompt.versions.find(v => v.id === normalizedVersionId);
        if (!version) return null;

        const updatedVersion = sanitizeVersion({
            ...version,
            description: typeof updates.description === 'string'
                ? (sanitizeNonEmptyString(updates.description) || undefined)
                : version.description,
            tags: typeof updates.tags !== 'undefined'
                ? sanitizeStringArray(updates.tags)
                : version.tags,
            id: version.id,
            promptId: version.promptId,
            version: version.version,
            content: version.content,
            createdAt: version.createdAt,
            isActive: version.isActive,
        });
        if (!updatedVersion) {
            return null;
        }

        const updatedPrompt = sanitizePrompt({
            ...prompt,
            versions: prompt.versions.map((entry) => (
                entry.id === normalizedVersionId ? updatedVersion : entry
            )),
            updatedAt: Date.now(),
            id: prompt.id,
            createdAt: prompt.createdAt,
            activeVersionId: prompt.activeVersionId,
        });
        if (!updatedPrompt) {
            return null;
        }

        this.prompts.set(updatedPrompt.id, updatedPrompt);
        this.persist();

        return updatedPrompt.versions.find((entry) => entry.id === normalizedVersionId) || null;
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
            const data = parseJson(jsonData);
            if (!isRecord(data) || !Array.isArray(data.prompts)) {
                errors.push('Invalid export file format');
                return { imported, errors };
            }

            for (const prompt of data.prompts) {
                try {
                    const sanitized = sanitizePrompt(prompt);
                    if (!sanitized) {
                        errors.push(`Skipped prompt: missing required fields`);
                        continue;
                    }

                    // Generate new IDs
                    const newId = `vp-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const idMap = new Map<string, string>();

                    const newVersions = sanitized.versions.map((v: PromptVersion) => {
                        const newVersionId = `v-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        idMap.set(v.id, newVersionId);
                        return {
                            ...v,
                            id: newVersionId,
                            promptId: newId,
                            metrics: v.metrics
                                ? { ...v.metrics, useCount: 0, lastUsed: undefined }
                                : {
                                    useCount: 0,
                                    avgResponseTime: 0,
                                    avgTokensUsed: 0,
                                    successRate: 1,
                                    userRatings: [],
                                    avgRating: 0,
                                    lastUsed: undefined,
                                },
                        };
                    });

                    const newPrompt: VersionedPrompt = {
                        ...sanitized,
                        id: newId,
                        versions: newVersions,
                        activeVersionId: idMap.get(sanitized.activeVersionId) || newVersions[0].id,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };

                    this.prompts.set(newId, newPrompt);
                    imported++;
                } catch (e) {
                    const promptName = isRecord(prompt) && typeof prompt.name === 'string'
                        ? prompt.name
                        : 'unknown';
                    errors.push(`Failed to import: ${promptName}`);
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
            const seenIds = new Set<string>();
            const prompts = Array.from(this.prompts.values())
                .map((entry) => sanitizePrompt(entry))
                .filter((entry): entry is VersionedPrompt => {
                    if (!entry) {
                        return false;
                    }
                    if (seenIds.has(entry.id)) {
                        return false;
                    }
                    seenIds.add(entry.id);
                    return true;
                });
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
