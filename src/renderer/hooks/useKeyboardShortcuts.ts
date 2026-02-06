import { useEffect, useState, useCallback } from 'react';
import { keyboardShortcutsManager, KeyboardShortcut } from '../lib/keyboardShortcuts';

/**
 * Hook for using keyboard shortcuts in components
 *
 * @param shortcutId - The ID of the shortcut to listen for
 * @param callback - The function to call when the shortcut is triggered
 * @param enabled - Whether the shortcut should be active
 */
export function useKeyboardShortcut(
    shortcutId: string,
    callback: (event: KeyboardEvent) => void,
    enabled: boolean = true
): void {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (keyboardShortcutsManager.matchesShortcut(event, shortcutId)) {
                event.preventDefault();
                callback(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcutId, callback, enabled]);
}

/**
 * Hook for getting all shortcuts or shortcuts by category
 */
export function useKeyboardShortcuts() {
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

    useEffect(() => {
        const loadShortcuts = () => {
            setShortcuts(keyboardShortcutsManager.getAllShortcuts());
        };

        loadShortcuts();

        const unsubscribe = keyboardShortcutsManager.subscribe(loadShortcuts);
        return unsubscribe;
    }, []);

    const getShortcutKeys = useCallback((id: string): string[] | undefined => {
        return keyboardShortcutsManager.getActiveKeys(id);
    }, []);

    const formatShortcut = useCallback((id: string): string => {
        const keys = getShortcutKeys(id);
        return keys ? keys.join(' + ') : '';
    }, [getShortcutKeys]);

    return {
        shortcuts,
        getShortcutKeys,
        formatShortcut,
        manager: keyboardShortcutsManager,
    };
}

/**
 * Hook for managing shortcut editor state
 */
export function useShortcutEditor() {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    return {
        isOpen,
        open,
        close,
        toggle,
    };
}
