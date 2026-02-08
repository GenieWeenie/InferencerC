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
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    enabled: Boolean(parsed.enabled),
                    baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim().length > 0
                        ? parsed.baseUrl.trim().replace(/\/$/, '')
                        : 'http://localhost:3000',
                    displayName: typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0
                        ? parsed.displayName
                        : (localStorage.getItem('user_name') || 'User'),
                    pollTimeoutMs: Number.isFinite(parsed.pollTimeoutMs)
                        ? Math.max(5000, Math.min(30000, Number(parsed.pollTimeoutMs)))
                        : 20000,
                    autoJoin: Boolean(parsed.autoJoin),
                };
            }
        } catch (error) {
            console.error('Failed to load collaboration config:', error);
        }

        return {
            enabled: true,
            baseUrl: 'http://localhost:3000',
            displayName: localStorage.getItem('user_name') || 'User',
            pollTimeoutMs: 20000,
            autoJoin: false,
        };
    }

    saveConfig(partial: Partial<CollaborationConfig>): CollaborationConfig {
        const next: CollaborationConfig = {
            ...this.config,
            ...partial,
        };

        next.baseUrl = next.baseUrl.trim().replace(/\/$/, '') || 'http://localhost:3000';
        next.displayName = next.displayName.trim() || 'User';
        next.pollTimeoutMs = Math.max(5000, Math.min(30000, Number(next.pollTimeoutMs) || 20000));

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

        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
            const errorMessage = typeof payload.error === 'string'
                ? payload.error
                : `Request failed: ${response.status}`;
            throw new Error(errorMessage);
        }

        return payload as T;
    }

    async createSession(name: string): Promise<CollaborationSession> {
        const created = await this.request<JoinPayload>('/v1/collaboration/sessions', {
            method: 'POST',
            body: JSON.stringify({
                name,
                hostName: this.config.displayName,
            }),
        });

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
        const joined = await this.request<JoinPayload>(`/v1/collaboration/sessions/${encodeURIComponent(sessionId)}/join`, {
            method: 'POST',
            body: JSON.stringify({ name: this.config.displayName }),
        });

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

        const result = await this.request<{ session: CollaborationSession }>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}${query}`
        );

        this.state.session = result.session;
        this.notifySessionUpdate();
        return result.session;
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

        const result = await this.request<{ message: CollaborationConversationMessage }>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/messages`,
            {
                method: 'POST',
                body: JSON.stringify({
                    participantId: this.state.participantId,
                    content,
                }),
            }
        );

        return result.message;
    }

    async editMessage(messageId: string, content: string, baseVersion: number): Promise<CollaborationEditResult> {
        if (!this.state.session || !this.state.participantId) {
            throw new Error('Join a collaboration session first');
        }

        return this.request<CollaborationEditResult>(
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
    }

    async kickParticipant(targetParticipantId: string): Promise<CollaborationSession> {
        if (!this.state.session || !this.state.participantId) {
            throw new Error('Join a collaboration session first');
        }

        const result = await this.request<{ session: CollaborationSession }>(
            `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/participants/${encodeURIComponent(targetParticipantId)}/kick`,
            {
                method: 'POST',
                body: JSON.stringify({ requesterId: this.state.participantId }),
            }
        );

        this.state.session = result.session;
        this.notifySessionUpdate();
        return result.session;
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
                const payload = await this.request<PollPayload>(
                    `/v1/collaboration/sessions/${encodeURIComponent(this.state.session.id)}/events`
                    + `?participantId=${encodeURIComponent(this.state.participantId)}`
                    + `&since=${this.state.eventCursor}`
                    + `&timeoutMs=${this.config.pollTimeoutMs}`,
                    {
                        method: 'GET',
                        signal: controller.signal,
                    }
                );

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
