import { Model, ModelRuntimeAdapter, ChatRequest, ChatResponse, Message } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export class MockAdapter implements ModelRuntimeAdapter {
  private loaded: boolean = false;

  async loadModel(model: Model): Promise<void> {
    console.log(`[MockAdapter] Loading model: ${model.name}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    this.loaded = true;
  }

  async unloadModel(model: Model): Promise<void> {
    this.loaded = false;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const batchSize = request.n || 1;
      const lastUserMessage = request.messages.filter(m => m.role === 'user').pop()?.content || "";
      const baseId = uuidv4();

      const choices = Array.from({ length: batchSize }).map((_, i) => {
          // Vary the content slightly for mock realism
          const variation = i === 0 ? "Standard response." : `Alternative variation #${i}.`;
          const responseText = `[Mock Batch ${i + 1}/${batchSize}] You said: "${lastUserMessage}". ${variation}`;

          const words = responseText.split(' ');
          const logprobsContent = words.map(word => {
              const actualToken = word + " ";
              const alt1 = ["the ", "a ", "is ", "of "][Math.floor(Math.random() * 4)];
              const alt2 = ["maybe ", "could ", "should "][Math.floor(Math.random() * 3)];

              return {
                  token: actualToken,
                  logprob: -0.1,
                  top_logprobs: [
                      { token: actualToken, logprob: -0.1 },
                      { token: alt1, logprob: -2.5 },
                      { token: alt2, logprob: -4.0 }
                  ]
              };
          });

          return {
              index: i,
              message: { role: "assistant" as const, content: responseText },
              finish_reason: "stop",
              logprobs: { content: logprobsContent }
          };
      });

      return {
        id: "chatcmpl-" + baseId,
        object: "chat.completion",
        created: Date.now(),
        model: request.model,
        choices: choices,
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20 * batchSize,
          total_tokens: 10 + (20 * batchSize)
        }
      };
    } catch (error) {
      console.error('[MockAdapter] Error during chat request:', error);
      throw new Error(`Mock chat request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}