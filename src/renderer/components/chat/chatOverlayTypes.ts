import type React from 'react';
import type {
    ChatMessage,
    ChatSession,
    Model,
    RecoveryState,
} from '../../../shared/types';
import type { UsageStatsRecord } from '../../services/analyticsStore';
import type { Tutorial } from '../../services/onboarding';
import type { ConversationTemplate } from '../../services/templates';
import type { ConversationTreeManager } from '../../lib/conversationTree';
import type { MediaAttachment } from '../../services/multiModalAI';
import type { LogEntry } from '../RequestResponseLog';

export interface SelectedCodeState {
    code: string;
    language?: string;
}

export interface ExecuteChatCompletionParams {
    prompt: string;
    systemPrompt?: string;
    modelId?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
}

export type ExecuteChatCompletion = (
    params: ExecuteChatCompletionParams
) => Promise<{ content: string }>;

export interface ChatOverlaySlotsProps {
    showShortcutsModal: boolean;
    setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
    showRequestLog: boolean;
    setShowRequestLog: React.Dispatch<React.SetStateAction<boolean>>;
    apiLogs: LogEntry[];
    clearApiLogs: () => void;
    showAnalytics: boolean;
    setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
    usageStats: UsageStatsRecord[];
    branchingEnabled: boolean;
    showTreeView: boolean;
    setShowTreeView: React.Dispatch<React.SetStateAction<boolean>>;
    treeManager: ConversationTreeManager | null;
    currentPath: string[];
    showExportDialog: boolean;
    setShowExportDialog: React.Dispatch<React.SetStateAction<boolean>>;
    history: ChatMessage[];
    savedSessions: ChatSession[];
    sessionId: string;
    showGlobalSearch: boolean;
    setShowGlobalSearch: React.Dispatch<React.SetStateAction<boolean>>;
    handleLoadSession: (id: string) => void;
    onJumpToSearchMessage: (targetSessionId: string, messageIndex: number) => void;
    showTemplateLibrary: boolean;
    setShowTemplateLibrary: React.Dispatch<React.SetStateAction<boolean>>;
    createNewSession: () => void;
    setSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
    setTemperature: React.Dispatch<React.SetStateAction<number>>;
    setTopP: React.Dispatch<React.SetStateAction<number>>;
    setMaxTokens: React.Dispatch<React.SetStateAction<number>>;
    setExpertMode: React.Dispatch<React.SetStateAction<string | null>>;
    setThinkingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    replaceHistory: (messages: ChatMessage[]) => void;
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    expertMode: string | null;
    thinkingEnabled: boolean;
    showABTesting: boolean;
    setShowABTesting: React.Dispatch<React.SetStateAction<boolean>>;
    executeChatCompletion: ExecuteChatCompletion;
    input: string;
    showPromptOptimization: boolean;
    setShowPromptOptimization: React.Dispatch<React.SetStateAction<boolean>>;
    showCalendarSchedule: boolean;
    setShowCalendarSchedule: React.Dispatch<React.SetStateAction<boolean>>;
    showRecommendations: boolean;
    setShowRecommendations: React.Dispatch<React.SetStateAction<boolean>>;
    showWorkflows: boolean;
    setShowWorkflows: React.Dispatch<React.SetStateAction<boolean>>;
    showAPIPlayground: boolean;
    setShowAPIPlayground: React.Dispatch<React.SetStateAction<boolean>>;
    showDeveloperDocs: boolean;
    setShowDeveloperDocs: React.Dispatch<React.SetStateAction<boolean>>;
    showPluginManager: boolean;
    setShowPluginManager: React.Dispatch<React.SetStateAction<boolean>>;
    showCodeIntegration: boolean;
    setShowCodeIntegration: React.Dispatch<React.SetStateAction<boolean>>;
    selectedCode: SelectedCodeState | null;
    setSelectedCode: React.Dispatch<React.SetStateAction<SelectedCodeState | null>>;
    showWorkspaceViews: boolean;
    setShowWorkspaceViews: React.Dispatch<React.SetStateAction<boolean>>;
    showTutorial: boolean;
    currentTutorial: Tutorial | null;
    handleCompleteTutorial: () => void;
    handleSkipTutorial: () => void;
    showBCI: boolean;
    setShowBCI: React.Dispatch<React.SetStateAction<boolean>>;
    showMultiModal: boolean;
    setShowMultiModal: React.Dispatch<React.SetStateAction<boolean>>;
    onSendMultiModal: (media: MediaAttachment[], text?: string) => Promise<void>;
    showCollaboration: boolean;
    setShowCollaboration: React.Dispatch<React.SetStateAction<boolean>>;
    showCloudSync: boolean;
    setShowCloudSync: React.Dispatch<React.SetStateAction<boolean>>;
    showTeamWorkspaces: boolean;
    setShowTeamWorkspaces: React.Dispatch<React.SetStateAction<boolean>>;
    availableModels: Model[];
    showEnterpriseCompliance: boolean;
    setShowEnterpriseCompliance: React.Dispatch<React.SetStateAction<boolean>>;
    showBlockchain: boolean;
    setShowBlockchain: React.Dispatch<React.SetStateAction<boolean>>;
    showAIAgents: boolean;
    setShowAIAgents: React.Dispatch<React.SetStateAction<boolean>>;
    showFederatedLearning: boolean;
    setShowFederatedLearning: React.Dispatch<React.SetStateAction<boolean>>;
    devMonitorsEnabled: boolean;
    showRecoveryDialog: boolean;
    setShowRecoveryDialog: React.Dispatch<React.SetStateAction<boolean>>;
    handleRestoreSession: () => void;
    handleDismissRecovery: () => void;
    recoveryState: RecoveryState | null;
    onApplyOptimizedPrompt: (optimizedPrompt: string, optimizedSystemPrompt?: string) => void;
}

export type OverlayCurrentSessionTitle = string;

export type OverlayTemplateHandler = (template: ConversationTemplate) => void;
