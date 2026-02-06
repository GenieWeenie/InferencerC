jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));
import { MockAdapter } from '../src/server/adapters/mock';
import { ChatRequest, Model } from '../src/shared/types';

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  test('should load a model', async () => {
    const model: Model = {
      id: 'test-model',
      name: 'Test Model',
      pathOrUrl: 'http://localhost:3000',
      type: 'remote-endpoint',
      status: 'loaded',
      adapter: 'mock'
    };

    await expect(adapter.loadModel(model)).resolves.not.toThrow();
  });

  test('should unload a model', async () => {
    const model: Model = {
      id: 'test-model',
      name: 'Test Model',
      pathOrUrl: 'http://localhost:3000',
      type: 'remote-endpoint',
      status: 'loaded',
      adapter: 'mock'
    };

    await adapter.loadModel(model);
    await expect(adapter.unloadModel(model)).resolves.not.toThrow();
  });

  test('should handle chat request with single message', async () => {
    const request: ChatRequest = {
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    };

    const response = await adapter.chat(request);

    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('object', 'chat.completion');
    expect(response.choices).toHaveLength(1);
    expect(response.choices[0]).toHaveProperty('message');
    expect(response.choices[0].message.role).toBe('assistant');
  });

  test('should handle batch chat requests', async () => {
    const request: ChatRequest = {
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      n: 3 // Request 3 completions
    };

    const response = await adapter.chat(request);

    expect(response.choices).toHaveLength(3);
    response.choices.forEach(choice => {
      expect(choice).toHaveProperty('message');
      expect(choice.message.role).toBe('assistant');
    });
  });

  test('should handle empty messages array', async () => {
    const request: ChatRequest = {
      model: 'test-model',
      messages: [] // Empty messages
    };

    const response = await adapter.chat(request);

    expect(response).toHaveProperty('id');
    expect(response.choices).toHaveLength(1);
  });
});