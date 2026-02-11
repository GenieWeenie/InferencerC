/**
 * Refactoring Assistant Service
 *
 * AI suggests and applies refactorings
 */

export interface RefactoringSuggestion {
    id: string;
    type: RefactoringType;
    description: string;
    code: string;
    refactoredCode: string;
    confidence: number; // 0-1
    impact: 'low' | 'medium' | 'high';
    explanation: string;
}

export type RefactoringType =
    | 'extract-function'
    | 'extract-variable'
    | 'rename'
    | 'simplify'
    | 'optimize'
    | 'remove-duplication'
    | 'improve-readability'
    | 'add-error-handling';

export interface RefactoringResult {
    originalCode: string;
    refactoredCode: string;
    suggestions: RefactoringSuggestion[];
    appliedSuggestions: string[]; // IDs of applied suggestions
    language: string;
    refactoredAt: number;
}

const REFACTORING_TYPES = new Set<RefactoringType>([
    'extract-function',
    'extract-variable',
    'rename',
    'simplify',
    'optimize',
    'remove-duplication',
    'improve-readability',
    'add-error-handling',
]);

const REFACTORING_IMPACTS = new Set<RefactoringSuggestion['impact']>(['low', 'medium', 'high']);

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

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is string => typeof entry === 'string');
};

const sanitizeStoredSuggestion = (value: unknown): RefactoringSuggestion | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.description !== 'string'
        || typeof value.code !== 'string'
        || typeof value.refactoredCode !== 'string'
        || typeof value.confidence !== 'number'
        || !REFACTORING_TYPES.has(value.type as RefactoringType)
        || !REFACTORING_IMPACTS.has(value.impact as RefactoringSuggestion['impact'])
        || typeof value.explanation !== 'string') {
        return null;
    }

    return {
        id: value.id,
        type: value.type as RefactoringType,
        description: value.description,
        code: value.code,
        refactoredCode: value.refactoredCode,
        confidence: value.confidence,
        impact: value.impact as RefactoringSuggestion['impact'],
        explanation: value.explanation,
    };
};

const sanitizeStoredResult = (value: unknown): RefactoringResult | null => {
    if (!isRecord(value)
        || typeof value.originalCode !== 'string'
        || typeof value.refactoredCode !== 'string'
        || !Array.isArray(value.suggestions)
        || typeof value.language !== 'string'
        || typeof value.refactoredAt !== 'number') {
        return null;
    }

    const suggestions = value.suggestions
        .map((entry) => sanitizeStoredSuggestion(entry))
        .filter((entry): entry is RefactoringSuggestion => entry !== null);

    return {
        originalCode: value.originalCode,
        refactoredCode: value.refactoredCode,
        suggestions,
        appliedSuggestions: sanitizeStringArray(value.appliedSuggestions),
        language: value.language,
        refactoredAt: value.refactoredAt,
    };
};

const parseStoredResults = (raw: string): RefactoringResult[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeStoredResult(entry))
        .filter((entry): entry is RefactoringResult => entry !== null);
};

export class RefactoringAssistantService {
    private static instance: RefactoringAssistantService;
    private readonly STORAGE_KEY = 'refactoring_results';

    private constructor() {}

    static getInstance(): RefactoringAssistantService {
        if (!RefactoringAssistantService.instance) {
            RefactoringAssistantService.instance = new RefactoringAssistantService();
        }
        return RefactoringAssistantService.instance;
    }

