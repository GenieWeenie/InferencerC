/**
 * Code Generation Service
 *
 * Generate code from natural language descriptions
 */

import { ChatMessage } from '../../shared/types';

export interface CodeGenerationRequest {
    description: string;
    language: string;
    framework?: string;
    style?: 'functional' | 'oop' | 'procedural';
    includeTests?: boolean;
    includeComments?: boolean;
}

export interface CodeGenerationResult {
    code: string;
    language: string;
    explanation?: string;
    dependencies?: string[];
    usage?: string;
    generatedAt: number;
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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < value.length; index++) {
        const normalized = sanitizeNonEmptyString(value[index]);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }
    return result;
};

const sanitizePositiveInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }
    const rounded = Math.floor(value);
    return rounded > 0 ? rounded : null;
};

const sanitizeStoredGeneration = (value: unknown): CodeGenerationResult | null => {
    if (!isRecord(value)) {
        return null;
    }
    const code = sanitizeNonEmptyString(value.code);
    const language = sanitizeNonEmptyString(value.language);
    if (!code || !language) {
        return null;
    }
    if (typeof value.generatedAt !== 'number' || !Number.isFinite(value.generatedAt)) {
        return null;
    }
    const explanation = sanitizeNonEmptyString(value.explanation);
    const usage = sanitizeNonEmptyString(value.usage);

    return {
        code,
        language,
        explanation: explanation ?? undefined,
        dependencies: sanitizeStringArray(value.dependencies),
        usage: usage ?? undefined,
        generatedAt: value.generatedAt,
    };
};

const parseStoredGenerations = (raw: string): CodeGenerationResult[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const generations = parsed
        .map((entry) => sanitizeStoredGeneration(entry))
        .filter((entry): entry is CodeGenerationResult => entry !== null);
    const seenKeys = new Set<string>();
    return generations.filter((entry) => {
        const key = `${entry.generatedAt}:${entry.language}:${entry.code}`;
        if (seenKeys.has(key)) {
            return false;
        }
        seenKeys.add(key);
        return true;
    });
};

export class CodeGenerationService {
    private static instance: CodeGenerationService;
    private readonly STORAGE_KEY = 'code_generations';

    private constructor() {}

    static getInstance(): CodeGenerationService {
        if (!CodeGenerationService.instance) {
            CodeGenerationService.instance = new CodeGenerationService();
        }
        return CodeGenerationService.instance;
    }

    /**
     * Generate code from description
     */
    async generateCode(
        request: CodeGenerationRequest,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<CodeGenerationResult> {
        const systemPrompt = this.buildSystemPrompt(request);
        const userPrompt = this.buildUserPrompt(request);

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            const code = this.extractCode(result.content, request.language);

            const generation: CodeGenerationResult = {
                code,
                language: request.language,
                explanation: this.extractExplanation(result.content),
                dependencies: this.extractDependencies(code, request.language),
                usage: this.extractUsage(result.content),
                generatedAt: Date.now(),
            };

            this.saveGeneration(generation);
            return generation;
        } catch (error) {
            throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Build system prompt for code generation
     */
    private buildSystemPrompt(request: CodeGenerationRequest): string {
        let prompt = `You are an expert ${request.language} developer. `;

        if (request.framework) {
            prompt += `You specialize in ${request.framework}. `;
        }

        prompt += `Generate clean, production-ready code following best practices. `;

        if (request.style) {
            prompt += `Use ${request.style} programming style. `;
        }

        if (request.includeComments) {
            prompt += `Include comprehensive comments explaining the code. `;
        }

        prompt += `Return only the code, optionally with a brief explanation at the end.`;

        return prompt;
    }

    /**
     * Build user prompt
     */
    private buildUserPrompt(request: CodeGenerationRequest): string {
        let prompt = `Generate ${request.language} code for: ${request.description}`;

        if (request.framework) {
            prompt += `\n\nUse ${request.framework} framework.`;
        }

        if (request.includeTests) {
            prompt += `\n\nInclude unit tests.`;
        }

        return prompt;
    }

    /**
     * Extract code from response
     */
    private extractCode(content: string, language: string): string {
        // Try to find code blocks
        const codeBlockRegex = new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
        const match = content.match(codeBlockRegex);
        if (match) {
            return match[1].trim();
        }

        // Try generic code block
        const genericCodeBlock = /```[\s\S]*?\n([\s\S]*?)\n```/;
        const genericMatch = content.match(genericCodeBlock);
        if (genericMatch) {
            return genericMatch[1].trim();
        }

        // Return content as-is if no code blocks found
        return content.trim();
    }

    /**
     * Extract explanation from response
     */
    private extractExplanation(content: string): string | undefined {
        const explanationMatch = content.match(/explanation[:\s]+(.*?)(?:\n\n|$)/i);
        if (explanationMatch) {
            return explanationMatch[1].trim();
        }
        return undefined;
    }

    /**
     * Extract dependencies from code
     */
    private extractDependencies(code: string, language: string): string[] {
        const dependencies: string[] = [];

        if (language === 'javascript' || language === 'typescript') {
            // Find import/require statements
            const importRegex = /(?:import|require)\(?['"]([^'"]+)['"]\)?/g;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                dependencies.push(match[1]);
            }
        } else if (language === 'python') {
            // Find import statements
            const importRegex = /^import\s+(\w+)|^from\s+(\w+)\s+import/gm;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                dependencies.push(match[1] || match[2]);
            }
        }

        return [...new Set(dependencies)];
    }

    /**
     * Extract usage example
     */
    private extractUsage(content: string): string | undefined {
        const usageMatch = content.match(/usage[:\s]+(.*?)(?:\n\n|$)/i);
        if (usageMatch) {
            return usageMatch[1].trim();
        }
        return undefined;
    }

    /**
     * Save generation
     */
    private saveGeneration(generation: CodeGenerationResult): void {
        try {
            const sanitizedGeneration = sanitizeStoredGeneration(generation);
            if (!sanitizedGeneration) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const generations = stored ? parseStoredGenerations(stored) : [];
            generations.push(sanitizedGeneration);
            const deduped: CodeGenerationResult[] = [];
            const seenKeys = new Set<string>();
            for (let index = generations.length - 1; index >= 0; index--) {
                const entry = generations[index];
                const key = `${entry.generatedAt}:${entry.language}:${entry.code}`;
                if (seenKeys.has(key)) {
                    continue;
                }
                seenKeys.add(key);
                deduped.push(entry);
            }
            deduped.reverse();
            // Keep only last 50
            if (deduped.length > 50) {
                deduped.splice(0, deduped.length - 50);
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save generation:', error);
        }
    }

    /**
     * Get generation history
     */
    getGenerationHistory(limit: number = 20): CodeGenerationResult[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const sanitizedLimit = sanitizePositiveInteger(limit) ?? 20;
            const generations = parseStoredGenerations(stored);
            return generations.slice(-sanitizedLimit).reverse();
        } catch (error) {
            console.error('Failed to load generation history:', error);
            return [];
        }
    }
}

export const codeGenerationService = CodeGenerationService.getInstance();
