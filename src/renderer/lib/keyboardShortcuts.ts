/**
 * Keyboard Shortcuts Manager
 *
 * Manages customizable keyboard shortcuts throughout the application.
 * Provides conflict detection, import/export, and reset functionality.
 */

export interface KeyboardShortcut {
    id: string;
    label: string;
    description: string;
    category: ShortcutCategory;
    defaultKeys: string[];
    customKeys?: string[];
    enabled: boolean;
    isChord?: boolean;
    defaultChord?: string[][];
    customChord?: string[][];
}

export type ShortcutCategory =
    | 'Navigation'
    | 'Chat'
    | 'Editing'
    | 'View'
    | 'Tools'
    | 'System';

export interface ShortcutConflict {
    shortcut1: KeyboardShortcut;
    shortcut2: KeyboardShortcut;
    keys: string[];
}

/**
 * Chord binding represents a sequence of key combinations
 * Example: [['Ctrl', 'K'], ['Ctrl', 'C']] means press Ctrl+K, then press Ctrl+C
 */
export type ChordBinding = string[][];

const SHORTCUT_CATEGORIES = new Set<ShortcutCategory>([
    'Navigation',
    'Chat',
    'Editing',
    'View',
    'Tools',
    'System',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeKeyBinding = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
};

const sanitizeChordBinding = (value: unknown): ChordBinding => {
    if (!Array.isArray(value)) {
        return [];
    }
    const chord: ChordBinding = [];
    for (let index = 0; index < value.length; index++) {
        const keys = sanitizeKeyBinding(value[index]);
        if (keys.length > 0) {
            chord.push(keys);
        }
    }
    return chord;
};

// Default keyboard shortcuts configuration
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
    // Navigation
    {
        id: 'nav.commandPalette',
        label: 'Open Command Palette',
        description: 'Open the command palette to search and execute commands',
        category: 'Navigation',
        defaultKeys: ['Ctrl', 'P'],
        enabled: true,
    },
    {
        id: 'nav.settings',
        label: 'Open Settings',
        description: 'Open the settings dialog',
        category: 'Navigation',
        defaultKeys: ['Ctrl', ','],
        enabled: true,
    },
    {
        id: 'nav.shortcuts',
        label: 'View Keyboard Shortcuts',
        description: 'View all available keyboard shortcuts',
        category: 'Navigation',
        defaultKeys: ['Ctrl', '/'],
        enabled: true,
    },
    {
        id: 'nav.quickOpen',
        label: 'Quick Open File',
        description: 'Quickly open a file from the project',
        category: 'Navigation',
        defaultKeys: [],
        enabled: true,
        isChord: true,
        defaultChord: [['Ctrl', 'K'], ['Ctrl', 'O']],
    },
    {
        id: 'nav.goToLine',
        label: 'Go to Line',
        description: 'Jump to a specific line number',
        category: 'Navigation',
        defaultKeys: [],
        enabled: true,
        isChord: true,
        defaultChord: [['Ctrl', 'K'], ['Ctrl', 'G']],
    },

    // Chat
    {
        id: 'chat.new',
        label: 'New Chat',
        description: 'Start a new chat conversation',
        category: 'Chat',
        defaultKeys: ['Ctrl', 'N'],
        enabled: true,
    },
    {
        id: 'chat.clear',
        label: 'Clear Chat',
        description: 'Clear the current chat conversation',
        category: 'Chat',
        defaultKeys: ['Ctrl', 'Shift', 'K'],
        enabled: true,
    },
    {
        id: 'chat.send',
        label: 'Send Message',
        description: 'Send the current message',
        category: 'Chat',
        defaultKeys: ['Enter'],
        enabled: true,
    },
    {
        id: 'chat.newLine',
        label: 'New Line in Message',
        description: 'Add a new line in the message input',
        category: 'Chat',
        defaultKeys: ['Shift', 'Enter'],
        enabled: true,
    },
    {
        id: 'chat.stop',
        label: 'Stop Generation',
        description: 'Stop the AI from generating a response',
        category: 'Chat',
        defaultKeys: ['Escape'],
        enabled: true,
    },

    // Editing
    {
        id: 'edit.copy',
        label: 'Copy Message',
        description: 'Copy the selected message',
        category: 'Editing',
        defaultKeys: ['Ctrl', 'C'],
        enabled: true,
    },
    {
        id: 'edit.regenerate',
        label: 'Regenerate Response',
        description: 'Regenerate the last AI response',
        category: 'Editing',
        defaultKeys: ['Ctrl', 'R'],
        enabled: true,
    },
    {
        id: 'edit.edit',
        label: 'Edit Message',
        description: 'Edit the selected message',
        category: 'Editing',
        defaultKeys: ['Ctrl', 'E'],
        enabled: true,
    },

    // View
    {
        id: 'view.conversationTree',
        label: 'Toggle Conversation Tree',
        description: 'Open or close the conversation tree view',
        category: 'View',
        defaultKeys: ['Ctrl', 'T'],
        enabled: true,
    },
    {
        id: 'view.sidebar',
        label: 'Toggle Sidebar',
        description: 'Show or hide the sidebar',
        category: 'View',
        defaultKeys: ['Ctrl', 'B'],
        enabled: true,
    },
    {
        id: 'view.thinking',
        label: 'Toggle Thinking Process',
        description: 'Show or hide AI thinking process',
        category: 'View',
        defaultKeys: ['Ctrl', 'Shift', 'T'],
        enabled: true,
    },

    // Tools
    {
        id: 'tools.export',
        label: 'Export Chat',
        description: 'Export the current chat',
        category: 'Tools',
        defaultKeys: ['Ctrl', 'S'],
        enabled: true,
    },
    {
        id: 'tools.search',
        label: 'Search Messages',
        description: 'Search within messages',
        category: 'Tools',
        defaultKeys: ['Ctrl', 'F'],
        enabled: true,
    },

    // Branching
    {
        id: 'branch.create',
        label: 'Create Branch',
        description: 'Create a new branch from current message',
        category: 'Chat',
        defaultKeys: ['Ctrl', 'Shift', 'B'],
        enabled: true,
    },
    {
        id: 'branch.previous',
        label: 'Previous Branch',
        description: 'Navigate to previous branch',
        category: 'Navigation',
        defaultKeys: ['Alt', 'ArrowLeft'],
        enabled: true,
    },
    {
        id: 'branch.next',
        label: 'Next Branch',
        description: 'Navigate to next branch',
        category: 'Navigation',
        defaultKeys: ['Alt', 'ArrowRight'],
        enabled: true,
    },
];

