/**
 * Accessibility Service
 *
 * WCAG 2.1 AA compliance features
 */

export interface AccessibilityConfig {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    touchTargetSize: 'standard' | 'large' | 'xlarge';
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

const FONT_SIZE_VALUES = new Set<AccessibilityConfig['fontSize']>(['small', 'medium', 'large', 'xlarge']);
const TOUCH_TARGET_VALUES = new Set<AccessibilityConfig['touchTargetSize']>(['standard', 'large', 'xlarge']);
const COLOR_BLIND_VALUES = new Set<AccessibilityConfig['colorBlindMode']>(['none', 'protanopia', 'deuteranopia', 'tritanopia']);

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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

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

    private getDefaultConfig(): AccessibilityConfig {
        return {
            reducedMotion: false,
            highContrast: false,
            fontSize: 'medium',
            touchTargetSize: 'standard',
            screenReader: true,
            keyboardNavigation: true,
            focusVisible: true,
            ariaLabels: true,
            colorBlindMode: 'none',
        };
    }

    private sanitizeConfig(value: unknown): AccessibilityConfig | null {
        if (!isRecord(value)) {
            return null;
        }
        const defaults = this.getDefaultConfig();
        return {
            reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : defaults.reducedMotion,
            highContrast: typeof value.highContrast === 'boolean' ? value.highContrast : defaults.highContrast,
            fontSize: FONT_SIZE_VALUES.has(value.fontSize as AccessibilityConfig['fontSize'])
                ? value.fontSize as AccessibilityConfig['fontSize']
                : defaults.fontSize,
            touchTargetSize: TOUCH_TARGET_VALUES.has(value.touchTargetSize as AccessibilityConfig['touchTargetSize'])
                ? value.touchTargetSize as AccessibilityConfig['touchTargetSize']
                : defaults.touchTargetSize,
            screenReader: typeof value.screenReader === 'boolean' ? value.screenReader : defaults.screenReader,
            keyboardNavigation: typeof value.keyboardNavigation === 'boolean' ? value.keyboardNavigation : defaults.keyboardNavigation,
            focusVisible: typeof value.focusVisible === 'boolean' ? value.focusVisible : defaults.focusVisible,
            ariaLabels: typeof value.ariaLabels === 'boolean' ? value.ariaLabels : defaults.ariaLabels,
            colorBlindMode: COLOR_BLIND_VALUES.has(value.colorBlindMode as AccessibilityConfig['colorBlindMode'])
                ? value.colorBlindMode as AccessibilityConfig['colorBlindMode']
                : defaults.colorBlindMode,
        };
    }

    private sanitizeShortcut(value: unknown): KeyboardShortcut | null {
        if (!isRecord(value)) {
            return null;
        }
        const key = sanitizeNonEmptyString(value.key);
        const action = sanitizeNonEmptyString(value.action);
        const description = sanitizeNonEmptyString(value.description);
        if (!key || !action || !description) {
            return null;
        }
        return {
            key,
            action,
            description,
            ctrl: typeof value.ctrl === 'boolean' ? value.ctrl : undefined,
            shift: typeof value.shift === 'boolean' ? value.shift : undefined,
            alt: typeof value.alt === 'boolean' ? value.alt : undefined,
        };
    }

    /**
     * Initialize accessibility features
     */
    private initializeAccessibility(): void {
        const config = this.getConfig();

        // Apply reduced motion
        document.documentElement.setAttribute('data-motion-reduce', config.reducedMotion ? '1' : '0');

        // Apply high contrast
        document.documentElement.classList.toggle('high-contrast', config.highContrast);

        // Apply font size
        document.documentElement.setAttribute('data-font-size', config.fontSize);

        // Apply touch target size
        document.documentElement.setAttribute('data-touch-target-size', config.touchTargetSize);

        // Apply color blind mode
        if (config.colorBlindMode !== 'none') {
            document.documentElement.setAttribute('data-color-blind', config.colorBlindMode);
        } else {
            document.documentElement.removeAttribute('data-color-blind');
        }
    }

    /**
     * Get accessibility configuration
     */
    getConfig(): AccessibilityConfig {
        const defaults = this.getDefaultConfig();

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = parseJson(stored);
                const config = this.sanitizeConfig(parsed);
                if (config) {
                    return config;
                }
            }
        } catch (error) {
            console.error('Failed to load accessibility config:', error);
        }

        return defaults;
    }

    /**
     * Update accessibility configuration
     */
    updateConfig(config: Partial<AccessibilityConfig>): void {
        const current = this.getConfig();
        const updated = this.sanitizeConfig({ ...current, ...config }) || current;
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
                const parsed = parseJson(stored);
                if (Array.isArray(parsed)) {
                    const shortcuts = parsed
                        .map((entry) => this.sanitizeShortcut(entry))
                        .filter((entry): entry is KeyboardShortcut => entry !== null);
                    if (shortcuts.length > 0) {
                        return shortcuts;
                    }
                }
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
        const seen = new Set<string>();
        const sanitized = shortcuts
            .map((entry) => this.sanitizeShortcut(entry))
            .filter((entry): entry is KeyboardShortcut => {
                if (!entry) {
                    return false;
                }
                const signature = [
                    entry.key.toLowerCase(),
                    entry.action.toLowerCase(),
                    entry.ctrl ? '1' : '0',
                    entry.shift ? '1' : '0',
                    entry.alt ? '1' : '0',
                ].join(':');
                if (seen.has(signature)) {
                    return false;
                }
                seen.add(signature);
                return true;
            });
        if (sanitized.length === 0) {
            localStorage.removeItem(this.SHORTCUTS_KEY);
            return;
        }
        localStorage.setItem(this.SHORTCUTS_KEY, JSON.stringify(sanitized));
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
