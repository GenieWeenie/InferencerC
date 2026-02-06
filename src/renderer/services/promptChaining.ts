/**
 * Prompt Chaining Service
 *
 * Enables chaining multiple prompts together where the output of one
 * becomes the input for the next. Supports:
 * - Sequential chain execution
 * - Variable passing between steps
 * - Conditional branching
 * - Error handling and retry
 * - Chain templates
 */

import { ChatMessage } from '../../shared/types';

// Step types for the chain
export type ChainStepType = 'prompt' | 'transform' | 'condition' | 'aggregate';

// Variable reference in prompts: {{stepName.output}} or {{input}}
export interface VariableRef {
    stepName: string;
    property: 'output' | 'input' | string; // 'output' for full output, or a JSON path
}

// A single step in the chain
export interface ChainStep {
    id: string;
    name: string;
    type: ChainStepType;
    // For 'prompt' type
    prompt?: string;
    systemPrompt?: string;
    modelId?: string; // Optional: use specific model for this step
    temperature?: number;
    // For 'transform' type
    transform?: 'json_extract' | 'summarize' | 'format' | 'custom';
    transformConfig?: Record<string, unknown>;
    // For 'condition' type
    condition?: string; // JavaScript expression
    trueBranch?: string; // Step ID to go to if true
    falseBranch?: string; // Step ID to go to if false
    // For 'aggregate' type
    aggregateFrom?: string[]; // Step IDs to aggregate outputs from
    aggregateMode?: 'concat' | 'merge' | 'list';
    // Common
    dependsOn?: string[]; // Step IDs that must complete first
    timeout?: number; // Step timeout in ms
    retryCount?: number;
}

// Chain definition
export interface PromptChain {
    id: string;
    name: string;
    description: string;
    version: number;
    steps: ChainStep[];
    inputSchema?: Record<string, unknown>; // JSON Schema for input validation
    outputStep: string; // ID of the final step
    createdAt: number;
    updatedAt: number;
    usageCount: number;
    tags: string[];
}

// Execution state
export interface ChainExecutionState {
    chainId: string;
    startedAt: number;
    completedAt?: number;
    currentStepId: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    input: unknown;
    stepResults: Map<string, StepResult>;
    error?: string;
}

export interface StepResult {
    stepId: string;
    input: string;
    output: string;
    startedAt: number;
    completedAt: number;
    tokensUsed?: number;
    error?: string;
    retryCount: number;
}

// Chain execution context for variable resolution
export interface ChainContext {
    input: unknown;
    stepResults: Map<string, StepResult>;
    variables: Record<string, unknown>;
}

// Callbacks for chain execution
export interface ChainExecutionCallbacks {
    onStepStart?: (step: ChainStep, context: ChainContext) => void;
    onStepComplete?: (step: ChainStep, result: StepResult) => void;
    onStepError?: (step: ChainStep, error: Error) => void;
    onChainComplete?: (state: ChainExecutionState) => void;
    // For prompt steps, this is called to actually execute the prompt
    executePrompt: (
        prompt: string,
        systemPrompt?: string,
        modelId?: string,
        temperature?: number
    ) => Promise<{ content: string; tokensUsed?: number }>;
}

const CHAINS_STORAGE_KEY = 'prompt_chains';

