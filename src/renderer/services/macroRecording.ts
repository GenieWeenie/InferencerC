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

        const macro: Macro = {
            id: crypto.randomUUID(),
            name: `Macro ${new Date().toLocaleString()}`,
            actions: this.recordedActions,
            createdAt: Date.now(),
            playCount: 0,
        };

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

        const macroAction: MacroAction = {
            ...action,
            timestamp: Date.now() - this.recordingStartTime,
        };

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
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a macro
     */
    createMacro(macro: Omit<Macro, 'id' | 'createdAt' | 'playCount'>): Macro {
        const newMacro: Macro = {
            ...macro,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            playCount: 0,
        };

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
            return JSON.parse(stored);
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

        const updated = { ...macro, ...updates };
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
        const macros = this.getAllMacros();
        const index = macros.findIndex(m => m.id === macro.id);
        if (index >= 0) {
            macros[index] = macro;
        } else {
            macros.push(macro);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(macros));
    }

    /**
     * Save playback record
     */
    private savePlayback(playback: MacroPlayback): void {
        try {
            const stored = localStorage.getItem(this.PLAYBACKS_KEY);
            const playbacks: MacroPlayback[] = stored ? JSON.parse(stored) : [];
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
            const playbacks: MacroPlayback[] = JSON.parse(stored);
            return playbacks
                .sort((a, b) => (b.startedAt) - a.startedAt)
                .slice(0, limit);
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
