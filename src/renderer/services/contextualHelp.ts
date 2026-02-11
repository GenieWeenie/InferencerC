/**
 * Contextual Help Service
 *
 * Context-sensitive help tooltips
 */

export interface HelpTooltip {
    id: string;
    target: string; // CSS selector
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    trigger?: 'hover' | 'click' | 'focus' | 'always';
    delay?: number; // Delay in ms before showing
    persistent?: boolean; // Don't auto-hide
}

export interface HelpContext {
    page: string;
    section?: string;
    element?: string;
    helpId?: string;
}

const TOOLTIP_POSITIONS = new Set<NonNullable<HelpTooltip['position']>>([
    'top',
    'bottom',
    'left',
    'right',
]);

const TOOLTIP_TRIGGERS = new Set<NonNullable<HelpTooltip['trigger']>>([
    'hover',
    'click',
    'focus',
    'always',
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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

export class ContextualHelpService {
    private static instance: ContextualHelpService;
    private readonly STORAGE_KEY = 'contextual_help';
    private readonly DISABLED_KEY = 'help_disabled';
    private tooltips: Map<string, HelpTooltip> = new Map();

    private constructor() {
        this.loadTooltips();
    }

    static getInstance(): ContextualHelpService {
        if (!ContextualHelpService.instance) {
            ContextualHelpService.instance = new ContextualHelpService();
        }
        return ContextualHelpService.instance;
    }

    private sanitizeTooltip(value: unknown): HelpTooltip | null {
        if (!isRecord(value)) {
            return null;
        }
        const id = sanitizeNonEmptyString(value.id);
        const target = sanitizeNonEmptyString(value.target);
        const title = sanitizeNonEmptyString(value.title);
        const content = sanitizeNonEmptyString(value.content);
        if (!id || !target || !title || !content) {
            return null;
        }
        return {
            id,
            target,
            title,
            content,
            position: TOOLTIP_POSITIONS.has(value.position as NonNullable<HelpTooltip['position']>)
                ? value.position as NonNullable<HelpTooltip['position']>
                : undefined,
            trigger: TOOLTIP_TRIGGERS.has(value.trigger as NonNullable<HelpTooltip['trigger']>)
                ? value.trigger as NonNullable<HelpTooltip['trigger']>
                : undefined,
            delay: typeof value.delay === 'number' && Number.isFinite(value.delay)
                ? Math.max(0, Math.floor(value.delay))
                : undefined,
            persistent: typeof value.persistent === 'boolean' ? value.persistent : undefined,
        };
    }

    private parseStoredTooltips(raw: string): HelpTooltip[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const seenIds = new Set<string>();
        return parsed
            .map((entry) => this.sanitizeTooltip(entry))
            .filter((entry): entry is HelpTooltip => {
                if (!entry) {
                    return false;
                }
                if (seenIds.has(entry.id)) {
                    return false;
                }
                seenIds.add(entry.id);
                return true;
            });
    }

    /**
     * Load tooltips
     */
    private loadTooltips(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const tooltips = this.parseStoredTooltips(stored);
                tooltips.forEach(t => this.tooltips.set(t.id, t));
                if (tooltips.length === 0) {
                    this.loadDefaultTooltips();
                }
            } else {
                // Load default tooltips
                this.loadDefaultTooltips();
            }
        } catch (error) {
            console.error('Failed to load tooltips:', error);
            this.loadDefaultTooltips();
        }
    }

    /**
     * Load default tooltips
     */
    private loadDefaultTooltips(): void {
        const defaults: HelpTooltip[] = [
            {
                id: 'new-chat',
                target: 'button[title="New Chat"]',
                title: 'New Chat',
                content: 'Start a new conversation. Your current conversation will be saved automatically.',
                position: 'bottom',
                trigger: 'hover',
            },
            // Command palette tooltip disabled - was overlapping input area
            // {
            //     id: 'command-palette',
            //     target: 'body',
            //     title: 'Command Palette',
            //     content: 'Press Ctrl+P (or Cmd+P on Mac) to open the command palette. Access all features quickly!',
            //     position: 'top',
            //     trigger: 'hover',
            //     persistent: false,
            //     delay: 3000,
            // },
            {
                id: 'system-prompt',
                target: 'textarea[placeholder*="system"], textarea[name*="system"]',
                title: 'System Prompt',
                content: 'The system prompt sets the behavior and personality of the AI. Double-click to edit.',
                position: 'top',
                trigger: 'hover',
            },
            {
                id: 'temperature',
                target: 'input[name*="temperature"], input[aria-label*="temperature"]',
                title: 'Temperature',
                content: 'Controls randomness. Lower values (0.1-0.3) = more focused, Higher values (0.7-1.0) = more creative.',
                position: 'top',
                trigger: 'hover',
            },
            {
                id: 'max-tokens',
                target: 'input[name*="maxTokens"], input[aria-label*="max tokens"]',
                title: 'Max Tokens',
                content: 'Maximum length of the response. Higher values allow longer responses but use more tokens.',
                position: 'top',
                trigger: 'hover',
            },
            {
                id: 'export',
                target: 'button[title*="Export"], button[title*="export"]',
                title: 'Export Conversation',
                content: 'Export your conversation in multiple formats: PDF, DOCX, HTML, Markdown, or JSON.',
                position: 'top',
                trigger: 'hover',
            },
            {
                id: 'templates',
                target: 'button[title="Templates"]',
                title: 'Templates',
                content: 'Use pre-built conversation templates or create your own for common workflows.',
                position: 'bottom',
                trigger: 'hover',
            },
            {
                id: 'settings',
                target: '[data-nav="settings"]',
                title: 'Settings',
                content: 'Configure API keys, model endpoints, themes, and all app preferences.',
                position: 'left',
                trigger: 'hover',
            },
        ];

        defaults.forEach(t => this.tooltips.set(t.id, t));
        this.saveTooltips();
    }

    /**
     * Save tooltips
     */
    private saveTooltips(): void {
        try {
            const seenIds = new Set<string>();
            const tooltips = Array.from(this.tooltips.values())
                .map((entry) => this.sanitizeTooltip(entry))
                .filter((entry): entry is HelpTooltip => {
                    if (!entry) {
                        return false;
                    }
                    if (seenIds.has(entry.id)) {
                        return false;
                    }
                    seenIds.add(entry.id);
                    return true;
                });
            this.tooltips = new Map(tooltips.map((entry) => [entry.id, entry]));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tooltips));
        } catch (error) {
            console.error('Failed to save tooltips:', error);
        }
    }

    /**
     * Get tooltip for element
     */
    getTooltipForElement(selector: string): HelpTooltip | null {
        // Try exact match first
        for (const tooltip of this.tooltips.values()) {
            if (tooltip.target === selector) {
                return tooltip;
            }
        }

        // Try partial match
        for (const tooltip of this.tooltips.values()) {
            if (selector.includes(tooltip.target) || tooltip.target.includes(selector)) {
                return tooltip;
            }
        }

        return null;
    }

    /**
     * Get tooltip by ID
     */
    getTooltip(id: string): HelpTooltip | null {
        const normalizedId = sanitizeNonEmptyString(id);
        if (!normalizedId) {
            return null;
        }
        return this.tooltips.get(normalizedId) || null;
    }

    /**
     * Get all tooltips
     */
    getAllTooltips(): HelpTooltip[] {
        return Array.from(this.tooltips.values());
    }

    /**
     * Add or update tooltip
     */
    setTooltip(tooltip: HelpTooltip): void {
        const sanitized = this.sanitizeTooltip(tooltip);
        if (!sanitized) {
            return;
        }
        this.tooltips.set(sanitized.id, sanitized);
        this.saveTooltips();
    }

    /**
     * Remove tooltip
     */
    removeTooltip(id: string): void {
        const normalizedId = sanitizeNonEmptyString(id);
        if (!normalizedId) {
            return;
        }
        this.tooltips.delete(normalizedId);
        this.saveTooltips();
    }

    /**
     * Check if help is enabled
     */
    isHelpEnabled(): boolean {
        try {
            return localStorage.getItem(this.DISABLED_KEY) !== 'true';
        } catch {
            return true;
        }
    }

    /**
     * Enable/disable help
     */
    setHelpEnabled(enabled: boolean): void {
        localStorage.setItem(this.DISABLED_KEY, enabled ? 'false' : 'true');
    }

    /**
     * Get help for current context
     */
    getContextualHelp(context: HelpContext): HelpTooltip[] {
        const relevant: HelpTooltip[] = [];

        for (const tooltip of this.tooltips.values()) {
            // Match by page
            if (tooltip.target.includes(context.page)) {
                relevant.push(tooltip);
            }
            // Match by section
            if (context.section && tooltip.target.includes(context.section)) {
                relevant.push(tooltip);
            }
            // Match by element
            if (context.element && tooltip.target === context.element) {
                relevant.push(tooltip);
            }
            // Match by help ID
            if (context.helpId && tooltip.id === context.helpId) {
                relevant.push(tooltip);
            }
        }

        return relevant;
    }
}

export const contextualHelpService = ContextualHelpService.getInstance();
