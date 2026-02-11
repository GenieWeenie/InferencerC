import { deriveLaunchChecklistState } from '../useChatLaunchReadiness';

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