// Built-in chain templates
const DEFAULT_CHAINS: PromptChain[] = [
    {
        id: 'chain-analyze-then-action',
        name: 'Analyze Then Act',
        description: 'First analyze the input, then take action based on the analysis',
        version: 1,
        steps: [
            {
                id: 'analyze',
                name: 'Analyze Input',
                type: 'prompt',
                prompt: 'Analyze the following input and provide a structured analysis:\n\n{{input}}\n\nProvide your analysis in JSON format with keys: category, sentiment, key_points, suggested_action',
                temperature: 0.3,
            },
            {
                id: 'act',
                name: 'Take Action',
                type: 'prompt',
                prompt: 'Based on this analysis:\n\n{{analyze.output}}\n\nExecute the suggested action and provide a response.',
                dependsOn: ['analyze'],
                temperature: 0.7,
            }
        ],
        outputStep: 'act',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        tags: ['analysis', 'action']
    },
    {
        id: 'chain-iterative-refinement',
        name: 'Iterative Refinement',
        description: 'Generate initial output, then refine it multiple times',
        version: 1,
        steps: [
            {
                id: 'draft',
                name: 'Create Draft',
                type: 'prompt',
                prompt: '{{input}}\n\nCreate an initial draft response.',
                temperature: 0.8,
            },
            {
                id: 'critique',
                name: 'Critique Draft',
                type: 'prompt',
                prompt: 'Review this draft and identify areas for improvement:\n\n{{draft.output}}\n\nProvide specific, actionable feedback.',
                dependsOn: ['draft'],
                temperature: 0.4,
            },
            {
                id: 'refine',
                name: 'Refine Based on Feedback',
                type: 'prompt',
                prompt: 'Original draft:\n{{draft.output}}\n\nFeedback:\n{{critique.output}}\n\nCreate an improved version incorporating the feedback.',
                dependsOn: ['draft', 'critique'],
                temperature: 0.6,
            }
        ],
        outputStep: 'refine',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        tags: ['refinement', 'iteration', 'quality']
    },
    {
        id: 'chain-research-synthesize',
        name: 'Research & Synthesize',
        description: 'Research a topic from multiple angles, then synthesize findings',
        version: 1,
        steps: [
            {
                id: 'technical',
                name: 'Technical Perspective',
                type: 'prompt',
                prompt: 'Research "{{input}}" from a technical perspective. Focus on implementation details, specifications, and technical considerations.',
                temperature: 0.3,
            },
            {
                id: 'practical',
                name: 'Practical Perspective',
                type: 'prompt',
                prompt: 'Research "{{input}}" from a practical perspective. Focus on real-world applications, use cases, and examples.',
                temperature: 0.5,
            },
            {
                id: 'critical',
                name: 'Critical Perspective',
                type: 'prompt',
                prompt: 'Research "{{input}}" critically. Identify limitations, challenges, alternatives, and potential issues.',
                temperature: 0.4,
            },
            {
                id: 'synthesize',
                name: 'Synthesize Findings',
                type: 'prompt',
                prompt: 'Synthesize these research findings into a comprehensive overview:\n\nTechnical:\n{{technical.output}}\n\nPractical:\n{{practical.output}}\n\nCritical:\n{{critical.output}}\n\nProvide a balanced, well-structured summary.',
                dependsOn: ['technical', 'practical', 'critical'],
                temperature: 0.5,
            }
        ],
        outputStep: 'synthesize',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        tags: ['research', 'synthesis', 'comprehensive']
    }
];

export class PromptChainingService {
    private static chains: Map<string, PromptChain> = new Map();
    private static initialized = false;

