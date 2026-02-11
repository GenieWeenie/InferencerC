/**
 * Code Review Service
 *
 * AI-powered code review suggestions
 */

import { ChatMessage } from '../../shared/types';

export interface CodeReviewIssue {
    type: 'error' | 'warning' | 'info' | 'suggestion';
    severity: 'critical' | 'high' | 'medium' | 'low';
    line?: number;
    column?: number;
    message: string;
    suggestion?: string;
    category: CodeReviewCategory;
}

export type CodeReviewCategory =
    | 'security'
    | 'performance'
    | 'style'
    | 'best-practice'
    | 'bug'
    | 'maintainability'
    | 'accessibility';

export interface CodeReviewResult {
    code: string;
    language: string;
    issues: CodeReviewIssue[];
    score: number; // 0-100
    summary: string;
    reviewedAt: number;
}

const REVIEW_ISSUE_TYPES = new Set<CodeReviewIssue['type']>(['error', 'warning', 'info', 'suggestion']);
const REVIEW_SEVERITIES = new Set<CodeReviewIssue['severity']>(['critical', 'high', 'medium', 'low']);
const REVIEW_CATEGORIES = new Set<CodeReviewCategory>([
    'security',
    'performance',
    'style',
    'best-practice',
    'bug',
    'maintainability',
    'accessibility',
]);

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

const toFiniteNumber = (value: unknown): number | undefined => (
    typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizePositiveInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }
    const rounded = Math.floor(value);
    return rounded > 0 ? rounded : null;
};

const sanitizeReviewIssue = (value: unknown): CodeReviewIssue | null => {
    if (!isRecord(value)
        || !REVIEW_ISSUE_TYPES.has(value.type as CodeReviewIssue['type'])
        || !REVIEW_SEVERITIES.has(value.severity as CodeReviewIssue['severity'])
        || !REVIEW_CATEGORIES.has(value.category as CodeReviewCategory)) {
        return null;
    }
    const message = sanitizeNonEmptyString(value.message);
    if (!message) {
        return null;
    }

    const line = toFiniteNumber(value.line);
    const column = toFiniteNumber(value.column);

    return {
        type: value.type as CodeReviewIssue['type'],
        severity: value.severity as CodeReviewIssue['severity'],
        line,
        column,
        message,
        suggestion: sanitizeNonEmptyString(value.suggestion) || undefined,
        category: value.category as CodeReviewCategory,
    };
};

const sanitizeStoredReview = (value: unknown): CodeReviewResult | null => {
    if (!isRecord(value)
        || typeof value.score !== 'number'
        || typeof value.reviewedAt !== 'number'
        || !Number.isFinite(value.score)
        || !Number.isFinite(value.reviewedAt)
        || !Array.isArray(value.issues)) {
        return null;
    }
    const code = sanitizeNonEmptyString(value.code);
    const language = sanitizeNonEmptyString(value.language);
    const summary = sanitizeNonEmptyString(value.summary);
    if (!code || !language || !summary) {
        return null;
    }

    return {
        code,
        language,
        issues: value.issues
            .map((entry) => sanitizeReviewIssue(entry))
            .filter((entry): entry is CodeReviewIssue => entry !== null),
        score: value.score,
        summary,
        reviewedAt: value.reviewedAt,
    };
};

const parseStoredReviews = (raw: string): CodeReviewResult[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const reviews = parsed
        .map((entry) => sanitizeStoredReview(entry))
        .filter((entry): entry is CodeReviewResult => entry !== null);
    const seenKeys = new Set<string>();
    return reviews.filter((entry) => {
        const key = `${entry.reviewedAt}:${entry.language}:${entry.code}`;
        if (seenKeys.has(key)) {
            return false;
        }
        seenKeys.add(key);
        return true;
    });
};

export class CodeReviewService {
    private static instance: CodeReviewService;
    private readonly STORAGE_KEY = 'code_reviews';

    private constructor() {}

    static getInstance(): CodeReviewService {
        if (!CodeReviewService.instance) {
            CodeReviewService.instance = new CodeReviewService();
        }
        return CodeReviewService.instance;
    }

