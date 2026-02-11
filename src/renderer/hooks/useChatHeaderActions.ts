import React from 'react';
import {
    Bot,
    Cloud,
    Code2,
    FileText,
    HelpCircle,
    LayoutGrid,
    Link,
    Package,
    Shield,
    Sparkles,
    TestTube,
    Users,
    Video,
    Zap,
    Plus,
    Brain,
    ClipboardList,
} from 'lucide-react';
import {
    type ExperimentalFeatureAction,
    type HeaderPrimaryActionConfig,
} from '../components/chat/ChatHeaderCluster';
import {
    EXPERIMENTAL_FEATURE_MENU_ITEMS,
    type ExperimentalFeatureMenuItem,
} from '../lib/chatRenderModels';

interface UseChatHeaderActionsParams {
    createNewSession: () => void;
    setShowTemplateLibrary: React.Dispatch<React.SetStateAction<boolean>>;
    setShowABTesting: React.Dispatch<React.SetStateAction<boolean>>;
    setShowPromptOptimization: React.Dispatch<React.SetStateAction<boolean>>;
    setShowWorkflows: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAPIPlayground: React.Dispatch<React.SetStateAction<boolean>>;
    setShowDeveloperDocs: React.Dispatch<React.SetStateAction<boolean>>;
    setShowPluginManager: React.Dispatch<React.SetStateAction<boolean>>;
    setShowWorkspaceViews: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCloudSync: React.Dispatch<React.SetStateAction<boolean>>;
    setShowBCI: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMultiModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCollaboration: React.Dispatch<React.SetStateAction<boolean>>;
    setShowTeamWorkspaces: React.Dispatch<React.SetStateAction<boolean>>;
    setShowEnterpriseCompliance: React.Dispatch<React.SetStateAction<boolean>>;
    setShowBlockchain: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAIAgents: React.Dispatch<React.SetStateAction<boolean>>;
    setShowFederatedLearning: React.Dispatch<React.SetStateAction<boolean>>;
}

const NOOP = () => {};

const EXPERIMENTAL_FEATURE_ICON_MAP: Record<
    ExperimentalFeatureMenuItem['icon'],
    React.ComponentType<{ size?: number }>
> = {
    brain: Brain,
    multimodal: Video,
    collaboration: Users,
    cloud: Cloud,
    workspaces: Shield,
    compliance: ClipboardList,
    blockchain: Link,
    agents: Bot,
    federated: Shield,
};

