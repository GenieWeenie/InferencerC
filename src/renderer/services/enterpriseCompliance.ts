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

    private getStorageValue(key: string): string | null {
        try {
            const storage = (globalThis as any).localStorage as Storage | undefined;
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
            const storage = (globalThis as any).localStorage as Storage | undefined;
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
            const storage = (globalThis as any).localStorage as Storage | undefined;
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
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    }

    private writeJson(key: string, value: unknown): void {
        this.setStorageValue(key, JSON.stringify(value));
    }

    getSSOConfig(): EnterpriseSSOConfig {
        const parsed = this.readJson<Partial<EnterpriseSSOConfig>>(SSO_CONFIG_KEY, DEFAULT_SSO_CONFIG);
        return {
            saml: {
                ...DEFAULT_SSO_CONFIG.saml,
                ...(parsed.saml || {}),
            },
            oidc: {
                ...DEFAULT_SSO_CONFIG.oidc,
                ...(parsed.oidc || {}),
                scopes: Array.isArray(parsed.oidc?.scopes)
                    ? Array.from(new Set(parsed.oidc!.scopes.map(scope => String(scope).trim()).filter(Boolean)))
                    : [...DEFAULT_SSO_CONFIG.oidc.scopes],
            },
            allowPasswordFallback: parsed.allowPasswordFallback ?? DEFAULT_SSO_CONFIG.allowPasswordFallback,
        };
    }

    updateSSOConfig(partial: Partial<EnterpriseSSOConfig>): EnterpriseSSOConfig {
        const current = this.getSSOConfig();
        const updated: EnterpriseSSOConfig = {
            ...current,
            ...partial,
            saml: {
                ...current.saml,
                ...(partial.saml || {}),
            },
            oidc: {
                ...current.oidc,
                ...(partial.oidc || {}),
                scopes: partial.oidc?.scopes
                    ? Array.from(new Set(partial.oidc.scopes.map(scope => scope.trim()).filter(Boolean)))
                    : current.oidc.scopes,
            },
        };

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
        const parsed = this.readJson<Partial<RetentionPolicy>>(RETENTION_POLICY_KEY, DEFAULT_RETENTION_POLICY);
        return {
            enabled: parsed.enabled ?? DEFAULT_RETENTION_POLICY.enabled,
            retentionDays: Math.max(1, parsed.retentionDays ?? DEFAULT_RETENTION_POLICY.retentionDays),
            anonymizePII: parsed.anonymizePII ?? DEFAULT_RETENTION_POLICY.anonymizePII,
            purgeIntervalHours: Math.max(1, parsed.purgeIntervalHours ?? DEFAULT_RETENTION_POLICY.purgeIntervalHours),
        };
    }

    updateRetentionPolicy(partial: Partial<RetentionPolicy>): RetentionPolicy {
        const current = this.getRetentionPolicy();
        const updated: RetentionPolicy = {
            ...current,
            ...partial,
            retentionDays: Math.max(1, partial.retentionDays ?? current.retentionDays),
            purgeIntervalHours: Math.max(1, partial.purgeIntervalHours ?? current.purgeIntervalHours),
        };

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
        return this.readJson<SSOStartRequest | null>(`${SSO_STATE_PREFIX}${stateKey}`, null);
    }

    private saveStateRecord(record: SSOStartRequest): void {
        this.writeJson(`${SSO_STATE_PREFIX}${record.state}`, record);
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
        const session = this.readJson<SSOSession | null>(SSO_SESSION_KEY, null);
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
        const logs = this.readJson<AuditLogEntry[]>(AUDIT_LOGS_KEY, []);
        return Array.isArray(logs) ? logs : [];
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
