/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import {
    deriveLaunchChecklistState,
    readPersistedLaunchChecklistCompleted,
    useChatLaunchReadiness,
} from '../useChatLaunchReadiness';

describe('deriveLaunchChecklistState', () => {
    const readinessSteps = [
        { id: 'provider', title: 'Provider Reachable', description: 'ok', complete: true },
        { id: 'model', title: 'Model Selected', description: 'ok', complete: true },
        { id: 'prompt', title: 'Prompt Drafted', description: 'pending', complete: false },
    ];

    it('computes completion counts and checklist visibility for incomplete setup', () => {
        const result = deriveLaunchChecklistState({
            hasCompletedLaunchChecklist: false,
            readinessSteps,
        });

        expect(result.readinessCompletedCount).toBe(2);
        expect(result.launchChecklistComplete).toBe(false);
        expect(result.shouldShowLaunchChecklist).toBe(true);
    });

    it('hides checklist after completion persistence flag is set', () => {
        const result = deriveLaunchChecklistState({
            hasCompletedLaunchChecklist: true,
            readinessSteps,
        });

        expect(result.readinessCompletedCount).toBe(2);
        expect(result.launchChecklistComplete).toBe(false);
        expect(result.shouldShowLaunchChecklist).toBe(false);
    });

    it('marks checklist complete and hidden when all readiness steps are complete', () => {
        const result = deriveLaunchChecklistState({
            hasCompletedLaunchChecklist: false,
            readinessSteps: readinessSteps.map((step) => ({ ...step, complete: true })),
        });

        expect(result.readinessCompletedCount).toBe(3);
        expect(result.launchChecklistComplete).toBe(true);
        expect(result.shouldShowLaunchChecklist).toBe(false);
    });
});

describe('useChatLaunchReadiness persistence guards', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('treats only "1" as completed launch checklist marker', () => {
        expect(readPersistedLaunchChecklistCompleted()).toBe(false);

        localStorage.setItem('chat_launch_checklist_completed', 'true');
        expect(readPersistedLaunchChecklistCompleted()).toBe(false);

        localStorage.setItem('chat_launch_checklist_completed', '1');
        expect(readPersistedLaunchChecklistCompleted()).toBe(true);
    });

    it('keeps checklist hidden after persisted completion even with blank prompt', () => {
        localStorage.setItem('chat_launch_checklist_completed', '1');
        const { result } = renderHook(() => useChatLaunchReadiness({
            connectionStatus: { local: 'online', remote: 'none' },
            currentModel: 'local-lmstudio',
            currentModelLabel: 'LM Studio',
            input: '   ',
        }));

        expect(result.current.hasCompletedLaunchChecklist).toBe(true);
        expect(result.current.shouldShowLaunchChecklist).toBe(false);
        expect(result.current.promptReady).toBe(false);
    });
});
