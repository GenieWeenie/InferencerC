/**
 * Macro Recording Service
 *
 * Record and replay complex interaction sequences
 */

export interface MacroAction {
    type: 'type' | 'click' | 'keypress' | 'wait' | 'select-model' | 'set-parameter' | 'send-message';
    timestamp: number; // Relative to macro start
    data: Record<string, unknown>;
}

export interface Macro {
    id: string;
    name: string;
    description?: string;
    actions: MacroAction[];
    createdAt: number;
    lastPlayed?: number;
    playCount: number;
}

export interface MacroPlayback {
    macroId: string;
    startedAt: number;
    completedAt?: number;
    success: boolean;
    error?: string;
    actionsExecuted: number;
}

const ACTION_TYPES = new Set<MacroAction['type']>([
    'type',
    'click',
    'keypress',
    'wait',
    'select-model',
    'set-parameter',
    'send-message',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeAction = (value: unknown): MacroAction | null => {
    if (!isRecord(value)
        || !ACTION_TYPES.has(value.type as MacroAction['type'])
        || !isFiniteNumber(value.timestamp)
        || !isRecord(value.data)) {
        return null;
    }

    return {
        type: value.type as MacroAction['type'],
        timestamp: Math.max(0, Math.floor(value.timestamp)),
        data: { ...value.data },
    };
};

const sanitizeMacro = (value: unknown): Macro | null => {
    const createdAt = isRecord(value) && isFiniteNumber(value.createdAt)
        ? Math.max(0, Math.floor(value.createdAt))
        : null;
    const playCount = isRecord(value) && isFiniteNumber(value.playCount)
        ? Math.max(0, Math.floor(value.playCount))
        : null;

    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.name !== 'string'
        || !Array.isArray(value.actions)
        || createdAt === null
        || playCount === null) {
        return null;
    }

    const id = value.id.trim();
    const name = value.name.trim();
    if (!id || !name) {
        return null;
    }
    const actions = value.actions
        .map((entry) => sanitizeAction(entry))
        .filter((entry): entry is MacroAction => entry !== null);
    if (actions.length === 0) {
        return null;
    }

    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) || undefined,
        actions,
        createdAt,
        lastPlayed: isFiniteNumber(value.lastPlayed) ? Math.max(0, Math.floor(value.lastPlayed)) : undefined,
        playCount,
    };
};

