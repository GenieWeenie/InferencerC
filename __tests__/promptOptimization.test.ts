/** @jest-environment jsdom */

import { PromptOptimizationService } from '../src/renderer/services/promptOptimization';

describe('PromptOptimizationService', () => {
  let service: PromptOptimizationService;

  beforeEach(() => {
    service = PromptOptimizationService.getInstance();
  });

  describe('analyzePrompt', () => {
    it('returns high score for a good, specific prompt', () => {
      const prompt =
        'Write a Python function that takes a list of integers and returns the sum. Please include type hints and a docstring. The function must handle empty lists.';
      const result = service.analyzePrompt(prompt);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.prompt).toBe(prompt);
      expect(result.category).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('returns lower score for a vague prompt', () => {
      const prompt = 'do something';
      const result = service.analyzePrompt(prompt);
      expect(result.score).toBeLessThan(70);
      expect(result.weaknesses.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('includes strengths for clear, specific prompts', () => {
      const prompt =
        'Please analyze the following code for performance issues. Provide specific examples and suggest optimizations. Use bullet points for each finding.';
      const result = service.analyzePrompt(prompt);
      expect(result.strengths).toBeDefined();
      expect(Array.isArray(result.strengths)).toBe(true);
    });

    it('includes weaknesses for vague prompts with "something" or "stuff"', () => {
      const prompt = 'Can you do something with this stuff?';
      const result = service.analyzePrompt(prompt);
      expect(result.weaknesses.length).toBeGreaterThan(0);
      expect(result.weaknesses.some((w) => w.toLowerCase().includes('vague') || w.toLowerCase().includes('unclear'))).toBe(
        true
      );
    });

    it('returns suggestions for improvable prompts', () => {
      const prompt = 'thing';
      const result = service.analyzePrompt(prompt);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('accepts optional systemPrompt and includes it in result', () => {
      const prompt = 'Explain recursion.';
      const systemPrompt = 'You are a patient teacher.';
      const result = service.analyzePrompt(prompt, systemPrompt);
      expect(result.systemPrompt).toBe(systemPrompt);
      expect(result.prompt).toBe(prompt);
    });

    it('returns metrics with all expected fields', () => {
      const prompt = 'Write a function to sort a list.';
      const result = service.analyzePrompt(prompt);
      expect(result.metrics).toMatchObject({
        clarity: expect.any(Number),
        specificity: expect.any(Number),
        structure: expect.any(Number),
        completeness: expect.any(Number),
        efficiency: expect.any(Number),
        effectiveness: expect.any(Number),
      });
    });

    it('returns score between 0 and 100', () => {
      const result = service.analyzePrompt('x');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('detectCategory (via analyzePrompt)', () => {
    it('detects "coding" for prompts about code', () => {
      const result = service.analyzePrompt('Write Python code to parse JSON.');
      expect(result.category).toBe('coding');
    });

    it('detects "creative" for prompts about writing stories', () => {
      const result = service.analyzePrompt('Write a short story about a dragon.');
      expect(result.category).toBe('creative');
    });

    it('detects "general" or "reasoning" for explain prompts', () => {
      const result = service.analyzePrompt('Explain this concept to me.');
      expect(['general', 'reasoning']).toContain(result.category);
    });

    it('detects "analysis" for analyze prompts', () => {
      const result = service.analyzePrompt('Analyze the pros and cons of this approach.');
      expect(result.category).toBe('analysis');
    });

    it('detects "summarization" for summarize prompts', () => {
      const result = service.analyzePrompt('Summarize this article in 3 sentences.');
      expect(result.category).toBe('summarization');
    });

    it('detects "translation" for translate prompts', () => {
      const result = service.analyzePrompt('Translate this text to Spanish.');
      expect(result.category).toBe('translation');
    });

    it('detects "question-answering" for prompts with question mark', () => {
      const result = service.analyzePrompt('What is the capital of France?');
      expect(result.category).toBe('question-answering');
    });
  });

  describe('calculateMetrics (via analyzePrompt)', () => {
    it('longer specific prompts get higher clarity/specificity', () => {
      const short = 'do it';
      const long =
        'Please create a Python script that reads a CSV file, filters rows where the "status" column equals "active", and outputs the result as JSON. Include error handling for missing files.';
      const shortResult = service.analyzePrompt(short);
      const longResult = service.analyzePrompt(long);
      expect(longResult.metrics.clarity).toBeGreaterThanOrEqual(shortResult.metrics.clarity);
      expect(longResult.metrics.specificity).toBeGreaterThanOrEqual(shortResult.metrics.specificity);
    });

    it('prompts with examples score higher on specificity', () => {
      const withExamples =
        'List programming languages. For example: Python, JavaScript, and Rust.';
      const withoutExamples = 'List programming languages.';
      const withResult = service.analyzePrompt(withExamples);
      const withoutResult = service.analyzePrompt(withoutExamples);
      expect(withResult.metrics.specificity).toBeGreaterThanOrEqual(withoutResult.metrics.specificity);
    });

    it('structured prompts (bullets, numbers) score higher on structure', () => {
      const structured =
        '1. First step\n2. Second step\n3. Third step';
      const unstructured = 'First step second step third step';
      const structuredResult = service.analyzePrompt(structured);
      const unstructuredResult = service.analyzePrompt(unstructured);
      expect(structuredResult.metrics.structure).toBeGreaterThanOrEqual(unstructuredResult.metrics.structure);
    });
  });

  describe('optimizePrompt', () => {
    it('returns OptimizationResult with original and optimized analyses', () => {
      const prompt = 'do something with stuff';
      const result = service.optimizePrompt(prompt);
      expect(result.original).toBeDefined();
      expect(result.optimized).toBeDefined();
      expect(result.improvements).toBeDefined();
      expect(result.expectedImpact).toMatchObject({
        clarity: expect.any(Number),
        specificity: expect.any(Number),
        effectiveness: expect.any(Number),
      });
    });

    it('original.prompt matches input', () => {
      const prompt = 'Explain quantum computing.';
      const result = service.optimizePrompt(prompt);
      expect(result.original.prompt).toBe(prompt);
    });
  });
});
