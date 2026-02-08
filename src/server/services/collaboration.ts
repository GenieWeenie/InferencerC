import crypto from 'crypto';

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

interface CollaborationSessionRecord {
  id: string;
  name: string;
  hostId: string;
  participants: Map<string, CollaborationParticipant>;
  messages: CollaborationConversationMessage[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  revision: number;
  eventSeq: number;
  events: CollaborationEvent[];
}

interface EventWaiter {
  since: number;
  resolve: (events: CollaborationEvent[]) => void;
  timer: NodeJS.Timeout;
}

export interface CollaborationJoinResult {
  participantId: string;
  session: CollaborationSession;
  eventCursor: number;
}

export interface CollaborationEditResult {
  conflict: boolean;
  message: CollaborationConversationMessage;
}

export class CollaborationService {
  private readonly sessions = new Map<string, CollaborationSessionRecord>();
  private readonly eventWaiters = new Map<string, Set<EventWaiter>>();
  private readonly maxEventsPerSession = 500;

  createSession(name: string, hostName: string): CollaborationJoinResult {
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const hostId = crypto.randomUUID();

    const hostParticipant: CollaborationParticipant = {
      id: hostId,
      name: hostName.trim() || 'Host',
      isHost: true,
      isTyping: false,
      lastSeen: now,
    };

    const session: CollaborationSessionRecord = {
      id: sessionId,
      name: name.trim() || 'Collaboration Session',
      hostId,
      participants: new Map([[hostId, hostParticipant]]),
      messages: [],
      createdAt: now,
      updatedAt: now,
      isActive: true,
      revision: 1,
      eventSeq: 0,
      events: [],
    };

    this.sessions.set(sessionId, session);
    this.pushEvent(session, 'session-created', hostId, {
      sessionName: session.name,
      hostId,
    });

    return {
      participantId: hostId,
      session: this.toSessionSnapshot(session),
      eventCursor: session.eventSeq,
    };
  }

  joinSession(sessionId: string, participantName: string): CollaborationJoinResult {
    const session = this.requireSession(sessionId);
    this.ensureSessionActive(session);

    const now = Date.now();
    const participantId = crypto.randomUUID();
    const participant: CollaborationParticipant = {
      id: participantId,
      name: participantName.trim() || `User-${participantId.slice(0, 6)}`,
      isHost: false,
      isTyping: false,
      lastSeen: now,
    };

    session.participants.set(participantId, participant);
    session.updatedAt = now;
    session.revision += 1;

    this.pushEvent(session, 'participant-joined', participantId, {
      participant,
    });

    return {
      participantId,
      session: this.toSessionSnapshot(session),
      eventCursor: session.eventSeq,
    };
  }

  leaveSession(sessionId: string, participantId: string): CollaborationSession {
    const session = this.requireSession(sessionId);
    const participant = this.requireParticipant(session, participantId);

    session.participants.delete(participantId);
    const now = Date.now();
    session.updatedAt = now;
    session.revision += 1;

    this.pushEvent(session, 'participant-left', participantId, {
      participantId,
      name: participant.name,
    });

    if (session.hostId === participantId && session.participants.size > 0) {
      const nextHost = Array.from(session.participants.values())[0];
      nextHost.isHost = true;
      session.hostId = nextHost.id;
      this.pushEvent(session, 'host-transferred', nextHost.id, {
        hostId: nextHost.id,
        name: nextHost.name,
      });
    }

    if (session.participants.size === 0) {
      session.isActive = false;
    }

    return this.toSessionSnapshot(session);
  }

  getSession(sessionId: string, participantId?: string): CollaborationSession {
    const session = this.requireSession(sessionId);

    if (participantId) {
      this.requireParticipant(session, participantId);
      this.touchParticipant(session, participantId);
    }

    return this.toSessionSnapshot(session);
  }

  updatePresence(
    sessionId: string,
    participantId: string,
    presence: { isTyping?: boolean; cursorPosition?: CollaborationCursorPosition }
  ): CollaborationSession {
    const session = this.requireSession(sessionId);
    const participant = this.requireParticipant(session, participantId);

    if (presence.isTyping !== undefined) {
      participant.isTyping = Boolean(presence.isTyping);
    }

    if (presence.cursorPosition) {
      participant.cursorPosition = {
        line: Math.max(1, Math.floor(presence.cursorPosition.line)),
        column: Math.max(1, Math.floor(presence.cursorPosition.column)),
      };
    }

    this.touchParticipant(session, participantId);
    session.updatedAt = Date.now();
    session.revision += 1;

    this.pushEvent(session, 'participant-updated', participantId, {
      participant,
    });

    return this.toSessionSnapshot(session);
  }

  addMessage(sessionId: string, participantId: string, content: string): CollaborationConversationMessage {
    const session = this.requireSession(sessionId);
    const participant = this.requireParticipant(session, participantId);

    const now = Date.now();
    const message: CollaborationConversationMessage = {
      id: crypto.randomUUID(),
      sessionId,
      authorId: participantId,
      authorName: participant.name,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      hasConflict: false,
    };

    session.messages.push(message);
    session.updatedAt = now;
    session.revision += 1;
    this.touchParticipant(session, participantId);

    this.pushEvent(session, 'message-added', participantId, {
      message,
    });

    return { ...message };
  }

