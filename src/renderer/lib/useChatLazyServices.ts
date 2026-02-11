import { Model } from '../../shared/types';

type AnalyticsService = typeof import('../services/analytics')['analyticsService'];
type WebhookService = typeof import('../services/webhooks')['webhookService'];
type EnterpriseComplianceService = typeof import('../services/enterpriseCompliance')['enterpriseComplianceService'];
type CredentialService = typeof import('../services/credentials')['credentialService'];

let analyticsServicePromise: Promise<AnalyticsService> | null = null;
let webhookServicePromise: Promise<WebhookService> | null = null;
let enterpriseComplianceServicePromise: Promise<EnterpriseComplianceService> | null = null;
let credentialServicePromise: Promise<CredentialService> | null = null;

const OPENROUTER_CREDENTIAL_MARKER_KEY = 'secure_marker_openRouterApiKey';
const OPENROUTER_CREDENTIAL_LEGACY_KEY = 'openRouterApiKey';
const TEAM_WORKSPACES_ACTIVE_KEY = 'team_workspaces_active_v1';
const TEAM_WORKSPACES_STORAGE_KEY = 'team_workspaces_v1';

type WorkspaceModelPolicy = {
    allowedProviders: string[];
    allowedModelIds: string[];
};

type SerializedWorkspace = {
    id: string;
    modelPolicy?: Partial<WorkspaceModelPolicy>;
};

export const loadAnalyticsService = async (): Promise<AnalyticsService> => {
    if (!analyticsServicePromise) {
        analyticsServicePromise = import('../services/analytics').then((mod) => mod.analyticsService);
    }
    return analyticsServicePromise;
};

export const loadWebhookService = async (): Promise<WebhookService> => {
    if (!webhookServicePromise) {
        webhookServicePromise = import('../services/webhooks').then((mod) => mod.webhookService);
    }
    return webhookServicePromise;
};

export const loadEnterpriseComplianceService = async (): Promise<EnterpriseComplianceService> => {
    if (!enterpriseComplianceServicePromise) {
        enterpriseComplianceServicePromise = import('../services/enterpriseCompliance').then((mod) => mod.enterpriseComplianceService);
    }
    return enterpriseComplianceServicePromise;
};

export const loadCredentialService = async (): Promise<CredentialService> => {
    if (!credentialServicePromise) {
        credentialServicePromise = import('../services/credentials').then((mod) => mod.credentialService);
    }
    return credentialServicePromise;
};

export const hasLikelyOpenRouterCredential = (): boolean => {
    try {
        return Boolean(
            localStorage.getItem(OPENROUTER_CREDENTIAL_MARKER_KEY) ||
            localStorage.getItem(OPENROUTER_CREDENTIAL_LEGACY_KEY)
        );
    } catch {
        return false;
    }
};

export const hasLikelyActiveTeamWorkspace = (): boolean => {
    try {
        const activeWorkspace = localStorage.getItem(TEAM_WORKSPACES_ACTIVE_KEY);
        if (!activeWorkspace || activeWorkspace.trim().length === 0) {
            return false;
        }
        const workspacesRaw = localStorage.getItem(TEAM_WORKSPACES_STORAGE_KEY);
        return Boolean(workspacesRaw && workspacesRaw !== '[]');
    } catch {
        return false;
    }
};

const resolveModelProvider = (model: Model): string => {
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
};

const getActiveWorkspaceModelPolicy = (): WorkspaceModelPolicy | null => {
    try {
        const activeWorkspaceId = localStorage.getItem(TEAM_WORKSPACES_ACTIVE_KEY);
        if (!activeWorkspaceId || activeWorkspaceId.trim().length === 0) {
            return null;
        }

        const workspacesRaw = localStorage.getItem(TEAM_WORKSPACES_STORAGE_KEY);
        if (!workspacesRaw) return null;

        const workspaces = JSON.parse(workspacesRaw) as SerializedWorkspace[];
        if (!Array.isArray(workspaces)) return null;

        const workspace = workspaces.find((entry) => entry?.id === activeWorkspaceId);
        if (!workspace) return null;

        return {
            allowedProviders: Array.isArray(workspace.modelPolicy?.allowedProviders)
                ? workspace.modelPolicy!.allowedProviders!
                : [],
            allowedModelIds: Array.isArray(workspace.modelPolicy?.allowedModelIds)
                ? workspace.modelPolicy!.allowedModelIds!
                : [],
        };
    } catch {
        return null;
    }
};

export const filterModelsByWorkspacePolicy = (models: Model[]): Model[] => {
    const policy = getActiveWorkspaceModelPolicy();
    if (!policy) return models;

    if (policy.allowedProviders.length === 0 && policy.allowedModelIds.length === 0) {
        return models;
    }

    return models.filter((model) => {
        const providerAllowed = policy.allowedProviders.length === 0
            || policy.allowedProviders.includes(resolveModelProvider(model));
        const modelAllowed = policy.allowedModelIds.length === 0
            || policy.allowedModelIds.includes(model.id);
        return providerAllowed && modelAllowed;
    });
};