const parseStoredMacros = (raw: string): Macro[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenIds = new Set<string>();
    return parsed
        .map((entry) => sanitizeMacro(entry))
        .filter((entry): entry is Macro => {
            if (!entry) {
                return false;
            }
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
};

const sanitizePlayback = (value: unknown): MacroPlayback | null => {
    const startedAt = isRecord(value) && isFiniteNumber(value.startedAt)
        ? Math.max(0, Math.floor(value.startedAt))
        : null;
    const actionsExecuted = isRecord(value) && isFiniteNumber(value.actionsExecuted)
        ? Math.max(0, Math.floor(value.actionsExecuted))
        : null;

    if (!isRecord(value)
        || typeof value.macroId !== 'string'
        || startedAt === null
        || typeof value.success !== 'boolean'
        || actionsExecuted === null) {
        return null;
    }

    const macroId = value.macroId.trim();
    if (!macroId) {
        return null;
    }

    const completedAt = isFiniteNumber(value.completedAt)
        ? Math.max(startedAt, Math.floor(value.completedAt))
        : undefined;

    return {
        macroId,
        startedAt,
        completedAt,
        success: value.success,
        error: typeof value.error === 'string' ? value.error : undefined,
        actionsExecuted,
    };
};

const parseStoredPlaybacks = (raw: string): MacroPlayback[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizePlayback(entry))
        .filter((entry): entry is MacroPlayback => entry !== null);
};

export class MacroRecordingService {
    private static instance: MacroRecordingService;
    private readonly STORAGE_KEY = 'macros';
    private readonly PLAYBACKS_KEY = 'macro_playbacks';
    private isRecording = false;
    private recordingStartTime = 0;
    private recordedActions: MacroAction[] = [];
    private currentPlayback: MacroPlayback | null = null;

    private constructor() {}

    static getInstance(): MacroRecordingService {
        if (!MacroRecordingService.instance) {
            MacroRecordingService.instance = new MacroRecordingService();
        }
        return MacroRecordingService.instance;
    }

    /**
     * Start recording a macro
     */
    startRecording(): void {
        if (this.isRecording) return;

        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.recordedActions = [];

        // Listen for events
        this.setupRecordingListeners();
    }

    /**
     * Stop recording
     */
    stopRecording(): Macro | null {
        if (!this.isRecording) return null;

        this.isRecording = false;
        this.removeRecordingListeners();

        if (this.recordedActions.length === 0) {
            return null;
        }

        const macro = sanitizeMacro({
            id: crypto.randomUUID(),
            name: `Macro ${new Date().toLocaleString()}`,
            actions: this.recordedActions,
            createdAt: Date.now(),
            playCount: 0,
        });
        if (!macro) {
            return null;
        }

        this.saveMacro(macro);
        return macro;
    }

    /**
     * Setup recording listeners
     */
    private setupRecordingListeners(): void {
        // This would listen to DOM events, but in our case,
        // we'll record actions through explicit API calls
        // The actual recording would be done by the UI components
    }

    /**
     * Remove recording listeners
     */
    private removeRecordingListeners(): void {
        // Clean up listeners
    }

    /**
     * Record an action
     */
    recordAction(action: Omit<MacroAction, 'timestamp'>): void {
        if (!this.isRecording) return;

        const macroAction = sanitizeAction({
            ...action,
            timestamp: Date.now() - this.recordingStartTime,
        });
        if (!macroAction) {
            return;
        }

        this.recordedActions.push(macroAction);
    }

    /**
     * Play a macro
     */
    async playMacro(macroId: string, onAction?: (action: MacroAction) => Promise<void>): Promise<MacroPlayback> {
        const macro = this.getMacro(macroId);
        if (!macro) {
            throw new Error(`Macro ${macroId} not found`);
        }

        const playback: MacroPlayback = {
            macroId,
            startedAt: Date.now(),
            success: false,
            actionsExecuted: 0,
        };

        this.currentPlayback = playback;

        try {
            for (const action of macro.actions) {
                // Wait for the action's timestamp
                if (action.timestamp > 0) {
                    await this.wait(action.timestamp);
                }

                // Execute the action
                if (onAction) {
                    await onAction(action);
                } else {
                    await this.executeAction(action);
                }

                playback.actionsExecuted++;
            }

            playback.success = true;
            playback.completedAt = Date.now();

            // Update macro stats
            macro.lastPlayed = Date.now();
            macro.playCount++;
            this.saveMacro(macro);
        } catch (error) {
            playback.success = false;
            playback.error = error instanceof Error ? error.message : 'Unknown error';
        } finally {
            this.currentPlayback = null;
            this.savePlayback(playback);
        }

        return playback;
    }

    /**
     * Execute a macro action
     */
    private async executeAction(action: MacroAction): Promise<void> {
        switch (action.type) {
            case 'type':
                // Simulate typing
                window.dispatchEvent(new CustomEvent('macro-type', {
                    detail: { text: action.data.text },
                }));
                break;

            case 'click':
                // Simulate click
                window.dispatchEvent(new CustomEvent('macro-click', {
                    detail: { selector: action.data.selector },
                }));
                break;

            case 'keypress':
                // Simulate keypress
                window.dispatchEvent(new CustomEvent('macro-keypress', {
                    detail: { key: action.data.key },
                }));
                break;

            case 'wait':
                await this.wait(action.data.duration as number || 1000);
                break;

            case 'select-model':
                window.dispatchEvent(new CustomEvent('macro-select-model', {
                    detail: { modelId: action.data.modelId },
                }));
                break;

            case 'set-parameter':
                window.dispatchEvent(new CustomEvent('macro-set-parameter', {
                    detail: { parameter: action.data.parameter, value: action.data.value },
                }));
                break;

            case 'send-message':
                window.dispatchEvent(new CustomEvent('macro-send-message', {
                    detail: { message: action.data.message },
                }));
                break;

            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    /**
     * Wait for a duration
     */
    private wait(ms: number): Promise<void> {
        const duration = isFiniteNumber(ms) ? Math.max(0, Math.floor(ms)) : 0;
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    /**
     * Create a macro
     */
    createMacro(macro: Omit<Macro, 'id' | 'createdAt' | 'playCount'>): Macro {
        const newMacro = sanitizeMacro({
            ...macro,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            playCount: 0,
        });
        if (!newMacro) {
            throw new Error('Invalid macro configuration');
        }

        this.saveMacro(newMacro);
        return newMacro;
    }

    /**
     * Get all macros
     */
    getAllMacros(): Macro[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return parseStoredMacros(stored);
        } catch (error) {
            console.error('Failed to load macros:', error);
            return [];
        }
    }

    /**
     * Get a macro by ID
     */
    getMacro(id: string): Macro | null {
        const macros = this.getAllMacros();
        return macros.find(m => m.id === id) || null;
    }

    /**
     * Update a macro
     */
    updateMacro(id: string, updates: Partial<Macro>): boolean {
        const macro = this.getMacro(id);
        if (!macro) return false;

        const updated = sanitizeMacro({
            ...macro,
            ...updates,
            id: macro.id,
            createdAt: macro.createdAt,
            playCount: macro.playCount,
            actions: typeof updates.actions !== 'undefined'
                ? updates.actions
                    .map((entry) => sanitizeAction(entry))
                    .filter((entry): entry is MacroAction => entry !== null)
                : macro.actions,
        });
        if (!updated) {
            return false;
        }
        this.saveMacro(updated);
        return true;
    }

    /**
     * Delete a macro
     */
    deleteMacro(id: string): boolean {
        const macros = this.getAllMacros();
        const filtered = macros.filter(m => m.id !== id);
        if (filtered.length === macros.length) return false;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Save a macro
     */
    private saveMacro(macro: Macro): void {
        const sanitized = sanitizeMacro(macro);
        if (!sanitized) {
            return;
        }
        const macros = this.getAllMacros();
        const index = macros.findIndex(m => m.id === sanitized.id);
        if (index >= 0) {
            macros[index] = sanitized;
        } else {
            macros.push(sanitized);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(macros));
    }

    /**
     * Save playback record
     */
    private savePlayback(playback: MacroPlayback): void {
        try {
            const stored = localStorage.getItem(this.PLAYBACKS_KEY);
            const playbacks = stored ? parseStoredPlaybacks(stored) : [];
            playbacks.push(playback);
            // Keep only last 50 playbacks
            if (playbacks.length > 50) {
                playbacks.shift();
            }
            localStorage.setItem(this.PLAYBACKS_KEY, JSON.stringify(playbacks));
        } catch (error) {
            console.error('Failed to save playback:', error);
        }
    }

    /**
     * Get playback history
     */
    getPlaybackHistory(limit: number = 20): MacroPlayback[] {
        try {
            const stored = localStorage.getItem(this.PLAYBACKS_KEY);
            if (!stored) return [];
            const playbacks = parseStoredPlaybacks(stored);
            const sanitizedLimit = Number.isFinite(limit)
                ? Math.max(0, Math.floor(limit))
                : 20;
            return playbacks
                .sort((a, b) => (b.startedAt) - a.startedAt)
                .slice(0, sanitizedLimit);
        } catch (error) {
            console.error('Failed to load playback history:', error);
            return [];
        }
    }

    /**
     * Check if currently recording
     */
    getRecordingState(): { isRecording: boolean; actionCount: number } {
        return {
            isRecording: this.isRecording,
            actionCount: this.recordedActions.length,
        };
    }
}

export const macroRecordingService = MacroRecordingService.getInstance();
