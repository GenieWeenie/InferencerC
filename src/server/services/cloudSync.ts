import crypto from 'crypto';

interface CloudSyncAccount {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  encryptionSalt: string;
  createdAt: number;
  lastLoginAt: number;
}

interface CloudSyncConversationRecord {
  id: string;
  ciphertext: string;
  hash: string;
  version: number;
  updatedAt: number;
  size: number;
}

interface CloudSyncBlobRecord {
  ciphertext: string;
  hash: string;
  version: number;
  updatedAt: number;
  size: number;
}

interface CloudSyncAccountData {
  conversations: Map<string, CloudSyncConversationRecord>;
  settings: CloudSyncBlobRecord | null;
  templates: CloudSyncBlobRecord | null;
  revision: number;
}

export interface CloudSyncAuthResult {
  token: string;
  accountId: string;
  email: string;
  encryptionSalt: string;
}

export interface CloudSyncConversationManifestEntry {
  id: string;
  hash: string;
}

export interface CloudSyncConversationPushEntry {
  id: string;
  ciphertext: string;
  hash: string;
  baseVersion?: number;
}

export interface CloudSyncBlobPushEntry {
  ciphertext: string;
  hash: string;
  baseVersion?: number;
}

export interface CloudSyncSyncRequest {
  deviceId?: string;
  selectedConversationIds?: string[];
  manifest?: {
    conversations?: CloudSyncConversationManifestEntry[];
    settingsHash?: string;
    templatesHash?: string;
  };
  push?: {
    conversations?: CloudSyncConversationPushEntry[];
    settings?: CloudSyncBlobPushEntry;
    templates?: CloudSyncBlobPushEntry;
    deleteConversationIds?: string[];
  };
}

interface CloudSyncConflictRecord {
  id: string;
  serverRecord: CloudSyncConversationRecord;
}

interface CloudSyncAcceptedConversation {
  id: string;
  version: number;
  hash: string;
}

interface CloudSyncAcceptedBlob {
  version: number;
  hash: string;
}

export interface CloudSyncSyncResponse {
  serverRevision: number;
  serverTime: number;
  pull: {
    conversations: CloudSyncConversationRecord[];
    deletedConversationIds: string[];
    settings: CloudSyncBlobRecord | null;
    templates: CloudSyncBlobRecord | null;
  };
  accepted: {
    conversations: CloudSyncAcceptedConversation[];
    settings: CloudSyncAcceptedBlob | null;
    templates: CloudSyncAcceptedBlob | null;
  };
  conflicts: {
    conversations: CloudSyncConflictRecord[];
    settings: CloudSyncBlobRecord | null;
    templates: CloudSyncBlobRecord | null;
  };
  stats: {
    uploadedBytes: number;
    downloadedBytes: number;
  };
}

export class CloudSyncService {
  private readonly accountsByEmail = new Map<string, CloudSyncAccount>();
  private readonly accountData = new Map<string, CloudSyncAccountData>();
  private readonly tokens = new Map<string, string>();