export const useChatHeaderActions = ({
    createNewSession,
    setShowTemplateLibrary,
    setShowABTesting,
    setShowPromptOptimization,
    setShowWorkflows,
    setShowAPIPlayground,
    setShowDeveloperDocs,
    setShowPluginManager,
    setShowWorkspaceViews,
    setShowCloudSync,
    setShowBCI,
    setShowMultiModal,
    setShowCollaboration,
    setShowTeamWorkspaces,
    setShowEnterpriseCompliance,
    setShowBlockchain,
    setShowAIAgents,
    setShowFederatedLearning,
}: UseChatHeaderActionsParams) => {
    const handleOpenTemplateLibrary = React.useCallback(() => {
        setShowTemplateLibrary(true);
    }, [setShowTemplateLibrary]);

    const handleOpenABTesting = React.useCallback(() => {
        setShowABTesting(true);
    }, [setShowABTesting]);

    const handleOpenPromptOptimization = React.useCallback(() => {
        setShowPromptOptimization(true);
    }, [setShowPromptOptimization]);

    const handleOpenWorkflows = React.useCallback(() => {
        setShowWorkflows(true);
    }, [setShowWorkflows]);

    const handleOpenAPIPlayground = React.useCallback(() => {
        setShowAPIPlayground(true);
    }, [setShowAPIPlayground]);

    const handleOpenDeveloperDocs = React.useCallback(() => {
        setShowDeveloperDocs(true);
    }, [setShowDeveloperDocs]);

    const handleOpenPluginManager = React.useCallback(() => {
        setShowPluginManager(true);
    }, [setShowPluginManager]);

    const handleOpenWorkspaceViews = React.useCallback(() => {
        setShowWorkspaceViews(true);
    }, [setShowWorkspaceViews]);

    const handleOpenCloudSyncPanel = React.useCallback(() => {
        setShowCloudSync(true);
    }, [setShowCloudSync]);

    const handleOpenBCI = React.useCallback(() => {
        setShowBCI(true);
    }, [setShowBCI]);

    const handleOpenMultiModal = React.useCallback(() => {
        setShowMultiModal(true);
    }, [setShowMultiModal]);

    const handleOpenCollaboration = React.useCallback(() => {
        setShowCollaboration(true);
    }, [setShowCollaboration]);

    const handleOpenTeamWorkspaces = React.useCallback(() => {
        setShowTeamWorkspaces(true);
    }, [setShowTeamWorkspaces]);

    const handleOpenEnterpriseCompliance = React.useCallback(() => {
        setShowEnterpriseCompliance(true);
    }, [setShowEnterpriseCompliance]);

    const handleOpenBlockchain = React.useCallback(() => {
        setShowBlockchain(true);
    }, [setShowBlockchain]);

    const handleOpenAIAgents = React.useCallback(() => {
        setShowAIAgents(true);
    }, [setShowAIAgents]);

    const handleOpenFederatedLearning = React.useCallback(() => {
        setShowFederatedLearning(true);
    }, [setShowFederatedLearning]);

    const topHeaderPrimaryActions = React.useMemo<HeaderPrimaryActionConfig[]>(() => ([
        {
            key: 'new-chat',
            title: 'New Chat',
            label: 'New',
            icon: Plus,
            onClick: createNewSession,
            variant: 'primary',
        },
        {
            key: 'templates',
            title: 'Templates',
            label: 'Templates',
            icon: FileText,
            onClick: handleOpenTemplateLibrary,
        },
        {
            key: 'ab-test',
            title: 'A/B Testing (Test different prompts)',
            label: 'A/B Test',
            icon: TestTube,
            onClick: handleOpenABTesting,
        },
        {
            key: 'optimize',
            title: 'Prompt Optimization (AI-powered suggestions)',
            label: 'Optimize',
            icon: Sparkles,
            onClick: handleOpenPromptOptimization,
        },
        {
            key: 'workflows',
            title: 'Workflows (Automation)',
            label: 'Workflows',
            icon: Zap,
            onClick: handleOpenWorkflows,
        },
        {
            key: 'api',
            title: 'API Playground (Developer Tools)',
            label: 'API',
            icon: Code2,
            onClick: handleOpenAPIPlayground,
        },
        {
            key: 'docs',
            title: 'Developer Documentation',
            label: 'Docs',
            icon: HelpCircle,
            onClick: handleOpenDeveloperDocs,
        },
        {
            key: 'plugins',
            title: 'Plugin Manager',
            label: 'Plugins',
            icon: Package,
            onClick: handleOpenPluginManager,
        },
        {
            key: 'views',
            title: 'Workspace Views',
            label: 'Views',
            icon: LayoutGrid,
            onClick: handleOpenWorkspaceViews,
        },
    ]), [
        createNewSession,
        handleOpenTemplateLibrary,
        handleOpenABTesting,
        handleOpenPromptOptimization,
        handleOpenWorkflows,
        handleOpenAPIPlayground,
        handleOpenDeveloperDocs,
        handleOpenPluginManager,
        handleOpenWorkspaceViews,
    ]);

    const experimentalFeatureOpeners = React.useMemo<Record<string, () => void>>(() => ({
        bci: handleOpenBCI,
        multimodal: handleOpenMultiModal,
        collaboration: handleOpenCollaboration,
        cloudSync: handleOpenCloudSyncPanel,
        teamWorkspaces: handleOpenTeamWorkspaces,
        enterpriseCompliance: handleOpenEnterpriseCompliance,
        blockchain: handleOpenBlockchain,
        aiAgents: handleOpenAIAgents,
        federatedLearning: handleOpenFederatedLearning,
    }), [
        handleOpenAIAgents,
        handleOpenBCI,
        handleOpenBlockchain,
        handleOpenCloudSyncPanel,
        handleOpenCollaboration,
        handleOpenEnterpriseCompliance,
        handleOpenFederatedLearning,
        handleOpenMultiModal,
        handleOpenTeamWorkspaces,
    ]);

    const experimentalFeatureActions = React.useMemo<ExperimentalFeatureAction[]>(
        () => EXPERIMENTAL_FEATURE_MENU_ITEMS.map((item) => ({
            key: item.key,
            label: item.label,
            icon: EXPERIMENTAL_FEATURE_ICON_MAP[item.icon],
            onClick: experimentalFeatureOpeners[item.key] || NOOP,
        })),
        [experimentalFeatureOpeners]
    );

    return {
        topHeaderPrimaryActions,
        experimentalFeatureActions,
        handleOpenCloudSyncPanel,
    };
};
