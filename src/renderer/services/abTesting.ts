/**
 * A/B Testing Service
 *
 * Enables testing different prompts and comparing results:
 * - Define multiple prompt variants (A, B, C, etc.)
 * - Execute all variants in parallel
 * - Track metrics (response time, tokens, quality)
 * - Compare results side-by-side
 * - Store test history
 */

import { ChatMessage } from '../../shared/types';

// A single variant in an A/B test
export interface ABTestVariant {
    id: string;
    name: string; // e.g., "Variant A", "Prompt V1"
    prompt: string;
    systemPrompt?: string;
    modelId?: string; // Optional: use specific model for this variant
    temperature?: number;
    topP?: number;
    maxTokens?: number;
}

// Result of executing a single variant
export interface ABTestVariantResult {
    variantId: string;
    variantName: string;
    response: string;
    responseTime: number; // milliseconds
    tokensUsed?: number;
    error?: string;
    metadata?: {
        modelId?: string;
        finishReason?: string;
    };
}

// Complete A/B test definition
export interface ABTest {
    id: string;
    name: string;
    description?: string;
    variants: ABTestVariant[];
    input: string; // The user input/question to test
    context?: ChatMessage[]; // Conversation context
    createdAt: number;
    completedAt?: number;
    results?: ABTestVariantResult[];
    status: 'draft' | 'running' | 'completed' | 'failed';
    metrics?: ABTestMetrics;
}

// Aggregated metrics for a test
export interface ABTestMetrics {
    bestVariant?: string; // Variant ID with best score
    avgResponseTime: number;
    totalTokens: number;
    successRate: number; // 0-1
    qualityScores?: Record<string, number>; // Variant ID -> quality score (0-1)
}

// Quality scoring criteria
export interface QualityCriteria {
    length?: { min?: number; max?: number; optimal?: number }; // Response length
    keywords?: string[]; // Keywords that should be present
    avoidKeywords?: string[]; // Keywords that should be avoided
    structure?: 'json' | 'markdown' | 'plain'; // Expected structure
}

export class ABTestingService {
    private static instance: ABTestingService;
    private static readonly STORAGE_KEY = 'ab_tests';
    private tests: Map<string, ABTest> = new Map();

    private constructor() {
        this.loadTests();
    }

    static getInstance(): ABTestingService {
        if (!ABTestingService.instance) {
            ABTestingService.instance = new ABTestingService();
        }
        return ABTestingService.instance;
    }

    /**
     * Load tests from localStorage
     */
    private loadTests(): void {
        try {
            const stored = localStorage.getItem(ABTestingService.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ABTest[];
                parsed.forEach(test => {
                    this.tests.set(test.id, test);
                });
            }
        } catch (error) {
            console.error('Failed to load A/B tests:', error);
        }
    }

    /**
     * Save tests to localStorage
     */
    private saveTests(): void {
        try {
            const tests = Array.from(this.tests.values());
            localStorage.setItem(ABTestingService.STORAGE_KEY, JSON.stringify(tests));
        } catch (error) {
            console.error('Failed to save A/B tests:', error);
        }
    }

    /**
     * Create a new A/B test
     */
    createTest(name: string, variants: ABTestVariant[], input: string, context?: ChatMessage[]): ABTest {
        const test: ABTest = {
            id: crypto.randomUUID(),
            name,
            variants,
            input,
            context,
            createdAt: Date.now(),
            status: 'draft',
        };

        this.tests.set(test.id, test);
        this.saveTests();
        return test;
    }

    /**
     * Get a test by ID
     */
    getTest(id: string): ABTest | undefined {
        return this.tests.get(id);
    }

