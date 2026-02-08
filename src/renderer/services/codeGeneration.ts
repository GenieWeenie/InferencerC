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
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const generations: CodeGenerationResult[] = stored ? JSON.parse(stored) : [];
            generations.push(generation);
            // Keep only last 50
            if (generations.length > 50) {
                generations.shift();
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(generations));
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
            const generations: CodeGenerationResult[] = JSON.parse(stored);
            return generations.slice(-limit).reverse();
        } catch (error) {
            console.error('Failed to load generation history:', error);
            return [];
        }
    }
}

export const codeGenerationService = CodeGenerationService.getInstance();
