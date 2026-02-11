/**
 * Real-Time Collaboration Service
 *
 * Server-backed collaboration over HTTP long polling.
 */

export interface CollaborationCursorPosition {
    line: number;
    column: number;
}

export interface CollaborationParticipant {
    id: string;
    name: string;
    isHost: boolean;
    isTyping: boolean;
    cursorPosition?: CollaborationCursorPosition;
    lastSeen: number;
}

export interface CollaborationConversationMessage {
    id: string;
    sessionId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    version: number;
    lastEditedBy?: string;
    hasConflict?: boolean;
}

export type CollaborationEventType =
    | 'session-created'
    | 'participant-joined'
    | 'participant-left'
    | 'participant-updated'
    | 'participant-kicked'
    | 'host-transferred'
    | 'message-added'
    | 'message-edited'
    | 'message-conflict';

export interface CollaborationEvent {
    seq: number;
    sessionId: string;
    type: CollaborationEventType;
    timestamp: number;
    actorId?: string;
    payload: Record<string, unknown>;
}

export interface CollaborationSession {
    id: string;
    name: string;
    hostId: string;
    participants: CollaborationParticipant[];
    messages: CollaborationConversationMessage[];
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    revision: number;
}

export interface CollaborationConfig {
    enabled: boolean;
    baseUrl: string;
    displayName: string;
    pollTimeoutMs: number;
    autoJoin: boolean;
}

interface JoinPayload {
    participantId: string;
    session: CollaborationSession;
    eventCursor: number;
}

interface PollPayload {
    events: CollaborationEvent[];
    cursor: number;
    session: CollaborationSession;
}

export interface CollaborationEditResult {
    conflict: boolean;
    message: CollaborationConversationMessage;
}

interface ServiceState {
    session: CollaborationSession | null;
    participantId: string | null;
    eventCursor: number;
}

const VALID_EVENT_TYPES = new Set<CollaborationEventType>([
    'session-created',
    'participant-joined',
    'participant-left',
    'participant-updated',
    'participant-kicked',
    'host-transferred',
    'message-added',
    'message-edited',
    'message-conflict',
]);
const DEFAULT_COLLABORATION_BASE_URL = 'http://localhost:3000';
const DEFAULT_COLLABORATION_POLL_TIMEOUT_MS = 20000;
const MIN_COLLABORATION_POLL_TIMEOUT_MS = 5000;
const MAX_COLLABORATION_POLL_TIMEOUT_MS = 30000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const normalizeTimestamp = (value: unknown, fallback: number = Date.now()): number => (
    isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : fallback
);

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeCollaborationConfig = (
    value: unknown,
    fallbackDisplayName: string
): CollaborationConfig => {
    const source = isRecord(value) ? value : {};
    const normalizedBaseUrl = sanitizeNonEmptyString(source.baseUrl);
    const baseUrl = normalizedBaseUrl
        ? normalizedBaseUrl.replace(/\/+$/, '')
        : DEFAULT_COLLABORATION_BASE_URL;
    const displayName = sanitizeNonEmptyString(source.displayName)
        || fallbackDisplayName;
    const pollTimeoutMs = isFiniteNumber(source.pollTimeoutMs)
        ? Math.max(
            MIN_COLLABORATION_POLL_TIMEOUT_MS,
            Math.min(MAX_COLLABORATION_POLL_TIMEOUT_MS, Math.floor(source.pollTimeoutMs))
        )
        : DEFAULT_COLLABORATION_POLL_TIMEOUT_MS;

    return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
        baseUrl: baseUrl || DEFAULT_COLLABORATION_BASE_URL,
        displayName,
        pollTimeoutMs,
        autoJoin: typeof source.autoJoin === 'boolean' ? source.autoJoin : false,
    };
};

const sanitizeCursorPosition = (value: unknown): CollaborationCursorPosition | undefined => {
    if (!isRecord(value) || !isFiniteNumber(value.line) || !isFiniteNumber(value.column)) {
        return undefined;
    }
    return {
        line: Math.max(1, Math.floor(value.line)),
        column: Math.max(1, Math.floor(value.column)),
    };
};

const sanitizeParticipant = (value: unknown): CollaborationParticipant | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.name !== 'string'
        || typeof value.isHost !== 'boolean'
        || typeof value.isTyping !== 'boolean'
        || !isFiniteNumber(value.lastSeen)) {
        return null;
    }

    const id = value.id.trim();
    const name = value.name.trim();
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        isHost: value.isHost,
        isTyping: value.isTyping,
        cursorPosition: sanitizeCursorPosition(value.cursorPosition),
        lastSeen: normalizeTimestamp(value.lastSeen, 0),
    };
};