  register(email: string, password: string): CloudSyncAuthResult {
    const normalizedEmail = this.normalizeEmail(email);
    this.validatePassword(password);

    if (this.accountsByEmail.has(normalizedEmail)) {
      throw new Error('Account already exists');
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const passwordSalt = this.randomBase64(16);
    const encryptionSalt = this.randomBase64(16);

    const account: CloudSyncAccount = {
      id,
      email: normalizedEmail,
      passwordSalt,
      passwordHash: this.hashPassword(password, passwordSalt),
      encryptionSalt,
      createdAt: now,
      lastLoginAt: now,
    };

    this.accountsByEmail.set(normalizedEmail, account);
    this.accountData.set(id, {
      conversations: new Map(),
      settings: null,
      templates: null,
      revision: 1,
    });

    return this.issueToken(account);
  }

  login(email: string, password: string): CloudSyncAuthResult {
    const normalizedEmail = this.normalizeEmail(email);
    const account = this.accountsByEmail.get(normalizedEmail);
    if (!account) {
      throw new Error('Invalid credentials');
    }

    const incomingHash = this.hashPassword(password, account.passwordSalt);
    if (incomingHash !== account.passwordHash) {
      throw new Error('Invalid credentials');
    }

    account.lastLoginAt = Date.now();
    return this.issueToken(account);
  }

  authenticate(token: string): CloudSyncAccount {
    const accountId = this.tokens.get(token);
    if (!accountId) {
      throw new Error('Unauthorized');
    }

    const account = Array.from(this.accountsByEmail.values()).find(entry => entry.id === accountId);
    if (!account) {
      throw new Error('Unauthorized');
    }

    return account;
  }

  logout(token: string): void {
    this.tokens.delete(token);
  }

  getProfile(accountId: string): {
    accountId: string;
    email: string;
    encryptionSalt: string;
    revision: number;
    conversationCount: number;
  } {
    const account = this.requireAccount(accountId);
    const data = this.requireAccountData(accountId);

    return {
      accountId: account.id,
      email: account.email,
      encryptionSalt: account.encryptionSalt,
      revision: data.revision,
      conversationCount: data.conversations.size,
    };
  }

  sync(accountId: string, request: CloudSyncSyncRequest): CloudSyncSyncResponse {
    const data = this.requireAccountData(accountId);

    const selectedIds = new Set(
      (request.selectedConversationIds || [])
        .filter(id => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
    );

    const manifestConversations = new Map<string, string>();
    (request.manifest?.conversations || []).forEach(entry => {
      if (entry && typeof entry.id === 'string' && typeof entry.hash === 'string') {
        manifestConversations.set(entry.id, entry.hash);
      }
    });

    let uploadedBytes = 0;
    let downloadedBytes = 0;

    const acceptedConversations: CloudSyncAcceptedConversation[] = [];
    const conflicts: CloudSyncConflictRecord[] = [];
    let settingsConflict: CloudSyncBlobRecord | null = null;
    let templatesConflict: CloudSyncBlobRecord | null = null;
    let acceptedSettings: CloudSyncAcceptedBlob | null = null;
    let acceptedTemplates: CloudSyncAcceptedBlob | null = null;

    const deletes = request.push?.deleteConversationIds || [];
    deletes.forEach(id => {
      if (data.conversations.delete(id)) {
        data.revision += 1;
      }
    });

    for (const entry of request.push?.conversations || []) {
      if (!selectedIds.has(entry.id)) {
        continue;
      }

      const normalized = this.normalizeConversationPush(entry);
      const existing = data.conversations.get(normalized.id);

      if (!existing) {
        const created: CloudSyncConversationRecord = {
          id: normalized.id,
          ciphertext: normalized.ciphertext,
          hash: normalized.hash,
          version: 1,
          updatedAt: Date.now(),
          size: normalized.ciphertext.length,
        };

        data.conversations.set(normalized.id, created);
        data.revision += 1;
        uploadedBytes += created.size;
        acceptedConversations.push({ id: created.id, version: created.version, hash: created.hash });
        continue;
      }

      if (existing.hash === normalized.hash) {
        acceptedConversations.push({ id: existing.id, version: existing.version, hash: existing.hash });
        continue;
      }

      const hasVersionConflict = typeof normalized.baseVersion === 'number'
        && normalized.baseVersion !== existing.version;

      if (hasVersionConflict) {
        conflicts.push({ id: existing.id, serverRecord: { ...existing } });
        continue;
      }

      existing.ciphertext = normalized.ciphertext;
      existing.hash = normalized.hash;
      existing.version += 1;
      existing.updatedAt = Date.now();
      existing.size = normalized.ciphertext.length;

      data.revision += 1;
      uploadedBytes += existing.size;
      acceptedConversations.push({ id: existing.id, version: existing.version, hash: existing.hash });
    }

    const settingsPush = request.push?.settings;
    if (settingsPush) {
      const normalized = this.normalizeBlobPush(settingsPush);
      const existing = data.settings;

      if (!existing) {
        data.settings = {
          ciphertext: normalized.ciphertext,
          hash: normalized.hash,
          version: 1,
          updatedAt: Date.now(),
          size: normalized.ciphertext.length,
        };
        data.revision += 1;
        uploadedBytes += data.settings.size;
        acceptedSettings = { version: data.settings.version, hash: data.settings.hash };
      } else if (existing.hash === normalized.hash) {
        acceptedSettings = { version: existing.version, hash: existing.hash };
      } else if (typeof normalized.baseVersion === 'number' && normalized.baseVersion !== existing.version) {
        settingsConflict = { ...existing };
      } else {
        existing.ciphertext = normalized.ciphertext;
        existing.hash = normalized.hash;
        existing.version += 1;
        existing.updatedAt = Date.now();
        existing.size = normalized.ciphertext.length;
        data.revision += 1;
        uploadedBytes += existing.size;
        acceptedSettings = { version: existing.version, hash: existing.hash };
      }
    }

    const templatesPush = request.push?.templates;
    if (templatesPush) {
      const normalized = this.normalizeBlobPush(templatesPush);
      const existing = data.templates;

      if (!existing) {
        data.templates = {
          ciphertext: normalized.ciphertext,
          hash: normalized.hash,
          version: 1,
          updatedAt: Date.now(),
          size: normalized.ciphertext.length,
        };
        data.revision += 1;
        uploadedBytes += data.templates.size;
        acceptedTemplates = { version: data.templates.version, hash: data.templates.hash };
      } else if (existing.hash === normalized.hash) {
        acceptedTemplates = { version: existing.version, hash: existing.hash };
      } else if (typeof normalized.baseVersion === 'number' && normalized.baseVersion !== existing.version) {
        templatesConflict = { ...existing };
      } else {
        existing.ciphertext = normalized.ciphertext;
        existing.hash = normalized.hash;
        existing.version += 1;
        existing.updatedAt = Date.now();
        existing.size = normalized.ciphertext.length;
        data.revision += 1;
        uploadedBytes += existing.size;
        acceptedTemplates = { version: existing.version, hash: existing.hash };
      }
    }

    const pullConversations: CloudSyncConversationRecord[] = [];
    const deletedConversationIds: string[] = [];

    selectedIds.forEach(id => {
      const serverRecord = data.conversations.get(id);
      const clientHash = manifestConversations.get(id);

      if (!serverRecord) {
        if (manifestConversations.has(id)) {
          deletedConversationIds.push(id);
        }
        return;
      }

      if (!clientHash || clientHash !== serverRecord.hash) {
        pullConversations.push({ ...serverRecord });
        downloadedBytes += serverRecord.size;
      }
    });

    const settingsHash = request.manifest?.settingsHash;
    const pullSettings = data.settings && settingsHash !== data.settings.hash
      ? { ...data.settings }
      : null;
    if (pullSettings) {
      downloadedBytes += pullSettings.size;
    }

    const templatesHash = request.manifest?.templatesHash;
    const pullTemplates = data.templates && templatesHash !== data.templates.hash
      ? { ...data.templates }
      : null;
    if (pullTemplates) {
      downloadedBytes += pullTemplates.size;
    }

    return {
      serverRevision: data.revision,
      serverTime: Date.now(),
      pull: {
        conversations: pullConversations,
        deletedConversationIds,
        settings: pullSettings,
        templates: pullTemplates,
      },
      accepted: {
        conversations: acceptedConversations,
        settings: acceptedSettings,
        templates: acceptedTemplates,
      },
      conflicts: {
        conversations: conflicts,
        settings: settingsConflict,
        templates: templatesConflict,
      },
      stats: {
        uploadedBytes,
        downloadedBytes,
      },
    };
  }

  private issueToken(account: CloudSyncAccount): CloudSyncAuthResult {
    const token = this.randomBase64(32);
    this.tokens.set(token, account.id);

    return {
      token,
      accountId: account.id,
      email: account.email,
      encryptionSalt: account.encryptionSalt,
    };
  }

  private normalizeEmail(email: string): string {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Valid email is required');
    }
    return normalized;
  }

  private validatePassword(password: string): void {
    if (typeof password !== 'string' || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto
      .createHash('sha256')
      .update(`${salt}:${password}`)
      .digest('hex');
  }

  private randomBase64(size: number): string {
    return crypto.randomBytes(size).toString('base64');
  }

  private requireAccount(accountId: string): CloudSyncAccount {
    const account = Array.from(this.accountsByEmail.values()).find(entry => entry.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private requireAccountData(accountId: string): CloudSyncAccountData {
    const data = this.accountData.get(accountId);
    if (!data) {
      throw new Error('Account data not found');
    }
    return data;
  }

  private normalizeConversationPush(entry: CloudSyncConversationPushEntry): CloudSyncConversationPushEntry {
    if (!entry || typeof entry.id !== 'string' || typeof entry.ciphertext !== 'string' || typeof entry.hash !== 'string') {
      throw new Error('Invalid conversation sync payload');
    }

    const id = entry.id.trim();
    const ciphertext = entry.ciphertext.trim();
    const hash = entry.hash.trim();

    if (!id || !ciphertext || !hash) {
      throw new Error('Invalid conversation sync payload');
    }

    return {
      id,
      ciphertext,
      hash,
      baseVersion: typeof entry.baseVersion === 'number' ? entry.baseVersion : undefined,
    };
  }

  private normalizeBlobPush(entry: CloudSyncBlobPushEntry): CloudSyncBlobPushEntry {
    if (!entry || typeof entry.ciphertext !== 'string' || typeof entry.hash !== 'string') {
      throw new Error('Invalid blob sync payload');
    }

    const ciphertext = entry.ciphertext.trim();
    const hash = entry.hash.trim();
    if (!ciphertext || !hash) {
      throw new Error('Invalid blob sync payload');
    }

    return {
      ciphertext,
      hash,
      baseVersion: typeof entry.baseVersion === 'number' ? entry.baseVersion : undefined,
    };
  }
}
