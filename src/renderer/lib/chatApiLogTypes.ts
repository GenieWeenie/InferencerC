export interface ChatApiLogEntry {
    id: string;
    timestamp: number;
    type: 'request' | 'response' | 'error';
    model: string;
    request?: unknown;
    response?: unknown;
    error?: string;
    duration?: number;
}

export type ChatApiLogCallback = (log: ChatApiLogEntry) => void;
