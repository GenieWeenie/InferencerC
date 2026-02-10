import { ChatMessage, ChatSession, ToolCall } from '../src/shared/types';
import {
  areToolCallsEquivalent,
  buildChoiceSelectionUpdate,
  buildContextMessagesPatch,
  buildDeleteMessagePatch,
  buildInitialLazySessionState,
  buildMessageLoadPatch,
  buildMessageReplacePatch,
  buildOutgoingMessagePatch,
  buildSavedSessionsPatch,
  buildStopGenerationPatch,
  buildTokenEditUpdate,
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

  describe('buildDeleteMessagePatch', () => {
    it('returns null for out-of-range indices', () => {
      const history = [createMessage('a'), createMessage('b')];
      const cache = new Map<number, ChatMessage>([[0, history[0]]]);
      const loaded = new Set<number>([0]);
      expect(buildDeleteMessagePatch(history, cache, loaded, -1)).toBeNull();
      expect(buildDeleteMessagePatch(history, cache, loaded, 2)).toBeNull();
    });

    it('truncates history and prunes cache/index entries from deletion point', () => {
      const history = [createMessage('a'), createMessage('b'), createMessage('c')];
      const cache = new Map<number, ChatMessage>([
        [0, history[0]],
        [1, history[1]],
        [2, history[2]],
      ]);
      const loaded = new Set<number>([0, 1, 2]);
      const patch = buildDeleteMessagePatch(history, cache, loaded, 1);

      expect(patch).not.toBeNull();
      expect(patch!.nextHistory).toEqual([history[0]]);
      expect(Array.from(patch!.nextFullMessageCache.keys())).toEqual([0]);
      expect(Array.from(patch!.nextLoadedMessageIndices.values())).toEqual([0]);
    });

    it('reuses cache/index references when no entries need pruning', () => {
      const history = [createMessage('a'), createMessage('b')];
      const cache = new Map<number, ChatMessage>([[0, history[0]]]);
      const loaded = new Set<number>([0]);
      const patch = buildDeleteMessagePatch(history, cache, loaded, 1);

      expect(patch).not.toBeNull();
      expect(patch!.nextHistory).toEqual([history[0]]);
      expect(patch!.nextFullMessageCache).toBe(cache);
      expect(patch!.nextLoadedMessageIndices).toBe(loaded);
    });
  });

  describe('buildMessageReplacePatch', () => {
    it('returns null for out-of-range index', () => {
      const history = [createMessage('a')];
      const cache = new Map<number, ChatMessage>([[0, history[0]]]);
      const updated = createMessage('updated');
      expect(buildMessageReplacePatch(history, cache, -1, updated)).toBeNull();
      expect(buildMessageReplacePatch(history, cache, 1, updated)).toBeNull();
    });

    it('returns null when both history and cache already hold the same message object', () => {
      const message = createMessage('same');
      const history = [message];
      const cache = new Map<number, ChatMessage>([[0, message]]);
      expect(buildMessageReplacePatch(history, cache, 0, message)).toBeNull();
    });

    it('updates both history and cache when replacing with a new message', () => {
      const history = [createMessage('old')];
      const cache = new Map<number, ChatMessage>([[0, history[0]]]);
      const updated = createMessage('new');
      const patch = buildMessageReplacePatch(history, cache, 0, updated);

      expect(patch).not.toBeNull();
      expect(patch!.nextHistory[0]).toBe(updated);
      expect(patch!.nextHistory).not.toBe(history);
      expect(patch!.nextFullMessageCache.get(0)).toBe(updated);
      expect(patch!.nextFullMessageCache).not.toBe(cache);
    });

    it('can patch cache only when history already references updated message', () => {
      const updated = createMessage('shared');
      const history = [updated];
      const cache = new Map<number, ChatMessage>();
      const patch = buildMessageReplacePatch(history, cache, 0, updated);

      expect(patch).not.toBeNull();
      expect(patch!.nextHistory).toBe(history);
      expect(patch!.nextFullMessageCache.get(0)).toBe(updated);
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

  describe('buildChoiceSelectionUpdate', () => {
    it('returns null when selected choice would not change content/index', () => {
      const existing: ChatMessage = {
        role: 'assistant',
        content: 'choice-a',
        selectedChoiceIndex: 0,
        choices: [
          { index: 0, message: { role: 'assistant', content: 'choice-a' } },
          { index: 1, message: { role: 'assistant', content: 'choice-b' } },
        ],
      };

      const next = buildChoiceSelectionUpdate(existing, 0);
      expect(next).toBeNull();
    });

    it('returns updated message when selecting a different valid choice', () => {
      const existing: ChatMessage = {
        role: 'assistant',
        content: 'choice-a',
        selectedChoiceIndex: 0,
        choices: [
          { index: 0, message: { role: 'assistant', content: 'choice-a' } },
          { index: 1, message: { role: 'assistant', content: 'choice-b' } },
        ],
      };

      const next = buildChoiceSelectionUpdate(existing, 1);
      expect(next).not.toBeNull();
      expect(next!.selectedChoiceIndex).toBe(1);
      expect(next!.content).toBe('choice-b');
    });
  });

  describe('buildTokenEditUpdate', () => {
    it('returns null for no-op token edits', () => {
      const existing: ChatMessage = {
        role: 'assistant',
        content: 'Hello',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello' },
          logprobs: {
            content: [
              { token: 'Hel', logprob: -0.1 },
              { token: 'lo', logprob: -0.2 },
            ],
          },
        }],
      };

      const next = buildTokenEditUpdate(existing, 1, 'lo');
      expect(next).toBeNull();
    });

    it('returns updated message and token for meaningful edits', () => {
      const existing: ChatMessage = {
        role: 'assistant',
        content: 'Hello',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello' },
          logprobs: {
            content: [
              { token: 'Hel', logprob: -0.1 },
              { token: 'lo', logprob: -0.2 },
            ],
          },
        }],
      };

      const next = buildTokenEditUpdate(existing, 1, 'LA');
      expect(next).not.toBeNull();
      expect(next!.updatedToken.token).toBe('LA');
      expect(next!.updatedMessage.content).toBe('HelLA');
      expect(next!.updatedMessage.choices?.[0].message.content).toBe('HelLA');
    });
  });

  describe('buildStopGenerationPatch', () => {
    it('returns null when no messages are loading', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'done', isLoading: false },
      ];
      const cache = new Map<number, ChatMessage>([
        [0, history[0]],
        [1, history[1]],
      ]);

      expect(buildStopGenerationPatch(history, cache)).toBeNull();
    });

    it('stops loading messages and updates cache in one patch', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'stream-a', isLoading: true },
        { role: 'assistant', content: 'stream-b [Stopped]', isLoading: true },
      ];
      const cache = new Map<number, ChatMessage>([
        [1, history[1]],
      ]);

      const patch = buildStopGenerationPatch(history, cache);
      expect(patch).not.toBeNull();
      expect(patch!.nextHistory[0]).toBe(history[0]);
      expect(patch!.nextHistory[1].isLoading).toBe(false);
      expect(patch!.nextHistory[1].content).toBe('stream-a [Stopped]');
      expect(patch!.nextHistory[2].isLoading).toBe(false);
      expect(patch!.nextHistory[2].content).toBe('stream-b [Stopped]');
      expect(patch!.nextFullMessageCache.get(1)?.content).toBe('stream-a [Stopped]');
      expect(patch!.nextFullMessageCache.get(2)?.content).toBe('stream-b [Stopped]');
    });
  });

  describe('buildOutgoingMessagePatch', () => {
    it('appends user+assistant messages and updates cache/index sets', () => {
      const history: ChatMessage[] = [
        { role: 'system', content: 'sys' },
      ];
      const userMessage: ChatMessage = { role: 'user', content: 'hello' };
      const assistants: ChatMessage[] = [
        { role: 'assistant', content: '', isLoading: true },
        { role: 'assistant', content: '', isLoading: true },
      ];
      const cache = new Map<number, ChatMessage>([[0, history[0]]]);
      const loaded = new Set<number>([0]);

      const patch = buildOutgoingMessagePatch({
        history,
        fullMessageCache: cache,
        loadedMessageIndices: loaded,
        userMessage,
        assistantMessages: assistants,
      });

      expect(patch.userMessageIndex).toBe(1);
      expect(patch.assistantStartIndex).toBe(2);
      expect(patch.nextHistory).toHaveLength(4);
      expect(patch.nextHistory[1]).toEqual(userMessage);
      expect(patch.nextHistory[2]).toEqual(assistants[0]);
      expect(patch.nextHistory[3]).toEqual(assistants[1]);
      expect(Array.from(patch.nextLoadedMessageIndices).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
      expect(patch.nextFullMessageCache.get(1)).toEqual(userMessage);
      expect(patch.nextFullMessageCache.get(3)).toEqual(assistants[1]);
    });
  });

  describe('buildContextMessagesPatch', () => {
    it('builds a system + filtered history + user sequence in one pass', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
      ];
      const messages = buildContextMessagesPatch({
        history,
        excludedIndices: new Set([1]),
        finalSystemPrompt: 'system',
        contextSummary: 'summary',
        userMessageContent: 'latest',
      });

      expect(messages).toEqual([
        { role: 'system', content: 'system' },
        { role: 'system', content: 'summary' },
        { role: 'user', content: 'first' },
        { role: 'user', content: 'third' },
        { role: 'user', content: 'latest' },
      ]);
    });

    it('omits summary when not provided', () => {
      const messages = buildContextMessagesPatch({
        history: [],
        excludedIndices: new Set(),
        finalSystemPrompt: 'system',
        userMessageContent: 'hello',
      });
      expect(messages).toEqual([
        { role: 'system', content: 'system' },
        { role: 'user', content: 'hello' },
      ]);
    });
  });

  describe('buildInitialLazySessionState', () => {
    it('keeps all messages loaded when history size is below threshold', () => {
      const allMessages: ChatMessage[] = [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ];
      const patch = buildInitialLazySessionState({
        allMessages,
        initialLoadCount: 5,
      });

      expect(patch.lightweightHistory).toBe(allMessages);
      expect(Array.from(patch.nextLoadedMessageIndices).sort((a, b) => a - b)).toEqual([0, 1]);
      expect(patch.nextFullMessageCache.get(1)).toEqual(allMessages[1]);
    });

    it('returns lightweight previews for older messages', () => {
      const allMessages: ChatMessage[] = [
        { role: 'user', content: 'old-message-1' },
        { role: 'assistant', content: 'old-message-2' },
        { role: 'user', content: 'recent-message' },
      ];
      const patch = buildInitialLazySessionState({
        allMessages,
        initialLoadCount: 1,
        previewLength: 4,
      });

      expect(patch.lightweightHistory[0].content).toBe('old-...');
      expect(patch.lightweightHistory[1].content).toBe('old-...');
      expect(patch.lightweightHistory[2]).toBe(allMessages[2]);
      expect(Array.from(patch.nextLoadedMessageIndices)).toEqual([2]);
      expect(patch.nextFullMessageCache.get(2)).toEqual(allMessages[2]);
    });
  });

  describe('buildSavedSessionsPatch', () => {
    const baseSession = (overrides: Partial<ChatSession>): ChatSession => ({
      id: overrides.id ?? 'session-1',
      title: overrides.title ?? 'Session 1',
      lastModified: overrides.lastModified ?? 1,
      modelId: overrides.modelId ?? 'model',
      messages: overrides.messages ?? [],
      expertMode: overrides.expertMode,
      thinkingEnabled: overrides.thinkingEnabled,
      pinned: overrides.pinned,
      systemPrompt: overrides.systemPrompt,
      temperature: overrides.temperature,
      topP: overrides.topP,
      maxTokens: overrides.maxTokens,
      batchSize: overrides.batchSize,
      encrypted: overrides.encrypted,
      encryptedHash: overrides.encryptedHash,
      usesTreeStructure: overrides.usesTreeStructure,
    });

    it('upserts metadata to top and moves existing entries', () => {
      const sessions = [
        baseSession({ id: 'a', title: 'A' }),
        baseSession({ id: 'b', title: 'B' }),
      ];
      const patch = buildSavedSessionsPatch(sessions, {
        type: 'upsertTop',
        metadata: baseSession({ id: 'b', title: 'B2', lastModified: 5 }),
      });

      expect(patch).not.toBeNull();
      expect(patch![0].id).toBe('b');
      expect(patch![0].title).toBe('B2');
      expect(patch![1].id).toBe('a');
    });

    it('returns null for no-op top upsert', () => {
      const sessions = [
        baseSession({ id: 'a', title: 'A' }),
      ];
      const patch = buildSavedSessionsPatch(sessions, {
        type: 'upsertTop',
        metadata: baseSession({ id: 'a', title: 'A' }),
      });
      expect(patch).toBeNull();
    });

    it('updates by id only when data actually changes', () => {
      const sessions = [
        baseSession({ id: 'a', title: 'A' }),
      ];

      const changed = buildSavedSessionsPatch(sessions, {
        type: 'updateById',
        id: 'a',
        updater: (session) => ({ ...session, title: 'A+' }),
      });
      expect(changed).not.toBeNull();
      expect(changed![0].title).toBe('A+');

      const unchanged = buildSavedSessionsPatch(sessions, {
        type: 'updateById',
        id: 'a',
        updater: (session) => ({ ...session }),
      });
      expect(unchanged).toBeNull();
    });

    it('removes by id and no-ops when id is missing', () => {
      const sessions = [
        baseSession({ id: 'a', title: 'A' }),
        baseSession({ id: 'b', title: 'B' }),
      ];
      const removed = buildSavedSessionsPatch(sessions, {
        type: 'removeById',
        id: 'a',
      });
      expect(removed).toEqual([sessions[1]]);

      const missing = buildSavedSessionsPatch(sessions, {
        type: 'removeById',
        id: 'missing',
      });
      expect(missing).toBeNull();
    });
  });
});
