export interface Model {
  id: string;
  name: string;
  pathOrUrl: string; // Local path or remote URL
  type: 'local-folder' | 'remote-endpoint';
  contextLength?: number;
  status: 'loaded' | 'unloaded' | 'loading' | 'error';
  adapter: 'mock' | 'lm-studio' | 'llama-cpp'; // Extensible
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // 'text/plain', 'application/json', etc.
  content: string; // The raw text content
}

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  base64: string; // Base64-encoded image data (without data: prefix)
  thumbnailUrl: string; // Data URL for thumbnail display
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string; // Keep as string to minimize breakage, use empty string if null
  attachments?: Attachment[];
  images?: ImageAttachment[]; // For vision/multimodal support
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  n?: number; // Number of generations (batch size)
  stream?: boolean; // We'll support streaming later
}

export interface TopLogprob {
  token: string;
  logprob: number;
  bytes?: number[] | null;
}

export interface TokenLogprob {
  token: string;
  logprob: number;
  top_logprobs?: TopLogprob[];
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: Message;
    finish_reason: string;
    logprobs?: {
      content: TokenLogprob[];
    } | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Internal Server Types
export interface ModelRuntimeAdapter {
  loadModel(model: Model): Promise<void>;
  unloadModel(model: Model): Promise<void>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): Promise<any>;
}

export interface ChatMessage extends Message {
  choices?: {
    message: Message;
    logprobs?: { content: TokenLogprob[] } | null;
    index: number;
    finish_reason?: string;
  }[];
  selectedChoiceIndex?: number;
  isLoading?: boolean;
  generationTime?: number; // Time in milliseconds to generate this response
  collapsedCodeBlocks?: string[]; // Array of code block identifiers that are collapsed
  collapsedSections?: boolean; // Whether the message section itself is collapsed
  wordCount?: number; // Word count for determining if message should be collapsible
}

export interface ChatSession {
  id: string;
  title: string;
  lastModified: number;
  modelId: string;
  messages: ChatMessage[];
  expertMode?: string | null;
  thinkingEnabled?: boolean;
  pinned?: boolean;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  batchSize?: number;
  encrypted?: boolean;
  encryptedHash?: string;
  conversationTree?: any;
  usesTreeStructure?: boolean;
}

// Crash Recovery Types
export interface RecoveryState {
  sessionId: string;
  timestamp: number;
  draftMessage?: string;
  pendingResponse?: boolean;
}
