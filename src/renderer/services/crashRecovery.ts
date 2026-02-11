import { RecoveryState } from '../../shared/types';

const RECOVERY_STATE_KEY = 'app_recovery_state';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeRecoveryState = (value: unknown): RecoveryState | null => {
    if (!isRecord(value) || typeof value.sessionId !== 'string' || !isFiniteNumber(value.timestamp)) {
        return null;
    }

    const sessionId = value.sessionId.trim();
    if (!sessionId) {
        return null;
    }

    return {
        sessionId,
        timestamp: Math.max(0, Math.floor(value.timestamp)),
        draftMessage: typeof value.draftMessage === 'string' && value.draftMessage.length > 0
            ? value.draftMessage
            : undefined,
        pendingResponse: typeof value.pendingResponse === 'boolean'
            ? value.pendingResponse
            : undefined,
    };
};

export class CrashRecoveryService {
    private static instance: CrashRecoveryService;
    private autoSaveTimer: NodeJS.Timeout | null = null;

    private constructor() {}

    static getInstance(): CrashRecoveryService {
        if (!CrashRecoveryService.instance) {
            CrashRecoveryService.instance = new CrashRecoveryService();
        }
        return CrashRecoveryService.instance;
    }

    /**
     * Save current conversation state for recovery
     */
    saveRecoveryState(state: RecoveryState): void {
        try {
            const sanitized = sanitizeRecoveryState(state);
            if (!sanitized) {
                return;
            }
            localStorage.setItem(RECOVERY_STATE_KEY, JSON.stringify(sanitized));
        } catch (error) {
            console.error('Failed to save recovery state:', error);
        }
    }

    /**
     * Get saved recovery state
     */
    getRecoveryState(): RecoveryState | null {
        try {
            const data = localStorage.getItem(RECOVERY_STATE_KEY);
            if (!data) return null;
            return sanitizeRecoveryState(parseJson(data));
        } catch (error) {
            console.error('Failed to load recovery state:', error);
            return null;
        }
    }

    /**
     * Check if recovery state exists
     */
    hasRecoveryState(): boolean {
        return this.getRecoveryState() !== null;
    }

    /**
     * Clear recovery state (after successful recovery or dismissal)
     */
    clearRecoveryState(): void {
        try {
            localStorage.removeItem(RECOVERY_STATE_KEY);
        } catch (error) {
            console.error('Failed to clear recovery state:', error);
        }
    }

    /**
     * Start auto-save timer for periodic state saving
     */
    startAutoSave(callback: () => void): void {
        // Clear existing timer if any
        this.stopAutoSave();

        // Set up new timer
        this.autoSaveTimer = setInterval(() => {
            callback();
        }, AUTO_SAVE_INTERVAL);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * Save draft message for current session
     */
    saveDraft(sessionId: string, draftMessage: string): void {
        const currentState = this.getRecoveryState();

        const state: RecoveryState = {
            sessionId: currentState?.sessionId || sessionId,
            timestamp: Date.now(),
            draftMessage: draftMessage || undefined,
            pendingResponse: currentState?.pendingResponse,
        };

        this.saveRecoveryState(state);
    }

    /**
     * Get draft message for current session
     */
    getDraft(sessionId: string): string | undefined {
        const state = this.getRecoveryState();
        if (state && state.sessionId === sessionId) {
            return state.draftMessage;
        }
        return undefined;
    }

    /**
     * Mark that a response is pending (for mid-response crash recovery)
     */
    setPendingResponse(sessionId: string, pending: boolean): void {
        const currentState = this.getRecoveryState();

        const state: RecoveryState = {
            sessionId: currentState?.sessionId || sessionId,
            timestamp: Date.now(),
            draftMessage: currentState?.draftMessage,
            pendingResponse: pending,
        };

        this.saveRecoveryState(state);
    }

    /**
     * Check if there's a pending response for the session
     */
    hasPendingResponse(sessionId: string): boolean {
        const state = this.getRecoveryState();
        return state?.sessionId === sessionId && state?.pendingResponse === true;
    }
}

export const crashRecoveryService = CrashRecoveryService.getInstance();
