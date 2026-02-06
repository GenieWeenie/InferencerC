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

    /**
     * Load tooltips
     */
    private loadTooltips(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const tooltips: HelpTooltip[] = JSON.parse(stored);
                tooltips.forEach(t => this.tooltips.set(t.id, t));
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
            const tooltips = Array.from(this.tooltips.values());
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
        return this.tooltips.get(id) || null;
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
        this.tooltips.set(tooltip.id, tooltip);
        this.saveTooltips();
    }

    /**
     * Remove tooltip
     */
    removeTooltip(id: string): void {
        this.tooltips.delete(id);
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
