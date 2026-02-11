export type SSOProtocol = 'saml2' | 'oidc';
export type AuditResult = 'success' | 'failure' | 'info';

export interface SAMLConfig {
    enabled: boolean;
    entryPoint: string;
    issuer: string;
    certificate: string;
    relayState: string;
}

export interface OIDCConfig {
    enabled: boolean;
    issuerUrl: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    clientId: string;
    scopes: string[];
}

export interface EnterpriseSSOConfig {
    saml: SAMLConfig;
    oidc: OIDCConfig;
    allowPasswordFallback: boolean;
}

export interface RetentionPolicy {
    enabled: boolean;
    retentionDays: number;
    anonymizePII: boolean;
    purgeIntervalHours: number;
}

export interface AuditActor {
    id: string;
    name: string;
    role?: string;
}

export interface AuditLogEntry {
    id: string;
    timestamp: number;
    category: string;
    action: string;
    result: AuditResult;
    actor: AuditActor;
    resourceType?: string;
    resourceId?: string;
    details: Record<string, unknown>;
    piiFields?: string[];
}

export interface AuditLogFilter {
    category?: string;
    action?: string;
    result?: AuditResult;
    from?: number;
    to?: number;
    actorId?: string;
    limit?: number;
}

export interface SSOSession {
    sessionId: string;
    protocol: SSOProtocol;
    userId: string;
    email: string;
    displayName: string;
    issuedAt: number;
    expiresAt: number;
}

export interface SSOStartRequest {
    protocol: SSOProtocol;
    state: string;
    redirectUrl: string;
    expiresAt: number;
}

export interface ComplianceExportOptions {
    standard: 'soc2' | 'gdpr';
    format: 'json' | 'csv';
    from?: number;
    to?: number;
    includePII?: boolean;
}

export interface ComplianceExportResult {
    fileName: string;
    mimeType: string;
    content: string;
    recordCount: number;
}

export interface AuditSummary {
    totalEntries: number;
    successCount: number;
    failureCount: number;
    infoCount: number;
    categories: Array<{ category: string; count: number }>;
}

const SSO_CONFIG_KEY = 'enterprise_sso_config_v1';
const AUDIT_LOGS_KEY = 'enterprise_audit_logs_v1';
const RETENTION_POLICY_KEY = 'enterprise_retention_policy_v1';
const SSO_SESSION_KEY = 'enterprise_sso_session_v1';
const SSO_STATE_PREFIX = 'enterprise_sso_state_';

const DEFAULT_SSO_CONFIG: EnterpriseSSOConfig = {
    saml: {
        enabled: false,
        entryPoint: '',
        issuer: '',
        certificate: '',
        relayState: '',
    },
    oidc: {
        enabled: false,
        issuerUrl: '',
        authorizationEndpoint: '',
        tokenEndpoint: '',
        clientId: '',
        scopes: ['openid', 'profile', 'email'],
    },
    allowPasswordFallback: true,
};

const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
    enabled: true,
    retentionDays: 90,
    anonymizePII: true,
    purgeIntervalHours: 24,
};

const DEFAULT_ACTOR: AuditActor = {
    id: 'system',
    name: 'System',
    role: 'system',
};

const PII_FIELD_HINTS = ['email', 'ip', 'token', 'password', 'secret', 'key', 'authorization'];
const VALID_PROTOCOLS = new Set<SSOProtocol>(['saml2', 'oidc']);
const VALID_AUDIT_RESULTS = new Set<AuditResult>(['success', 'failure', 'info']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeString = (value: unknown, fallback: string = ''): string => (
    typeof value === 'string' ? value.trim() : fallback
);

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

const sanitizeSamlConfig = (value: unknown): SAMLConfig => {
    const parsed = isRecord(value) ? value : {};
    return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SSO_CONFIG.saml.enabled,
        entryPoint: sanitizeString(parsed.entryPoint),
        issuer: sanitizeString(parsed.issuer),
        certificate: sanitizeString(parsed.certificate),
        relayState: sanitizeString(parsed.relayState),
    };
};

