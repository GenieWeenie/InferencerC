import { CollaborationService } from '../src/server/services/collaboration';

describe('CollaborationService', () => {
  test('creates session and joins participants', () => {
    const service = new CollaborationService();

    const created = service.createSession('Team Thread', 'Alice');
    expect(created.session.name).toBe('Team Thread');
    expect(created.session.participants).toHaveLength(1);
    expect(created.session.participants[0].isHost).toBe(true);

    const joined = service.joinSession(created.session.id, 'Bob');
    expect(joined.session.participants).toHaveLength(2);
    expect(joined.session.participants.some(p => p.name === 'Bob')).toBe(true);
  });

  test('updates typing and cursor presence', () => {
    const service = new CollaborationService();
    const created = service.createSession('Presence', 'Alice');
    const joined = service.joinSession(created.session.id, 'Bob');

    const updated = service.updatePresence(created.session.id, joined.participantId, {
      isTyping: true,
      cursorPosition: { line: 4, column: 12 },
    });

    const bob = updated.participants.find(p => p.id === joined.participantId);
    expect(bob?.isTyping).toBe(true);
    expect(bob?.cursorPosition).toEqual({ line: 4, column: 12 });
  });

  test('handles edit conflicts with deterministic merge', () => {
    const service = new CollaborationService();
    const created = service.createSession('Conflicts', 'Alice');
    const aliceId = created.participantId;
    const bob = service.joinSession(created.session.id, 'Bob');

    const added = service.addMessage(created.session.id, aliceId, 'Original line');
    const firstEdit = service.editMessage(created.session.id, aliceId, added.id, 'Host edit', 1);
    expect(firstEdit.conflict).toBe(false);
    expect(firstEdit.message.version).toBe(2);

    const conflictEdit = service.editMessage(created.session.id, bob.participantId, added.id, 'Bob edit', 1);
    expect(conflictEdit.conflict).toBe(true);
    expect(conflictEdit.message.version).toBe(3);
    expect(conflictEdit.message.content).toContain('Host edit');
    expect(conflictEdit.message.content).toContain('Bob edit');
    expect(conflictEdit.message.hasConflict).toBe(true);
  });

  test('enforces host-only participant removal', () => {
    const service = new CollaborationService();
    const created = service.createSession('Access', 'Alice');
    const aliceId = created.participantId;
    const bob = service.joinSession(created.session.id, 'Bob');
    const charlie = service.joinSession(created.session.id, 'Charlie');

    expect(() => {
      service.kickParticipant(created.session.id, bob.participantId, charlie.participantId);
    }).toThrow('Only the host can manage participants');

    const updated = service.kickParticipant(created.session.id, aliceId, bob.participantId);
    expect(updated.participants.some(p => p.id === bob.participantId)).toBe(false);
  });

  test('pollEvents returns new events after the provided cursor', async () => {
    const service = new CollaborationService();
    const created = service.createSession('Polling', 'Alice');
    const aliceId = created.participantId;

    const beforeCursor = created.eventCursor;

    const pending = service.pollEvents(created.session.id, aliceId, beforeCursor, 5000);
    setTimeout(() => {
      service.addMessage(created.session.id, aliceId, 'New event message');
    }, 30);

    const polled = await pending;
    expect(polled.events.length).toBeGreaterThan(0);
    expect(polled.events.some(e => e.type === 'message-added')).toBe(true);
  });
});