  editMessage(
    sessionId: string,
    participantId: string,
    messageId: string,
    content: string,
    baseVersion: number
  ): CollaborationEditResult {
    const session = this.requireSession(sessionId);
    const participant = this.requireParticipant(session, participantId);
    const message = session.messages.find(item => item.id === messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    const now = Date.now();
    const nextContent = content.trim();
    const hasConflict = Number(baseVersion) !== Number(message.version);

    if (hasConflict) {
      const conflictBanner = `[Conflict merge by ${participant.name} at ${new Date(now).toISOString()}]`;
      message.content = `${message.content}\n\n${conflictBanner}\n${nextContent}`;
      message.hasConflict = true;
      message.version += 1;
      message.lastEditedBy = participantId;
      message.updatedAt = now;

      session.updatedAt = now;
      session.revision += 1;
      this.touchParticipant(session, participantId);

      this.pushEvent(session, 'message-conflict', participantId, {
        message,
        requestedBaseVersion: baseVersion,
      });

      return {
        conflict: true,
        message: { ...message },
      };
    }

    message.content = nextContent;
    message.hasConflict = false;
    message.version += 1;
    message.lastEditedBy = participantId;
    message.updatedAt = now;

    session.updatedAt = now;
    session.revision += 1;
    this.touchParticipant(session, participantId);

    this.pushEvent(session, 'message-edited', participantId, {
      message,
      previousVersion: baseVersion,
    });

    return {
      conflict: false,
      message: { ...message },
    };
  }

  kickParticipant(sessionId: string, requesterId: string, targetParticipantId: string): CollaborationSession {
    const session = this.requireSession(sessionId);
    const requester = this.requireParticipant(session, requesterId);

    if (!requester.isHost || session.hostId !== requesterId) {
      throw new Error('Only the host can manage participants');
    }

    if (targetParticipantId === requesterId) {
      throw new Error('Host cannot remove themselves via kick');
    }

    const target = this.requireParticipant(session, targetParticipantId);
    session.participants.delete(targetParticipantId);
    session.updatedAt = Date.now();
    session.revision += 1;

    this.pushEvent(session, 'participant-kicked', requesterId, {
      participantId: targetParticipantId,
      name: target.name,
    });

    return this.toSessionSnapshot(session);
  }

  async pollEvents(
    sessionId: string,
    participantId: string,
    sinceSeq: number,
    timeoutMs: number = 25000
  ): Promise<{ events: CollaborationEvent[]; cursor: number; session: CollaborationSession }> {
    const session = this.requireSession(sessionId);
    this.requireParticipant(session, participantId);
    this.touchParticipant(session, participantId);

    const immediateEvents = session.events.filter(event => event.seq > sinceSeq);
    if (immediateEvents.length > 0) {
      return {
        events: immediateEvents.map(event => ({ ...event, payload: { ...event.payload } })),
        cursor: session.eventSeq,
        session: this.toSessionSnapshot(session),
      };
    }

    const events = await this.waitForEvents(session, sinceSeq, timeoutMs);
    return {
      events: events.map(event => ({ ...event, payload: { ...event.payload } })),
      cursor: session.eventSeq,
      session: this.toSessionSnapshot(session),
    };
  }

  private async waitForEvents(
    session: CollaborationSessionRecord,
    sinceSeq: number,
    timeoutMs: number
  ): Promise<CollaborationEvent[]> {
    return new Promise(resolve => {
      const existing = this.eventWaiters.get(session.id) || new Set<EventWaiter>();
      const waiter: EventWaiter = {
        since: sinceSeq,
        resolve: (events) => {
          clearTimeout(waiter.timer);
          existing.delete(waiter);
          resolve(events);
        },
        timer: setTimeout(() => {
          existing.delete(waiter);
          resolve([]);
        }, Math.max(1000, Math.min(timeoutMs, 30000))),
      };

      existing.add(waiter);
      this.eventWaiters.set(session.id, existing);
    });
  }

  private pushEvent(
    session: CollaborationSessionRecord,
    type: CollaborationEventType,
    actorId: string | undefined,
    payload: Record<string, unknown>
  ): void {
    session.eventSeq += 1;
    const event: CollaborationEvent = {
      seq: session.eventSeq,
      sessionId: session.id,
      type,
      timestamp: Date.now(),
      actorId,
      payload,
    };

    session.events.push(event);
    if (session.events.length > this.maxEventsPerSession) {
      session.events.splice(0, session.events.length - this.maxEventsPerSession);
    }

    const waiters = this.eventWaiters.get(session.id);
    if (!waiters || waiters.size === 0) {
      return;
    }

    waiters.forEach(waiter => {
      const events = session.events.filter(item => item.seq > waiter.since);
      if (events.length > 0) {
        waiter.resolve(events);
      }
    });
  }

  private toSessionSnapshot(session: CollaborationSessionRecord): CollaborationSession {
    return {
      id: session.id,
      name: session.name,
      hostId: session.hostId,
      participants: Array.from(session.participants.values()).map(participant => ({
        ...participant,
        cursorPosition: participant.cursorPosition
          ? { ...participant.cursorPosition }
          : undefined,
      })),
      messages: session.messages.map(message => ({ ...message })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isActive: session.isActive,
      revision: session.revision,
    };
  }

  private requireSession(sessionId: string): CollaborationSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  private ensureSessionActive(session: CollaborationSessionRecord): void {
    if (!session.isActive) {
      throw new Error('Session is no longer active');
    }
  }

  private requireParticipant(session: CollaborationSessionRecord, participantId: string): CollaborationParticipant {
    const participant = session.participants.get(participantId);
    if (!participant) {
      throw new Error('Participant not found in this session');
    }
    return participant;
  }

  private touchParticipant(session: CollaborationSessionRecord, participantId: string): void {
    const participant = this.requireParticipant(session, participantId);
    participant.lastSeen = Date.now();
  }
}