export class KeyboardShortcutsManager {
    private shortcuts: Map<string, KeyboardShortcut>;
    private listeners: Set<() => void> = new Set();
    private static readonly STORAGE_KEY = 'keyboard-shortcuts';
    private static readonly CHORD_TIMEOUT = 1500; // 1.5 seconds in milliseconds

    // Chord matching state
    private chordSequence: string[][] = [];
    private chordTimeoutId: NodeJS.Timeout | null = null;
    private pendingChordShortcutId: string | null = null;

    constructor() {
        this.shortcuts = new Map();
        this.loadShortcuts();
    }

    private hydrateShortcutFromDefaults(
        defaultsById: Map<string, KeyboardShortcut>,
        storedEntryById: Map<string, Record<string, unknown>>
    ): void {
        DEFAULT_SHORTCUTS.forEach((defaultShortcut) => {
            const storedShortcut = storedEntryById.get(defaultShortcut.id);
            if (!storedShortcut) {
                this.shortcuts.set(defaultShortcut.id, { ...defaultShortcut });
                return;
            }

            const isChord = typeof storedShortcut.isChord === 'boolean'
                ? storedShortcut.isChord
                : (defaultShortcut.isChord ?? false);

            const merged: KeyboardShortcut = {
                ...defaultShortcut,
                enabled: typeof storedShortcut.enabled === 'boolean'
                    ? storedShortcut.enabled
                    : defaultShortcut.enabled,
                isChord,
            };

            if (isChord) {
                const customChord = sanitizeChordBinding(storedShortcut.customChord);
                if (customChord.length > 0) {
                    merged.customChord = customChord;
                }
            } else {
                const customKeys = sanitizeKeyBinding(storedShortcut.customKeys);
                if (customKeys.length > 0) {
                    merged.customKeys = customKeys;
                }
            }

            this.shortcuts.set(merged.id, merged);
        });

        storedEntryById.forEach((storedShortcut, id) => {
            if (defaultsById.has(id)) {
                return;
            }
            const customShortcut = this.sanitizeCustomShortcut(storedShortcut);
            if (customShortcut) {
                this.shortcuts.set(id, customShortcut);
            }
        });
    }

