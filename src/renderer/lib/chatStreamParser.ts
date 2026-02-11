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

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeToolCallFunctionDelta = (value: unknown): ToolCallFunctionDelta | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    const next: ToolCallFunctionDelta = {};
    if (typeof value.name === 'string') {
        next.name = value.name;
    }
    if (typeof value.arguments === 'string') {
        next.arguments = value.arguments;
    }
    return next;
};

const sanitizeToolCallDelta = (value: unknown): ToolCallDelta | null => {
    if (!isRecord(value)) {
        return null;
    }
    const next: ToolCallDelta = {};
    if (typeof value.id === 'string') {
        next.id = value.id;
    }
    if (typeof value.index === 'number' && Number.isInteger(value.index) && Number.isFinite(value.index)) {
        next.index = value.index;
    }
    const fn = sanitizeToolCallFunctionDelta(value.function);
    if (fn && (typeof fn.name === 'string' || typeof fn.arguments === 'string')) {
        next.function = fn;
    }
    if (typeof next.index !== 'number') {
        return null;
    }
    if (typeof next.id !== 'string' && !next.function) {
        return null;
    }
    return next;
};

const sanitizeChoiceDelta = (value: unknown): ChoiceDelta | null => {
    if (!isRecord(value)) {
        return null;
    }
    const delta: ChoiceDelta = {};
    if (typeof value.content === 'string') {
        delta.content = value.content;
    }
    if (Array.isArray(value.tool_calls)) {
        const toolCalls = value.tool_calls
            .map((entry) => sanitizeToolCallDelta(entry))
            .filter((entry): entry is ToolCallDelta => entry !== null);
        if (toolCalls.length > 0) {
            delta.tool_calls = toolCalls;
        }
    }
    if (typeof delta.content !== 'string' && !Array.isArray(delta.tool_calls)) {
        return null;
    }
    return delta;
};

const sanitizeDataPayload = (value: unknown): StreamDataPayload | null => {
    if (!isRecord(value) || !Array.isArray(value.choices)) {
        return null;
    }
    const choices: StreamDataPayload['choices'] = [];
    for (let i = 0; i < value.choices.length; i += 1) {
        const choice = value.choices[i];
        if (!isRecord(choice)) {
            continue;
        }
        const delta = sanitizeChoiceDelta(choice.delta);
        if (!delta) {
            continue;
        }
        choices.push({ delta });
    }
    if (choices.length === 0) {
        return null;
    }
    return { choices };
};

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

    const parsed = parseJson(dataStr);
    if (parsed === null) {
        return null;
    }
    return sanitizeDataPayload(parsed);
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
