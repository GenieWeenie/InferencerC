/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useChatStartupRecovery } from '../src/renderer/hooks/useChatStartupRecovery';

const getRecoveryStateMock = jest.fn();
jest.mock('../src/renderer/services/crashRecovery', () => ({
    crashRecoveryService: {
        getRecoveryState: (...args: unknown[]) => getRecoveryStateMock(...args),
    },
}));

const clearRecoveryStateMock = jest.fn();
jest.mock('../src/renderer/services/history', () => ({
    HistoryService: {
        clearRecoveryState: (...args: unknown[]) => clearRecoveryStateMock(...args),
    },
}));

const loadOnboardingServiceMock = jest.fn();
jest.mock('../src/renderer/lib/chatLazyServices', () => ({
    loadOnboardingService: (...args: unknown[]) => loadOnboardingServiceMock(...args),
}));

describe('useChatStartupRecovery', () => {
    beforeEach(() => {
        localStorage.clear();
        getRecoveryStateMock.mockReset();
        clearRecoveryStateMock.mockReset();
        loadOnboardingServiceMock.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('restores recovery state and reloads session/draft', async () => {
        localStorage.setItem('app_recovery_clean_exit', 'false');
        getRecoveryStateMock.mockReturnValue({
            sessionId: 'session-1',
            timestamp: Date.now(),
            draftMessage: 'hello draft',
        });
        loadOnboardingServiceMock.mockResolvedValue({
            hasCompletedOnboarding: () => true,
            getTutorials: () => [],
            completeOnboarding: jest.fn(),
        });

        const loadSession = jest.fn();
        const setInput = (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>;
        const { result } = renderHook(() => useChatStartupRecovery({ loadSession, setInput }));

        await waitFor(() => {
            expect(result.current.showRecoveryDialog).toBe(true);
        });

        act(() => {
            result.current.handleRestoreSession();
        });

        expect(loadSession).toHaveBeenCalledWith('session-1');
        expect(setInput).toHaveBeenCalledWith('hello draft');
        expect(clearRecoveryStateMock).toHaveBeenCalled();
        expect(result.current.showRecoveryDialog).toBe(false);
    });

    it('opens welcome tutorial and marks onboarding complete', async () => {
        jest.useFakeTimers();
        const completeOnboardingMock = jest.fn();
        loadOnboardingServiceMock.mockResolvedValue({
            hasCompletedOnboarding: () => false,
            getTutorials: () => [{ id: 'welcome', completed: false }],
            completeOnboarding: completeOnboardingMock,
        });
        getRecoveryStateMock.mockReturnValue(null);

        const setInput = (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>;
        const { result } = renderHook(() => useChatStartupRecovery({
            loadSession: jest.fn(),
            setInput,
        }));

        act(() => {
            jest.advanceTimersByTime(900);
        });

        await waitFor(() => {
            expect(result.current.showTutorial).toBe(true);
        });

        act(() => {
            result.current.handleCompleteTutorial();
        });

        await waitFor(() => {
            expect(completeOnboardingMock).toHaveBeenCalled();
        });
    });

    it('marks recovery exit state on mount/unmount and handles malformed clean-exit marker safely', async () => {
        localStorage.setItem('app_recovery_clean_exit', 'unexpected');
        getRecoveryStateMock.mockReturnValue({
            sessionId: 'session-2',
            timestamp: Date.now(),
            draftMessage: 'should-not-restore',
        });
        loadOnboardingServiceMock.mockResolvedValue({
            hasCompletedOnboarding: () => true,
            getTutorials: () => [],
            completeOnboarding: jest.fn(),
        });

        const { result, unmount } = renderHook(() => useChatStartupRecovery({
            loadSession: jest.fn(),
            setInput: (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>,
        }));

        expect(localStorage.getItem('app_recovery_clean_exit')).toBe('false');
        expect(result.current.showRecoveryDialog).toBe(false);

        unmount();
        expect(localStorage.getItem('app_recovery_clean_exit')).toBe('true');
    });

    it('dismisses recovery dialog and clears persisted recovery state', async () => {
        localStorage.setItem('app_recovery_clean_exit', 'false');
        getRecoveryStateMock.mockReturnValue({
            sessionId: 'session-3',
            timestamp: Date.now(),
            draftMessage: 'draft',
        });
        loadOnboardingServiceMock.mockResolvedValue({
            hasCompletedOnboarding: () => true,
            getTutorials: () => [],
            completeOnboarding: jest.fn(),
        });

        const { result } = renderHook(() => useChatStartupRecovery({
            loadSession: jest.fn(),
            setInput: (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<string>>,
        }));

        await waitFor(() => {
            expect(result.current.showRecoveryDialog).toBe(true);
        });

        act(() => {
            result.current.handleDismissRecovery();
        });

        expect(clearRecoveryStateMock).toHaveBeenCalled();
        expect(result.current.showRecoveryDialog).toBe(false);
        expect(localStorage.getItem('app_recovery_clean_exit')).toBe('true');
    });
});
