/**
 * Prompt Optimization Service
 *
 * AI-powered prompt analysis and optimization:
 * - Analyze prompts for quality and effectiveness
 * - Suggest improvements based on best practices
 * - Evaluate prompt clarity, specificity, and structure
 * - Provide optimization recommendations
 * - Track optimization impact
 */

import { ChatMessage } from '../../shared/types';

// Prompt analysis result
export interface PromptAnalysis {
    prompt: string;
    systemPrompt?: string;
    score: number; // 0-100 overall quality score
    strengths: string[];
    weaknesses: string[];
    suggestions: OptimizationSuggestion[];
    metrics: PromptMetrics;
    category: PromptCategory;
}

// Quality metrics for a prompt
export interface PromptMetrics {
    clarity: number; // 0-100: How clear and understandable
    specificity: number; // 0-100: How specific and detailed
    structure: number; // 0-100: How well-structured
    completeness: number; // 0-100: How complete the instructions are
    efficiency: number; // 0-100: Token efficiency
    effectiveness: number; // 0-100: Expected effectiveness
}

// Optimization suggestion
export interface OptimizationSuggestion {
    type: SuggestionType;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    currentText?: string; // The problematic text
    suggestedText?: string; // The improved text
    impact: string; // Expected impact of the change
}

export type SuggestionType =
    | 'clarity'
    | 'specificity'
    | 'structure'
    | 'examples'
    | 'constraints'
    | 'format'
    | 'context'
    | 'tone'
    | 'length'
    | 'keywords';

export type PromptCategory =
    | 'coding'
    | 'creative'
    | 'analysis'
    | 'question-answering'
    | 'translation'
    | 'summarization'
    | 'general'
    | 'reasoning';

// Optimization result with before/after comparison
export interface OptimizationResult {
    original: PromptAnalysis;
    optimized: PromptAnalysis;
    improvements: string[];
    expectedImpact: {
        clarity: number;
        specificity: number;
        effectiveness: number;
    };
}

export class PromptOptimizationService {
    private static instance: PromptOptimizationService;

    private constructor() {}

    static getInstance(): PromptOptimizationService {
        if (!PromptOptimizationService.instance) {
            PromptOptimizationService.instance = new PromptOptimizationService();
        }
        return PromptOptimizationService.instance;
    }

    /**
     * Analyze a prompt and provide quality assessment
     */
    analyzePrompt(prompt: string, systemPrompt?: string): PromptAnalysis {
        const metrics = this.calculateMetrics(prompt, systemPrompt);
        const category = this.categorizePrompt(prompt);
        const strengths = this.identifyStrengths(prompt, metrics);
        const weaknesses = this.identifyWeaknesses(prompt, metrics);
        const suggestions = this.generateSuggestions(prompt, systemPrompt, metrics, weaknesses);
        const score = this.calculateOverallScore(metrics);

        return {
            prompt,
            systemPrompt,
            score,
            strengths,
            weaknesses,
            suggestions,
            metrics,
            category,
        };
    }

    /**
     * Optimize a prompt based on analysis
     */
    optimizePrompt(prompt: string, systemPrompt?: string): OptimizationResult {
        const original = this.analyzePrompt(prompt, systemPrompt);
        const optimizedPrompt = this.applyOptimizations(prompt, original.suggestions);
        const optimizedSystemPrompt = systemPrompt
            ? this.applyOptimizations(systemPrompt, original.suggestions.filter(s => s.type === 'context'))
            : undefined;
        const optimized = this.analyzePrompt(optimizedPrompt, optimizedSystemPrompt);

        const improvements = this.compareAnalyses(original, optimized);

        return {
            original,
            optimized,
            improvements,
            expectedImpact: {
                clarity: optimized.metrics.clarity - original.metrics.clarity,
                specificity: optimized.metrics.specificity - original.metrics.specificity,
                effectiveness: optimized.metrics.effectiveness - original.metrics.effectiveness,
            },
        };
    }

    /**
     * Calculate quality metrics
     */
    private calculateMetrics(prompt: string, systemPrompt?: string): PromptMetrics {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        return {
            clarity: this.calculateClarity(fullPrompt),
            specificity: this.calculateSpecificity(fullPrompt),
            structure: this.calculateStructure(fullPrompt),
            completeness: this.calculateCompleteness(fullPrompt),
            efficiency: this.calculateEfficiency(fullPrompt),
            effectiveness: this.calculateEffectiveness(fullPrompt),
        };
    }

