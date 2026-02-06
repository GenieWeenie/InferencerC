/**
 * Accessibility Service
 *
 * WCAG 2.1 AA compliance features
 */

export interface AccessibilityConfig {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    screenReader: boolean;
    keyboardNavigation: boolean;
    focusVisible: boolean;
    ariaLabels: boolean;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: string;
    description: string;
}

export class AccessibilityService {
    private static instance: AccessibilityService;
    private readonly STORAGE_KEY = 'accessibility_config';
    private readonly SHORTCUTS_KEY = 'accessibility_shortcuts';

    private constructor() {
        this.initializeAccessibility();
    }

    static getInstance(): AccessibilityService {
        if (!AccessibilityService.instance) {
            AccessibilityService.instance = new AccessibilityService();
        }
        return AccessibilityService.instance;
    }

    /**
     * Initialize accessibility features
     */
    private initializeAccessibility(): void {
        const config = this.getConfig();

        // Apply reduced motion
        if (config.reducedMotion) {
            document.documentElement.style.setProperty('--motion-reduce', '1');
        }

        // Apply high contrast
        if (config.highContrast) {
            document.documentElement.classList.add('high-contrast');
        }

        // Apply font size
        document.documentElement.setAttribute('data-font-size', config.fontSize);

        // Apply color blind mode
        if (config.colorBlindMode !== 'none') {
            document.documentElement.setAttribute('data-color-blind', config.colorBlindMode);
        }
    }

    /**
     * Get accessibility configuration
     */
    getConfig(): AccessibilityConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load accessibility config:', error);
        }

        return {
            reducedMotion: false,
            highContrast: false,
            fontSize: 'medium',
            screenReader: true,
            keyboardNavigation: true,
            focusVisible: true,
            ariaLabels: true,
            colorBlindMode: 'none',
        };
    }

    /**
     * Update accessibility configuration
     */
    updateConfig(config: Partial<AccessibilityConfig>): void {
        const current = this.getConfig();
        const updated = { ...current, ...config };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        this.initializeAccessibility();
    }

    /**
     * Get keyboard shortcuts
     */
    getKeyboardShortcuts(): KeyboardShortcut[] {
        try {
            const stored = localStorage.getItem(this.SHORTCUTS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load keyboard shortcuts:', error);
        }

        // Default shortcuts
        return [
            { key: 'p', ctrl: true, action: 'command-palette', description: 'Open Command Palette' },
            { key: 'k', ctrl: true, action: 'focus-input', description: 'Focus Input' },
            { key: 'n', ctrl: true, action: 'new-conversation', description: 'New Conversation' },
            { key: 's', ctrl: true, action: 'save', description: 'Save' },
            { key: 'f', ctrl: true, action: 'search', description: 'Search' },
            { key: 'Escape', action: 'close-modal', description: 'Close Modal' },
            { key: 'Tab', action: 'next-element', description: 'Next Element' },
            { key: 'Tab', shift: true, action: 'previous-element', description: 'Previous Element' },
        ];
    }

    /**
     * Update keyboard shortcuts
     */
    updateKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
        localStorage.setItem(this.SHORTCUTS_KEY, JSON.stringify(shortcuts));
    }

    /**
     * Announce to screen readers
     */
    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        const config = this.getConfig();
        if (!config.screenReader) return;

        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Check if element is focusable
     */
    isFocusable(element: HTMLElement): boolean {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ];

        return focusableSelectors.some(selector => element.matches(selector));
    }

    /**
     * Get next focusable element
     */
    getNextFocusable(current: HTMLElement, reverse: boolean = false): HTMLElement | null {
        const focusableElements = Array.from(
            document.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        const currentIndex = focusableElements.indexOf(current);
        if (currentIndex === -1) return focusableElements[0] || null;

        if (reverse) {
            return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1] || null;
        }
        return focusableElements[currentIndex + 1] || focusableElements[0] || null;
    }

    /**
     * Trap focus within element
     */
    trapFocus(container: HTMLElement): () => void {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusableElements = Array.from(
                container.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }
}

export const accessibilityService = AccessibilityService.getInstance();