    /**
     * Get all tests
     */
    getAllTests(): ABTest[] {
        return Array.from(this.tests.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Update a test
     */
    updateTest(id: string, updates: Partial<ABTest>): boolean {
        const test = this.tests.get(id);
        if (!test) return false;

        const updated = { ...test, ...updates };
        this.tests.set(id, updated);
        this.saveTests();
        return true;
    }

    /**
     * Delete a test
     */
    deleteTest(id: string): boolean {
        const deleted = this.tests.delete(id);
        if (deleted) {
            this.saveTests();
        }
        return deleted;
    }

    /**
     * Execute an A/B test
     * Runs all variants in parallel and collects results
     */
    async executeTest(
        testId: string,
        executePrompt: (
            prompt: string,
            systemPrompt?: string,
            modelId?: string,
            temperature?: number,
            topP?: number,
            maxTokens?: number
        ) => Promise<{ content: string; tokensUsed?: number }>
    ): Promise<ABTestVariantResult[]> {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`Test ${testId} not found`);
        }

        // Update status
        this.updateTest(testId, { status: 'running' });

        const results: ABTestVariantResult[] = [];

        // Execute all variants in parallel
        const promises = test.variants.map(async (variant) => {
            const startTime = Date.now();
            try {
                const result = await executePrompt(
                    variant.prompt,
                    variant.systemPrompt,
                    variant.modelId,
                    variant.temperature,
                    variant.topP,
                    variant.maxTokens
                );

                const responseTime = Date.now() - startTime;

                return {
                    variantId: variant.id,
                    variantName: variant.name,
                    response: result.content,
                    responseTime,
                    tokensUsed: result.tokensUsed,
                } as ABTestVariantResult;
            } catch (error) {
                const responseTime = Date.now() - startTime;
                return {
                    variantId: variant.id,
                    variantName: variant.name,
                    response: '',
                    responseTime,
                    error: error instanceof Error ? error.message : 'Unknown error',
                } as ABTestVariantResult;
            }
        });

        const variantResults = await Promise.all(promises);
        results.push(...variantResults);

        // Calculate metrics
        const metrics = this.calculateMetrics(results);
        const successCount = results.filter(r => !r.error).length;
        const successRate = results.length > 0 ? successCount / results.length : 0;

        // Update test with results
        this.updateTest(testId, {
            results,
            status: successRate > 0 ? 'completed' : 'failed',
            completedAt: Date.now(),
            metrics: {
                ...metrics,
                successRate,
            },
        });

        return results;
    }

    /**
     * Calculate quality metrics for test results
     */
    calculateMetrics(results: ABTestVariantResult[], criteria?: QualityCriteria): ABTestMetrics {
        const successfulResults = results.filter(r => !r.error);
        
        if (successfulResults.length === 0) {
            return {
                avgResponseTime: 0,
                totalTokens: 0,
                successRate: 0,
            };
        }

        const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
        const totalTokens = successfulResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

        // Calculate quality scores if criteria provided
        const qualityScores: Record<string, number> = {};
        if (criteria) {
            successfulResults.forEach(result => {
                qualityScores[result.variantId] = this.calculateQualityScore(result, criteria);
            });
        }

        // Find best variant (highest quality score or fastest response)
        let bestVariant: string | undefined;
        if (Object.keys(qualityScores).length > 0) {
            bestVariant = Object.entries(qualityScores)
                .sort((a, b) => b[1] - a[1])[0]?.[0];
        } else {
            // Fallback: fastest successful response
            bestVariant = successfulResults
                .sort((a, b) => a.responseTime - b.responseTime)[0]?.variantId;
        }

        return {
            bestVariant,
            avgResponseTime,
            totalTokens,
            successRate: successfulResults.length / results.length,
            qualityScores: Object.keys(qualityScores).length > 0 ? qualityScores : undefined,
        };
    }

