import { Model } from '../../shared/types';
import { readAnalyticsUsageStats } from './analyticsStore';
import { TemplateService, ConversationTemplate } from './templates';

type EnterpriseComplianceService = typeof import('./enterpriseCompliance')['enterpriseComplianceService'];
type ComplianceEventInput = Parameters<EnterpriseComplianceService['logEvent']>[0];

let enterpriseComplianceServicePromise: Promise<EnterpriseComplianceService> | null = null;

const loadEnterpriseComplianceService = async (): Promise<EnterpriseComplianceService> => {
    if (!enterpriseComplianceServicePromise) {
        enterpriseComplianceServicePromise = import('./enterpriseCompliance').then((mod) => mod.enterpriseComplianceService);
    }
    return enterpriseComplianceServicePromise;
};

export type WorkspaceRole = 'admin' | 'member' | 'viewer';

export interface WorkspaceIdentity {
    userId: string;
    displayName: string;
}

export interface WorkspaceMember {
    id: string;
    name: string;
    role: WorkspaceRole;
    joinedAt: number;
}

export interface WorkspaceInvite {
    token: string;
    role: WorkspaceRole;
    createdAt: number;
    expiresAt: number;
    inviteLink: string;
}

export interface WorkspaceModelPolicy {
    allowedProviders: string[];
    allowedModelIds: string[];
}

export interface TeamWorkspace {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    members: WorkspaceMember[];
    invites: WorkspaceInvite[];
    sharedTemplateIds: string[];
    conversationIds: string[];
    modelPolicy: WorkspaceModelPolicy;
}

export interface WorkspaceUsageModelBreakdown {
    modelId: string;
    messageCount: number;
    tokenCount: number;
}

export interface WorkspaceUsageSummary {
    totalTokens: number;
    totalMessages: number;
    totalSessions: number;
    topModels: WorkspaceUsageModelBreakdown[];
}

const WORKSPACES_KEY = 'team_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'team_workspaces_active_v1';
const IDENTITY_KEY = 'team_workspace_identity_v1';

const DEFAULT_IDENTITY_NAME = 'Workspace User';
const WORKSPACE_ROLES = new Set<WorkspaceRole>(['admin', 'member', 'viewer']);

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

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

const sanitizeFiniteNonNegativeNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < value.length; i++) {
        const normalized = sanitizeNonEmptyString(value[i]);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }
    return result;
};

const sanitizeWorkspaceMember = (value: unknown): WorkspaceMember | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    if (!id || !name) {
        return null;
    }
    const joinedAt = sanitizeFiniteNonNegativeNumber(value.joinedAt);
    if (!WORKSPACE_ROLES.has(value.role as WorkspaceRole) || joinedAt === null) {
        return null;
    }
    return {
        id,
        name,
        role: value.role as WorkspaceRole,
        joinedAt,
    };
};

const sanitizeWorkspaceInvite = (value: unknown): WorkspaceInvite | null => {
    if (!isRecord(value)) {
        return null;
    }
    const token = sanitizeNonEmptyString(value.token);
    const inviteLink = sanitizeNonEmptyString(value.inviteLink);
    if (!token || !inviteLink) {
        return null;
    }
    const createdAt = sanitizeFiniteNonNegativeNumber(value.createdAt);
    const expiresAt = sanitizeFiniteNonNegativeNumber(value.expiresAt);
    if (!WORKSPACE_ROLES.has(value.role as WorkspaceRole) || createdAt === null || expiresAt === null) {
        return null;
    }
    return {
        token,
        role: value.role as WorkspaceRole,
        createdAt,
        expiresAt: Math.max(createdAt, expiresAt),
        inviteLink,
    };
};