    private sanitizeCustomShortcut(value: unknown): KeyboardShortcut | null {
        if (!isRecord(value)) {
            return null;
        }
        if (
            typeof value.id !== 'string'
            || typeof value.label !== 'string'
            || typeof value.description !== 'string'
            || !SHORTCUT_CATEGORIES.has(value.category as ShortcutCategory)
            || typeof value.enabled !== 'boolean'
        ) {
            return null;
        }

        const isChord = typeof value.isChord === 'boolean' ? value.isChord : false;
        const defaultKeys = sanitizeKeyBinding(value.defaultKeys);
        const defaultChord = sanitizeChordBinding(value.defaultChord);
        if (!isChord && defaultKeys.length === 0) {
            return null;
        }
        if (isChord && defaultChord.length === 0) {
            return null;
        }

        const shortcut: KeyboardShortcut = {
            id: value.id,
            label: value.label,
            description: value.description,
            category: value.category as ShortcutCategory,
            defaultKeys: isChord ? [] : defaultKeys,
            enabled: value.enabled,
            isChord,
            defaultChord: isChord ? defaultChord : undefined,
        };

        const customKeys = sanitizeKeyBinding(value.customKeys);
        const customChord = sanitizeChordBinding(value.customChord);
        if (!isChord && customKeys.length > 0) {
            shortcut.customKeys = customKeys;
        }
        if (isChord && customChord.length > 0) {
            shortcut.customChord = customChord;
        }

        return shortcut;
    }

    private loadStoredShortcutRecords(stored: string): Map<string, Record<string, unknown>> {
        const parsed = parseJson(stored);
        if (!Array.isArray(parsed)) {
            return new Map();
        }

        const storedById = new Map<string, Record<string, unknown>>();
        parsed.forEach((entry) => {
            if (!isRecord(entry) || typeof entry.id !== 'string') {
                return;
            }
            storedById.set(entry.id, entry);
        });

        return storedById;
    }

    /**
     * Load shortcuts from localStorage or use defaults
     */
    private loadShortcuts(): void {
        try {
            const stored = localStorage.getItem(KeyboardShortcutsManager.STORAGE_KEY);

            if (stored) {
                const defaultsById = new Map(DEFAULT_SHORTCUTS.map(shortcut => [shortcut.id, shortcut]));
                const storedById = this.loadStoredShortcutRecords(stored);
                this.hydrateShortcutFromDefaults(defaultsById, storedById);
                // Persist normalized structure back to storage after migration.
                localStorage.setItem(
                    KeyboardShortcutsManager.STORAGE_KEY,
                    JSON.stringify(Array.from(this.shortcuts.values()))
                );
            } else {
                // Use defaults
                DEFAULT_SHORTCUTS.forEach(shortcut => {
                    this.shortcuts.set(shortcut.id, { ...shortcut });
                });
            }
        } catch (error) {
            console.error('Failed to load keyboard shortcuts:', error);
            // Fall back to defaults
            DEFAULT_SHORTCUTS.forEach(shortcut => {
                this.shortcuts.set(shortcut.id, { ...shortcut });
            });
        }
    }

