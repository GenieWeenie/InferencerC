import React from 'react';
import type { LaunchReadinessStep } from '../components/ChatEmptyState';
import { buildReadinessSteps } from '../lib/chatDiagnosticsModels';

const LAUNCH_CHECKLIST_COMPLETED_KEY = 'chat_launch_checklist_completed';

export const readPersistedLaunchChecklistCompleted = (): boolean => {
    try {
        return localStorage.getItem(LAUNCH_CHECKLIST_COMPLETED_KEY) === '1';
    } catch {
        return false;
    }
};

export interface LaunchChecklistState {
    readinessCompletedCount: number;
    launchChecklistComplete: boolean;
    shouldShowLaunchChecklist: boolean;
}

interface DeriveLaunchChecklistStateParams {
    hasCompletedLaunchChecklist: boolean;
    readinessSteps: LaunchReadinessStep[];
}

export const deriveLaunchChecklistState = ({
    hasCompletedLaunchChecklist,
    readinessSteps,
}: DeriveLaunchChecklistStateParams): LaunchChecklistState => {
    const readinessCompletedCount = readinessSteps.filter((step) => step.complete).length;
    const launchChecklistComplete = readinessCompletedCount === readinessSteps.length;
    const shouldShowLaunchChecklist = !hasCompletedLaunchChecklist && !launchChecklistComplete;

    return {
        readinessCompletedCount,
        launchChecklistComplete,
        shouldShowLaunchChecklist,
    };
};

interface UseChatLaunchReadinessParams {
    connectionStatus: {
        local: 'online' | 'offline' | 'checking' | 'none';
        remote: 'online' | 'offline' | 'checking' | 'none';
    };
    currentModel: string;
    currentModelLabel: string;
    input: string;
}

export const useChatLaunchReadiness = ({
    connectionStatus,
    currentModel,
    currentModelLabel,
    input,
}: UseChatLaunchReadinessParams) => {
    const [hasCompletedLaunchChecklist, setHasCompletedLaunchChecklist] = React.useState<boolean>(
        readPersistedLaunchChecklistCompleted
    );

    const providerReady = connectionStatus.local === 'online' || connectionStatus.remote === 'online';
    const modelReady = Boolean(currentModel);
    const promptReady = input.trim().length > 0;

    const readinessSteps = React.useMemo<LaunchReadinessStep[]>(
        () =>
            buildReadinessSteps({
                providerReady,
                localStatus: connectionStatus.local,
                remoteStatus: connectionStatus.remote,
                modelReady,
                modelLabel: currentModelLabel,
                promptReady,
            }),
        [providerReady, connectionStatus.local, connectionStatus.remote, modelReady, currentModelLabel, promptReady]
    );

    const { readinessCompletedCount, launchChecklistComplete, shouldShowLaunchChecklist } = React.useMemo(
        () => deriveLaunchChecklistState({
            hasCompletedLaunchChecklist,
            readinessSteps,
        }),
        [hasCompletedLaunchChecklist, readinessSteps]
    );

    React.useEffect(() => {
        if (!launchChecklistComplete || hasCompletedLaunchChecklist) {
            return;
        }

        setHasCompletedLaunchChecklist(true);
        try {
            localStorage.setItem(LAUNCH_CHECKLIST_COMPLETED_KEY, '1');
        } catch {
            // Ignore local persistence failures for launch checklist tracking.
        }
    }, [launchChecklistComplete, hasCompletedLaunchChecklist]);

    return {
        hasCompletedLaunchChecklist,
        providerReady,
        modelReady,
        promptReady,
        readinessSteps,
        readinessCompletedCount,
        launchChecklistComplete,
        shouldShowLaunchChecklist,
    };
};