const sanitizeWorkspace = (value: unknown): TeamWorkspace | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    if (!id || !name) {
        return null;
    }
    const createdAt = sanitizeFiniteNonNegativeNumber(value.createdAt);
    const updatedAt = sanitizeFiniteNonNegativeNumber(value.updatedAt);
    if (createdAt === null || updatedAt === null) {
        return null;
    }

    const modelPolicy = isRecord(value.modelPolicy) ? value.modelPolicy : {};
    const members = Array.isArray(value.members)
        ? value.members.map(sanitizeWorkspaceMember).filter((member): member is WorkspaceMember => member !== null)
        : [];
    const invites = Array.isArray(value.invites)
        ? value.invites.map(sanitizeWorkspaceInvite).filter((invite): invite is WorkspaceInvite => invite !== null)
        : [];
    const dedupedMembers = members.filter((member, index, all) => (
        all.findIndex((candidate) => candidate.id === member.id) === index
    ));
    const dedupedInvites = invites.filter((invite, index, all) => (
        all.findIndex((candidate) => candidate.token === invite.token) === index
    ));
    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) || '',
        createdAt,
        updatedAt: Math.max(createdAt, updatedAt),
        members: dedupedMembers,
        invites: dedupedInvites,
        sharedTemplateIds: sanitizeStringArray(value.sharedTemplateIds),
        conversationIds: sanitizeStringArray(value.conversationIds),
        modelPolicy: {
            allowedProviders: sanitizeStringArray(modelPolicy.allowedProviders),
            allowedModelIds: sanitizeStringArray(modelPolicy.allowedModelIds),
        },
    };
};

class TeamWorkspacesService {
    private listeners = new Set<() => void>();

