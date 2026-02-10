import {
  applyChatStreamChunk,
  consumeChatStreamContent,
  createChatStreamParseState,
  flushChatStreamToolCalls,
} from '../src/renderer/lib/chatStreamParser';

describe('chatStreamParser', () => {
  it('parses streamed content across chunk boundaries', () => {
    const state = createChatStreamParseState();

    applyChatStreamChunk(
      state,
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n' +
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n' +
        'data: {"choices":[{"delta":{"content":" wor',
      false,
    );

    expect(consumeChatStreamContent(state)).toBe('Hello');

    applyChatStreamChunk(state, 'ld"}}]}\n', false);
    expect(consumeChatStreamContent(state)).toBe(' world');

    applyChatStreamChunk(state, 'data: [DONE]\n', true);
    expect(consumeChatStreamContent(state)).toBe('');
  });

  it('merges tool-call deltas by index and flushes in sorted order', () => {
    const state = createChatStreamParseState();

    applyChatStreamChunk(
      state,
      'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"call-2","function":{"name":"sea","arguments":"{\\"q\\":\\"he"}}]}}]}\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"lookup","arguments":"{}"}}]}}]}\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"name":"rch","arguments":"llo\\"}"}}]}}]}\n',
      false,
    );

    const toolCalls = flushChatStreamToolCalls(state);

    expect(toolCalls).toEqual([
      {
        id: 'call-1',
        type: 'function',
        function: { name: 'lookup', arguments: '{}' },
      },
      {
        id: 'call-2',
        type: 'function',
        function: { name: 'search', arguments: '{"q":"hello"}' },
      },
    ]);

    expect(flushChatStreamToolCalls(state)).toBeNull();
  });

  it('ignores malformed/non-data lines without crashing', () => {
    const state = createChatStreamParseState();

    applyChatStreamChunk(
      state,
      'event: ping\n' +
        'data: {not-valid-json}\n' +
        'data: {"choices":[{"delta":{}}]}\n',
      false,
    );

    expect(consumeChatStreamContent(state)).toBe('');
    expect(flushChatStreamToolCalls(state)).toBeNull();
  });
});