    /**
     * Calculate clarity score
     */
    private calculateClarity(prompt: string): number {
        let score = 50; // Base score

        // Positive indicators
        if (prompt.includes('?')) score += 10; // Questions are clear
        if (/\b(please|kindly|can you|should|must)\b/i.test(prompt)) score += 5; // Polite/clear requests
        if (prompt.split('.').length > 2) score += 5; // Multiple sentences (usually clearer)
        if (!/\b(thing|stuff|something|it|that)\b/i.test(prompt)) score += 10; // Avoids vague pronouns

        // Negative indicators
        if (prompt.length < 10) score -= 20; // Too short
        if (prompt.length > 1000) score -= 10; // Too long (may be unclear)
        if (/\b(thing|stuff|something|it|that)\b/i.test(prompt)) score -= 5; // Vague pronouns
        if (/[A-Z]{5,}/.test(prompt)) score -= 5; // ALL CAPS (usually unclear)

        // Check for ambiguous words
        const ambiguousWords = /\b(maybe|perhaps|possibly|kind of|sort of|a bit)\b/i;
        if (ambiguousWords.test(prompt)) score -= 10;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate specificity score
     */
    private calculateSpecificity(prompt: string): number {
        let score = 50;

        // Positive indicators
        const specificWords = prompt.match(/\b(\d+|specific|exact|precise|detailed|concrete|particular)\b/gi);
        if (specificWords) score += specificWords.length * 5;

        // Examples increase specificity
        if (/\b(example|for instance|such as|like|including)\b/i.test(prompt)) score += 15;

        // Numbers and measurements
        if (/\d+/.test(prompt)) score += 10;

        // Negative indicators
        if (/\b(general|vague|roughly|approximately|about|some|any)\b/i.test(prompt)) score -= 10;
        if (/\b(thing|stuff|something)\b/i.test(prompt)) score -= 15;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate structure score
     */
    private calculateStructure(prompt: string): number {
        let score = 50;

        // Positive indicators
        const hasNumberedList = /\d+\./.test(prompt);
        const hasBulletPoints = /[-*•]/.test(prompt);
        const hasLineBreaks = prompt.split('\n').length > 1;

        if (hasNumberedList || hasBulletPoints) score += 20;
        if (hasLineBreaks) score += 10;

        // Check for clear sections
        if (/^#{1,3}\s/.test(prompt)) score += 15; // Markdown headers
        if (/\n\n/.test(prompt)) score += 5; // Paragraph breaks

        // Negative indicators
        if (prompt.length > 0 && !/[.!?]/.test(prompt)) score -= 10; // No punctuation
        if (prompt.split(/\s+/).length < 5) score -= 20; // Too short

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate completeness score
     */
    private calculateCompleteness(prompt: string): number {
        let score = 50;

        // Check for key components
        const hasContext = /\b(context|background|information|details)\b/i.test(prompt);
        const hasInstructions = /\b(do|create|write|generate|make|build|analyze|explain)\b/i.test(prompt);
        const hasConstraints = /\b(must|should|cannot|avoid|don't|limit|max|min)\b/i.test(prompt);
        const hasFormat = /\b(format|output|json|markdown|code|list|table)\b/i.test(prompt);

        if (hasContext) score += 10;
        if (hasInstructions) score += 15;
        if (hasConstraints) score += 10;
        if (hasFormat) score += 10;

        // Check length (longer prompts often more complete)
        if (prompt.length > 200) score += 10;
        if (prompt.length < 20) score -= 20;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate efficiency score (token efficiency)
     */
    private calculateEfficiency(prompt: string): number {
        let score = 100;

        // Penalize redundancy
        const words = prompt.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        const redundancy = 1 - (uniqueWords.size / words.length);
        score -= redundancy * 30;

        // Penalize excessive length
        if (prompt.length > 500) score -= 20;
        if (prompt.length > 1000) score -= 20;

        // Reward concise but complete prompts
        if (prompt.length > 50 && prompt.length < 300) score += 10;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate expected effectiveness
     */
    private calculateEffectiveness(prompt: string): number {
        const clarity = this.calculateClarity(prompt);
        const specificity = this.calculateSpecificity(prompt);
        const structure = this.calculateStructure(prompt);
        const completeness = this.calculateCompleteness(prompt);
        const efficiency = this.calculateEfficiency(prompt);
        return Math.round(
            clarity * 0.3 +
            specificity * 0.25 +
            structure * 0.15 +
            completeness * 0.2 +
            efficiency * 0.1
        );
    }

    /**
     * Categorize the prompt
     */
    private categorizePrompt(prompt: string): PromptCategory {
        const lower = prompt.toLowerCase();

        if (/(code|function|program|script|algorithm|bug|error|debug|implement)/.test(lower)) return 'coding';
        if (/(write|create|story|poem|creative|imagine|narrative|fiction)/.test(lower)) return 'creative';
        if (/(analyze|analysis|examine|evaluate|assess|review|compare)/.test(lower)) return 'analysis';
        if (/(translate|translation|convert language)/.test(lower)) return 'translation';
        if (/(summarize|summary|brief|overview|condense)/.test(lower)) return 'summarization';
        if (/(solve|reason|think|logic|step by step|why|how|explain)/.test(lower)) return 'reasoning';
        if (/\?/.test(prompt)) return 'question-answering';

        return 'general';
    }

    /**
     * Identify strengths
     */
    private identifyStrengths(prompt: string, metrics: PromptMetrics): string[] {
        const strengths: string[] = [];

        if (metrics.clarity >= 70) strengths.push('Clear and understandable');
        if (metrics.specificity >= 70) strengths.push('Specific and detailed');
        if (metrics.structure >= 70) strengths.push('Well-structured');
        if (metrics.completeness >= 70) strengths.push('Complete instructions');
        if (metrics.efficiency >= 70) strengths.push('Efficient use of tokens');
        if (prompt.length > 50 && prompt.length < 500) strengths.push('Appropriate length');
        if (/\b(example|for instance)\b/i.test(prompt)) strengths.push('Includes examples');

        return strengths;
    }

    /**
     * Identify weaknesses
     */
    private identifyWeaknesses(prompt: string, metrics: PromptMetrics): string[] {
        const weaknesses: string[] = [];

        if (metrics.clarity < 50) weaknesses.push('Unclear or ambiguous');
        if (metrics.specificity < 50) weaknesses.push('Too vague or general');
        if (metrics.structure < 50) weaknesses.push('Poor structure');
        if (metrics.completeness < 50) weaknesses.push('Incomplete instructions');
        if (metrics.efficiency < 50) weaknesses.push('Inefficient or redundant');
        if (prompt.length < 20) weaknesses.push('Too short');
        if (prompt.length > 1000) weaknesses.push('Too long');
        if (/\b(thing|stuff|something|it|that)\b/i.test(prompt)) weaknesses.push('Uses vague pronouns');
        if (!/[.!?]/.test(prompt)) weaknesses.push('Missing punctuation');

        return weaknesses;
    }

    /**
     * Generate optimization suggestions
     */
    private generateSuggestions(
        prompt: string,
        systemPrompt: string | undefined,
        metrics: PromptMetrics,
        weaknesses: string[]
    ): OptimizationSuggestion[] {
        const suggestions: OptimizationSuggestion[] = [];

        // Clarity suggestions
        if (metrics.clarity < 60) {
            if (/\b(thing|stuff|something)\b/i.test(prompt)) {
                suggestions.push({
                    type: 'clarity',
                    priority: 'high',
                    title: 'Replace vague pronouns',
                    description: 'Replace vague words like "thing" or "stuff" with specific terms',
                    currentText: prompt.match(/\b(thing|stuff|something)\b/i)?.[0],
                    impact: 'Improves clarity and helps the model understand exactly what you need',
                });
            }

            if (prompt.length < 20) {
                suggestions.push({
                    type: 'clarity',
                    priority: 'high',
                    title: 'Add more context',
                    description: 'The prompt is too short. Add more details about what you need',
                    impact: 'Significantly improves clarity and response quality',
                });
            }
        }

        // Specificity suggestions
        if (metrics.specificity < 60) {
            if (!/\b(example|for instance|such as)\b/i.test(prompt)) {
                suggestions.push({
                    type: 'examples',
                    priority: 'medium',
                    title: 'Add examples',
                    description: 'Include examples to make your request more specific',
                    suggestedText: prompt + '\n\nExample: [add your example here]',
                    impact: 'Helps the model understand the expected format and style',
                });
            }

            if (!/\d+/.test(prompt) && this.categorizePrompt(prompt) === 'coding') {
                suggestions.push({
                    type: 'specificity',
                    priority: 'medium',
                    title: 'Add specific requirements',
                    description: 'Include specific numbers, constraints, or requirements',
                    impact: 'Makes the prompt more actionable',
                });
            }
        }

        // Structure suggestions
        if (metrics.structure < 60) {
            if (!/\n/.test(prompt) && prompt.length > 100) {
                suggestions.push({
                    type: 'structure',
                    priority: 'medium',
                    title: 'Add structure',
                    description: 'Break the prompt into sections or use bullet points',
                    impact: 'Improves readability and helps the model parse instructions',
                });
            }
        }

        // Format suggestions
        if (!/\b(format|output|json|markdown|code)\b/i.test(prompt) && this.categorizePrompt(prompt) === 'coding') {
            suggestions.push({
                type: 'format',
                priority: 'low',
                title: 'Specify output format',
                description: 'Specify the desired output format (JSON, code, markdown, etc.)',
                impact: 'Ensures the response matches your expectations',
            });
        }

        // Constraints suggestions
        if (!/\b(must|should|cannot|avoid|don't)\b/i.test(prompt) && prompt.length > 50) {
            suggestions.push({
                type: 'constraints',
                priority: 'low',
                title: 'Add constraints',
                description: 'Specify what should or should not be included',
                impact: 'Helps guide the model to produce more accurate results',
            });
        }

        // Length optimization
        if (metrics.efficiency < 60 && prompt.length > 500) {
            suggestions.push({
                type: 'length',
                priority: 'medium',
                title: 'Reduce length',
                description: 'The prompt may be too long. Consider removing redundant information',
                impact: 'Improves token efficiency and may improve response quality',
            });
        }

        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Apply optimizations to a prompt
     */
    private applyOptimizations(prompt: string, suggestions: OptimizationSuggestion[]): string {
        let optimized = prompt;

        // Apply high-priority suggestions
        const highPriority = suggestions.filter(s => s.priority === 'high');
        for (const suggestion of highPriority) {
            if (suggestion.currentText && suggestion.suggestedText) {
                optimized = optimized.replace(
                    new RegExp(suggestion.currentText, 'gi'),
                    suggestion.suggestedText
                );
            } else if (suggestion.suggestedText && !suggestion.currentText) {
                // Append suggestion
                optimized = suggestion.suggestedText;
            }
        }

        // Apply medium-priority structural improvements
        const structureSuggestions = suggestions.filter(s => s.type === 'structure' && s.priority === 'medium');
        if (structureSuggestions.length > 0 && optimized.length > 100 && !/\n/.test(optimized)) {
            // Try to break into sentences
            optimized = optimized.replace(/\. /g, '.\n\n');
        }

        return optimized;
    }

    /**
     * Compare two analyses
     */
    private compareAnalyses(original: PromptAnalysis, optimized: PromptAnalysis): string[] {
        const improvements: string[] = [];

        if (optimized.metrics.clarity > original.metrics.clarity + 5) {
            improvements.push(`Clarity improved by ${optimized.metrics.clarity - original.metrics.clarity} points`);
        }
        if (optimized.metrics.specificity > original.metrics.specificity + 5) {
            improvements.push(`Specificity improved by ${optimized.metrics.specificity - original.metrics.specificity} points`);
        }
        if (optimized.metrics.structure > original.metrics.structure + 5) {
            improvements.push(`Structure improved by ${optimized.metrics.structure - original.metrics.structure} points`);
        }
        if (optimized.score > original.score + 5) {
            improvements.push(`Overall score improved from ${original.score} to ${optimized.score}`);
        }

        return improvements;
    }

    /**
     * Calculate overall quality score
     */
    private calculateOverallScore(metrics: PromptMetrics): number {
        return Math.round(
            metrics.clarity * 0.25 +
            metrics.specificity * 0.25 +
            metrics.structure * 0.15 +
            metrics.completeness * 0.2 +
            metrics.effectiveness * 0.15
        );
    }
}

export const promptOptimizationService = PromptOptimizationService.getInstance();