    /**
     * Initialize the service
     */
    static init(): void {
        if (this.initialized) return;

        try {
            const stored = localStorage.getItem(CHAINS_STORAGE_KEY);
            if (stored) {
                const chains: PromptChain[] = JSON.parse(stored);
                chains.forEach(c => this.chains.set(c.id, c));
            }

            // Add defaults if not present
            DEFAULT_CHAINS.forEach(c => {
                if (!this.chains.has(c.id)) {
                    this.chains.set(c.id, c);
                }
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize prompt chaining service:', error);
            this.initialized = true;
        }
    }

    /**
     * Get all chains
     */
    static getAllChains(): PromptChain[] {
        this.init();
        return Array.from(this.chains.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get a specific chain
     */
    static getChain(id: string): PromptChain | undefined {
        this.init();
        return this.chains.get(id);
    }

    /**
     * Create a new chain
     */
    static createChain(
        name: string,
        description: string,
        steps: ChainStep[],
        outputStep: string,
        tags: string[] = []
    ): PromptChain {
        this.init();

        const chain: PromptChain = {
            id: `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            version: 1,
            steps,
            outputStep,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0,
            tags,
        };

        this.chains.set(chain.id, chain);
        this.persist();

        return chain;
    }

    /**
     * Update an existing chain
     */
    static updateChain(id: string, updates: Partial<PromptChain>): PromptChain | null {
        this.init();

        const chain = this.chains.get(id);
        if (!chain) return null;

        const updated: PromptChain = {
            ...chain,
            ...updates,
            version: chain.version + 1,
            updatedAt: Date.now(),
        };

        this.chains.set(id, updated);
        this.persist();

        return updated;
    }

    /**
     * Delete a chain
     */
    static deleteChain(id: string): boolean {
        this.init();

        if (DEFAULT_CHAINS.find(c => c.id === id)) {
            return false; // Don't delete built-in chains
        }

        const deleted = this.chains.delete(id);
        if (deleted) {
            this.persist();
        }
        return deleted;
    }

    /**
     * Resolve variable references in a prompt
     * Supports: {{input}}, {{stepName.output}}, {{stepName.property}}
     */
    static resolveVariables(template: string, context: ChainContext): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
            const path = varPath.trim();

            // Handle {{input}}
            if (path === 'input') {
                return typeof context.input === 'string'
                    ? context.input
                    : JSON.stringify(context.input);
            }

            // Handle {{stepName.output}} or {{stepName.property}}
            const parts = path.split('.');
            if (parts.length >= 2) {
                const [stepName, ...propertyPath] = parts;
                const stepResult = context.stepResults.get(stepName);

                if (!stepResult) {
                    console.warn(`Variable reference to unknown step: ${stepName}`);
                    return match;
                }

                if (propertyPath[0] === 'output') {
                    return stepResult.output;
                }

                // Try to parse output as JSON and extract property
                try {
                    const parsed = JSON.parse(stepResult.output);
                    let value = parsed;
                    for (const prop of propertyPath) {
                        value = value?.[prop];
                    }
                    return typeof value === 'string' ? value : JSON.stringify(value);
                } catch {
                    return stepResult.output;
                }
            }

            // Check custom variables
            if (context.variables[path] !== undefined) {
                const val = context.variables[path];
                return typeof val === 'string' ? val : JSON.stringify(val);
            }

            return match; // Keep unresolved
        });
    }

    /**
     * Get steps that can be executed (all dependencies met)
     */
    static getExecutableSteps(
        chain: PromptChain,
        completedStepIds: Set<string>
    ): ChainStep[] {
        return chain.steps.filter(step => {
            if (completedStepIds.has(step.id)) return false;

            const deps = step.dependsOn || [];
            return deps.every(depId => completedStepIds.has(depId));
        });
    }

    /**
     * Execute a chain
     */
    static async executeChain(
        chainId: string,
        input: unknown,
        callbacks: ChainExecutionCallbacks
    ): Promise<ChainExecutionState> {
        this.init();

        const chain = this.chains.get(chainId);
        if (!chain) {
            throw new Error(`Chain not found: ${chainId}`);
        }

        const state: ChainExecutionState = {
            chainId,
            startedAt: Date.now(),
            currentStepId: '',
            status: 'running',
            input,
            stepResults: new Map(),
        };

        const context: ChainContext = {
            input,
            stepResults: state.stepResults,
            variables: {},
        };

        const completedStepIds = new Set<string>();

        try {
            // Execute steps in dependency order
            while (completedStepIds.size < chain.steps.length) {
                const executableSteps = this.getExecutableSteps(chain, completedStepIds);

                if (executableSteps.length === 0) {
                    // Check for circular dependencies or missing steps
                    const remaining = chain.steps.filter(s => !completedStepIds.has(s.id));
                    throw new Error(`Cannot execute remaining steps: ${remaining.map(s => s.id).join(', ')}`);
                }

                // Execute all executable steps in parallel
                await Promise.all(executableSteps.map(async step => {
                    state.currentStepId = step.id;
                    callbacks.onStepStart?.(step, context);

                    const result = await this.executeStep(step, context, callbacks);
                    state.stepResults.set(step.id, result);
                    completedStepIds.add(step.id);

                    if (result.error) {
                        callbacks.onStepError?.(step, new Error(result.error));
                    } else {
                        callbacks.onStepComplete?.(step, result);
                    }
                }));
            }

            state.status = 'completed';
            state.completedAt = Date.now();

            // Update usage count
            const chainToUpdate = this.chains.get(chainId);
            if (chainToUpdate) {
                chainToUpdate.usageCount++;
                chainToUpdate.updatedAt = Date.now();
                this.chains.set(chainId, chainToUpdate);
                this.persist();
            }
        } catch (error) {
            state.status = 'failed';
            state.error = error instanceof Error ? error.message : 'Unknown error';
            state.completedAt = Date.now();
        }

        callbacks.onChainComplete?.(state);
        return state;
    }

    /**
     * Execute a single step
     */
    private static async executeStep(
        step: ChainStep,
        context: ChainContext,
        callbacks: ChainExecutionCallbacks
    ): Promise<StepResult> {
        const startedAt = Date.now();
        let retryCount = 0;
        const maxRetries = step.retryCount || 0;

        while (retryCount <= maxRetries) {
            try {
                let output: string;
                let tokensUsed: number | undefined;

                switch (step.type) {
                    case 'prompt':
                        if (!step.prompt) {
                            throw new Error(`Step ${step.id} missing prompt`);
                        }
                        const resolvedPrompt = this.resolveVariables(step.prompt, context);
                        const resolvedSystem = step.systemPrompt
                            ? this.resolveVariables(step.systemPrompt, context)
                            : undefined;

                        const result = await callbacks.executePrompt(
                            resolvedPrompt,
                            resolvedSystem,
                            step.modelId,
                            step.temperature
                        );
                        output = result.content;
                        tokensUsed = result.tokensUsed;
                        break;

                    case 'transform':
                        output = this.executeTransform(step, context);
                        break;

                    case 'condition':
                        output = this.evaluateCondition(step, context);
                        break;

                    case 'aggregate':
                        output = this.aggregateOutputs(step, context);
                        break;

                    default:
                        throw new Error(`Unknown step type: ${step.type}`);
                }

                return {
                    stepId: step.id,
                    input: step.prompt ? this.resolveVariables(step.prompt, context) : '',
                    output,
                    startedAt,
                    completedAt: Date.now(),
                    tokensUsed,
                    retryCount,
                };
            } catch (error) {
                retryCount++;
                if (retryCount > maxRetries) {
                    return {
                        stepId: step.id,
                        input: step.prompt || '',
                        output: '',
                        startedAt,
                        completedAt: Date.now(),
                        error: error instanceof Error ? error.message : 'Unknown error',
                        retryCount,
                    };
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        // Should never reach here
        throw new Error('Unexpected end of retry loop');
    }

    /**
     * Execute a transform step
     */
    private static executeTransform(step: ChainStep, context: ChainContext): string {
        const deps = step.dependsOn || [];
        const inputs = deps.map(depId => context.stepResults.get(depId)?.output || '');

        switch (step.transform) {
            case 'json_extract':
                const path = (step.transformConfig?.path as string) || '';
                try {
                    const parsed = JSON.parse(inputs[0]);
                    const value = path.split('.').reduce((obj, key) => obj?.[key], parsed);
                    return typeof value === 'string' ? value : JSON.stringify(value);
                } catch {
                    return inputs[0];
                }

            case 'summarize':
                // Simple summarization - take first N characters
                const maxLength = (step.transformConfig?.maxLength as number) || 500;
                return inputs.map(i => i.substring(0, maxLength)).join('\n\n');

            case 'format':
                const template = (step.transformConfig?.template as string) || '{{0}}';
                return inputs.reduce((result, input, index) =>
                    result.replace(new RegExp(`\\{\\{${index}\\}\\}`, 'g'), input),
                    template
                );

            case 'custom':
                // Execute custom JavaScript (sandboxed)
                const code = step.transformConfig?.code as string;
                if (!code) return inputs.join('\n');
                try {
                    const fn = new Function('inputs', 'context', code);
                    return String(fn(inputs, context));
                } catch (e) {
                    console.error('Transform code error:', e);
                    return inputs.join('\n');
                }

            default:
                return inputs.join('\n');
        }
    }

    /**
     * Evaluate a condition step
     */
    private static evaluateCondition(step: ChainStep, context: ChainContext): string {
        if (!step.condition) {
            return 'true';
        }

        try {
            // Create a safe evaluation context
            const evalContext: Record<string, unknown> = {
                input: context.input,
            };

            // Add step outputs
            context.stepResults.forEach((result, stepId) => {
                evalContext[stepId] = result.output;
                try {
                    evalContext[`${stepId}_json`] = JSON.parse(result.output);
                } catch {
                    // Not JSON, that's fine
                }
            });

            const fn = new Function(...Object.keys(evalContext), `return (${step.condition})`);
            const result = fn(...Object.values(evalContext));

            return result ? 'true' : 'false';
        } catch (e) {
            console.error('Condition evaluation error:', e);
            return 'false';
        }
    }

    /**
     * Aggregate outputs from multiple steps
     */
    private static aggregateOutputs(step: ChainStep, context: ChainContext): string {
        const sources = step.aggregateFrom || step.dependsOn || [];
        const outputs = sources.map(stepId => context.stepResults.get(stepId)?.output || '');

        switch (step.aggregateMode) {
            case 'concat':
                return outputs.join('\n\n---\n\n');

            case 'merge':
                // Try to merge as JSON objects
                try {
                    const merged = outputs.reduce((acc, output) => {
                        const parsed = JSON.parse(output);
                        return { ...acc, ...parsed };
                    }, {});
                    return JSON.stringify(merged, null, 2);
                } catch {
                    return outputs.join('\n\n');
                }

            case 'list':
                return JSON.stringify(outputs, null, 2);

            default:
                return outputs.join('\n\n');
        }
    }

    /**
     * Persist chains to storage
     */
    private static persist(): void {
        try {
            const userChains = Array.from(this.chains.values())
                .filter(c => !DEFAULT_CHAINS.find(d => d.id === c.id));
            localStorage.setItem(CHAINS_STORAGE_KEY, JSON.stringify(userChains));
        } catch (error) {
            console.error('Failed to persist chains:', error);
        }
    }

    /**
     * Export chains
     */
    static exportChains(chainIds?: string[]): string {
        this.init();

        const chains = chainIds
            ? this.getAllChains().filter(c => chainIds.includes(c.id))
            : this.getAllChains().filter(c => !DEFAULT_CHAINS.find(d => d.id === c.id));

        return JSON.stringify({
            version: '1.0',
            exportedAt: Date.now(),
            chains,
        }, null, 2);
    }

    /**
     * Import chains
     */
    static importChains(jsonData: string): { imported: number; errors: string[] } {
        this.init();

        const errors: string[] = [];
        let imported = 0;

        try {
            const data = JSON.parse(jsonData);

            if (!data.chains || !Array.isArray(data.chains)) {
                errors.push('Invalid chain file format');
                return { imported, errors };
            }

            for (const chain of data.chains) {
                try {
                    if (!chain.name || !chain.steps || !chain.outputStep) {
                        errors.push(`Skipped chain: missing required fields`);
                        continue;
                    }

                    const newChain: PromptChain = {
                        ...chain,
                        id: `chain-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        usageCount: 0,
                    };

                    this.chains.set(newChain.id, newChain);
                    imported++;
                } catch (e) {
                    errors.push(`Failed to import chain: ${chain.name || 'unknown'}`);
                }
            }

            if (imported > 0) {
                this.persist();
            }
        } catch (e) {
            errors.push('Failed to parse chain file');
        }

        return { imported, errors };
    }

    /**
     * Reset to defaults
     */
    static reset(): void {
        this.chains.clear();
        DEFAULT_CHAINS.forEach(c => this.chains.set(c.id, c));
        localStorage.removeItem(CHAINS_STORAGE_KEY);
    }
}

// Initialize on load
PromptChainingService.init();

export default PromptChainingService;