    /**
     * Calculate quality score for a single result based on criteria
     */
    private calculateQualityScore(result: ABTestVariantResult, criteria: QualityCriteria): number {
        let score = 1.0; // Start with perfect score

        // Length check
        if (criteria.length) {
            const length = result.response.length;
            if (criteria.length.min && length < criteria.length.min) {
                score *= 0.5; // Penalize too short
            }
            if (criteria.length.max && length > criteria.length.max) {
                score *= 0.7; // Penalize too long
            }
            if (criteria.length.optimal) {
                const diff = Math.abs(length - criteria.length.optimal);
                const penalty = Math.min(diff / criteria.length.optimal, 0.5);
                score *= (1 - penalty);
            }
        }

        // Keyword checks
        if (criteria.keywords && criteria.keywords.length > 0) {
            const foundKeywords = criteria.keywords.filter(kw =>
                result.response.toLowerCase().includes(kw.toLowerCase())
            ).length;
            const keywordScore = foundKeywords / criteria.keywords.length;
            score *= keywordScore;
        }

        // Avoid keywords
        if (criteria.avoidKeywords && criteria.avoidKeywords.length > 0) {
            const foundAvoided = criteria.avoidKeywords.filter(kw =>
                result.response.toLowerCase().includes(kw.toLowerCase())
            ).length;
            if (foundAvoided > 0) {
                score *= 0.3; // Heavy penalty for avoided keywords
            }
        }

        // Structure check
        if (criteria.structure) {
            const hasStructure = this.checkStructure(result.response, criteria.structure);
            if (!hasStructure) {
                score *= 0.6; // Penalize wrong structure
            }
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Check if response matches expected structure
     */
    private checkStructure(response: string, structure: 'json' | 'markdown' | 'plain'): boolean {
        switch (structure) {
            case 'json':
                try {
                    JSON.parse(response);
                    return true;
                } catch {
                    return false;
                }
            case 'markdown':
                // Simple check: has markdown syntax
                return /[#*`\[\]]/.test(response);
            case 'plain':
                return true; // Always true for plain
            default:
                return true;
        }
    }

    /**
     * Compare two test results side-by-side
     */
    compareResults(result1: ABTestVariantResult, result2: ABTestVariantResult): {
        winner: 'result1' | 'result2' | 'tie';
        differences: string[];
    } {
        const differences: string[] = [];

        // Response time comparison
        if (result1.responseTime < result2.responseTime) {
            differences.push(`${result1.variantName} was ${result2.responseTime - result1.responseTime}ms faster`);
        } else if (result2.responseTime < result1.responseTime) {
            differences.push(`${result2.variantName} was ${result1.responseTime - result2.responseTime}ms faster`);
        }

        // Token usage comparison
        if (result1.tokensUsed && result2.tokensUsed) {
            if (result1.tokensUsed < result2.tokensUsed) {
                differences.push(`${result1.variantName} used ${result2.tokensUsed - result1.tokensUsed} fewer tokens`);
            } else if (result2.tokensUsed < result1.tokensUsed) {
                differences.push(`${result2.variantName} used ${result1.tokensUsed - result2.tokensUsed} fewer tokens`);
            }
        }

        // Length comparison
        if (result1.response.length !== result2.response.length) {
            const diff = Math.abs(result1.response.length - result2.response.length);
            differences.push(`Length difference: ${diff} characters`);
        }

        // Determine winner (simplified: faster + shorter response wins)
        let winner: 'result1' | 'result2' | 'tie' = 'tie';
        const score1 = (result1.error ? 0 : 1) - (result1.responseTime / 10000) - (result1.response.length / 100000);
        const score2 = (result2.error ? 0 : 1) - (result2.responseTime / 10000) - (result2.response.length / 100000);

        if (score1 > score2) winner = 'result1';
        else if (score2 > score1) winner = 'result2';

        return { winner, differences };
    }

    /**
     * Export test results
     */
    exportTest(testId: string): string {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`Test ${testId} not found`);
        }

        return JSON.stringify(test, null, 2);
    }

    /**
     * Import test
     */
    importTest(json: string): ABTest {
        try {
            const test = JSON.parse(json) as ABTest;
            test.id = crypto.randomUUID(); // Generate new ID
            test.createdAt = Date.now();
            this.tests.set(test.id, test);
            this.saveTests();
            return test;
        } catch (error) {
            throw new Error('Invalid test format');
        }
    }
}

export const abTestingService = ABTestingService.getInstance();
