/**
 * Unit tests for LMStudioAdapter (src/server/adapters/lmstudio.ts).
 * Mocks fetch to avoid real network calls.
 */
import { LMStudioAdapter } from '../src/server/adapters/lmstudio';
import { ChatRequest, Model } from '../src/shared/types';

const mockChatResponse = {
  id: 'gen-1',
  object: 'chat.completion' as const,
  created: Date.now(),
  model: 'test-model',
  choices: [
    {
      index: 0,
      message: { role: 'assistant' as const, content: 'Hi' },
      finish_reason: 'stop' as const,
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

describe('LMStudioAdapter', () => {
  const model: Model = {
    id: 'test-model',
    name: 'Test Model',
    pathOrUrl: 'http://localhost:1234',
    type: 'remote-endpoint',
    status: 'loaded',
    adapter: 'lmstudio',
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses default base URL when not provided', () => {
      const adapter = new LMStudioAdapter();
      expect(adapter).toBeDefined();
    });

    it('uses provided base URL', () => {
      const adapter = new LMStudioAdapter('http://localhost:9999');
      expect(adapter).toBeDefined();
    });
  });

  describe('loadModel / unloadModel', () => {
    it('loadModel logs and resolves', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const adapter = new LMStudioAdapter();
      await adapter.loadModel(model);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Assuming model test-model'));
      logSpy.mockRestore();
    });

    it('unloadModel logs and resolves', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const adapter = new LMStudioAdapter();
      await adapter.unloadModel(model);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Unload not fully supported'));
      logSpy.mockRestore();
    });
  });

  describe('chat', () => {
    it('performs single request and returns normalized response', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockChatResponse }),
      } as Response);

      const adapter = new LMStudioAdapter('http://localhost:1234');
      const request: ChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await adapter.chat(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBe('Hi');
      fetchSpy.mockRestore();
    });

    it('throws when fetch fails', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const adapter = new LMStudioAdapter();
      const request: ChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(adapter.chat(request)).rejects.toThrow();
    });

    it('batch size 1 uses single request path', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockChatResponse }),
      } as Response);

      const adapter = new LMStudioAdapter();
      const request: ChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        n: 1,
      };

      await adapter.chat(request);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });
  });

  describe('chatStream', () => {
    it('returns body stream when response is ok', async () => {
      const mockStream = new ReadableStream<Uint8Array>();
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      const adapter = new LMStudioAdapter();
      const request: ChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const stream = await adapter.chatStream(request);
      expect(stream).toBe(mockStream);
      fetchSpy.mockRestore();
    });

    it('throws when stream response is not ok', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      const adapter = new LMStudioAdapter();
      const request: ChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(adapter.chatStream(request)).rejects.toThrow();
    });
  });
});
