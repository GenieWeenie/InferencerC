import { ChatSession } from '../../shared/types';
import { HistoryService } from './history';
import { TemplateService } from './templates';

type EnterpriseComplianceService = typeof import('./enterpriseCompliance')['enterpriseComplianceService'];
type ComplianceEventInput = Parameters<EnterpriseComplianceService['logEvent']>[0];

let enterpriseComplianceServicePromise: Promise<EnterpriseComplianceService> | null = null;

const loadEnterpriseComplianceService = async (): Promise<EnterpriseComplianceService> => {
    if (!enterpriseComplianceServicePromise) {
        enterpriseComplianceServicePromise = import('./enterpriseCompliance').then((mod) => mod.enterpriseComplianceService);
    }
    return enterpriseComplianceServicePromise;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const normalizeTimestamp = (value: unknown, fallback: number = 0): number => (
    isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : fallback
);

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const parseStringRecord = (raw: string): Record<string, string> | null => {
    const parsed = parseJson(raw);
    if (!isRecord(parsed)) return null;
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
            record[key] = value;
        }
    }
    return record;
};

const parseChatSession = (raw: string): ChatSession | null => {
    const parsed = parseJson(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.id !== 'string'
        || typeof parsed.title !== 'string'
        || typeof parsed.modelId !== 'string'
        || !isFiniteNumber(parsed.lastModified)) {
        return null;
    }
    if (!Array.isArray(parsed.messages)) {
        return null;
    }
    return {
        ...(parsed as ChatSession),
        id: parsed.id.trim(),
        title: parsed.title.trim() || 'Recovered Conversation',
        modelId: parsed.modelId.trim(),
        lastModified: normalizeTimestamp(parsed.lastModified, Date.now()),
        messages: parsed.messages,
    };
};

type EncryptedPayload = { v: number; iv: string; ct: string };

const parseEncryptedPayload = (ciphertext: string): EncryptedPayload | null => {
    const parsed = parseJson(ciphertext);
    if (!isRecord(parsed)) return null;
    if (!Number.isInteger(parsed.v)
        || parsed.v <= 0
        || typeof parsed.iv !== 'string'
        || typeof parsed.ct !== 'string') {
        return null;
    }
    const iv = parsed.iv.trim();
    const ct = parsed.ct.trim();
    if (!iv || !ct) {
        return null;
    }
    return { v: parsed.v, iv, ct };
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const output: string[] = [];
    for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'string') {
            continue;
        }
        const item = value[i].trim();
        if (!item || output.includes(item)) {
            continue;
        }
        output.push(item);
    }
    return output;
};

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeSyncItemState = (value: unknown): SyncItemState | null => {
    if (!isRecord(value)
        || !isFiniteNumber(value.serverVersion)
        || typeof value.lastSyncedHash !== 'string') {
        return null;
    }
    const lastSyncedHash = value.lastSyncedHash.trim();
    if (!lastSyncedHash) {
        return null;
    }
    return {
        serverVersion: Math.max(0, Math.floor(value.serverVersion)),
        lastSyncedHash,
    };
};

const sanitizeCloudSyncState = (
    value: unknown,
    accountId: string
): CloudSyncState => {
    if (!isRecord(value)) {
        return {
            accountId,
            lastSyncedAt: 0,
            conversations: {},
        };
    }

    const conversations: Record<string, SyncItemState> = {};
    if (isRecord(value.conversations)) {
        Object.entries(value.conversations).forEach(([sessionId, item]) => {
            if (!sessionId.trim()) {
                return;
            }
            const sanitized = sanitizeSyncItemState(item);
            if (!sanitized) {
                return;
            }
            conversations[sessionId] = sanitized;
        });
    }

    return {
        accountId: typeof value.accountId === 'string' && value.accountId.trim()
            ? value.accountId.trim()
            : accountId,
        lastSyncedAt: normalizeTimestamp(value.lastSyncedAt, 0),
        conversations,
        settings: sanitizeSyncItemState(value.settings) || undefined,
        templates: sanitizeSyncItemState(value.templates) || undefined,
    };
};

