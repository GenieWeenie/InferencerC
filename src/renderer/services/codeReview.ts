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
    typeof value === 'object' && value !== null
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

const sanitizeReviewIssue = (value: unknown): CodeReviewIssue | null => {
    if (!isRecord(value)
        || typeof value.message !== 'string'
        || !REVIEW_ISSUE_TYPES.has(value.type as CodeReviewIssue['type'])
        || !REVIEW_SEVERITIES.has(value.severity as CodeReviewIssue['severity'])
        || !REVIEW_CATEGORIES.has(value.category as CodeReviewCategory)) {
        return null;
    }

    const line = toFiniteNumber(value.line);
    const column = toFiniteNumber(value.column);

    return {
        type: value.type as CodeReviewIssue['type'],
        severity: value.severity as CodeReviewIssue['severity'],
        line,
        column,
        message: value.message,
        suggestion: typeof value.suggestion === 'string' ? value.suggestion : undefined,
        category: value.category as CodeReviewCategory,
    };
};

const sanitizeStoredReview = (value: unknown): CodeReviewResult | null => {
    if (!isRecord(value)
        || typeof value.code !== 'string'
        || typeof value.language !== 'string'
        || typeof value.score !== 'number'
        || typeof value.summary !== 'string'
        || typeof value.reviewedAt !== 'number'
        || !Array.isArray(value.issues)) {
        return null;
    }

    return {
        code: value.code,
        language: value.language,
        issues: value.issues
            .map((entry) => sanitizeReviewIssue(entry))
            .filter((entry): entry is CodeReviewIssue => entry !== null),
        score: value.score,
        summary: value.summary,
        reviewedAt: value.reviewedAt,
    };
};

const parseStoredReviews = (raw: string): CodeReviewResult[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeStoredReview(entry))
        .filter((entry): entry is CodeReviewResult => entry !== null);
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
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const reviews = stored ? parseStoredReviews(stored) : [];
            reviews.push(review);
            // Keep only last 50 reviews
            if (reviews.length > 50) {
                reviews.shift();
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviews));
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
            const reviews = parseStoredReviews(stored);
            return reviews.slice(-limit).reverse();
        } catch (error) {
            console.error('Failed to load review history:', error);
            return [];
        }
    }
}

export const codeReviewService = CodeReviewService.getInstance();