const sanitizeConversationMessage = (value: unknown): CollaborationConversationMessage | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.sessionId !== 'string'
        || typeof value.authorId !== 'string'
        || typeof value.authorName !== 'string'
        || typeof value.content !== 'string'
        || !isFiniteNumber(value.createdAt)
        || !isFiniteNumber(value.updatedAt)
        || !isFiniteNumber(value.version)) {
        return null;
    }

    const id = value.id.trim();
    const sessionId = value.sessionId.trim();
    const authorId = value.authorId.trim();
    const authorName = value.authorName.trim();
    if (!id || !sessionId || !authorId || !authorName) {
        return null;
    }

    return {
        id,
        sessionId,
        authorId,
        authorName,
        content: value.content,
        createdAt: normalizeTimestamp(value.createdAt, 0),
        updatedAt: normalizeTimestamp(value.updatedAt, 0),
        version: Math.max(0, Math.floor(value.version)),
        lastEditedBy: typeof value.lastEditedBy === 'string' ? value.lastEditedBy.trim() : undefined,
        hasConflict: typeof value.hasConflict === 'boolean' ? value.hasConflict : undefined,
    };
};

const sanitizeEvent = (value: unknown): CollaborationEvent | null => {
    if (!isRecord(value)
        || !isFiniteNumber(value.seq)
        || typeof value.sessionId !== 'string'
        || !VALID_EVENT_TYPES.has(value.type as CollaborationEventType)
        || !isFiniteNumber(value.timestamp)
        || !isRecord(value.payload)) {
        return null;
    }

    const sessionId = value.sessionId.trim();
    if (!sessionId) {
        return null;
    }

    return {
        seq: Math.max(0, Math.floor(value.seq)),
        sessionId,
        type: value.type as CollaborationEventType,
        timestamp: normalizeTimestamp(value.timestamp, 0),
        actorId: typeof value.actorId === 'string' ? value.actorId.trim() : undefined,
        payload: { ...value.payload },
    };
};

const sanitizeSession = (value: unknown): CollaborationSession | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.name !== 'string'
        || typeof value.hostId !== 'string'
        || !Array.isArray(value.participants)
        || !Array.isArray(value.messages)
        || !isFiniteNumber(value.createdAt)
        || !isFiniteNumber(value.updatedAt)
        || typeof value.isActive !== 'boolean'
        || !isFiniteNumber(value.revision)) {
        return null;
    }

    const id = value.id.trim();
    const name = value.name.trim();
    const hostId = value.hostId.trim();
    if (!id || !name || !hostId) {
        return null;
    }

    const participants = value.participants
        .map((entry) => sanitizeParticipant(entry))
        .filter((entry): entry is CollaborationParticipant => entry !== null);
    const messages = value.messages
        .map((entry) => sanitizeConversationMessage(entry))
        .filter((entry): entry is CollaborationConversationMessage => entry !== null);

    return {
        id,
        name,
        hostId,
        participants,
        messages,
        createdAt: normalizeTimestamp(value.createdAt, 0),
        updatedAt: normalizeTimestamp(value.updatedAt, 0),
        isActive: value.isActive,
        revision: Math.max(0, Math.floor(value.revision)),
    };
};

const sanitizeJoinPayload = (value: unknown): JoinPayload | null => {
    if (!isRecord(value)
        || typeof value.participantId !== 'string'
        || !isFiniteNumber(value.eventCursor)) {
        return null;
    }
    const participantId = value.participantId.trim();
    const session = sanitizeSession(value.session);
    if (!participantId || !session) {
        return null;
    }
    return {
        participantId,
        session,
        eventCursor: Math.max(0, Math.floor(value.eventCursor)),
    };
};

const sanitizePollPayload = (value: unknown): PollPayload | null => {
    if (!isRecord(value)
        || !Array.isArray(value.events)
        || !isFiniteNumber(value.cursor)) {
        return null;
    }
    const session = sanitizeSession(value.session);
    if (!session) {
        return null;
    }
    return {
        events: value.events
            .map((entry) => sanitizeEvent(entry))
            .filter((entry): entry is CollaborationEvent => entry !== null),
        cursor: Math.max(0, Math.floor(value.cursor)),
        session,
    };
};

const sanitizeEditResult = (value: unknown): CollaborationEditResult | null => {
    if (!isRecord(value) || typeof value.conflict !== 'boolean') {
        return null;
    }
    const message = sanitizeConversationMessage(value.message);
    if (!message) {
        return null;
    }
    return {
        conflict: value.conflict,
        message,
    };
};

class RealTimeCollaborationService {
    private config: CollaborationConfig;
    private readonly STORAGE_KEY = 'collaboration_config';
    private state: ServiceState = {
        session: null,
        participantId: null,
        eventCursor: 0,
    };