const sanitizeConversationRecord = (value: unknown): CloudSyncConversationRecord | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.ciphertext !== 'string'
        || typeof value.hash !== 'string'
        || !isFiniteNumber(value.version)
        || !isFiniteNumber(value.updatedAt)
        || !isFiniteNumber(value.size)) {
        return null;
    }

    const id = value.id.trim();
    const ciphertext = value.ciphertext.trim();
    const hash = value.hash.trim();
    if (!id || !ciphertext || !hash) {
        return null;
    }

    return {
        id,
        ciphertext,
        hash,
        version: Math.max(0, Math.floor(value.version)),
        updatedAt: normalizeTimestamp(value.updatedAt, 0),
        size: Math.max(0, Math.floor(value.size)),
    };
};

const sanitizeBlobRecord = (value: unknown): CloudSyncBlobRecord | null => {
    if (!isRecord(value)
        || typeof value.ciphertext !== 'string'
        || typeof value.hash !== 'string'
        || !isFiniteNumber(value.version)
        || !isFiniteNumber(value.updatedAt)
        || !isFiniteNumber(value.size)) {
        return null;
    }

    const ciphertext = value.ciphertext.trim();
    const hash = value.hash.trim();
    if (!ciphertext || !hash) {
        return null;
    }

    return {
        ciphertext,
        hash,
        version: Math.max(0, Math.floor(value.version)),
        updatedAt: normalizeTimestamp(value.updatedAt, 0),
        size: Math.max(0, Math.floor(value.size)),
    };
};

const sanitizeCloudSyncSyncResponse = (value: unknown): CloudSyncSyncResponse | null => {
    if (!isRecord(value)
        || !isFiniteNumber(value.serverRevision)
        || !isFiniteNumber(value.serverTime)
        || !isRecord(value.pull)
        || !isRecord(value.accepted)
        || !isRecord(value.conflicts)
        || !isRecord(value.stats)) {
        return null;
    }

    const pullConversations = Array.isArray(value.pull.conversations)
        ? value.pull.conversations
            .map((entry) => sanitizeConversationRecord(entry))
            .filter((entry): entry is CloudSyncConversationRecord => entry !== null)
        : [];
    const deletedConversationIds = sanitizeStringArray(value.pull.deletedConversationIds);

    const acceptedConversations = Array.isArray(value.accepted.conversations)
        ? value.accepted.conversations
            .map((entry) => {
                if (!isRecord(entry)
                    || typeof entry.id !== 'string'
                    || !isFiniteNumber(entry.version)
                    || typeof entry.hash !== 'string') {
                    return null;
                }
                const id = entry.id.trim();
                const hash = entry.hash.trim();
                if (!id || !hash) {
                    return null;
                }
                return {
                    id,
                    version: Math.max(0, Math.floor(entry.version)),
                    hash,
                };
            })
            .filter((entry): entry is { id: string; version: number; hash: string } => entry !== null)
        : [];

    const sanitizeAcceptedBlob = (
        blobValue: unknown
    ): { version: number; hash: string } | null => {
        if (!isRecord(blobValue)
            || !isFiniteNumber(blobValue.version)
            || typeof blobValue.hash !== 'string') {
            return null;
        }
        const hash = blobValue.hash.trim();
        if (!hash) {
            return null;
        }
        return {
            version: Math.max(0, Math.floor(blobValue.version)),
            hash,
        };
    };

    const conflictConversations = Array.isArray(value.conflicts.conversations)
        ? value.conflicts.conversations
            .map((entry) => {
                if (!isRecord(entry) || typeof entry.id !== 'string') {
                    return null;
                }
                const id = entry.id.trim();
                const serverRecord = sanitizeConversationRecord(entry.serverRecord);
                if (!id || !serverRecord) {
                    return null;
                }
                return { id, serverRecord };
            })
            .filter((entry): entry is { id: string; serverRecord: CloudSyncConversationRecord } => entry !== null)
        : [];

    if (!isFiniteNumber(value.stats.uploadedBytes) || !isFiniteNumber(value.stats.downloadedBytes)) {
        return null;
    }

    return {
        serverRevision: Math.max(0, Math.floor(value.serverRevision)),
        serverTime: normalizeTimestamp(value.serverTime, 0),
        pull: {
            conversations: pullConversations,
            deletedConversationIds,
            settings: sanitizeBlobRecord(value.pull.settings),
            templates: sanitizeBlobRecord(value.pull.templates),
        },
        accepted: {
            conversations: acceptedConversations,
            settings: sanitizeAcceptedBlob(value.accepted.settings),
            templates: sanitizeAcceptedBlob(value.accepted.templates),
        },
        conflicts: {
            conversations: conflictConversations,
            settings: sanitizeBlobRecord(value.conflicts.settings),
            templates: sanitizeBlobRecord(value.conflicts.templates),
        },
        stats: {
            uploadedBytes: Math.max(0, Math.floor(value.stats.uploadedBytes)),
            downloadedBytes: Math.max(0, Math.floor(value.stats.downloadedBytes)),
        },
    };
};