const sanitizeOidcConfig = (value: unknown): OIDCConfig => {
    const parsed = isRecord(value) ? value : {};
    const scopes = sanitizeStringArray(parsed.scopes);
    return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SSO_CONFIG.oidc.enabled,
        issuerUrl: sanitizeString(parsed.issuerUrl),
        authorizationEndpoint: sanitizeString(parsed.authorizationEndpoint),
        tokenEndpoint: sanitizeString(parsed.tokenEndpoint),
        clientId: sanitizeString(parsed.clientId),
        scopes: scopes.length > 0 ? scopes : [...DEFAULT_SSO_CONFIG.oidc.scopes],
    };
};

const sanitizeEnterpriseSSOConfig = (value: unknown): EnterpriseSSOConfig => {
    const parsed = isRecord(value) ? value : {};
    return {
        saml: sanitizeSamlConfig(parsed.saml),
        oidc: sanitizeOidcConfig(parsed.oidc),
        allowPasswordFallback: typeof parsed.allowPasswordFallback === 'boolean'
            ? parsed.allowPasswordFallback
            : DEFAULT_SSO_CONFIG.allowPasswordFallback,
    };
};

const sanitizeRetentionPolicy = (value: unknown): RetentionPolicy => {
    const parsed = isRecord(value) ? value : {};
    return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_RETENTION_POLICY.enabled,
        retentionDays: isFiniteNumber(parsed.retentionDays)
            ? Math.max(1, Math.floor(parsed.retentionDays))
            : DEFAULT_RETENTION_POLICY.retentionDays,
        anonymizePII: typeof parsed.anonymizePII === 'boolean'
            ? parsed.anonymizePII
            : DEFAULT_RETENTION_POLICY.anonymizePII,
        purgeIntervalHours: isFiniteNumber(parsed.purgeIntervalHours)
            ? Math.max(1, Math.floor(parsed.purgeIntervalHours))
            : DEFAULT_RETENTION_POLICY.purgeIntervalHours,
    };
};

const sanitizeAuditActor = (value: unknown): AuditActor | null => {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
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
        role: typeof value.role === 'string' ? value.role.trim() : undefined,
    };
};

const sanitizeAuditResult = (value: unknown): AuditResult => (
    VALID_AUDIT_RESULTS.has(value as AuditResult) ? value as AuditResult : 'info'
);

const sanitizeAuditLogEntry = (value: unknown): AuditLogEntry | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || !isFiniteNumber(value.timestamp)
        || typeof value.category !== 'string'
        || typeof value.action !== 'string'
        || !isRecord(value.details)) {
        return null;
    }

    const actor = sanitizeAuditActor(value.actor) || DEFAULT_ACTOR;
    const id = value.id.trim();
    const category = value.category.trim();
    const action = value.action.trim();
    if (!id || !category || !action) {
        return null;
    }

    return {
        id,
        timestamp: Math.max(0, Math.floor(value.timestamp)),
        category,
        action,
        result: sanitizeAuditResult(value.result),
        actor,
        resourceType: typeof value.resourceType === 'string' ? value.resourceType.trim() : undefined,
        resourceId: typeof value.resourceId === 'string' ? value.resourceId.trim() : undefined,
        details: { ...value.details },
        piiFields: sanitizeStringArray(value.piiFields),
    };
};

const sanitizeAuditLogs = (value: unknown): AuditLogEntry[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => sanitizeAuditLogEntry(entry))
        .filter((entry): entry is AuditLogEntry => entry !== null);
};

const sanitizeSSOStartRequest = (value: unknown): SSOStartRequest | null => {
    if (!isRecord(value)
        || !VALID_PROTOCOLS.has(value.protocol as SSOProtocol)
        || typeof value.state !== 'string'
        || typeof value.redirectUrl !== 'string'
        || !isFiniteNumber(value.expiresAt)) {
        return null;
    }

    const state = value.state.trim();
    const redirectUrl = value.redirectUrl.trim();
    if (!state || !redirectUrl) {
        return null;
    }

    return {
        protocol: value.protocol as SSOProtocol,
        state,
        redirectUrl,
        expiresAt: Math.max(0, Math.floor(value.expiresAt)),
    };
};

