import { CloudSyncService } from '../src/server/services/cloudSync';

describe('CloudSyncService', () => {
  test('register/login lifecycle with normalized email and token auth', () => {
    const service = new CloudSyncService();

    const registered = service.register('USER@Example.com', 'password-123');
    expect(registered.email).toBe('user@example.com');

    const authenticated = service.authenticate(registered.token);
    expect(authenticated.id).toBe(registered.accountId);

    service.logout(registered.token);
    expect(() => service.authenticate(registered.token)).toThrow('Unauthorized');

    const loggedIn = service.login('user@example.com', 'password-123');
    expect(loggedIn.accountId).toBe(registered.accountId);
  });

  test('supports selective sync by conversation id', () => {
    const service = new CloudSyncService();
    const auth = service.register('selective@example.com', 'password-123');

    service.sync(auth.accountId, {
      selectedConversationIds: ['conv-a', 'conv-b'],
      push: {
        conversations: [
          { id: 'conv-a', ciphertext: 'cipher-a', hash: 'hash-a' },
          { id: 'conv-b', ciphertext: 'cipher-b', hash: 'hash-b' },
        ],
      },
    });

    const pullOnlyA = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-a'],
      manifest: { conversations: [] },
    });

    expect(pullOnlyA.pull.conversations).toHaveLength(1);
    expect(pullOnlyA.pull.conversations[0].id).toBe('conv-a');
  });

  test('returns conflict for stale baseVersion updates', () => {
    const service = new CloudSyncService();
    const auth = service.register('conflict@example.com', 'password-123');

    const first = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-1'],
      push: {
        conversations: [{ id: 'conv-1', ciphertext: 'cipher-v1', hash: 'hash-v1' }],
      },
    });

    expect(first.accepted.conversations[0].version).toBe(1);

    const second = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-1'],
      push: {
        conversations: [{ id: 'conv-1', ciphertext: 'cipher-v2', hash: 'hash-v2', baseVersion: 1 }],
      },
    });

    expect(second.accepted.conversations[0].version).toBe(2);

    const stale = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-1'],
      push: {
        conversations: [{ id: 'conv-1', ciphertext: 'cipher-stale', hash: 'hash-stale', baseVersion: 1 }],
      },
    });

    expect(stale.accepted.conversations).toHaveLength(0);
    expect(stale.conflicts.conversations).toHaveLength(1);
    expect(stale.conflicts.conversations[0].id).toBe('conv-1');
    expect(stale.conflicts.conversations[0].serverRecord.hash).toBe('hash-v2');
  });

  test('uses manifest hashes to avoid re-downloading unchanged conversations', () => {
    const service = new CloudSyncService();
    const auth = service.register('delta@example.com', 'password-123');

    service.sync(auth.accountId, {
      selectedConversationIds: ['conv-a', 'conv-b'],
      push: {
        conversations: [
          { id: 'conv-a', ciphertext: 'cipher-a', hash: 'hash-a' },
          { id: 'conv-b', ciphertext: 'cipher-b-longer', hash: 'hash-b' },
        ],
      },
    });

    const fullyInSync = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-a', 'conv-b'],
      manifest: {
        conversations: [
          { id: 'conv-a', hash: 'hash-a' },
          { id: 'conv-b', hash: 'hash-b' },
        ],
      },
    });

    expect(fullyInSync.pull.conversations).toHaveLength(0);
    expect(fullyInSync.stats.downloadedBytes).toBe(0);

    const missingOneHash = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-a', 'conv-b'],
      manifest: {
        conversations: [{ id: 'conv-a', hash: 'hash-a' }],
      },
    });

    expect(missingOneHash.pull.conversations).toHaveLength(1);
    expect(missingOneHash.pull.conversations[0].id).toBe('conv-b');
    expect(missingOneHash.stats.downloadedBytes).toBe(missingOneHash.pull.conversations[0].size);
  });

  test('propagates deleted conversation ids when client manifest references removed data', () => {
    const service = new CloudSyncService();
    const auth = service.register('delete@example.com', 'password-123');

    service.sync(auth.accountId, {
      selectedConversationIds: ['conv-delete'],
      push: {
        conversations: [{ id: 'conv-delete', ciphertext: 'cipher-delete', hash: 'hash-delete' }],
      },
    });

    const deleted = service.sync(auth.accountId, {
      selectedConversationIds: ['conv-delete'],
      manifest: {
        conversations: [{ id: 'conv-delete', hash: 'hash-delete' }],
      },
      push: {
        deleteConversationIds: ['conv-delete'],
      },
    });

    expect(deleted.pull.deletedConversationIds).toContain('conv-delete');
  });
});