    /**
     * Analyze code and suggest refactorings
     */
    async suggestRefactorings(
        code: string,
        language: string,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<RefactoringSuggestion[]> {
        const systemPrompt = `You are an expert code refactoring assistant. Analyze the provided code and suggest improvements:
1. Extract functions for repeated logic
2. Extract variables for complex expressions
3. Rename variables/functions for clarity
4. Simplify complex conditions
5. Optimize performance
6. Remove code duplication
7. Improve readability
8. Add error handling

Return a JSON array of suggestions:
[
  {
    "type": "extract-function",
    "description": "Extract repeated logic into a function",
    "code": "original code snippet",
    "refactoredCode": "refactored code",
    "confidence": 0.9,
    "impact": "high",
    "explanation": "Why this refactoring improves the code"
  }
]`;

        const userPrompt = `Analyze and suggest refactorings for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            return this.parseSuggestions(result.content);
        } catch (error) {
            console.error('Failed to get refactoring suggestions:', error);
            return [];
        }
    }

    /**
     * Apply refactoring suggestions
     */
    applyRefactorings(
        originalCode: string,
        suggestions: RefactoringSuggestion[],
        selectedIds: string[]
    ): RefactoringResult {
        let refactoredCode = originalCode;
        const appliedSuggestions: string[] = [];

        // Apply suggestions in order
        suggestions
            .filter(s => selectedIds.includes(s.id))
            .sort((a, b) => {
                // Apply high-impact first
                const impactOrder = { high: 3, medium: 2, low: 1 };
                return impactOrder[b.impact] - impactOrder[a.impact];
            })
            .forEach(suggestion => {
                // Simple string replacement (in production, would use AST)
                if (refactoredCode.includes(suggestion.code)) {
                    refactoredCode = refactoredCode.replace(suggestion.code, suggestion.refactoredCode);
                    appliedSuggestions.push(suggestion.id);
                }
            });

        const result: RefactoringResult = {
            originalCode,
            refactoredCode,
            suggestions,
            appliedSuggestions,
            language: 'unknown',
            refactoredAt: Date.now(),
        };

        this.saveResult(result);
        return result;
    }

    /**
     * Parse suggestions from AI response
     */
    private parseSuggestions(content: string): RefactoringSuggestion[] {
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return [];

            const parsedUnknown: unknown = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsedUnknown)) {
                return [];
            }

            return parsedUnknown.map((entry, i: number) => {
                const suggestion = (typeof entry === 'object' && entry !== null
                    ? entry
                    : {}) as {
                        type?: unknown;
                        description?: unknown;
                        code?: unknown;
                        refactoredCode?: unknown;
                        confidence?: unknown;
                        impact?: unknown;
                        explanation?: unknown;
                    };

                const code = typeof suggestion.code === 'string' ? suggestion.code : '';
                const refactoredCode = typeof suggestion.refactoredCode === 'string'
                    ? suggestion.refactoredCode
                    : code;
                const confidence = typeof suggestion.confidence === 'number'
                    ? suggestion.confidence
                    : 0.5;

                return {
                    id: `refactor-${i}`,
                    type: this.normalizeRefactoringType(suggestion.type),
                    description: typeof suggestion.description === 'string' ? suggestion.description : '',
                    code,
                    refactoredCode,
                    confidence,
                    impact: this.normalizeRefactoringImpact(suggestion.impact),
                    explanation: typeof suggestion.explanation === 'string' ? suggestion.explanation : '',
                } satisfies RefactoringSuggestion;
            });
        } catch (error) {
            console.error('Failed to parse suggestions:', error);
            return [];
        }
    }

    private normalizeRefactoringType(value: unknown): RefactoringType {
        if (value === 'extract-function' ||
            value === 'extract-variable' ||
            value === 'rename' ||
            value === 'simplify' ||
            value === 'optimize' ||
            value === 'remove-duplication' ||
            value === 'improve-readability' ||
            value === 'add-error-handling') {
            return value;
        }
        return 'improve-readability';
    }

    private normalizeRefactoringImpact(value: unknown): 'low' | 'medium' | 'high' {
        if (value === 'low' || value === 'medium' || value === 'high') {
            return value;
        }
        return 'medium';
    }

    /**
     * Save refactoring result
     */
    private saveResult(result: RefactoringResult): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const results = stored ? parseStoredResults(stored) : [];
            results.push(result);
            // Keep only last 50
            if (results.length > 50) {
                results.shift();
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(results));
        } catch (error) {
            console.error('Failed to save refactoring result:', error);
        }
    }

    /**
     * Get refactoring history
     */
    getHistory(limit: number = 20): RefactoringResult[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const results = parseStoredResults(stored);
            return results.slice(-limit).reverse();
        } catch (error) {
            console.error('Failed to load refactoring history:', error);
            return [];
        }
    }
}

export const refactoringAssistantService = RefactoringAssistantService.getInstance();