    /**
     * Save shortcuts to localStorage
     */
    private saveShortcuts(): void {
        try {
            const shortcuts = Array.from(this.shortcuts.values());
            localStorage.setItem(
                KeyboardShortcutsManager.STORAGE_KEY,
                JSON.stringify(shortcuts)
            );
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to save keyboard shortcuts:', error);
        }
    }

    /**
     * Get all shortcuts
     */
    getAllShortcuts(): KeyboardShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Get shortcuts by category
     */
    getShortcutsByCategory(category: ShortcutCategory): KeyboardShortcut[] {
        return Array.from(this.shortcuts.values()).filter(
            s => s.category === category
        );
    }

    /**
     * Get a specific shortcut
     */
    getShortcut(id: string): KeyboardShortcut | undefined {
        return this.shortcuts.get(id);
    }

    /**
     * Get the active keys for a shortcut (custom or default)
     */
    getActiveKeys(id: string): string[] | undefined {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut || !shortcut.enabled) return undefined;
        return shortcut.customKeys || shortcut.defaultKeys;
    }

    /**
     * Update a shortcut's custom keys
     */
    updateShortcut(id: string, customKeys: string[]): void {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut) return;

        shortcut.customKeys = customKeys;
        this.saveShortcuts();
    }

    /**
     * Update a shortcut's custom chord
     */
    updateChordShortcut(id: string, customChord: string[][]): void {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut) return;

        shortcut.isChord = true;
        shortcut.customChord = customChord;
        delete shortcut.customKeys;
        this.saveShortcuts();
    }

    /**
     * Reset a shortcut to default
     */
    resetShortcut(id: string): void {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut) return;

        delete shortcut.customKeys;
        delete shortcut.customChord;
        this.saveShortcuts();
    }

    /**
     * Reset all shortcuts to defaults
     */
    resetAllShortcuts(): void {
        this.shortcuts.forEach(shortcut => {
            delete shortcut.customKeys;
            delete shortcut.customChord;
        });
        this.saveShortcuts();
    }

    /**
     * Enable/disable a shortcut
     */
    setShortcutEnabled(id: string, enabled: boolean): void {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut) return;

        shortcut.enabled = enabled;
        this.saveShortcuts();
    }

    /**
     * Check for conflicts between shortcuts
     */
    findConflicts(): ShortcutConflict[] {
        const conflicts: ShortcutConflict[] = [];
        const shortcuts = Array.from(this.shortcuts.values()).filter(s => s.enabled);

        for (let i = 0; i < shortcuts.length; i++) {
            for (let j = i + 1; j < shortcuts.length; j++) {
                const conflict = this.checkShortcutConflict(shortcuts[i], shortcuts[j]);
                if (conflict) {
                    conflicts.push(conflict);
                }
            }
        }

        return conflicts;
    }

    /**
     * Check if two shortcuts conflict
     * Handles single-key, chord, and prefix conflicts
     */
    private checkShortcutConflict(
        shortcut1: KeyboardShortcut,
        shortcut2: KeyboardShortcut
    ): ShortcutConflict | null {
        const isChord1 = shortcut1.isChord;
        const isChord2 = shortcut2.isChord;

        // Case 1: Both are single-key shortcuts
        if (!isChord1 && !isChord2) {
            const keys1 = shortcut1.customKeys || shortcut1.defaultKeys;
            const keys2 = shortcut2.customKeys || shortcut2.defaultKeys;

            if (this.areKeysEqual(keys1, keys2)) {
                return {
                    shortcut1,
                    shortcut2,
                    keys: keys1,
                };
            }
        }

        // Case 2: Both are chord shortcuts
        if (isChord1 && isChord2) {
            const chord1 = shortcut1.customChord || shortcut1.defaultChord;
            const chord2 = shortcut2.customChord || shortcut2.defaultChord;

            if (!chord1 || !chord2) return null;

            // Check for exact chord match
            if (this.areChordsEqual(chord1, chord2)) {
                return {
                    shortcut1,
                    shortcut2,
                    keys: chord1[0], // Use first key combo as representative
                };
            }

            // Check for prefix conflicts (one chord is prefix of another)
            if (this.isChordPrefix(chord1, chord2) || this.isChordPrefix(chord2, chord1)) {
                return {
                    shortcut1,
                    shortcut2,
                    keys: chord1[0], // Use first key combo as representative
                };
            }
        }

        // Case 3: One is chord, one is single-key
        if (isChord1 && !isChord2) {
            const chord1 = shortcut1.customChord || shortcut1.defaultChord;
            const keys2 = shortcut2.customKeys || shortcut2.defaultKeys;

            if (chord1 && this.doesSingleKeyConflictWithChord(keys2, chord1)) {
                return {
                    shortcut1,
                    shortcut2,
                    keys: keys2,
                };
            }
        }

        if (!isChord1 && isChord2) {
            const keys1 = shortcut1.customKeys || shortcut1.defaultKeys;
            const chord2 = shortcut2.customChord || shortcut2.defaultChord;

            if (chord2 && this.doesSingleKeyConflictWithChord(keys1, chord2)) {
                return {
                    shortcut1,
                    shortcut2,
                    keys: keys1,
                };
            }
        }

        return null;
    }

    /**
     * Check if two chords are equal
     */
    private areChordsEqual(chord1: ChordBinding, chord2: ChordBinding): boolean {
        if (chord1.length !== chord2.length) return false;

        return chord1.every((keys, index) =>
            this.areKeysEqual(keys, chord2[index])
        );
    }

    /**
     * Check if chord1 is a prefix of chord2
     * Example: [['Ctrl', 'K']] is a prefix of [['Ctrl', 'K'], ['Ctrl', 'C']]
     */
    private isChordPrefix(chord1: ChordBinding, chord2: ChordBinding): boolean {
        if (chord1.length >= chord2.length) return false;

        return chord1.every((keys, index) =>
            this.areKeysEqual(keys, chord2[index])
        );
    }

    /**
     * Check if a single-key shortcut conflicts with the first part of a chord
     * Example: ['Ctrl', 'K'] conflicts with [['Ctrl', 'K'], ['Ctrl', 'C']]
     */
    private doesSingleKeyConflictWithChord(
        singleKeys: string[],
        chord: ChordBinding
    ): boolean {
        if (chord.length === 0) return false;
        return this.areKeysEqual(singleKeys, chord[0]);
    }

    /**
     * Check if two key combinations are equal
     */
    private areKeysEqual(keys1: string[], keys2: string[]): boolean {
        if (keys1.length !== keys2.length) return false;

        const normalized1 = this.normalizeKeys(keys1);
        const normalized2 = this.normalizeKeys(keys2);

        return normalized1.every((key, index) => key === normalized2[index]);
    }

    /**
     * Normalize keys for comparison
     */
    private normalizeKeys(keys: string[]): string[] {
        return keys.map(k => k.toLowerCase()).sort();
    }

    /**
     * Export shortcuts configuration
     */
    exportShortcuts(): string {
        const shortcuts = Array.from(this.shortcuts.values());
        return JSON.stringify(shortcuts, null, 2);
    }

    /**
     * Import shortcuts configuration
     */
    importShortcuts(json: string): void {
        const parsed = parseJson(json);
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid shortcuts configuration');
        }

        const defaultsById = new Map(DEFAULT_SHORTCUTS.map(shortcut => [shortcut.id, shortcut]));
        const importedById = new Map<string, Record<string, unknown>>();
        parsed.forEach((entry) => {
            if (!isRecord(entry) || typeof entry.id !== 'string') {
                return;
            }
            importedById.set(entry.id, entry);
        });

        if (importedById.size === 0) {
            throw new Error('Invalid shortcuts configuration');
        }

        this.shortcuts.clear();
        this.hydrateShortcutFromDefaults(defaultsById, importedById);
        this.saveShortcuts();
    }

    /**
     * Subscribe to shortcut changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Get the active chord for a shortcut (custom or default)
     */
    private getActiveChord(id: string): ChordBinding | undefined {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut || !shortcut.enabled || !shortcut.isChord) return undefined;
        return shortcut.customChord || shortcut.defaultChord;
    }

    /**
     * Reset the chord sequence
     */
    private resetChordSequence(): void {
        this.chordSequence = [];
        this.pendingChordShortcutId = null;

        if (this.chordTimeoutId) {
            clearTimeout(this.chordTimeoutId);
            this.chordTimeoutId = null;
        }
    }

    /**
     * Extract keys from keyboard event
     */
    private extractKeysFromEvent(event: KeyboardEvent): string[] {
        const eventKeys: string[] = [];

        if (event.ctrlKey || event.metaKey) eventKeys.push('Ctrl');
        if (event.shiftKey) eventKeys.push('Shift');
        if (event.altKey) eventKeys.push('Alt');

        // Add the actual key
        const key = event.key;
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            eventKeys.push(key);
        }

        return eventKeys;
    }

    /**
     * Check if current sequence matches a chord pattern
     */
    private matchesChordPattern(sequence: string[][], chord: ChordBinding): boolean {
        if (sequence.length !== chord.length) return false;

        return sequence.every((keys, index) =>
            this.areKeysEqual(keys, chord[index])
        );
    }

    /**
     * Check if current sequence is a partial match for any chord
     */
    private isPartialChordMatch(sequence: string[][], chord: ChordBinding): boolean {
        if (sequence.length >= chord.length) return false;

        return sequence.every((keys, index) =>
            this.areKeysEqual(keys, chord[index])
        );
    }

    /**
     * Check if a keyboard event matches a chord shortcut
     * Returns the shortcut ID if matched, null if partial match (waiting for more keys),
     * undefined if no match
     */
    matchesChordShortcut(event: KeyboardEvent): string | null | undefined {
        const eventKeys = this.extractKeysFromEvent(event);

        // Add current keys to sequence
        this.chordSequence.push(eventKeys);

        // Clear existing timeout
        if (this.chordTimeoutId) {
            clearTimeout(this.chordTimeoutId);
            this.chordTimeoutId = null;
        }

        // Check all chord shortcuts
        const chordShortcuts = Array.from(this.shortcuts.values())
            .filter(s => s.enabled && s.isChord);

        for (const shortcut of chordShortcuts) {
            const chord = this.getActiveChord(shortcut.id);
            if (!chord) continue;

            // Check for complete match
            if (this.matchesChordPattern(this.chordSequence, chord)) {
                this.resetChordSequence();
                return shortcut.id;
            }

            // Check for partial match
            if (this.isPartialChordMatch(this.chordSequence, chord)) {
                this.pendingChordShortcutId = shortcut.id;

                // Set timeout to reset sequence
                this.chordTimeoutId = setTimeout(() => {
                    this.resetChordSequence();
                }, KeyboardShortcutsManager.CHORD_TIMEOUT);

                return null; // Partial match, waiting for more keys
            }
        }

        // No match found, reset sequence
        this.resetChordSequence();
        return undefined;
    }

    /**
     * Check if a keyboard event matches a shortcut
     */
    matchesShortcut(event: KeyboardEvent, id: string): boolean {
        const keys = this.getActiveKeys(id);
        if (!keys) return false;

        const eventKeys = this.extractKeysFromEvent(event);

        return this.areKeysEqual(eventKeys, keys);
    }
}

// Global instance
export const keyboardShortcutsManager = new KeyboardShortcutsManager();
