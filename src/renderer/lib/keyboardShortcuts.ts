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
        defaultKeys: ['Ctrl', 'K'],
        enabled: true,
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

    constructor() {
        this.shortcuts = new Map();
        this.loadShortcuts();
    }

    /**
     * Load shortcuts from localStorage or use defaults
     */
    private loadShortcuts(): void {
        try {
            const stored = localStorage.getItem(KeyboardShortcutsManager.STORAGE_KEY);

            if (stored) {
                const parsed = JSON.parse(stored) as KeyboardShortcut[];
                parsed.forEach(shortcut => {
                    this.shortcuts.set(shortcut.id, shortcut);
                });
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
     * Reset a shortcut to default
     */
    resetShortcut(id: string): void {
        const shortcut = this.shortcuts.get(id);
        if (!shortcut) return;

        delete shortcut.customKeys;
        this.saveShortcuts();
    }

    /**
     * Reset all shortcuts to defaults
     */
    resetAllShortcuts(): void {
        this.shortcuts.forEach(shortcut => {
            delete shortcut.customKeys;
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
                const keys1 = shortcuts[i].customKeys || shortcuts[i].defaultKeys;
                const keys2 = shortcuts[j].customKeys || shortcuts[j].defaultKeys;

                if (this.areKeysEqual(keys1, keys2)) {
                    conflicts.push({
                        shortcut1: shortcuts[i],
                        shortcut2: shortcuts[j],
                        keys: keys1,
                    });
                }
            }
        }

        return conflicts;
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
        try {
            const imported = JSON.parse(json) as KeyboardShortcut[];

            // Validate imported shortcuts
            imported.forEach(shortcut => {
                if (this.shortcuts.has(shortcut.id)) {
                    this.shortcuts.set(shortcut.id, shortcut);
                }
            });

            this.saveShortcuts();
        } catch (error) {
            console.error('Failed to import shortcuts:', error);
            throw new Error('Invalid shortcuts configuration');
        }
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
     * Check if a keyboard event matches a shortcut
     */
    matchesShortcut(event: KeyboardEvent, id: string): boolean {
        const keys = this.getActiveKeys(id);
        if (!keys) return false;

        const eventKeys: string[] = [];

        if (event.ctrlKey || event.metaKey) eventKeys.push('Ctrl');
        if (event.shiftKey) eventKeys.push('Shift');
        if (event.altKey) eventKeys.push('Alt');

        // Add the actual key
        const key = event.key;
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            eventKeys.push(key);
        }

        return this.areKeysEqual(eventKeys, keys);
    }
}

// Global instance
export const keyboardShortcutsManager = new KeyboardShortcutsManager();
