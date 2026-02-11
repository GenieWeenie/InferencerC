import React from 'react';
import type { SidebarTab } from '../components/chat/ChatInlinePanels';
import type { UsageStatsRecord } from '../services/analyticsStore';
import type { ProjectContext } from '../services/projectContext';

type ContextManagementServiceType = typeof import('../services/contextManagement')['ContextManagementService'];

const CHAT_DEV_MONITORS_ENABLED_KEY = 'chat_dev_monitors_enabled_v1';
const PROJECT_CONTEXT_FEATURE_ENABLED_KEY = 'project_context_feature_enabled_v1';

const readPersistedProjectContextFeatureEnabled = (): boolean => {
    try {
        return localStorage.getItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY) === '1';
    } catch {
        return false;
    }
};

const persistProjectContextFeatureEnabled = (enabled: boolean): void => {
    try {
        if (enabled) {
            localStorage.setItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY, '1');
        } else {
            localStorage.removeItem(PROJECT_CONTEXT_FEATURE_ENABLED_KEY);
        }
    } catch {
        // Ignore local persistence errors for this optional UI flag.
    }
};

const readPersistedDevMonitorsEnabled = (): boolean => {
    try {
        return localStorage.getItem(CHAT_DEV_MONITORS_ENABLED_KEY) === '1';
    } catch {
        return false;
    }
};

export const applyMessageRating = (
    currentRatings: Record<number, 'up' | 'down'>,
    index: number,
    rating: 'up' | 'down'
): Record<number, 'up' | 'down'> => {
    const nextRatings = { ...currentRatings };
    if (nextRatings[index] === rating) {
        delete nextRatings[index];
        return nextRatings;
    }

    nextRatings[index] = rating;
    return nextRatings;
};

export const useChatViewState = () => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<SidebarTab>('controls');
    const [isEditingSystemPrompt, setIsEditingSystemPrompt] = React.useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = React.useState<number | null>(null);
    const [editedMessageContent, setEditedMessageContent] = React.useState<string>('');

    const [devMonitorsEnabled, setDevMonitorsEnabled] = React.useState<boolean>(readPersistedDevMonitorsEnabled);
    const [messageRatings, setMessageRatings] = React.useState<Record<number, 'up' | 'down'>>({});
    const [jsonMode, setJsonMode] = React.useState(false);
    const [usageStats, setUsageStats] = React.useState<UsageStatsRecord[]>([]);
    const [comparisonIndex, setComparisonIndex] = React.useState<number | null>(null);

    const [projectContext, setProjectContext] = React.useState<ProjectContext | null>(null);
    const [projectContextFeatureEnabled, setProjectContextFeatureEnabled] = React.useState(
        readPersistedProjectContextFeatureEnabled
    );
    const [includeContextInMessages, setIncludeContextInMessages] = React.useState(true);
    const [githubUrl, setGithubUrl] = React.useState('');
    const [contextManagementService, setContextManagementService] = React.useState<ContextManagementServiceType | null>(null);

    React.useEffect(() => {
        try {
            localStorage.setItem(CHAT_DEV_MONITORS_ENABLED_KEY, devMonitorsEnabled ? '1' : '0');
        } catch {
            // Ignore storage failures for dev monitor preferences.
        }
    }, [devMonitorsEnabled]);

    const handleRateMessage = React.useCallback((index: number, rating: 'up' | 'down') => {
        setMessageRatings((prev) => applyMessageRating(prev, index, rating));
    }, []);

    const enableProjectContextFeature = React.useCallback(() => {
        setProjectContextFeatureEnabled(true);
        persistProjectContextFeatureEnabled(true);
    }, []);

    return {
        isDragging,
        setIsDragging,
        activeTab,
        setActiveTab,
        isEditingSystemPrompt,
        setIsEditingSystemPrompt,
        editingMessageIndex,
        setEditingMessageIndex,
        editedMessageContent,
        setEditedMessageContent,
        devMonitorsEnabled,
        setDevMonitorsEnabled,
        messageRatings,
        jsonMode,
        setJsonMode,
        usageStats,
        setUsageStats,
        comparisonIndex,
        setComparisonIndex,
        projectContext,
        setProjectContext,
        projectContextFeatureEnabled,
        includeContextInMessages,
        setIncludeContextInMessages,
        githubUrl,
        setGithubUrl,
        contextManagementService,
        setContextManagementService,
        handleRateMessage,
        enableProjectContextFeature,
    };
};
