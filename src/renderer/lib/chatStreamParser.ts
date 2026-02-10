import { ToolCall } from '../../shared/types';

type ToolCallFunctionDelta = {
    name?: string;
    arguments?: string;
};

type ToolCallDelta = {
    id?: string;
    index?: number;
    function?: ToolCallFunctionDelta;
};

type ChoiceDelta = {
    content?: string;
    tool_calls?: ToolCallDelta[];
};

type StreamDataPayload = {
    choices?: Array<{
        delta?: ChoiceDelta;
    }>;
};

export interface ChatStreamParseState {
    remainder: string;
    contentBuffer: string;
    toolCallsByIndex: Record<number, ToolCall>;
    toolCallsDirty: boolean;
}

export const createChatStreamParseState = (): ChatStreamParseState => ({
    remainder: '',
    contentBuffer: '',
    toolCallsByIndex: {},
    toolCallsDirty: false,
});

const getOrCreateToolCall = (
    state: ChatStreamParseState,
    index: number
): ToolCall => {
    if (!state.toolCallsByIndex[index]) {
        state.toolCallsByIndex[index] = {
            id: '',
            type: 'function',
            function: {
                name: '',
                arguments: '',
            },
        };
        state.toolCallsDirty = true;
    }

    return state.toolCallsByIndex[index];
};

const mergeToolCallDelta = (state: ChatStreamParseState, delta: ToolCallDelta): void => {
    if (typeof delta.index !== 'number' || !Number.isFinite(delta.index)) {
        return;
    }

    const toolCall = getOrCreateToolCall(state, delta.index);

    if (delta.id && toolCall.id !== delta.id) {
        toolCall.id = delta.id;
        state.toolCallsDirty = true;
    }

    if (delta.function?.name && delta.function.name.length > 0) {
        toolCall.function.name += delta.function.name;
        state.toolCallsDirty = true;
    }

    if (delta.function?.arguments && delta.function.arguments.length > 0) {
        toolCall.function.arguments += delta.function.arguments;
        state.toolCallsDirty = true;
    }
};

const parseDataPayload = (line: string): StreamDataPayload | null => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
        return null;
    }

    const dataStr = trimmed.replace(/^data:\s*/, '').trim();
    if (!dataStr || dataStr === '[DONE]') {
        return null;
    }

    try {
        return JSON.parse(dataStr) as StreamDataPayload;
    } catch {
        return null;
    }
};

export const applyChatStreamChunk = (
    state: ChatStreamParseState,
    chunk: string,
    isDone: boolean
): void => {
    state.remainder += chunk;
    const lines = state.remainder.split('\n');
    state.remainder = isDone ? '' : (lines.pop() || '');

    for (let i = 0; i < lines.length; i += 1) {
        const payload = parseDataPayload(lines[i]);
        if (!payload) {
            continue;
        }

        const delta = payload.choices?.[0]?.delta;
        if (!delta) {
            continue;
        }

        if (typeof delta.content === 'string' && delta.content.length > 0) {
            state.contentBuffer += delta.content;
        }

        if (Array.isArray(delta.tool_calls)) {
            for (let j = 0; j < delta.tool_calls.length; j += 1) {
                mergeToolCallDelta(state, delta.tool_calls[j]);
            }
        }
    }
};

export const consumeChatStreamContent = (state: ChatStreamParseState): string => {
    if (!state.contentBuffer) {
        return '';
    }

    const nextContent = state.contentBuffer;
    state.contentBuffer = '';
    return nextContent;
};

export const flushChatStreamToolCalls = (state: ChatStreamParseState): ToolCall[] | null => {
    if (!state.toolCallsDirty) {
        return null;
    }

    state.toolCallsDirty = false;

    return Object.keys(state.toolCallsByIndex)
        .map((key) => Number(key))
        .sort((a, b) => a - b)
        .map((index) => state.toolCallsByIndex[index]);
};
