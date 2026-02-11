/**
 * Documentation Generator Service
 *
 * Auto-generate code documentation
 */

export interface DocumentationOptions {
    format: 'jsdoc' | 'tsdoc' | 'python-docstring' | 'markdown' | 'asciidoc';
    includeExamples?: boolean;
    includeTypes?: boolean;
    style?: 'detailed' | 'brief' | 'minimal';
}

export interface DocumentationResult {
    code: string;
    language: string;
    documentedCode: string;
    documentation: string; // Standalone documentation
    format: DocumentationOptions['format'];
    generatedAt: number;
}

const DOCUMENTATION_FORMATS = new Set<DocumentationOptions['format']>([
    'jsdoc',
    'tsdoc',
    'python-docstring',
    'markdown',
    'asciidoc',
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

const sanitizeResult = (value: unknown): DocumentationResult | null => {
    if (!isRecord(value)
        || !DOCUMENTATION_FORMATS.has(value.format as DocumentationOptions['format'])
        || typeof value.generatedAt !== 'number'
        || !Number.isFinite(value.generatedAt)) {
        return null;
    }
    const code = sanitizeNonEmptyString(value.code);
    const language = sanitizeNonEmptyString(value.language);
    const documentedCode = sanitizeNonEmptyString(value.documentedCode);
    const documentation = sanitizeNonEmptyString(value.documentation);
    if (!code || !language || !documentedCode || !documentation) {
        return null;
    }

    return {
        code,
        language,
        documentedCode,
        documentation,
        format: value.format as DocumentationOptions['format'],
        generatedAt: value.generatedAt,
    };
};

const parseStoredResults = (raw: string): DocumentationResult[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const results = parsed
        .map((entry) => sanitizeResult(entry))
        .filter((entry): entry is DocumentationResult => entry !== null);
    const seenKeys = new Set<string>();
    return results.filter((entry) => {
        const key = `${entry.generatedAt}:${entry.language}:${entry.code}`;
        if (seenKeys.has(key)) {
            return false;
        }
        seenKeys.add(key);
        return true;
    });
};

export class DocumentationGeneratorService {
    private static instance: DocumentationGeneratorService;
    private readonly STORAGE_KEY = 'documentation_results';

    private constructor() {}

    static getInstance(): DocumentationGeneratorService {
        if (!DocumentationGeneratorService.instance) {
            DocumentationGeneratorService.instance = new DocumentationGeneratorService();
        }
        return DocumentationGeneratorService.instance;
    }

    /**
     * Generate documentation for code
     */
    async generateDocumentation(
        code: string,
        language: string,
        options: DocumentationOptions,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<DocumentationResult> {
        const systemPrompt = this.buildSystemPrompt(language, options);
        const userPrompt = `Generate ${options.format} documentation for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            const documented = this.extractDocumentedCode(result.content, code, language, options.format);

            const docResult: DocumentationResult = {
                code,
                language,
                documentedCode: documented.code,
                documentation: documented.standalone,
                format: options.format,
                generatedAt: Date.now(),
            };

            this.saveResult(docResult);
            return docResult;
        } catch (error) {
            // Fallback to rule-based documentation
            return this.ruleBasedDocumentation(code, language, options);
        }
    }

    /**
     * Build system prompt for documentation
     */
    private buildSystemPrompt(language: string, options: DocumentationOptions): string {
        let prompt = `You are an expert technical writer. Generate ${options.format} documentation for ${language} code. `;

        if (options.includeExamples) {
            prompt += 'Include usage examples. ';
        }

        if (options.includeTypes) {
            prompt += 'Include type information. ';
        }

        switch (options.style) {
            case 'brief':
                prompt += 'Keep documentation concise. ';
                break;
            case 'detailed':
                prompt += 'Provide comprehensive documentation. ';
                break;
            case 'minimal':
                prompt += 'Minimal documentation only. ';
                break;
        }

        prompt += `Return the code with ${options.format} comments added.`;

        return prompt;
    }

    /**
     * Extract documented code from AI response
     */
    private extractDocumentedCode(
        content: string,
        originalCode: string,
        language: string,
        format: DocumentationOptions['format']
    ): { code: string; standalone: string } {
        // Try to find code block
        const codeBlockRegex = new RegExp(`\`\`\`(?:${language}|javascript|typescript|python)\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
        const match = content.match(codeBlockRegex);

        if (match) {
            return {
                code: match[1].trim(),
                standalone: content.replace(codeBlockRegex, '').trim(),
            };
        }

        // Fallback: return original with basic documentation
        return {
            code: this.addBasicDocumentation(originalCode, format),
            standalone: '',
        };
    }

    /**
     * Add basic documentation (fallback)
     */
    private addBasicDocumentation(code: string, format: DocumentationOptions['format']): string {
        // Simple rule-based documentation
        const lines = code.split('\n');
        const documented: string[] = [];

        lines.forEach((line, index) => {
            // Detect function definitions
            if (line.match(/^(function|const|let|var)\s+\w+\s*[=(]/)) {
                const funcName = line.match(/(\w+)\s*[=(]/)?.[1] || 'function';
                switch (format) {
                    case 'jsdoc':
                    case 'tsdoc':
                        documented.push(`/**`);
                        documented.push(` * ${funcName}`);
                        documented.push(` */`);
                        break;
                    case 'python-docstring':
                        documented.push(`"""${funcName}"""`);
                        break;
                }
            }
            documented.push(line);
        });

        return documented.join('\n');
    }

    /**
     * Rule-based documentation (fallback)
     */
    private ruleBasedDocumentation(
        code: string,
        language: string,
        options: DocumentationOptions
    ): DocumentationResult {
        return {
            code,
            language,
            documentedCode: this.addBasicDocumentation(code, options.format),
            documentation: `# Documentation\n\nGenerated documentation for ${language} code.`,
            format: options.format,
            generatedAt: Date.now(),
        };
    }

    /**
     * Save documentation result
     */
    private saveResult(result: DocumentationResult): void {
        try {
            const sanitizedResult = sanitizeResult(result);
            if (!sanitizedResult) {
                return;
            }
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const results = stored ? parseStoredResults(stored) : [];
            results.push(sanitizedResult);
            const deduped: DocumentationResult[] = [];
            const seenKeys = new Set<string>();
            for (let index = results.length - 1; index >= 0; index--) {
                const entry = results[index];
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
            console.error('Failed to save documentation result:', error);
        }
    }

    /**
     * Get documentation history
     */
    getHistory(limit: number = 20): DocumentationResult[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const sanitizedLimit = sanitizePositiveInteger(limit) ?? 20;
            const results = parseStoredResults(stored);
            return results.slice(-sanitizedLimit).reverse();
        } catch (error) {
            console.error('Failed to load documentation history:', error);
            return [];
        }
    }
}

export const documentationGeneratorService = DocumentationGeneratorService.getInstance();