const sanitizeSSOSession = (value: unknown): SSOSession | null => {
    if (!isRecord(value)
        || typeof value.sessionId !== 'string'
        || !VALID_PROTOCOLS.has(value.protocol as SSOProtocol)
        || typeof value.userId !== 'string'
        || typeof value.email !== 'string'
        || typeof value.displayName !== 'string'
        || !isFiniteNumber(value.issuedAt)
        || !isFiniteNumber(value.expiresAt)) {
        return null;
    }

    const sessionId = value.sessionId.trim();
    const userId = value.userId.trim();
    const email = value.email.trim().toLowerCase();
    const displayName = value.displayName.trim();
    if (!sessionId || !userId || !email || !displayName) {
        return null;
    }

    return {
        sessionId,
        protocol: value.protocol as SSOProtocol,
        userId,
        email,
        displayName,
        issuedAt: Math.max(0, Math.floor(value.issuedAt)),
        expiresAt: Math.max(0, Math.floor(value.expiresAt)),
    };
};

class EnterpriseComplianceService {
    private listeners = new Set<() => void>();
    private fallbackStore = new Map<string, string>();
    private lastPruneAt = 0;

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener());
    }

    private randomId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `ent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private resolveLocalStorage(): Storage | undefined {
        const globalWithStorage = globalThis as typeof globalThis & { localStorage?: Storage };
        return globalWithStorage.localStorage;
    }

    private getStorageValue(key: string): string | null {
        try {
            const storage = this.resolveLocalStorage();
            if (storage && typeof storage.getItem === 'function') {
                return storage.getItem(key);
            }
        } catch {
            // fallback below
        }
        return this.fallbackStore.has(key) ? this.fallbackStore.get(key)! : null;
    }

    private setStorageValue(key: string, value: string): void {
        try {
            const storage = this.resolveLocalStorage();
            if (storage && typeof storage.setItem === 'function') {
                storage.setItem(key, value);
                return;
            }
        } catch {
            // fallback below
        }
        this.fallbackStore.set(key, value);
    }

    private removeStorageValue(key: string): void {
        try {
            const storage = this.resolveLocalStorage();
            if (storage && typeof storage.removeItem === 'function') {
                storage.removeItem(key);
                return;
            }
        } catch {
            // fallback below
        }
        this.fallbackStore.delete(key);
    }

    private readJson<T>(key: string, fallback: T): T {
        try {
            const raw = this.getStorageValue(key);
            if (!raw) return fallback;
            const parsed = parseJson(raw);
            return (parsed ?? fallback) as T;
        } catch {
            return fallback;
        }
    }

    private writeJson(key: string, value: unknown): void {
        this.setStorageValue(key, JSON.stringify(value));
    }

    getSSOConfig(): EnterpriseSSOConfig {
        const parsed = this.readJson<unknown>(SSO_CONFIG_KEY, null);
        return sanitizeEnterpriseSSOConfig(parsed);
    }

    updateSSOConfig(partial: Partial<EnterpriseSSOConfig>): EnterpriseSSOConfig {
        const current = this.getSSOConfig();
        const updated = sanitizeEnterpriseSSOConfig({
            ...current,
            ...partial,
            saml: {
                ...current.saml,
                ...(partial.saml || {}),
            },
            oidc: {
                ...current.oidc,
                ...(partial.oidc || {}),
            },
        });

        this.writeJson(SSO_CONFIG_KEY, updated);
        this.logEvent({
            category: 'enterprise.sso',
            action: 'config.updated',
            result: 'success',
            details: {
                samlEnabled: updated.saml.enabled,
                oidcEnabled: updated.oidc.enabled,
                allowPasswordFallback: updated.allowPasswordFallback,
            },
        });
        this.notify();
        return updated;
    }

    getRetentionPolicy(): RetentionPolicy {
        const parsed = this.readJson<unknown>(RETENTION_POLICY_KEY, null);
        return sanitizeRetentionPolicy(parsed);
    }

    updateRetentionPolicy(partial: Partial<RetentionPolicy>): RetentionPolicy {
        const current = this.getRetentionPolicy();
        const updated = sanitizeRetentionPolicy({
            ...current,
            ...partial,
        });

        this.writeJson(RETENTION_POLICY_KEY, updated);
        this.logEvent({
            category: 'enterprise.retention',
            action: 'policy.updated',
            result: 'success',
            details: updated,
        });
        this.notify();
        return updated;
    }

    private getStateRecord(stateKey: string): SSOStartRequest | null {
        return sanitizeSSOStartRequest(this.readJson<unknown>(`${SSO_STATE_PREFIX}${stateKey}`, null));
    }

    private saveStateRecord(record: SSOStartRequest): void {
        const sanitized = sanitizeSSOStartRequest(record);
        if (!sanitized) {
            return;
        }
        this.writeJson(`${SSO_STATE_PREFIX}${sanitized.state}`, sanitized);
    }

    private clearStateRecord(state: string): void {
        this.removeStorageValue(`${SSO_STATE_PREFIX}${state}`);
    }

    startSAMLLogin(): SSOStartRequest {
        const config = this.getSSOConfig();
        if (!config.saml.enabled) {
            throw new Error('SAML is not enabled');
        }
        if (!config.saml.entryPoint || !config.saml.issuer) {
            throw new Error('SAML configuration is incomplete');
        }

        const state = this.randomId();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const redirectUrl = `${config.saml.entryPoint}?SAMLRequest=mock_request&RelayState=${encodeURIComponent(config.saml.relayState || state)}&state=${encodeURIComponent(state)}`;

        const request: SSOStartRequest = {
            protocol: 'saml2',
            state,
            redirectUrl,
            expiresAt,
        };

        this.saveStateRecord(request);
        this.logEvent({
            category: 'enterprise.sso',
            action: 'saml.login.started',
            result: 'info',
            details: { state, entryPoint: config.saml.entryPoint },
        });

        return request;
    }

    startOIDCLogin(): SSOStartRequest {
        const config = this.getSSOConfig();
        if (!config.oidc.enabled) {
            throw new Error('OIDC is not enabled');
        }

        if (!config.oidc.authorizationEndpoint || !config.oidc.clientId) {
            throw new Error('OIDC configuration is incomplete');
        }

        const state = this.randomId();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const scope = encodeURIComponent(config.oidc.scopes.join(' '));
        const redirectUrl = `${config.oidc.authorizationEndpoint}?response_type=code&client_id=${encodeURIComponent(config.oidc.clientId)}&scope=${scope}&state=${encodeURIComponent(state)}`;

        const request: SSOStartRequest = {
            protocol: 'oidc',
            state,
            redirectUrl,
            expiresAt,
        };

        this.saveStateRecord(request);
        this.logEvent({
            category: 'enterprise.sso',
            action: 'oidc.login.started',
            result: 'info',
            details: { state, authorizationEndpoint: config.oidc.authorizationEndpoint },
        });

        return request;
    }

    completeSSOLogin(input: {
        protocol: SSOProtocol;
        state: string;
        email: string;
        displayName: string;
    }): SSOSession {
        const stateRecord = this.getStateRecord(input.state);
        if (!stateRecord || stateRecord.protocol !== input.protocol) {
            throw new Error('Invalid or expired SSO state');
        }
        if (stateRecord.expiresAt < Date.now()) {
            this.clearStateRecord(input.state);
            throw new Error('SSO state has expired');
        }

        const email = input.email.trim().toLowerCase();
        const displayName = input.displayName.trim();
        if (!email || !displayName) {
            throw new Error('Email and display name are required');
        }

        const session: SSOSession = {
            sessionId: this.randomId(),
            protocol: input.protocol,
            userId: this.randomId(),
            email,
            displayName,
            issuedAt: Date.now(),
            expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        };

        this.writeJson(SSO_SESSION_KEY, session);
        this.clearStateRecord(input.state);

        this.logEvent({
            category: 'enterprise.sso',
            action: `${input.protocol}.login.completed`,
            result: 'success',
            actor: {
                id: session.userId,
                name: session.displayName,
                role: 'enterprise-user',
            },
            details: {
                email: session.email,
            },
            piiFields: ['email'],
        });

        this.notify();
        return session;
    }

    getSSOSession(): SSOSession | null {
        const session = sanitizeSSOSession(this.readJson<unknown>(SSO_SESSION_KEY, null));
        if (!session) return null;

        if (session.expiresAt < Date.now()) {
            this.removeStorageValue(SSO_SESSION_KEY);
            return null;
        }

        return session;
    }

    clearSSOSession(): void {
        const session = this.getSSOSession();
        if (session) {
            this.logEvent({
                category: 'enterprise.sso',
                action: `${session.protocol}.logout`,
                result: 'info',
                actor: {
                    id: session.userId,
                    name: session.displayName,
                    role: 'enterprise-user',
                },
                details: {
                    email: session.email,
                },
                piiFields: ['email'],
            });
        }

        this.removeStorageValue(SSO_SESSION_KEY);
        this.notify();
    }

    private loadLogs(): AuditLogEntry[] {
        const logs = this.readJson<unknown>(AUDIT_LOGS_KEY, []);
        return sanitizeAuditLogs(logs);
    }

    private saveLogs(logs: AuditLogEntry[]): void {
        this.writeJson(AUDIT_LOGS_KEY, logs);
    }

    logEvent(input: {
        category: string;
        action: string;
        result?: AuditResult;
        actor?: AuditActor;
        resourceType?: string;
        resourceId?: string;
        details?: Record<string, unknown>;
        piiFields?: string[];
    }): AuditLogEntry {
        this.pruneExpiredLogs();

        const entry: AuditLogEntry = {
            id: this.randomId(),
            timestamp: Date.now(),
            category: input.category,
            action: input.action,
            result: input.result || 'info',
            actor: input.actor || this.resolveDefaultActor(),
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            details: input.details || {},
            piiFields: input.piiFields || this.detectPiiFields(input.details || {}),
        };

        const logs = this.loadLogs();
        logs.push(entry);
        this.saveLogs(logs);
        this.notify();
        return entry;
    }

    getAuditLogs(filter?: AuditLogFilter): AuditLogEntry[] {
        this.pruneExpiredLogs();
        const logs = this.loadLogs();

        let filtered = logs;
        if (filter?.category) {
            filtered = filtered.filter(entry => entry.category.includes(filter.category!));
        }
        if (filter?.action) {
            filtered = filtered.filter(entry => entry.action.includes(filter.action!));
        }
        if (filter?.result) {
            filtered = filtered.filter(entry => entry.result === filter.result);
        }
        if (filter?.actorId) {
            filtered = filtered.filter(entry => entry.actor.id === filter.actorId);
        }
        if (typeof filter?.from === 'number') {
            filtered = filtered.filter(entry => entry.timestamp >= filter.from!);
        }
        if (typeof filter?.to === 'number') {
            filtered = filtered.filter(entry => entry.timestamp <= filter.to!);
        }

        filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);

        if (typeof filter?.limit === 'number' && filter.limit > 0) {
            return filtered.slice(0, filter.limit);
        }
        return filtered;
    }

    getAuditSummary(): AuditSummary {
        const logs = this.getAuditLogs();
        const categories = new Map<string, number>();
        let successCount = 0;
        let failureCount = 0;
        let infoCount = 0;

        logs.forEach(entry => {
            categories.set(entry.category, (categories.get(entry.category) || 0) + 1);
            if (entry.result === 'success') successCount += 1;
            if (entry.result === 'failure') failureCount += 1;
            if (entry.result === 'info') infoCount += 1;
        });

        return {
            totalEntries: logs.length,
            successCount,
            failureCount,
            infoCount,
            categories: Array.from(categories.entries())
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count),
        };
    }

    pruneExpiredLogs(now: number = Date.now()): number {
        const policy = this.getRetentionPolicy();
        if (!policy.enabled) return 0;

        const minIntervalMs = policy.purgeIntervalHours * 60 * 60 * 1000;
        if (now - this.lastPruneAt < minIntervalMs && this.lastPruneAt !== 0) {
            return 0;
        }

        this.lastPruneAt = now;

        const cutoff = now - policy.retentionDays * 24 * 60 * 60 * 1000;
        const logs = this.loadLogs();
        const kept = logs.filter(entry => entry.timestamp >= cutoff);
        const removed = logs.length - kept.length;

        if (removed > 0) {
            this.saveLogs(kept);
            this.notify();
        }

        return removed;
    }

    exportComplianceReport(options: ComplianceExportOptions): ComplianceExportResult {
        const includePII = options.includePII ?? false;
        const logs = this.getAuditLogs({
            from: options.from,
            to: options.to,
        });

        const policy = this.getRetentionPolicy();
        const redactedLogs = logs.map(entry => this.redactEntry(entry, includePII || !policy.anonymizePII));

        if (options.format === 'csv') {
            const headers = ['timestamp', 'category', 'action', 'result', 'actorId', 'actorName', 'resourceType', 'resourceId', 'details'];
            const rows = redactedLogs.map(entry => {
                const values = [
                    new Date(entry.timestamp).toISOString(),
                    entry.category,
                    entry.action,
                    entry.result,
                    entry.actor.id,
                    entry.actor.name,
                    entry.resourceType || '',
                    entry.resourceId || '',
                    JSON.stringify(entry.details),
                ];
                return values.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
            });

            const content = [headers.join(','), ...rows].join('\n');
            return {
                fileName: `inferencerc-${options.standard}-audit-${Date.now()}.csv`,
                mimeType: 'text/csv',
                content,
                recordCount: redactedLogs.length,
            };
        }

        const payload = {
            standard: options.standard,
            exportedAt: new Date().toISOString(),
            retentionPolicy: this.getRetentionPolicy(),
            includePII,
            controls: this.resolveComplianceControls(options.standard),
            records: redactedLogs,
        };

        return {
            fileName: `inferencerc-${options.standard}-audit-${Date.now()}.json`,
            mimeType: 'application/json',
            content: JSON.stringify(payload, null, 2),
            recordCount: redactedLogs.length,
        };
    }

    private resolveComplianceControls(standard: 'soc2' | 'gdpr'): string[] {
        if (standard === 'soc2') {
            return [
                'CC6.1 Logical access controls',
                'CC7.2 Change management and monitoring',
                'CC8.1 Data protection and confidentiality',
            ];
        }
        return [
            'Article 5 Data minimization and integrity',
            'Article 30 Records of processing activities',
            'Article 32 Security of processing',
        ];
    }

    private resolveDefaultActor(): AuditActor {
        const session = this.getSSOSession();
        if (!session) {
            return DEFAULT_ACTOR;
        }
        return {
            id: session.userId,
            name: session.displayName,
            role: 'enterprise-user',
        };
    }

    private detectPiiFields(details: Record<string, unknown>): string[] {
        return Object.keys(details).filter(key => {
            const lower = key.toLowerCase();
            return PII_FIELD_HINTS.some(hint => lower.includes(hint));
        });
    }

    private redactValue(value: unknown, includePII: boolean): unknown {
        if (includePII) return value;

        if (Array.isArray(value)) {
            return value.map(item => this.redactValue(item, includePII));
        }
        if (value && typeof value === 'object') {
            const output: Record<string, unknown> = {};
            Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
                const lower = key.toLowerCase();
                if (PII_FIELD_HINTS.some(hint => lower.includes(hint))) {
                    output[key] = '[REDACTED]';
                } else {
                    output[key] = this.redactValue(inner, includePII);
                }
            });
            return output;
        }
        return value;
    }

    private redactEntry(entry: AuditLogEntry, includePII: boolean): AuditLogEntry {
        const shouldRedactActor = !includePII && (entry.piiFields || []).some(field => field.includes('email'));
        return {
            ...entry,
            actor: shouldRedactActor
                ? {
                    ...entry.actor,
                    name: '[REDACTED]',
                }
                : entry.actor,
            details: this.redactValue(entry.details, includePII) as Record<string, unknown>,
        };
    }
}

export const enterpriseComplianceService = new EnterpriseComplianceService();
