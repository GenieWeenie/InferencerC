import { ChatMessage, ToolCall } from '../src/shared/types';
import {
  areToolCallsEquivalent,
  buildMessageLoadPatch,
  buildUpdatedMessageContent,
  collectMessageIndicesToLoad,
} from '../src/renderer/lib/chatStateGuards';

const createMessage = (content: string, isLoading = false): ChatMessage => ({
  role: 'assistant',
  content,
  isLoading,
});

describe('chatStateGuards', () => {
  describe('collectMessageIndicesToLoad', () => {
    it('collects only unloaded indices within clamped range', () => {
      const loaded = new Set([1, 3]);
      expect(collectMessageIndicesToLoad(-2, 5, 4, loaded)).toEqual([0, 2]);
    });

    it('returns empty for invalid ranges or empty history', () => {
      const loaded = new Set<number>();
      expect(collectMessageIndicesToLoad(3, 1, 5, loaded)).toEqual([]);
      expect(collectMessageIndicesToLoad(0, 1, 0, loaded)).toEqual([]);
    });
  });

  describe('buildMessageLoadPatch', () => {
    it('returns null when nothing new needs to be loaded', () => {
      const allMessages = [createMessage('a'), createMessage('b')];
      const loadedIndices = new Set([0, 1]);
      const cache = new Map<number, ChatMessage>([
        [0, allMessages[0]],
        [1, allMessages[1]],
      ]);

      const patch = buildMessageLoadPatch(allMessages, loadedIndices, cache, [0, 1, 1]);
      expect(patch).toBeNull();
    });

    it('returns patched cache/set when new indices are loadable', () => {
      const allMessages = [createMessage('a'), createMessage('b'), createMessage('c')];
      const loadedIndices = new Set([0]);
      const cache = new Map<number, ChatMessage>([[0, allMessages[0]]]);

      const patch = buildMessageLoadPatch(allMessages, loadedIndices, cache, [0, 2, 5, -1]);
      expect(patch).not.toBeNull();
      expect(Array.from(patch!.nextLoadedMessageIndices).sort((a, b) => a - b)).toEqual([0, 2]);
      expect(patch!.nextFullMessageCache.get(2)).toBe(allMessages[2]);
    });
  });

  describe('buildUpdatedMessageContent', () => {
    const baseToolCalls: ToolCall[] = [{
      id: 'tool-1',
      type: 'function',
      function: { name: 'search', arguments: '{"q":"hello"}' },
    }];

    it('treats equivalent tool-call arrays as no-op', () => {
      const existing = createMessage('hello', true);
      existing.tool_calls = baseToolCalls;

      const next = buildUpdatedMessageContent({
        existing,
        content: 'hello',
        isLoading: true,
        toolCalls: [{
          id: 'tool-1',
          type: 'function',
          function: { name: 'search', arguments: '{"q":"hello"}' },
        }],
      });

      expect(areToolCallsEquivalent(existing.tool_calls, baseToolCalls)).toBe(true);
      expect(next).toBeNull();
    });

    it('returns null when patch is fully unchanged', () => {
      const existing = createMessage('steady', false);

      const next = buildUpdatedMessageContent({
        existing,
        content: 'steady',
        isLoading: false,
      });

      expect(next).toBeNull();
    });

    it('returns updated message when content/loading changes', () => {
      const existing = createMessage('old', true);

      const next = buildUpdatedMessageContent({
        existing,
        content: 'new',
        isLoading: false,
        generationTime: 120,
      });

      expect(next).not.toBeNull();
      expect(next!.content).toBe('new');
      expect(next!.isLoading).toBe(false);
      expect(next!.generationTime).toBe(120);
    });
  });
});
