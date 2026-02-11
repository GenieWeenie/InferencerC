import React from 'react';
import type { Tutorial } from '../services/onboarding';
import { crashRecoveryService } from '../services/crashRecovery';
import { HistoryService } from '../services/history';
import { RecoveryState } from '../../shared/types';
import { loadOnboardingService } from '../lib/chatLazyServices';

const RECOVERY_CLEAN_EXIT_KEY = 'app_recovery_clean_exit';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

interface UseChatStartupRecoveryParams {
    loadSession: (sessionId: string) => void;
    setInput: React.Dispatch<React.SetStateAction<string>>;
}

export const useChatStartupRecovery = ({
    loadSession,
    setInput,
}: UseChatStartupRecoveryParams) => {
    const [showTutorial, setShowTutorial] = React.useState(false);
    const [currentTutorial, setCurrentTutorial] = React.useState<Tutorial | null>(null);
    const [showRecoveryDialog, setShowRecoveryDialog] = React.useState(false);
    const [recoveryState, setRecoveryState] = React.useState<RecoveryState | null>(null);

    React.useEffect(() => {
        if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
            return;
        }

        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let idleId: number | null = null;
        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const checkOnboarding = async () => {
            try {
                if (localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') {
                    return;
                }

                const onboardingService = await loadOnboardingService();
                if (cancelled || onboardingService.hasCompletedOnboarding()) {
                    return;
                }

                const tutorials = onboardingService.getTutorials();
                const welcomeTutorial = tutorials.find((tutorial) => tutorial.id === 'welcome');
                if (!cancelled && welcomeTutorial && !welcomeTutorial.completed) {
                    setCurrentTutorial(welcomeTutorial);
                    setShowTutorial(true);
                }
            } catch {
                // Ignore onboarding initialization failures to avoid blocking chat startup.
            }
        };

        if (idleWindow.requestIdleCallback) {
            idleId = idleWindow.requestIdleCallback(() => {
                void checkOnboarding();
            }, { timeout: 2500 });
        } else {
            timeoutId = setTimeout(() => {
                void checkOnboarding();
            }, 800);
        }

        return () => {
            cancelled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (idleId !== null && idleWindow.cancelIdleCallback) {
                idleWindow.cancelIdleCallback(idleId);
            }
        };
    }, []);

    const markRecoveryExitClean = React.useCallback(() => {
        try {
            localStorage.setItem(RECOVERY_CLEAN_EXIT_KEY, 'true');
        } catch {
            // Ignore storage failures; recovery still works best-effort.
        }
    }, []);

    React.useEffect(() => {
        let hadUncleanExit = false;
        try {
            hadUncleanExit = localStorage.getItem(RECOVERY_CLEAN_EXIT_KEY) === 'false';
        } catch {
            hadUncleanExit = false;
        }

        const savedRecoveryState = crashRecoveryService.getRecoveryState();
        if (savedRecoveryState && hadUncleanExit) {
            setRecoveryState(savedRecoveryState);
            setShowRecoveryDialog(true);
        }

        try {
            localStorage.setItem(RECOVERY_CLEAN_EXIT_KEY, 'false');
        } catch {
            // Ignore storage failures; recovery still works best-effort.
        }
    }, []);

    React.useEffect(() => {
        window.addEventListener('beforeunload', markRecoveryExitClean);
        return () => {
            markRecoveryExitClean();
            window.removeEventListener('beforeunload', markRecoveryExitClean);
        };
    }, [markRecoveryExitClean]);

    const handleRestoreSession = React.useCallback(() => {
        if (!recoveryState) return;

        loadSession(recoveryState.sessionId);
        if (recoveryState.draftMessage) {
            setInput(recoveryState.draftMessage);
        }

        HistoryService.clearRecoveryState();
        markRecoveryExitClean();
        setShowRecoveryDialog(false);
        setRecoveryState(null);
    }, [loadSession, markRecoveryExitClean, recoveryState, setInput]);

    const handleDismissRecovery = React.useCallback(() => {
        HistoryService.clearRecoveryState();
        markRecoveryExitClean();
        setShowRecoveryDialog(false);
        setRecoveryState(null);
    }, [markRecoveryExitClean]);

    const handleCompleteTutorial = React.useCallback(() => {
        setShowTutorial(false);
        setCurrentTutorial(null);
        void loadOnboardingService()
            .then((onboardingService) => onboardingService.completeOnboarding())
            .catch(() => {
                // Ignore onboarding persistence failures.
            });
    }, []);

    const handleSkipTutorial = React.useCallback(() => {
        setShowTutorial(false);
        setCurrentTutorial(null);
    }, []);

    return {
        showTutorial,
        currentTutorial,
        showRecoveryDialog,
        setShowRecoveryDialog,
        recoveryState,
        handleRestoreSession,
        handleDismissRecovery,
        handleCompleteTutorial,
        handleSkipTutorial,
    };
};