const logComplianceEvent = (event: ComplianceEventInput): void => {
    void loadEnterpriseComplianceService()
        .then((service) => service.logEvent(event))
        .catch(() => {
            // Non-blocking compliance logging.
        });
};

interface CloudSyncAuthResponse {
    token: string;
    accountId: string;
    email: string;
    encryptionSalt: string;
}

export interface CloudSyncProfileResponse {
    accountId: string;
    email: string;
    encryptionSalt: string;
    revision: number;
    conversationCount: number;
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

interface CloudSyncSyncResponse {
    serverRevision: number;
    serverTime: number;
    pull: {
        conversations: CloudSyncConversationRecord[];
        deletedConversationIds: string[];
        settings: CloudSyncBlobRecord | null;
        templates: CloudSyncBlobRecord | null;
    };
    accepted: {
        conversations: Array<{ id: string; version: number; hash: string }>;
        settings: { version: number; hash: string } | null;
        templates: { version: number; hash: string } | null;
    };
    conflicts: {
        conversations: Array<{ id: string; serverRecord: CloudSyncConversationRecord }>;
        settings: CloudSyncBlobRecord | null;
        templates: CloudSyncBlobRecord | null;
    };
    stats: {
        uploadedBytes: number;
        downloadedBytes: number;
    };
}

interface SyncItemState {
    serverVersion: number;
    lastSyncedHash: string;
}

interface CloudSyncState {
    accountId: string;
    lastSyncedAt: number;
    conversations: Record<string, SyncItemState>;
    settings?: SyncItemState;
    templates?: SyncItemState;
}

export interface CloudSyncConfig {
    enabled: boolean;
    baseUrl: string;
    token?: string;
    accountId?: string;
    email?: string;
    encryptionSalt?: string;
    deviceId: string;
    syncSettings: boolean;
    syncTemplates: boolean;
    selectedConversationIds: string[];
}

export interface CloudSyncSummary {
    uploadedConversations: number;
    downloadedConversations: number;
    conflictsResolved: number;
    uploadedBytes: number;
    downloadedBytes: number;
    serverRevision: number;
    syncedAt: number;
}

export interface CloudSyncStatus {
    lastSyncedAt: number;
    syncedConversationCount: number;
    syncedSettings: boolean;
    syncedTemplates: boolean;
}

const CONFIG_KEY = 'cloud_sync_config_v1';
const STATE_PREFIX = 'cloud_sync_state_v1_';
const DEFAULT_CLOUD_SYNC_BASE_URL = 'http://localhost:3000';
const generateCloudSyncDeviceId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `cloud-sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const sanitizeCloudSyncConfig = (
    value: unknown,
    fallbackDeviceId?: string
): CloudSyncConfig => {
    const source = isRecord(value) ? value : {};
    const normalizedBaseUrl = sanitizeNonEmptyString(source.baseUrl);
    const deviceId = sanitizeNonEmptyString(source.deviceId) || fallbackDeviceId || generateCloudSyncDeviceId();

    return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
        baseUrl: (normalizedBaseUrl ? normalizedBaseUrl.replace(/\/+$/, '') : DEFAULT_CLOUD_SYNC_BASE_URL)
            || DEFAULT_CLOUD_SYNC_BASE_URL,
        token: sanitizeNonEmptyString(source.token) || undefined,
        accountId: sanitizeNonEmptyString(source.accountId) || undefined,
        email: sanitizeNonEmptyString(source.email) || undefined,
        encryptionSalt: sanitizeNonEmptyString(source.encryptionSalt) || undefined,
        deviceId,
        syncSettings: typeof source.syncSettings === 'boolean' ? source.syncSettings : true,
        syncTemplates: typeof source.syncTemplates === 'boolean' ? source.syncTemplates : true,
        selectedConversationIds: sanitizeStringArray(source.selectedConversationIds),
    };
};

const SETTINGS_KEYS = [
    'app_theme',
    'app_chat_font_size',
    'app_layout_mode',
    'notion_database_id',
    'slack_config',
    'discord_config',
    'email_config',
    'calendar_config',
] as const;

class CloudSyncService {
    private config: CloudSyncConfig;
    private cachedPassphrase: string | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): CloudSyncConfig {
        const fallbackDeviceId = generateCloudSyncDeviceId();
        try {
            const raw = localStorage.getItem(CONFIG_KEY);
            if (raw) {
                const parsedUnknown = parseJson(raw);
                return sanitizeCloudSyncConfig(parsedUnknown, fallbackDeviceId);
            }
        } catch (error) {
            console.error('Failed to load cloud sync config:', error);
        }

        return sanitizeCloudSyncConfig(null, fallbackDeviceId);
    }

    private saveConfig(): void {
        this.config = sanitizeCloudSyncConfig(this.config, this.config.deviceId);
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    }

    getConfig(): CloudSyncConfig {
        return {
            ...this.config,
            selectedConversationIds: [...this.config.selectedConversationIds],
        };
    }

    updateConfig(partial: Partial<CloudSyncConfig>): CloudSyncConfig {
        const partialRecord = isRecord(partial) ? partial : {};
        this.config = sanitizeCloudSyncConfig(
            {
                ...this.config,
                ...partialRecord,
            },
            this.config.deviceId
        );
        this.saveConfig();
        return this.getConfig();
    }

    setPassphrase(passphrase: string): void {
        this.cachedPassphrase = passphrase;
    }

    clearPassphrase(): void {
        this.cachedPassphrase = null;
    }

    isAuthenticated(): boolean {
        return Boolean(this.config.token && this.config.accountId && this.config.encryptionSalt);
    }

    private authHeaders(): Record<string, string> {
        if (!this.config.token) {
            throw new Error('Cloud sync account is not authenticated');
        }
        return {
            Authorization: `Bearer ${this.config.token}`,
        };
    }

    private async request<T>(path: string, init?: RequestInit, includeAuth: boolean = false): Promise<T> {
        const response = await fetch(`${this.config.baseUrl}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(includeAuth ? this.authHeaders() : {}),
                ...(init?.headers || {}),
            },
        });

        const payload: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = isRecord(payload) && typeof payload.error === 'string'
                ? payload.error
                : `Request failed (${response.status})`;
            throw new Error(message);
        }

        return payload as T;
    }

    async register(email: string, password: string): Promise<CloudSyncAuthResponse> {
        try {
            const result = await this.request<CloudSyncAuthResponse>('/v1/cloud-sync/register', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            this.config.token = result.token;
            this.config.accountId = result.accountId;
            this.config.email = result.email;
            this.config.encryptionSalt = result.encryptionSalt;
            this.saveConfig();

            logComplianceEvent({
                category: 'cloudsync.auth',
                action: 'register',
                result: 'success',
                resourceType: 'cloud-account',
                resourceId: result.accountId,
                details: { email: result.email },
                piiFields: ['email'],
            });

            return result;
        } catch (error: unknown) {
            logComplianceEvent({
                category: 'cloudsync.auth',
                action: 'register',
                result: 'failure',
                details: { email, error: getErrorMessage(error, 'Unknown error') },
                piiFields: ['email'],
            });
            throw error;
        }
    }

    async login(email: string, password: string): Promise<CloudSyncAuthResponse> {
        try {
            const result = await this.request<CloudSyncAuthResponse>('/v1/cloud-sync/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            this.config.token = result.token;
            this.config.accountId = result.accountId;
            this.config.email = result.email;
            this.config.encryptionSalt = result.encryptionSalt;
            this.saveConfig();

            logComplianceEvent({
                category: 'cloudsync.auth',
                action: 'login',
                result: 'success',
                resourceType: 'cloud-account',
                resourceId: result.accountId,
                details: { email: result.email },
                piiFields: ['email'],
            });

            return result;
        } catch (error: unknown) {
            logComplianceEvent({
                category: 'cloudsync.auth',
                action: 'login',
                result: 'failure',
                details: { email, error: getErrorMessage(error, 'Unknown error') },
                piiFields: ['email'],
            });
            throw error;
        }
    }

    async logout(): Promise<void> {
        if (this.config.token) {
            await this.request('/v1/cloud-sync/logout', { method: 'POST' }, true).catch(() => undefined);
        }

        this.config.token = undefined;
        this.config.accountId = undefined;
        this.config.email = undefined;
        this.config.encryptionSalt = undefined;
        this.cachedPassphrase = null;
        this.saveConfig();
        logComplianceEvent({
            category: 'cloudsync.auth',
            action: 'logout',
            result: 'info',
            details: {},
        });
    }

    async getProfile(): Promise<CloudSyncProfileResponse> {
        if (!this.isAuthenticated()) {
            throw new Error('Cloud sync account is not authenticated');
        }
        try {
            const profile = await this.request<CloudSyncProfileResponse>('/v1/cloud-sync/profile', undefined, true);
            logComplianceEvent({
                category: 'cloudsync.profile',
                action: 'read',
                result: 'success',
                resourceType: 'cloud-account',
                resourceId: profile.accountId,
                details: { conversationCount: profile.conversationCount, revision: profile.revision },
            });
            return profile;
        } catch (error: unknown) {
            logComplianceEvent({
                category: 'cloudsync.profile',
                action: 'read',
                result: 'failure',
                details: { error: getErrorMessage(error, 'Unknown error') },
            });
            throw error;
        }
    }

    getSyncStatus(): CloudSyncStatus | null {
        if (!this.isAuthenticated()) {
            return null;
        }

        const state = this.loadState();
        return {
            lastSyncedAt: state.lastSyncedAt,
            syncedConversationCount: Object.keys(state.conversations).length,
            syncedSettings: Boolean(state.settings),
            syncedTemplates: Boolean(state.templates),
        };
    }

    private getStateKey(): string {
        const accountId = this.config.accountId;
        if (!accountId) {
            throw new Error('Cloud sync account is not authenticated');
        }
        return `${STATE_PREFIX}${accountId}`;
    }

    private loadState(): CloudSyncState {
        const key = this.getStateKey();
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = parseJson(raw);
                return sanitizeCloudSyncState(parsed, this.config.accountId!);
            }
        } catch (error) {
            console.error('Failed to load cloud sync state:', error);
        }

        return {
            accountId: this.config.accountId!,
            lastSyncedAt: 0,
            conversations: {},
        };
    }

    private saveState(state: CloudSyncState): void {
        const sanitized = sanitizeCloudSyncState(state, this.config.accountId!);
        localStorage.setItem(this.getStateKey(), JSON.stringify(sanitized));
    }

    private base64Encode(bytes: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64Decode(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    private async sha256Base64(text: string): Promise<string> {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return this.base64Encode(new Uint8Array(digest));
    }

    private async deriveEncryptionKey(passphrase: string): Promise<CryptoKey> {
        if (!this.config.encryptionSalt) {
            throw new Error('Missing encryption salt from cloud account');
        }

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                hash: 'SHA-256',
                salt: this.base64Decode(this.config.encryptionSalt),
                iterations: 250000,
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: 256,
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    private async encryptPayload(plaintext: string, passphrase: string): Promise<string> {
        const key = await this.deriveEncryptionKey(passphrase);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(plaintext)
        );

        return JSON.stringify({
            v: 1,
            iv: this.base64Encode(iv),
            ct: this.base64Encode(new Uint8Array(encrypted)),
        });
    }

    private async decryptPayload(ciphertext: string, passphrase: string): Promise<string> {
        const parsed = parseEncryptedPayload(ciphertext);
        if (!parsed || parsed.v !== 1 || !parsed.iv || !parsed.ct) {
            throw new Error('Invalid encrypted payload');
        }

        const key = await this.deriveEncryptionKey(passphrase);
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: this.base64Decode(parsed.iv),
            },
            key,
            this.base64Decode(parsed.ct)
        );

        return new TextDecoder().decode(decrypted);
    }

    private getSelectedSessionIds(): string[] {
        if (this.config.selectedConversationIds.length > 0) {
            return [...this.config.selectedConversationIds];
        }

        return HistoryService.getAllSessions().map(session => session.id);
    }

    private readSyncableSettings(): Record<string, string> {
        const settings: Record<string, string> = {};

        SETTINGS_KEYS.forEach((key) => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                settings[key] = value;
            }
        });

        return settings;
    }

    private applySyncableSettings(settings: Record<string, string>): void {
        Object.entries(settings).forEach(([key, value]) => {
            if ((SETTINGS_KEYS as readonly string[]).includes(key)) {
                localStorage.setItem(key, value);
            }
        });
    }

    private serializeSession(session: ChatSession): string {
        return JSON.stringify(session);
    }

    private createConflictSessionCopy(source: ChatSession): ChatSession {
        return {
            ...source,
            id: crypto.randomUUID(),
            title: `${source.title} (Local Conflict)` ,
            lastModified: Date.now(),
        };
    }

    async syncNow(passphraseInput?: string): Promise<CloudSyncSummary> {
        if (!this.isAuthenticated()) {
            throw new Error('Cloud sync account is not authenticated');
        }

        const passphrase = (passphraseInput || this.cachedPassphrase || '').trim();
        if (!passphrase) {
            throw new Error('Encryption passphrase is required for sync');
        }

        this.cachedPassphrase = passphrase;

        const state = this.loadState();
        const selectedSessionIds = this.getSelectedSessionIds();
        const selectedSessionIdSet = new Set(selectedSessionIds);

        const localSessions = new Map<string, ChatSession>();
        const sessionManifest: Array<{ id: string; hash: string }> = [];
        const pushConversations: Array<{ id: string; ciphertext: string; hash: string; baseVersion?: number }> = [];
        const deleteConversationIds =
            this.config.selectedConversationIds.length > 0
                ? Object.keys(state.conversations).filter(id => !selectedSessionIdSet.has(id))
                : [];

        for (const sessionId of selectedSessionIds) {
            const session = HistoryService.getSession(sessionId);
            if (!session) continue;

            localSessions.set(sessionId, session);
            const serialized = this.serializeSession(session);
            const hash = await this.sha256Base64(serialized);
            sessionManifest.push({ id: sessionId, hash });

            const previous = state.conversations[sessionId];
            if (!previous || previous.lastSyncedHash !== hash) {
                pushConversations.push({
                    id: sessionId,
                    ciphertext: await this.encryptPayload(serialized, passphrase),
                    hash,
                    baseVersion: previous?.serverVersion,
                });
            }
        }

        let settingsHash: string | undefined;
        let templatesHash: string | undefined;

        let pushSettings: { ciphertext: string; hash: string; baseVersion?: number } | undefined;
        let pushTemplates: { ciphertext: string; hash: string; baseVersion?: number } | undefined;

        if (this.config.syncSettings) {
            const settingsData = this.readSyncableSettings();
            const settingsJson = JSON.stringify(settingsData);
            settingsHash = await this.sha256Base64(settingsJson);

            if (!state.settings || state.settings.lastSyncedHash !== settingsHash) {
                pushSettings = {
                    ciphertext: await this.encryptPayload(settingsJson, passphrase),
                    hash: settingsHash,
                    baseVersion: state.settings?.serverVersion,
                };
            }
        }

        if (this.config.syncTemplates) {
            const templatesJson = TemplateService.exportTemplates();
            templatesHash = await this.sha256Base64(templatesJson);

            if (!state.templates || state.templates.lastSyncedHash !== templatesHash) {
                pushTemplates = {
                    ciphertext: await this.encryptPayload(templatesJson, passphrase),
                    hash: templatesHash,
                    baseVersion: state.templates?.serverVersion,
                };
            }
        }

        const rawSyncResponse = await this.request<unknown>(
            '/v1/cloud-sync/sync',
            {
                method: 'POST',
                body: JSON.stringify({
                    deviceId: this.config.deviceId,
                    selectedConversationIds: selectedSessionIds,
                    manifest: {
                        conversations: sessionManifest,
                        settingsHash,
                        templatesHash,
                    },
                    push: {
                        conversations: pushConversations,
                        settings: pushSettings,
                        templates: pushTemplates,
                        deleteConversationIds,
                    },
                }),
            },
            true
        );
        const response = sanitizeCloudSyncSyncResponse(rawSyncResponse);
        if (!response) {
            throw new Error('Invalid cloud sync response payload');
        }

        let conflictsResolved = 0;

        for (const conflict of response.conflicts.conversations) {
            const localSession = localSessions.get(conflict.id);
            if (localSession) {
                const localCopy = this.createConflictSessionCopy(localSession);
                HistoryService.saveSession(localCopy);
            }

            const decrypted = await this.decryptPayload(conflict.serverRecord.ciphertext, passphrase);
            const remoteSession = parseChatSession(decrypted);
            if (!remoteSession) {
                continue;
            }
            remoteSession.id = conflict.id;
            HistoryService.saveSession(remoteSession);
            state.conversations[conflict.id] = {
                serverVersion: conflict.serverRecord.version,
                lastSyncedHash: conflict.serverRecord.hash,
            };
            conflictsResolved += 1;
        }

        for (const remote of response.pull.conversations) {
            const decrypted = await this.decryptPayload(remote.ciphertext, passphrase);
            const remoteSession = parseChatSession(decrypted);
            if (!remoteSession) {
                continue;
            }
            remoteSession.id = remote.id;
            HistoryService.saveSession(remoteSession);
            state.conversations[remote.id] = {
                serverVersion: remote.version,
                lastSyncedHash: remote.hash,
            };
        }

        response.pull.deletedConversationIds.forEach(id => {
            delete state.conversations[id];
            if (selectedSessionIdSet.has(id)) {
                HistoryService.deleteSession(id);
            }
        });

        response.accepted.conversations.forEach(item => {
            state.conversations[item.id] = {
                serverVersion: item.version,
                lastSyncedHash: item.hash,
            };
        });

        if (this.config.syncSettings) {
            if (response.conflicts.settings) {
                const decrypted = await this.decryptPayload(response.conflicts.settings.ciphertext, passphrase);
                const settingsObj = parseStringRecord(decrypted);
                if (!settingsObj) {
                    throw new Error('Invalid synced settings payload');
                }
                this.applySyncableSettings(settingsObj);
                state.settings = {
                    serverVersion: response.conflicts.settings.version,
                    lastSyncedHash: response.conflicts.settings.hash,
                };
                conflictsResolved += 1;
            } else if (response.pull.settings) {
                const decrypted = await this.decryptPayload(response.pull.settings.ciphertext, passphrase);
                const settingsObj = parseStringRecord(decrypted);
                if (!settingsObj) {
                    throw new Error('Invalid synced settings payload');
                }
                this.applySyncableSettings(settingsObj);
                state.settings = {
                    serverVersion: response.pull.settings.version,
                    lastSyncedHash: response.pull.settings.hash,
                };
            } else if (response.accepted.settings) {
                state.settings = {
                    serverVersion: response.accepted.settings.version,
                    lastSyncedHash: response.accepted.settings.hash,
                };
            }
        }

        if (this.config.syncTemplates) {
            if (response.conflicts.templates) {
                const decrypted = await this.decryptPayload(response.conflicts.templates.ciphertext, passphrase);
                const imported = TemplateService.importTemplates(decrypted);
                if (imported.errors.length > 0) {
                    console.warn('Template conflict import warnings:', imported.errors);
                }
                state.templates = {
                    serverVersion: response.conflicts.templates.version,
                    lastSyncedHash: response.conflicts.templates.hash,
                };
                conflictsResolved += 1;
            } else if (response.pull.templates) {
                const decrypted = await this.decryptPayload(response.pull.templates.ciphertext, passphrase);
                const imported = TemplateService.importTemplates(decrypted);
                if (imported.errors.length > 0) {
                    console.warn('Template import warnings:', imported.errors);
                }
                state.templates = {
                    serverVersion: response.pull.templates.version,
                    lastSyncedHash: response.pull.templates.hash,
                };
            } else if (response.accepted.templates) {
                state.templates = {
                    serverVersion: response.accepted.templates.version,
                    lastSyncedHash: response.accepted.templates.hash,
                };
            }
        }

        state.lastSyncedAt = Date.now();
        this.saveState(state);

        const summary = {
            uploadedConversations: response.accepted.conversations.length,
            downloadedConversations: response.pull.conversations.length,
            conflictsResolved,
            uploadedBytes: response.stats.uploadedBytes,
            downloadedBytes: response.stats.downloadedBytes,
            serverRevision: response.serverRevision,
            syncedAt: state.lastSyncedAt,
        };

        logComplianceEvent({
            category: 'cloudsync.sync',
            action: 'sync_now',
            result: 'success',
            resourceType: 'cloud-account',
            resourceId: this.config.accountId,
            details: {
                selectedConversations: selectedSessionIds.length,
                uploadedConversations: summary.uploadedConversations,
                downloadedConversations: summary.downloadedConversations,
                conflictsResolved: summary.conflictsResolved,
                uploadedBytes: summary.uploadedBytes,
                downloadedBytes: summary.downloadedBytes,
            },
        });

        return summary;
    }
}

export const cloudSyncService = new CloudSyncService();