    private sessionListeners: Set<(session: CollaborationSession | null) => void> = new Set();
    private eventListeners: Set<(event: CollaborationEvent) => void> = new Set();
    private pollingAbortController: AbortController | null = null;
    private pollingTimer: ReturnType<typeof setTimeout> | null = null;
    private typingTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): CollaborationConfig {
        const fallbackDisplayName = sanitizeNonEmptyString(localStorage.getItem('user_name')) || 'User';
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = parseJson(raw);
                return sanitizeCollaborationConfig(parsed, fallbackDisplayName);
            }
        } catch (error) {
            console.error('Failed to load collaboration config:', error);
        }

        return sanitizeCollaborationConfig(null, fallbackDisplayName);
    }

    saveConfig(partial: Partial<CollaborationConfig>): CollaborationConfig {
        const partialRecord = isRecord(partial) ? partial : {};
        const fallbackDisplayName = sanitizeNonEmptyString(localStorage.getItem('user_name')) || 'User';
        const next = sanitizeCollaborationConfig({
            ...this.config,
            ...partialRecord,
        }, fallbackDisplayName);

        this.config = next;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));
        return { ...this.config };
    }

    getConfig(): CollaborationConfig {
        return { ...this.config };
    }

    getCurrentSession(): CollaborationSession | null {
        return this.state.session;
    }

    getCurrentParticipantId(): string | null {
        return this.state.participantId;
    }

    isCurrentUserHost(): boolean {
        if (!this.state.session || !this.state.participantId) {
            return false;
        }
        return this.state.session.hostId === this.state.participantId;
    }

    private notifySessionUpdate(): void {
        this.sessionListeners.forEach(listener => listener(this.state.session));
    }

    private notifyEvent(event: CollaborationEvent): void {
        this.eventListeners.forEach(listener => listener(event));
    }

    subscribeSession(listener: (session: CollaborationSession | null) => void): () => void {
        this.sessionListeners.add(listener);
        listener(this.state.session);
        return () => this.sessionListeners.delete(listener);
    }

    subscribeEvent(listener: (event: CollaborationEvent) => void): () => void {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${this.config.baseUrl}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers || {}),
            },
        });

        const payload: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = isRecord(payload) && typeof payload.error === 'string'
                ? payload.error
                : `Request failed: ${response.status}`;
            throw new Error(errorMessage);
        }

        return payload as T;
    }

    async createSession(name: string): Promise<CollaborationSession> {
        const createdRaw = await this.request<unknown>('/v1/collaboration/sessions', {
            method: 'POST',
            body: JSON.stringify({
                name,
                hostName: this.config.displayName,
            }),
        });
        const created = sanitizeJoinPayload(createdRaw);
        if (!created) {
            throw new Error('Invalid collaboration create-session response');
        }

        this.state = {
            session: created.session,
            participantId: created.participantId,
            eventCursor: created.eventCursor,
        };
        this.notifySessionUpdate();
        this.startPolling();
        return created.session;
    }

    async joinSession(sessionId: string): Promise<CollaborationSession> {
        const joinedRaw = await this.request<unknown>(`/v1/collaboration/sessions/${encodeURIComponent(sessionId)}/join`, {
            method: 'POST',
            body: JSON.stringify({ name: this.config.displayName }),
        });
        const joined = sanitizeJoinPayload(joinedRaw);
        if (!joined) {
            throw new Error('Invalid collaboration join-session response');
        }

        this.state = {
            session: joined.session,
            participantId: joined.participantId,
            eventCursor: joined.eventCursor,
        };

        this.notifySessionUpdate();
        this.startPolling();
        return joined.session;
    }

    async refreshSession(): Promise<CollaborationSession | null> {
        if (!this.state.session) {
            return null;
        }

        const participantId = this.state.participantId;
        const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';

        const resultRaw = await this.request<unknown>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}${query}`
        );
        const result = isRecord(resultRaw) ? sanitizeSession(resultRaw.session) : null;
        if (!result) {
            throw new Error('Invalid collaboration refresh-session response');
        }

        this.state.session = result;
        this.notifySessionUpdate();
        return result;
    }

    async leaveSession(): Promise<void> {
        if (!this.state.session || !this.state.participantId) {
            this.stopPolling();
            this.state = { session: null, participantId: null, eventCursor: 0 };
            this.notifySessionUpdate();
            return;
        }

        await this.request<{ session: CollaborationSession }>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/leave`,
            {
                method: 'POST',
                body: JSON.stringify({ participantId: this.state.participantId }),
            }
        );

        this.stopPolling();
        this.state = { session: null, participantId: null, eventCursor: 0 };
        this.notifySessionUpdate();
    }

    async sendMessage(content: string): Promise<CollaborationConversationMessage> {
        if (!this.state.session || !this.state.participantId) {
            throw new Error('Join a collaboration session first');
        }

        const resultRaw = await this.request<unknown>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/messages`,
            {
                method: 'POST',
                body: JSON.stringify({
                    participantId: this.state.participantId,
                    content,
                }),
            }
        );
        const message = isRecord(resultRaw) ? sanitizeConversationMessage(resultRaw.message) : null;
        if (!message) {
            throw new Error('Invalid collaboration send-message response');
        }
        return message;
    }

    async editMessage(messageId: string, content: string, baseVersion: number): Promise<CollaborationEditResult> {
        if (!this.state.session || !this.state.participantId) {
            throw new Error('Join a collaboration session first');
        }

        const resultRaw = await this.request<unknown>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/messages/${encodeURIComponent(messageId)}`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    participantId: this.state.participantId,
                    content,
                    baseVersion,
                }),
            }
        );
        const result = sanitizeEditResult(resultRaw);
        if (!result) {
            throw new Error('Invalid collaboration edit-message response');
        }
        return result;
    }

    async kickParticipant(targetParticipantId: string): Promise<CollaborationSession> {
        if (!this.state.session || !this.state.participantId) {
            throw new Error('Join a collaboration session first');
        }

        const resultRaw = await this.request<unknown>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/participants/${encodeURIComponent(targetParticipantId)}/kick`,
            {
                method: 'POST',
                body: JSON.stringify({ requesterId: this.state.participantId }),
            }
        );
        const nextSession = isRecord(resultRaw) ? sanitizeSession(resultRaw.session) : null;
        if (!nextSession) {
            throw new Error('Invalid collaboration kick response');
        }

        this.state.session = nextSession;
        this.notifySessionUpdate();
        return nextSession;
    }

    async updatePresence(options: {
        isTyping?: boolean;
        cursorPosition?: CollaborationCursorPosition;
    }): Promise<void> {
        if (!this.state.session || !this.state.participantId) {
            return;
        }

        await this.request<{ session: CollaborationSession }>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/presence`,
            {
                method: 'POST',
                body: JSON.stringify({
                    participantId: this.state.participantId,
                    isTyping: options.isTyping,
                    cursorPosition: options.cursorPosition,
                }),
            }
        );
    }

    markTyping(): void {
        this.updatePresence({ isTyping: true }).catch(() => undefined);

        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }

        this.typingTimer = setTimeout(() => {
            this.updatePresence({ isTyping: false }).catch(() => undefined);
        }, 1200);
    }

    stopTyping(): void {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        this.updatePresence({ isTyping: false }).catch(() => undefined);
    }

    updateCursor(line: number, column: number): void {
        this.updatePresence({
            cursorPosition: {
                line: Math.max(1, Math.floor(line)),
                column: Math.max(1, Math.floor(column)),
            },
        }).catch(() => undefined);
    }

    private stopPolling(): void {
        if (this.pollingAbortController) {
            this.pollingAbortController.abort();
            this.pollingAbortController = null;
        }

        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    private startPolling(): void {
        this.stopPolling();
        let nextDelayMs = 250;

        const loop = async () => {
            if (!this.state.session || !this.state.participantId) {
                return;
            }

            const controller = new AbortController();
            this.pollingAbortController = controller;

            try {
                const payloadRaw = await this.request<unknown>(
                    `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/events`
                    + `?participantId=${encodeURIComponent(this.state.participantId)}`
                    + `&since=${this.state.eventCursor}`
                    + `&timeoutMs=${this.config.pollTimeoutMs}`,
                    {
                        method: 'GET',
                        signal: controller.signal,
                    }
                );
                const payload = sanitizePollPayload(payloadRaw);
                if (!payload) {
                    throw new Error('Invalid collaboration poll payload');
                }

                this.state.session = payload.session;
                this.state.eventCursor = payload.cursor;
                this.notifySessionUpdate();

                payload.events.forEach(event => this.notifyEvent(event));
                nextDelayMs = 250;
            } catch (error) {
                const typedError = error as Error;
                if (typedError.name !== 'AbortError') {
                    const normalizedMessage = typedError.message.toLowerCase();
                    if (
                        normalizedMessage.includes('participant not found')
                        || normalizedMessage.includes('session not found')
                    ) {
                        this.stopPolling();
                        this.state = { session: null, participantId: null, eventCursor: 0 };
                        this.notifySessionUpdate();
                        return;
                    }
                    console.warn('Collaboration polling failed:', error);
                    nextDelayMs = 1500;
                }
            } finally {
                if (this.pollingAbortController === controller) {
                    this.pollingAbortController = null;
                }
            }

            if (this.state.session && this.state.participantId) {
                this.pollingTimer = setTimeout(loop, nextDelayMs);
            }
        };

        void loop();
    }
}

export const realTimeCollaborationService = new RealTimeCollaborationService();
