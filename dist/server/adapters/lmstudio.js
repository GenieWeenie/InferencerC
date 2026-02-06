"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMStudioAdapter = void 0;
class LMStudioAdapter {
    baseUrl;
    constructor(baseUrl = 'http://localhost:1234') {
        this.baseUrl = baseUrl;
    }
    async loadModel(model) {
        console.log(`[LMStudioAdapter] Assuming model ${model.id} is managed/loaded by LM Studio.`);
    }
    async unloadModel(model) {
        console.log(`[LMStudioAdapter] Unload not fully supported via standard OpenAI API.`);
    }
    async chat(request) {
        const batchSize = request.n || 1;
        if (batchSize === 1) {
            return await this.performSingleRequest(request);
        }
        // Parallel execution for Batch Size > 1
        console.log(`[LMStudioAdapter] Executing batch size: ${batchSize}`);
        try {
            const promises = Array.from({ length: batchSize }).map((_, i) => {
                // Create a unique request for each batch item with a random seed
                const randomizedRequest = {
                    ...request,
                    n: 1,
                    seed: Math.floor(Math.random() * 1000000) + i
                };
                return this.performSingleRequest(randomizedRequest);
            });
            const results = await Promise.all(promises);
            const firstResult = results[0];
            const choices = results.flatMap((res, index) => {
                return res.choices.map(c => ({
                    ...c,
                    index: index
                }));
            });
            return {
                ...firstResult,
                choices: choices
            };
        }
        catch (error) {
            console.error('[LMStudioAdapter] Error during batch request:', error);
            throw new Error(`Batch request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async performSingleRequest(request) {
        const payload = {
            ...request,
            logprobs: true,
            top_logprobs: 5
        };
        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`LM Studio Error: ${response.statusText}`);
            }
            const data = await response.json();
            // NORMALIZATION: Handle "reasoning_content" for DeepSeek/GLM models
            // If content is empty but reasoning exists, or just to show reasoning.
            data.choices = data.choices.map((c) => {
                let finalContent = c.message.content || "";
                // If there is reasoning content, prepend it block-quoted
                if (c.message.reasoning_content) {
                    finalContent = `> **Thinking Process:**\n> ${c.message.reasoning_content.replace(/\n/g, '\n> ')}\n\n${finalContent}`;
                }
                // Fallback for completely empty responses (e.g. max tokens hit during reasoning)
                if (!finalContent && c.finish_reason === 'length') {
                    finalContent = "[Error: Model ran out of tokens while thinking. Increase Max Tokens.]";
                }
                return {
                    ...c,
                    message: {
                        ...c.message,
                        content: finalContent
                    }
                };
            });
            return data;
        }
        catch (error) {
            console.error("[LMStudioAdapter] Request failed:", error);
            throw error;
        }
    }
    async chatStream(request) {
        const payload = {
            ...request,
            stream: true
        };
        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`LM Studio Error: ${response.statusText}`);
            }
            return response.body;
        }
        catch (error) {
            console.error("[LMStudioAdapter] Stream Request failed:", error);
            throw error;
        }
    }
}
exports.LMStudioAdapter = LMStudioAdapter;
//# sourceMappingURL=lmstudio.js.map