/**
 * Test Case Generation Service
 *
 * Generate test cases from code descriptions
 */

export interface TestCaseRequest {
    codeDescription: string;
    language: string;
    framework?: 'jest' | 'mocha' | 'pytest' | 'junit' | 'vitest';
    testType?: 'unit' | 'integration' | 'e2e';
    coverage?: 'basic' | 'comprehensive';
}

export interface TestCaseResult {
    testCode: string;
    language: string;
    framework?: string;
    testCases: Array<{
        name: string;
        description: string;
        code: string;
    }>;
    setupCode?: string;
    teardownCode?: string;
    generatedAt: number;
}

export class TestCaseGenerationService {
    private static instance: TestCaseGenerationService;
    private readonly STORAGE_KEY = 'test_case_generations';

    private constructor() {}

    static getInstance(): TestCaseGenerationService {
        if (!TestCaseGenerationService.instance) {
            TestCaseGenerationService.instance = new TestCaseGenerationService();
        }
        return TestCaseGenerationService.instance;
    }

    /**
     * Generate test cases
     */
    async generateTestCases(
        request: TestCaseRequest,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<TestCaseResult> {
        const systemPrompt = this.buildSystemPrompt(request);
        const userPrompt = this.buildUserPrompt(request);

        try {
            const result = await executePrompt(userPrompt, systemPrompt);
            const testCode = this.extractTestCode(result.content, request.language);
            const testCases = this.extractTestCases(result.content);

            const testResult: TestCaseResult = {
                testCode,
                language: request.language,
                framework: request.framework,
                testCases,
                setupCode: this.extractSetupCode(result.content),
                teardownCode: this.extractTeardownCode(result.content),
                generatedAt: Date.now(),
            };

            this.saveTestCases(testResult);
            return testResult;
        } catch (error) {
            throw new Error(`Test case generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Build system prompt
     */
    private buildSystemPrompt(request: TestCaseRequest): string {
        let prompt = `You are an expert ${request.language} test developer. `;

        if (request.framework) {
            prompt += `You specialize in ${request.framework} testing framework. `;
        }

        prompt += `Generate comprehensive test cases following best practices. `;

        if (request.testType) {
            prompt += `Focus on ${request.testType} tests. `;
        }

        if (request.coverage === 'comprehensive') {
            prompt += `Include edge cases, error handling, and boundary conditions. `;
        }

        prompt += `Return well-structured test code with clear test names and descriptions.`;

        return prompt;
    }

    /**
     * Build user prompt
     */
    private buildUserPrompt(request: TestCaseRequest): string {
        let prompt = `Generate test cases for the following code description:\n\n${request.codeDescription}`;

        if (request.framework) {
            prompt += `\n\nUse ${request.framework} framework.`;
        }

        if (request.testType) {
            prompt += `\n\nTest type: ${request.testType}`;
        }

        return prompt;
    }

    /**
     * Extract test code from response
     */
    private extractTestCode(content: string, language: string): string {
        // Try to find code blocks
        const codeBlockRegex = new RegExp(`\`\`\`(?:${language}|javascript|typescript|python)\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
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

        return content.trim();
    }

    /**
     * Extract individual test cases
     */
    private extractTestCases(content: string): Array<{ name: string; description: string; code: string }> {
        const testCases: Array<{ name: string; description: string; code: string }> = [];

        // Look for test function patterns
        const testPatterns = [
            /(?:it|test|describe)\(['"]([^'"]+)['"][\s\S]*?\{([\s\S]*?)\}/g, // Jest/Mocha
            /def\s+(test_\w+)\([^)]*\):[\s\S]*?"""([\s\S]*?)"""[\s\S]*?([\s\S]*?)(?=def\s+test_|$)/g, // Pytest
        ];

        testPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                testCases.push({
                    name: match[1] || match[2] || 'Test',
                    description: match[2] || match[3] || '',
                    code: match[0],
                });
            }
        });

        return testCases.length > 0 ? testCases : [{
            name: 'Generated Test',
            description: 'Auto-generated test case',
            code: content,
        }];
    }

    /**
     * Extract setup code
     */
    private extractSetupCode(content: string): string | undefined {
        const setupMatch = content.match(/(?:beforeEach|setUp|setup|beforeAll)[\s\S]*?\{([\s\S]*?)\}/i);
        if (setupMatch) {
            return setupMatch[1].trim();
        }
        return undefined;
    }

    /**
     * Extract teardown code
     */
    private extractTeardownCode(content: string): string | undefined {
        const teardownMatch = content.match(/(?:afterEach|tearDown|teardown|afterAll)[\s\S]*?\{([\s\S]*?)\}/i);
        if (teardownMatch) {
            return teardownMatch[1].trim();
        }
        return undefined;
    }

    /**
     * Save test cases
     */
    private saveTestCases(testResult: TestCaseResult): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const testResults: TestCaseResult[] = stored ? JSON.parse(stored) : [];
            testResults.push(testResult);
            // Keep only last 50
            if (testResults.length > 50) {
                testResults.shift();
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(testResults));
        } catch (error) {
            console.error('Failed to save test cases:', error);
        }
    }

    /**
     * Get test case history
     */
    getTestCaseHistory(limit: number = 20): TestCaseResult[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            const testResults: TestCaseResult[] = JSON.parse(stored);
            return testResults.slice(-limit).reverse();
        } catch (error) {
            console.error('Failed to load test case history:', error);
            return [];
        }
    }
}

export const testCaseGenerationService = TestCaseGenerationService.getInstance();
