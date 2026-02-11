type OnboardingService = typeof import('../services/onboarding')['onboardingService'];
type CloudSyncService = typeof import('../services/cloudSync')['cloudSyncService'];
type MultiModalAIService = typeof import('../services/multiModalAI')['multiModalAIService'];
type AutoCategorizationService = typeof import('../services/autoCategorization')['autoCategorizationService'];
type AutoTaggingService = typeof import('../services/autoTagging')['autoTaggingService'];
type WorkflowsService = typeof import('../services/workflows')['workflowsService'];
type ApiClientService = typeof import('../services/apiClient')['apiClientService'];
type ProjectContextService = typeof import('../services/projectContext')['projectContextService'];
type PromptVariableService = typeof import('../services/promptVariables')['PromptVariableService'];
type ContextManagementService = typeof import('../services/contextManagement')['ContextManagementService'];
type AnalyticsStoreModule = typeof import('../services/analyticsStore');
type ActivityLogService = typeof import('../services/activityLog')['activityLogService'];

let onboardingServicePromise: Promise<OnboardingService> | null = null;
let cloudSyncServicePromise: Promise<CloudSyncService> | null = null;
let multiModalAIServicePromise: Promise<MultiModalAIService> | null = null;
let autoCategorizationServicePromise: Promise<AutoCategorizationService> | null = null;
let autoTaggingServicePromise: Promise<AutoTaggingService> | null = null;
let workflowsServicePromise: Promise<WorkflowsService> | null = null;
let apiClientServicePromise: Promise<ApiClientService> | null = null;
let projectContextServicePromise: Promise<ProjectContextService> | null = null;
let promptVariableServicePromise: Promise<PromptVariableService> | null = null;
let contextManagementServicePromise: Promise<ContextManagementService> | null = null;
let analyticsStorePromise: Promise<AnalyticsStoreModule> | null = null;
let activityLogServicePromise: Promise<ActivityLogService> | null = null;

export const loadOnboardingService = async (): Promise<OnboardingService> => {
    if (!onboardingServicePromise) {
        onboardingServicePromise = import('../services/onboarding').then((mod) => mod.onboardingService);
    }
    return onboardingServicePromise;
};

export const loadCloudSyncService = async (): Promise<CloudSyncService> => {
    if (!cloudSyncServicePromise) {
        cloudSyncServicePromise = import('../services/cloudSync').then((mod) => mod.cloudSyncService);
    }
    return cloudSyncServicePromise;
};

export const loadMultiModalAIService = async (): Promise<MultiModalAIService> => {
    if (!multiModalAIServicePromise) {
        multiModalAIServicePromise = import('../services/multiModalAI').then((mod) => mod.multiModalAIService);
    }
    return multiModalAIServicePromise;
};

export const loadAutoCategorizationService = async (): Promise<AutoCategorizationService> => {
    if (!autoCategorizationServicePromise) {
        autoCategorizationServicePromise = import('../services/autoCategorization').then((mod) => mod.autoCategorizationService);
    }
    return autoCategorizationServicePromise;
};

export const loadAutoTaggingService = async (): Promise<AutoTaggingService> => {
    if (!autoTaggingServicePromise) {
        autoTaggingServicePromise = import('../services/autoTagging').then((mod) => mod.autoTaggingService);
    }
    return autoTaggingServicePromise;
};

export const loadWorkflowsService = async (): Promise<WorkflowsService> => {
    if (!workflowsServicePromise) {
        workflowsServicePromise = import('../services/workflows').then((mod) => mod.workflowsService);
    }
    return workflowsServicePromise;
};

export const loadApiClientService = async (): Promise<ApiClientService> => {
    if (!apiClientServicePromise) {
        apiClientServicePromise = import('../services/apiClient').then((mod) => mod.apiClientService);
    }
    return apiClientServicePromise;
};

export const loadProjectContextService = async (): Promise<ProjectContextService> => {
    if (!projectContextServicePromise) {
        projectContextServicePromise = import('../services/projectContext').then((mod) => mod.projectContextService);
    }
    return projectContextServicePromise;
};

export const loadPromptVariableService = async (): Promise<PromptVariableService> => {
    if (!promptVariableServicePromise) {
        promptVariableServicePromise = import('../services/promptVariables').then((mod) => mod.PromptVariableService);
    }
    return promptVariableServicePromise;
};

export const loadContextManagementService = async (): Promise<ContextManagementService> => {
    if (!contextManagementServicePromise) {
        contextManagementServicePromise = import('../services/contextManagement').then((mod) => mod.ContextManagementService);
    }
    return contextManagementServicePromise;
};

export const loadAnalyticsStore = async (): Promise<AnalyticsStoreModule> => {
    if (!analyticsStorePromise) {
        analyticsStorePromise = import('../services/analyticsStore');
    }
    return analyticsStorePromise;
};

export const loadActivityLogService = async (): Promise<ActivityLogService> => {
    if (!activityLogServicePromise) {
        activityLogServicePromise = import('../services/activityLog').then((mod) => mod.activityLogService);
    }
    return activityLogServicePromise;
};