    /**
     * Review code using AI
     */
    async reviewCode(
        code: string,
        language: string,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<CodeReviewResult> {
        const systemPrompt = `You are an expert code reviewer. Analyze the provided code and identify:
1. Security vulnerabilities
2. Performance issues
3. Code style violations
4. Best practice violations
5. Potential bugs
6. Maintainability concerns
7. Accessibility issues

Return a JSON object with this structure:
{
  "issues": [
    {
      "type": "error|warning|info|suggestion",
      "severity": "critical|high|medium|low",
      "line": 10,
      "column": 5,
      "message": "Issue description",
      "suggestion": "How to fix",
      "category": "security|performance|style|best-practice|bug|maintainability|accessibility"
    }
  ],
  "score": 85,
  "summary": "Overall code quality assessment"
}`;

        const userPrompt = `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            const parsed = this.parseReviewResult(result.content, code, language);

            this.saveReview(parsed);
            return parsed;
        } catch (error) {
            // Fallback to rule-based review
            return this.ruleBasedReview(code, language);
        }
    }

    /**
     * Parse AI review result
     */
    private parseReviewResult(content: string, code: string, language: string): CodeReviewResult {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.ruleBasedReview(code, language);
            }

            const parsed = parseJson(jsonMatch[0]);
            const parsedRecord = isRecord(parsed) ? parsed : {};
            const issues = Array.isArray(parsedRecord.issues)
                ? parsedRecord.issues
                    .map((entry) => sanitizeReviewIssue(entry))
                    .filter((entry): entry is CodeReviewIssue => entry !== null)
                : [];
            return {
                code,
                language,
                issues,
                score: typeof parsedRecord.score === 'number' ? parsedRecord.score : 0,
                summary: typeof parsedRecord.summary === 'string' ? parsedRecord.summary : 'Code review completed',
                reviewedAt: Date.now(),
            };
        } catch (error) {
            return this.ruleBasedReview(code, language);
        }
    }

    /**
     * Rule-based code review (fallback)
     */
    private ruleBasedReview(code: string, language: string): CodeReviewResult {
        const issues: CodeReviewIssue[] = [];

        // Check for common issues
        if (code.includes('eval(')) {
            issues.push({
                type: 'error',
                severity: 'critical',
                message: 'Use of eval() is dangerous and should be avoided',
                category: 'security',
                suggestion: 'Use safer alternatives like JSON.parse() or Function() constructor',
            });
        }

        if (code.includes('console.log')) {
            issues.push({
                type: 'warning',
                severity: 'low',
                message: 'console.log() statements should be removed in production',
                category: 'best-practice',
                suggestion: 'Remove or replace with proper logging',
            });
        }

        if (code.includes('TODO') || code.includes('FIXME')) {
            issues.push({
                type: 'info',
                severity: 'low',
                message: 'Code contains TODO or FIXME comments',
                category: 'maintainability',
            });
        }

        // Calculate score
        const criticalIssues = issues.filter(i => i.severity === 'critical').length;
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const score = Math.max(0, 100 - (criticalIssues * 20) - (highIssues * 10) - (issues.length * 2));

        return {
            code,
            language,
            issues,
            score,
            summary: `Found ${issues.length} issues. ${criticalIssues} critical, ${highIssues} high priority.`,
            reviewedAt: Date.now(),
        };
    }

    /**
     * Save review result
     */
    private saveReview(review: CodeReviewResult): void {
        try {
            const sanitizedReview = sanitizeStoredReview(review);
            if (!sanitizedReview) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const reviews = stored ? parseStoredReviews(stored) : [];
            reviews.push(sanitizedReview);
            const deduped: CodeReviewResult[] = [];
            const seenKeys = new Set<string>();
            for (let index = reviews.length - 1; index >= 0; index--) {
                const entry = reviews[index];
                const key = `${entry.reviewedAt}:${entry.language}:${entry.code}`;
                if (seenKeys.has(key)) {
                    continue;
                }
                seenKeys.add(key);
                deduped.push(entry);
            }
            deduped.reverse();
            // Keep only last 50 reviews
            if (deduped.length > 50) {
                deduped.splice(0, deduped.length - 50);
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save review:', error);
        }
    }

    /**
     * Get review history
     */
    getReviewHistory(limit: number = 20): CodeReviewResult[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const sanitizedLimit = sanitizePositiveInteger(limit) ?? 20;
            const reviews = parseStoredReviews(stored);
            return reviews.slice(-sanitizedLimit).reverse();
        } catch (error) {
            console.error('Failed to load review history:', error);
            return [];
        }
    }
}

export const codeReviewService = CodeReviewService.getInstance();
