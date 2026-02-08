import { ChatMessage, ChatSession, Attachment, ImageAttachment, TokenLogprob } from '../../shared/types';
import { simulateLogprobs } from './chatUtils';

export interface GeneratorOptions {
    messageCount?: number;
    includeAttachments?: boolean;
    includeImages?: boolean;
    includeLogprobs?: boolean;
    includeChoices?: boolean;
    averageMessageLength?: number;
    variability?: number;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
    messageCount: 100,
    includeAttachments: false,
    includeImages: false,
    includeLogprobs: false,
    includeChoices: false,
    averageMessageLength: 200,
    variability: 0.5
};

const SAMPLE_TEXTS = [
    "Can you help me understand how this works?",
    "I need assistance with implementing a new feature.",
    "What's the best approach to solve this problem?",
    "Could you explain the concept in more detail?",
    "I'm encountering an error in my code. Here's what I see:",
    "Let me provide you with more context about the situation.",
    "That makes sense. Can you elaborate on the next steps?",
    "I appreciate your help. One more question:",
    "How does this compare to alternative solutions?",
    "What are the potential trade-offs to consider?"
];

const CODE_SNIPPETS = [
    "function calculateSum(a: number, b: number): number { return a + b; }",
    "const result = await fetch('/api/data').then(res => res.json());",
    "interface User { id: string; name: string; email: string; }",
    "export class DataService { constructor(private api: ApiClient) {} }",
    "try { processData(); } catch (error) { handleError(error); }"
];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

function generateRandomText(targetLength: number, variability: number): string {
    const minLength = Math.floor(targetLength * (1 - variability));
    const maxLength = Math.floor(targetLength * (1 + variability));
    const actualLength = randomInt(minLength, maxLength);

    let text = '';
    while (text.length < actualLength) {
        const segment = randomChoice(SAMPLE_TEXTS);
        text += segment + ' ';

        if (Math.random() < 0.2 && text.length < actualLength * 0.8) {
            text += '\n\n' + randomChoice(CODE_SNIPPETS) + '\n\n';
        }
    }

    return text.trim().substring(0, actualLength);
}

function generateAttachment(index: number): Attachment {
    const types = ['text/plain', 'application/json', 'text/markdown', 'text/csv'];
    const content = `Sample attachment content ${index}\n${generateRandomText(100, 0.3)}`;

    return {
        id: `att-${Date.now()}-${index}`,
        name: `attachment-${index}.txt`,
        type: randomChoice(types),
        content
    };
}

function generateImageAttachment(index: number): ImageAttachment {
    const mimeTypes: ('image/png' | 'image/jpeg' | 'image/gif' | 'image/webp')[] = [
        'image/png',
        'image/jpeg',
        'image/webp'
    ];

    // Generate a minimal 1x1 pixel image base64
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const thumbnailUrl = `data:image/png;base64,${base64}`;

    return {
        id: `img-${Date.now()}-${index}`,
        name: `image-${index}.png`,
        mimeType: randomChoice(mimeTypes),
        base64,
        thumbnailUrl
    };
}

function generateChatMessage(index: number, options: GeneratorOptions): ChatMessage {
    const roles: ('user' | 'assistant' | 'system')[] = ['user', 'assistant'];
    const role = index === 0 ? 'system' : (index % 2 === 1 ? 'user' : 'assistant');

    const messageLength = options.averageMessageLength || DEFAULT_OPTIONS.averageMessageLength!;
    const variability = options.variability || DEFAULT_OPTIONS.variability!;
    const content = generateRandomText(messageLength, variability);

    const message: ChatMessage = {
        role,
        content
    };

    if (options.includeAttachments && Math.random() < 0.1) {
        message.attachments = [generateAttachment(index)];
    }

    if (options.includeImages && role === 'user' && Math.random() < 0.05) {
        message.images = [generateImageAttachment(index)];
    }

    if (options.includeLogprobs && role === 'assistant' && Math.random() < 0.3) {
        const logprobs = simulateLogprobs(content.substring(0, 200));
        message.choices = [{
            message: { role, content },
            logprobs: { content: logprobs },
            index: 0,
            finish_reason: 'stop'
        }];
        message.selectedChoiceIndex = 0;
    }

    if (options.includeChoices && role === 'assistant' && Math.random() < 0.2) {
        const choiceCount = randomInt(2, 3);
        message.choices = Array.from({ length: choiceCount }, (_, i) => ({
            message: { role, content: generateRandomText(messageLength, variability) },
            index: i,
            finish_reason: 'stop'
        }));
        message.selectedChoiceIndex = 0;
    }

    if (role === 'assistant' && Math.random() < 0.5) {
        message.generationTime = randomInt(500, 5000);
    }

    return message;
}

export function generateLargeConversation(options: Partial<GeneratorOptions> = {}): ChatMessage[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const messageCount = opts.messageCount || 100;

    const messages: ChatMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
        messages.push(generateChatMessage(i, opts));
    }

    return messages;
}

let sessionCounter = 0;

export function generateChatSession(options: Partial<GeneratorOptions> & {
    title?: string;
    modelId?: string;
    includeSystemPrompt?: boolean;
} = {}): ChatSession {
    const messages = generateLargeConversation(options);
    const now = Date.now();
    const uniqueId = `session-${now}-${sessionCounter++}-${Math.random().toString(36).substring(2, 9)}`;

    return {
        id: uniqueId,
        title: options.title || `Test Conversation (${messages.length} messages)`,
        lastModified: now,
        modelId: options.modelId || 'test-model-v1',
        messages,
        systemPrompt: options.includeSystemPrompt ? 'You are a helpful AI assistant.' : undefined,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2000,
        batchSize: 1,
        pinned: false,
        thinkingEnabled: false
    };
}

export function generateMultipleSessions(count: number, options: Partial<GeneratorOptions> = {}): ChatSession[] {
    const sessions: ChatSession[] = [];

    for (let i = 0; i < count; i++) {
        const sessionOptions = {
            ...options,
            title: `Test Session ${i + 1}`,
            messageCount: randomInt(
                Math.floor((options.messageCount || 100) * 0.5),
                Math.floor((options.messageCount || 100) * 1.5)
            )
        };
        sessions.push(generateChatSession(sessionOptions));
    }

    return sessions;
}

export function generateStressTestData(): {
    small: ChatMessage[];
    medium: ChatMessage[];
    large: ChatMessage[];
    xlarge: ChatMessage[];
} {
    return {
        small: generateLargeConversation({ messageCount: 100 }),
        medium: generateLargeConversation({ messageCount: 500 }),
        large: generateLargeConversation({ messageCount: 1000 }),
        xlarge: generateLargeConversation({ messageCount: 5000 })
    };
}

export function calculateConversationStats(messages: ChatMessage[]): {
    totalMessages: number;
    totalCharacters: number;
    averageMessageLength: number;
    messagesWithAttachments: number;
    messagesWithImages: number;
    messagesWithChoices: number;
} {
    const totalMessages = messages.length;
    const totalCharacters = messages.reduce((sum, m) => sum + m.content.length, 0);
    const averageMessageLength = totalMessages > 0 ? totalCharacters / totalMessages : 0;
    const messagesWithAttachments = messages.filter(m => m.attachments && m.attachments.length > 0).length;
    const messagesWithImages = messages.filter(m => m.images && m.images.length > 0).length;
    const messagesWithChoices = messages.filter(m => m.choices && m.choices.length > 1).length;

    return {
        totalMessages,
        totalCharacters,
        averageMessageLength,
        messagesWithAttachments,
        messagesWithImages,
        messagesWithChoices
    };
}
