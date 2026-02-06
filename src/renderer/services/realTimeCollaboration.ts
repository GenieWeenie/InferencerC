/**
 * Real-Time Collaboration Service
 *
 * WebRTC-based real-time collaboration
 */

export interface CollaborationSession {
    id: string;
    name: string;
    hostId: string;
    participants: CollaborationParticipant[];
    createdAt: number;
    isActive: boolean;
}

export interface CollaborationParticipant {
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
    isTyping: boolean;
    cursorPosition?: { line: number; column: number };
    selection?: { start: number; end: number };
    lastSeen: number;
}

export interface CollaborationMessage {
    id: string;
    sessionId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type: 'message' | 'edit' | 'cursor' | 'selection' | 'system';
}

export interface CollaborationConfig {
    enabled: boolean;
    signalingServer?: string;
    iceServers?: RTCIceServer[];
    autoJoin?: boolean;
}

export class RealTimeCollaborationService {
    private static instance: RealTimeCollaborationService;
    private readonly STORAGE_KEY = 'collaboration_config';
    private readonly SESSIONS_KEY = 'collaboration_sessions';
    private config: CollaborationConfig;
    private currentSession: CollaborationSession | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private localId: string;
    private listeners: Set<(message: CollaborationMessage) => void> = new Set();

    private constructor() {
        this.config = this.loadConfig();
        this.localId = this.getOrCreateLocalId();
    }

    static getInstance(): RealTimeCollaborationService {
        if (!RealTimeCollaborationService.instance) {
            RealTimeCollaborationService.instance = new RealTimeCollaborationService();
        }
        return RealTimeCollaborationService.instance;
    }

    /**
     * Get or create local participant ID
     */
    private getOrCreateLocalId(): string {
        let id = localStorage.getItem('collaboration_local_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('collaboration_local_id', id);
        }
        return id;
    }

    /**
     * Load configuration
     */
    private loadConfig(): CollaborationConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load collaboration config:', error);
        }

        return {
            enabled: false,
            signalingServer: 'wss://signaling.example.com',
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
            autoJoin: false,
        };
    }

    /**
     * Save configuration
     */
    saveConfig(config: Partial<CollaborationConfig>): void {
        this.config = { ...this.config, ...config };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    }

    /**
     * Get configuration
     */
    getConfig(): CollaborationConfig {
        return { ...this.config };
    }

    /**
     * Create a new collaboration session
     */
    createSession(name: string): CollaborationSession {
        const session: CollaborationSession = {
            id: crypto.randomUUID(),
            name,
            hostId: this.localId,
            participants: [{
                id: this.localId,
                name: this.getLocalName(),
                isHost: true,
                isTyping: false,
                lastSeen: Date.now(),
            }],
            createdAt: Date.now(),
            isActive: true,
        };

        this.currentSession = session;
        this.saveSession(session);
        return session;
    }

    /**
     * Get local participant name
     */
    private getLocalName(): string {
        return localStorage.getItem('user_name') || 'User';
    }

    /**
     * Join a collaboration session
     */
    async joinSession(sessionId: string): Promise<CollaborationSession | null> {
        const session = this.getSession(sessionId);
        if (!session) return null;

        // Add local participant
        const participant: CollaborationParticipant = {
            id: this.localId,
            name: this.getLocalName(),
            isHost: false,
            isTyping: false,
            lastSeen: Date.now(),
        };

        session.participants.push(participant);
        session.isActive = true;
        this.currentSession = session;
        this.saveSession(session);

        // Establish WebRTC connections
        await this.establishConnections(session);

        return session;
    }

    /**
     * Establish WebRTC connections with other participants
     */
    private async establishConnections(session: CollaborationSession): Promise<void> {
        // In a real implementation, this would use WebRTC and signaling server
        // For now, we'll simulate the connection
        session.participants.forEach(participant => {
            if (participant.id !== this.localId) {
                this.createPeerConnection(participant.id);
            }
        });
    }

    /**
     * Create peer connection
     */
    private createPeerConnection(participantId: string): void {
        const pc = new RTCPeerConnection({
            iceServers: this.config.iceServers || [],
        });

        const dataChannel = pc.createDataChannel('collaboration', {
            ordered: true,
        });

        dataChannel.onmessage = (event) => {
            try {
                const message: CollaborationMessage = JSON.parse(event.data);
                this.listeners.forEach(listener => listener(message));
            } catch (error) {
                console.error('Failed to parse collaboration message:', error);
            }
        };

        this.peerConnections.set(participantId, pc);
        this.dataChannels.set(participantId, dataChannel);
    }

    /**
     * Send collaboration message
     */
    sendMessage(content: string, type: CollaborationMessage['type'] = 'message'): void {
        if (!this.currentSession) return;

        const message: CollaborationMessage = {
            id: crypto.randomUUID(),
            sessionId: this.currentSession.id,
            senderId: this.localId,
            senderName: this.getLocalName(),
            content,
            timestamp: Date.now(),
            type,
        };

        // Broadcast to all participants
        this.dataChannels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(message));
            }
        });

        // Also notify local listeners
        this.listeners.forEach(listener => listener(message));
    }

    /**
     * Update cursor position
     */
    updateCursor(line: number, column: number): void {
        this.sendMessage(JSON.stringify({ line, column }), 'cursor');
    }

    /**
     * Update selection
     */
    updateSelection(start: number, end: number): void {
        this.sendMessage(JSON.stringify({ start, end }), 'selection');
    }

    /**
     * Subscribe to collaboration messages
     */
    subscribe(listener: (message: CollaborationMessage) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get current session
     */
    getCurrentSession(): CollaborationSession | null {
        return this.currentSession;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): CollaborationSession | null {
        try {
            const stored = localStorage.getItem(this.SESSIONS_KEY);
            if (stored) {
                const sessions: CollaborationSession[] = JSON.parse(stored);
                return sessions.find(s => s.id === sessionId) || null;
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
        return null;
    }

    /**
     * Save session
     */
    private saveSession(session: CollaborationSession): void {
        try {
            const stored = localStorage.getItem(this.SESSIONS_KEY);
            const sessions: CollaborationSession[] = stored ? JSON.parse(stored) : [];
            const index = sessions.findIndex(s => s.id === session.id);
            if (index >= 0) {
                sessions[index] = session;
            } else {
                sessions.push(session);
            }
            localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    /**
     * Leave current session
     */
    leaveSession(): void {
        if (this.currentSession) {
            this.currentSession.isActive = false;
            this.saveSession(this.currentSession);
        }

        // Close all connections
        this.peerConnections.forEach(pc => pc.close());
        this.dataChannels.forEach(channel => channel.close());
        this.peerConnections.clear();
        this.dataChannels.clear();

        this.currentSession = null;
    }
}

export const realTimeCollaborationService = RealTimeCollaborationService.getInstance();