    private logComplianceEvent(event: ComplianceEventInput): void {
        void loadEnterpriseComplianceService()
            .then((service) => service.logEvent(event))
            .catch(() => {
                // Non-blocking compliance logging.
            });
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener());
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('team-workspace-changed'));
        }
    }

    private generateId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private normalizeWorkspace(workspace: TeamWorkspace): TeamWorkspace {
        return sanitizeWorkspace(workspace) || {
            ...workspace,
            members: [],
            invites: [],
            sharedTemplateIds: [],
            conversationIds: [],
            modelPolicy: {
                allowedProviders: [],
                allowedModelIds: [],
            },
        };
    }

    private loadWorkspaces(): TeamWorkspace[] {
        try {
            const raw = localStorage.getItem(WORKSPACES_KEY);
            if (!raw) return [];
            const parsed = parseJson(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            const workspaces: TeamWorkspace[] = [];
            for (let i = 0; i < parsed.length; i++) {
                const workspace = sanitizeWorkspace(parsed[i]);
                if (workspace) {
                    workspaces.push(this.normalizeWorkspace(workspace));
                }
            }
            return workspaces;
        } catch (error) {
            console.error('Failed to load team workspaces:', error);
            return [];
        }
    }

    private saveWorkspaces(workspaces: TeamWorkspace[]): void {
        const seenIds = new Set<string>();
        const sanitized = workspaces
            .map((workspace) => sanitizeWorkspace(workspace))
            .filter((workspace): workspace is TeamWorkspace => {
                if (!workspace) {
                    return false;
                }
                if (seenIds.has(workspace.id)) {
                    return false;
                }
                seenIds.add(workspace.id);
                return true;
            });
        localStorage.setItem(WORKSPACES_KEY, JSON.stringify(sanitized));
    }

    getIdentity(): WorkspaceIdentity {
        try {
            const raw = localStorage.getItem(IDENTITY_KEY);
            if (raw) {
                const parsed = parseJson(raw);
                if (isRecord(parsed)) {
                    const userId = sanitizeNonEmptyString(parsed.userId);
                    const displayName = sanitizeNonEmptyString(parsed.displayName);
                    if (userId && displayName) {
                        return { userId, displayName };
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load workspace identity:', error);
        }

        const identity: WorkspaceIdentity = {
            userId: this.generateId(),
            displayName: DEFAULT_IDENTITY_NAME,
        };
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
        return identity;
    }

    setIdentity(partial: Partial<WorkspaceIdentity>): WorkspaceIdentity {
        const current = this.getIdentity();
        const updated: WorkspaceIdentity = {
            userId: sanitizeNonEmptyString(partial.userId) || current.userId,
            displayName: sanitizeNonEmptyString(partial.displayName) || current.displayName,
        };

        localStorage.setItem(IDENTITY_KEY, JSON.stringify(updated));
        this.notify();
        return updated;
    }

    getWorkspaces(): TeamWorkspace[] {
        return this.loadWorkspaces().sort((a, b) => b.updatedAt - a.updatedAt);
    }

    getActiveWorkspaceId(): string | null {
        const id = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
        return id && id.trim().length > 0 ? id : null;
    }

    setActiveWorkspace(workspaceId: string | null): void {
        const normalizedWorkspaceId = sanitizeNonEmptyString(workspaceId);
        if (!normalizedWorkspaceId) {
            localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
            this.logComplianceEvent({
                category: 'workspace.selection',
                action: 'cleared',
                result: 'info',
                details: {},
            });
            this.notify();
            return;
        }

        localStorage.setItem(ACTIVE_WORKSPACE_KEY, normalizedWorkspaceId);
        this.logComplianceEvent({
            category: 'workspace.selection',
            action: 'set_active',
            result: 'info',
            resourceType: 'workspace',
            resourceId: normalizedWorkspaceId,
            details: {},
        });
        this.notify();
    }

    getActiveWorkspace(): TeamWorkspace | null {
        const workspaceId = this.getActiveWorkspaceId();
        if (!workspaceId) return null;

        return this.getWorkspaces().find(workspace => workspace.id === workspaceId) || null;
    }

    private requireWorkspace(workspaceId: string): TeamWorkspace {
        const workspace = this.getWorkspaces().find(entry => entry.id === workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        return workspace;
    }

    private getCurrentMember(workspace: TeamWorkspace): WorkspaceMember | null {
        const identity = this.getIdentity();
        return workspace.members.find(member => member.id === identity.userId) || null;
    }

    getCurrentRole(workspaceId: string): WorkspaceRole | null {
        const workspace = this.getWorkspaces().find(entry => entry.id === workspaceId);
        if (!workspace) return null;
        return this.getCurrentMember(workspace)?.role || null;
    }

    private requireRole(workspace: TeamWorkspace, allowed: WorkspaceRole[]): WorkspaceMember {
        const member = this.getCurrentMember(workspace);
        if (!member || !allowed.includes(member.role)) {
            throw new Error('Insufficient workspace permissions');
        }
        return member;
    }

    createWorkspace(name: string, description?: string): TeamWorkspace {
        const normalized = name.trim();
        if (!normalized) {
            throw new Error('Workspace name is required');
        }

        const identity = this.getIdentity();
        const now = Date.now();

        const workspace: TeamWorkspace = {
            id: this.generateId(),
            name: normalized,
            description: description?.trim() || '',
            createdAt: now,
            updatedAt: now,
            members: [
                {
                    id: identity.userId,
                    name: identity.displayName,
                    role: 'admin',
                    joinedAt: now,
                },
            ],
            invites: [],
            sharedTemplateIds: [],
            conversationIds: [],
            modelPolicy: {
                allowedProviders: [],
                allowedModelIds: [],
            },
        };

        const workspaces = this.loadWorkspaces();
        workspaces.push(workspace);
        this.saveWorkspaces(workspaces);
        this.setActiveWorkspace(workspace.id);
        this.notify();

        this.logComplianceEvent({
            category: 'workspace.management',
            action: 'workspace_created',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: { name: workspace.name },
        });

        return workspace;
    }

    private saveWorkspace(workspace: TeamWorkspace): TeamWorkspace {
        const workspaces = this.loadWorkspaces();
        const index = workspaces.findIndex(entry => entry.id === workspace.id);
        if (index < 0) {
            throw new Error('Workspace not found');
        }

        const sanitized = sanitizeWorkspace({
            ...workspace,
            updatedAt: Date.now(),
        });
        if (!sanitized) {
            throw new Error('Workspace payload is invalid');
        }
        workspaces[index] = sanitized;

        this.saveWorkspaces(workspaces);
        this.notify();
        return workspaces[index];
    }

    generateInvite(workspaceId: string, role: WorkspaceRole, expiresInHours: number = 72): WorkspaceInvite {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin']);

        const now = Date.now();
        const token = this.generateId();
        const sanitizedExpiryHours = Number.isFinite(expiresInHours)
            ? Math.max(1, Math.floor(expiresInHours))
            : 72;
        const expiresAt = now + sanitizedExpiryHours * 60 * 60 * 1000;

        const invite: WorkspaceInvite = {
            token,
            role,
            createdAt: now,
            expiresAt,
            inviteLink: `inferencerc://workspace-invite/${token}`,
        };

        workspace.invites = [...workspace.invites, invite];
        this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.invites',
            action: 'invite_created',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: {
                role,
                expiresAt,
            },
        });
        return invite;
    }

    acceptInvite(token: string): TeamWorkspace {
        const normalizedToken = token.trim();
        if (!normalizedToken) {
            throw new Error('Invite token is required');
        }

        const workspaces = this.loadWorkspaces();
        const workspaceIndex = workspaces.findIndex(workspace =>
            workspace.invites.some(invite => invite.token === normalizedToken)
        );

        if (workspaceIndex < 0) {
            throw new Error('Invite not found');
        }

        const workspace = workspaces[workspaceIndex];
        const invite = workspace.invites.find(entry => entry.token === normalizedToken)!;

        if (invite.expiresAt < Date.now()) {
            throw new Error('Invite has expired');
        }

        const identity = this.getIdentity();
        const existing = workspace.members.find(member => member.id === identity.userId);

        if (existing) {
            existing.role = invite.role;
        } else {
            workspace.members.push({
                id: identity.userId,
                name: identity.displayName,
                role: invite.role,
                joinedAt: Date.now(),
            });
        }

        workspace.invites = workspace.invites.filter(entry => entry.token !== normalizedToken);
        workspace.updatedAt = Date.now();

        workspaces[workspaceIndex] = workspace;
        this.saveWorkspaces(workspaces);
        this.setActiveWorkspace(workspace.id);
        this.notify();

        this.logComplianceEvent({
            category: 'workspace.invites',
            action: 'invite_accepted',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: {
                role: invite.role,
                memberId: identity.userId,
            },
        });

        return workspace;
    }

    removeInvite(workspaceId: string, token: string): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin']);
        const normalizedToken = sanitizeNonEmptyString(token);
        if (!normalizedToken) {
            throw new Error('Invite token is required');
        }

        workspace.invites = workspace.invites.filter(invite => invite.token !== normalizedToken);
        return this.saveWorkspace(workspace);
    }

    updateMemberRole(workspaceId: string, memberId: string, role: WorkspaceRole): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin']);
        const normalizedMemberId = sanitizeNonEmptyString(memberId);
        if (!normalizedMemberId) {
            throw new Error('Member ID is required');
        }

        const target = workspace.members.find(member => member.id === normalizedMemberId);
        if (!target) {
            throw new Error('Member not found');
        }

        const adminCount = workspace.members.filter(member => member.role === 'admin').length;
        if (target.role === 'admin' && role !== 'admin' && adminCount <= 1) {
            throw new Error('Workspace must retain at least one admin');
        }

        target.role = role;
        const updated = this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.members',
            action: 'role_updated',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: { memberId: normalizedMemberId, role },
        });
        return updated;
    }

    removeMember(workspaceId: string, memberId: string): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin']);
        const normalizedMemberId = sanitizeNonEmptyString(memberId);
        if (!normalizedMemberId) {
            throw new Error('Member ID is required');
        }

        const target = workspace.members.find(member => member.id === normalizedMemberId);
        if (!target) {
            throw new Error('Member not found');
        }

        const adminCount = workspace.members.filter(member => member.role === 'admin').length;
        if (target.role === 'admin' && adminCount <= 1) {
            throw new Error('Workspace must retain at least one admin');
        }

        workspace.members = workspace.members.filter(member => member.id !== normalizedMemberId);
        const updated = this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.members',
            action: 'member_removed',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: { memberId: normalizedMemberId },
        });
        return updated;
    }

    setSharedTemplates(workspaceId: string, templateIds: string[]): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin', 'member']);

        const valid = new Set<string>();
        sanitizeStringArray(templateIds).forEach(id => {
            if (TemplateService.getTemplate(id)) {
                valid.add(id);
            }
        });

        workspace.sharedTemplateIds = Array.from(valid);
        const updated = this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.templates',
            action: 'shared_templates_updated',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: {
                templateCount: updated.sharedTemplateIds.length,
            },
        });
        return updated;
    }

    getSharedTemplates(workspaceId: string): ConversationTemplate[] {
        const workspace = this.requireWorkspace(workspaceId);
        return workspace.sharedTemplateIds
            .map(id => TemplateService.getTemplate(id))
            .filter((template): template is ConversationTemplate => Boolean(template));
    }

    setConversationCollection(workspaceId: string, conversationIds: string[]): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin', 'member']);

        workspace.conversationIds = sanitizeStringArray(conversationIds);
        const updated = this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.conversations',
            action: 'collection_updated',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: {
                conversationCount: updated.conversationIds.length,
            },
        });
        return updated;
    }

    updateModelPolicy(workspaceId: string, policy: Partial<WorkspaceModelPolicy>): TeamWorkspace {
        const workspace = this.requireWorkspace(workspaceId);
        this.requireRole(workspace, ['admin']);

        workspace.modelPolicy = {
            allowedProviders: typeof policy.allowedProviders !== 'undefined'
                ? sanitizeStringArray(policy.allowedProviders)
                : workspace.modelPolicy.allowedProviders,
            allowedModelIds: typeof policy.allowedModelIds !== 'undefined'
                ? sanitizeStringArray(policy.allowedModelIds)
                : workspace.modelPolicy.allowedModelIds,
        };

        const updated = this.saveWorkspace(workspace);
        this.logComplianceEvent({
            category: 'workspace.policy',
            action: 'model_policy_updated',
            result: 'success',
            resourceType: 'workspace',
            resourceId: workspace.id,
            details: {
                allowedProviders: updated.modelPolicy.allowedProviders,
                allowedModelCount: updated.modelPolicy.allowedModelIds.length,
            },
        });
        return updated;
    }

    private resolveProvider(model: Model): string {
        if (model.id.startsWith('openrouter/')) {
            return 'openrouter';
        }

        if (model.type === 'local-folder') {
            return 'local';
        }

        if (typeof model.pathOrUrl === 'string' && model.pathOrUrl.includes('localhost')) {
            return 'local';
        }

        return 'custom';
    }

    filterAllowedModels(models: Model[]): Model[] {
        const workspace = this.getActiveWorkspace();
        if (!workspace) {
            return models;
        }

        const policy = workspace.modelPolicy;
        if (policy.allowedProviders.length === 0 && policy.allowedModelIds.length === 0) {
            return models;
        }

        return models.filter(model => {
            const providerAllowed = policy.allowedProviders.length === 0
                || policy.allowedProviders.includes(this.resolveProvider(model));

            const modelAllowed = policy.allowedModelIds.length === 0
                || policy.allowedModelIds.includes(model.id);

            return providerAllowed && modelAllowed;
        });
    }

    getWorkspaceUsageSummary(workspaceId: string): WorkspaceUsageSummary {
        const workspace = this.requireWorkspace(workspaceId);
        const sessionIdSet = new Set(workspace.conversationIds);
        const stats = readAnalyticsUsageStats()
            .filter(entry => sessionIdSet.size > 0 && sessionIdSet.has(entry.sessionId));

        const totalTokens = stats.reduce((sum, entry) => sum + entry.tokenCount, 0);
        const totalMessages = stats.reduce((sum, entry) => sum + entry.messageCount, 0);
        const totalSessions = new Set(stats.map(entry => entry.sessionId)).size;

        const byModel = new Map<string, WorkspaceUsageModelBreakdown>();
        stats.forEach(entry => {
            const existing = byModel.get(entry.modelId) || {
                modelId: entry.modelId,
                messageCount: 0,
                tokenCount: 0,
            };
            existing.messageCount += entry.messageCount;
            existing.tokenCount += entry.tokenCount;
            byModel.set(entry.modelId, existing);
        });

        const topModels = Array.from(byModel.values())
            .sort((a, b) => b.tokenCount - a.tokenCount)
            .slice(0, 5);

        return {
            totalTokens,
            totalMessages,
            totalSessions,
            topModels,
        };
    }
}

export const teamWorkspacesService = new TeamWorkspacesService();
