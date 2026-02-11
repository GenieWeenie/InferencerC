/**
 * Onboarding Service
 *
 * Interactive tutorial and feature discovery
 */

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    target?: string; // CSS selector for element to highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: 'click' | 'type' | 'scroll' | 'wait';
    actionTarget?: string; // What to click/type
    skipable?: boolean;
    onComplete?: () => void;
}

export interface Tutorial {
    id: string;
    name: string;
    description: string;
    steps: TutorialStep[];
    completed: boolean;
    completedAt?: number;
}

export interface FeatureDiscovery {
    id: string;
    featureName: string;
    description: string;
    target?: string; // CSS selector
    version?: string; // Version when feature was added
    shown: boolean;
    shownAt?: number;
    dismissed: boolean;
    dismissedAt?: number;
}

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

const STEP_POSITIONS = new Set<NonNullable<TutorialStep['position']>>([
    'top',
    'bottom',
    'left',
    'right',
    'center',
]);

const STEP_ACTIONS = new Set<NonNullable<TutorialStep['action']>>([
    'click',
    'type',
    'scroll',
    'wait',
]);

export class OnboardingService {
    private static instance: OnboardingService;
    private readonly STORAGE_KEY = 'onboarding_tutorials';
    private readonly DISCOVERY_KEY = 'feature_discovery';
    private readonly COMPLETED_KEY = 'onboarding_completed';

    private constructor() {}

    private sanitizeTutorialStep(value: unknown): TutorialStep | null {
        if (!isRecord(value)) {
            return null;
        }
        if (
            typeof value.id !== 'string'
            || typeof value.title !== 'string'
            || typeof value.description !== 'string'
        ) {
            return null;
        }
        return {
            id: value.id,
            title: value.title,
            description: value.description,
            target: typeof value.target === 'string' ? value.target : undefined,
            position: STEP_POSITIONS.has(value.position as NonNullable<TutorialStep['position']>)
                ? value.position as NonNullable<TutorialStep['position']>
                : undefined,
            action: STEP_ACTIONS.has(value.action as NonNullable<TutorialStep['action']>)
                ? value.action as NonNullable<TutorialStep['action']>
                : undefined,
            actionTarget: typeof value.actionTarget === 'string' ? value.actionTarget : undefined,
            skipable: typeof value.skipable === 'boolean' ? value.skipable : undefined,
        };
    }

    private sanitizeTutorial(value: unknown): Tutorial | null {
        if (!isRecord(value)) {
            return null;
        }
        if (
            typeof value.id !== 'string'
            || typeof value.name !== 'string'
            || typeof value.description !== 'string'
            || typeof value.completed !== 'boolean'
            || !Array.isArray(value.steps)
        ) {
            return null;
        }
        const steps = value.steps
            .map((entry) => this.sanitizeTutorialStep(entry))
            .filter((entry): entry is TutorialStep => entry !== null);
        if (steps.length === 0) {
            return null;
        }
        return {
            id: value.id,
            name: value.name,
            description: value.description,
            completed: value.completed,
            completedAt: typeof value.completedAt === 'number' && Number.isFinite(value.completedAt)
                ? value.completedAt
                : undefined,
            steps,
        };
    }

    private parseStoredTutorials(raw: string): Tutorial[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((entry) => this.sanitizeTutorial(entry))
            .filter((entry): entry is Tutorial => entry !== null);
    }

    private sanitizeFeatureDiscovery(value: unknown): FeatureDiscovery | null {
        if (!isRecord(value)) {
            return null;
        }
        if (
            typeof value.id !== 'string'
            || typeof value.featureName !== 'string'
            || typeof value.description !== 'string'
            || typeof value.shown !== 'boolean'
            || typeof value.dismissed !== 'boolean'
        ) {
            return null;
        }
        return {
            id: value.id,
            featureName: value.featureName,
            description: value.description,
            target: typeof value.target === 'string' ? value.target : undefined,
            version: typeof value.version === 'string' ? value.version : undefined,
            shown: value.shown,
            shownAt: typeof value.shownAt === 'number' && Number.isFinite(value.shownAt)
                ? value.shownAt
                : undefined,
            dismissed: value.dismissed,
            dismissedAt: typeof value.dismissedAt === 'number' && Number.isFinite(value.dismissedAt)
                ? value.dismissedAt
                : undefined,
        };
    }

    private parseStoredDiscoveries(raw: string): FeatureDiscovery[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((entry) => this.sanitizeFeatureDiscovery(entry))
            .filter((entry): entry is FeatureDiscovery => entry !== null);
    }

    static getInstance(): OnboardingService {
        if (!OnboardingService.instance) {
            OnboardingService.instance = new OnboardingService();
        }
        return OnboardingService.instance;
    }

    /**
     * Check if user has completed onboarding
     */
    hasCompletedOnboarding(): boolean {
        try {
            return localStorage.getItem(this.COMPLETED_KEY) === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Mark onboarding as completed
     */
    completeOnboarding(): void {
        localStorage.setItem(this.COMPLETED_KEY, 'true');
    }

    /**
     * Reset onboarding (for testing or re-onboarding)
     */
    resetOnboarding(): void {
        localStorage.removeItem(this.COMPLETED_KEY);
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.DISCOVERY_KEY);
    }

    /**
     * Get all tutorials
     */
    getTutorials(): Tutorial[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const tutorials = this.parseStoredTutorials(stored);
                if (tutorials.length > 0) {
                    return tutorials;
                }
            }
        } catch (error) {
            console.error('Failed to load tutorials:', error);
        }

        // Default tutorials
        return this.getDefaultTutorials();
    }

    /**
     * Get default tutorials
     */
    private getDefaultTutorials(): Tutorial[] {
        return [
            {
                id: 'welcome',
                name: 'Welcome to InferencerC',
                description: 'Get started with the basics',
                completed: false,
                steps: [
                    {
                        id: 'welcome-1',
                        title: 'Welcome!',
                        description: 'Welcome to InferencerC! This tutorial will help you get started.',
                        position: 'center',
                        skipable: true,
                    },
                    {
                        id: 'welcome-2',
                        title: 'New Chat',
                        description: 'Click here to start a new conversation',
                        target: 'button[title="New Chat"]',
                        position: 'bottom',
                        action: 'click',
                        actionTarget: 'button[title="New Chat"]',
                    },
                    {
                        id: 'welcome-3',
                        title: 'Type Your Message',
                        description: 'Type your message here and press Enter or click Send',
                        target: 'textarea[placeholder*="message"], textarea[placeholder*="Message"]',
                        position: 'top',
                        action: 'type',
                    },
                    {
                        id: 'welcome-4',
                        title: 'Command Palette',
                        description: 'Press Ctrl+P to open the command palette - a powerful way to access all features',
                        position: 'center',
                        skipable: true,
                    },
                ],
            },
            {
                id: 'features',
                name: 'Key Features',
                description: 'Learn about powerful features',
                completed: false,
                steps: [
                    {
                        id: 'features-1',
                        title: 'Settings',
                        description: 'Access settings to configure API keys, models, and preferences',
                        target: '[data-nav="settings"]',
                        position: 'left',
                        skipable: true,
                    },
                    {
                        id: 'features-2',
                        title: 'Templates',
                        description: 'Use conversation templates to quickly start structured conversations',
                        target: 'button[title="Templates"]',
                        position: 'bottom',
                        skipable: true,
                    },
                    {
                        id: 'features-3',
                        title: 'Export',
                        description: 'Export your conversations in multiple formats (PDF, DOCX, Markdown, etc.)',
                        target: 'button[title*="Export"], button[title*="export"]',
                        position: 'top',
                        skipable: true,
                    },
                ],
            },
        ];
    }

    /**
     * Save tutorials
     */
    private saveTutorials(tutorials: Tutorial[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tutorials));
        } catch (error) {
            console.error('Failed to save tutorials:', error);
        }
    }

    /**
     * Mark tutorial as completed
     */
    completeTutorial(tutorialId: string): void {
        const tutorials = this.getTutorials();
        const tutorial = tutorials.find(t => t.id === tutorialId);
        if (tutorial) {
            tutorial.completed = true;
            tutorial.completedAt = Date.now();
            this.saveTutorials(tutorials);
        }
    }

    /**
     * Get feature discoveries
     */
    getFeatureDiscoveries(): FeatureDiscovery[] {
        try {
            const stored = localStorage.getItem(this.DISCOVERY_KEY);
            if (stored) {
                return this.parseStoredDiscoveries(stored);
            }
        } catch (error) {
            console.error('Failed to load feature discoveries:', error);
        }

        return [];
    }

    /**
     * Add new feature discovery
     */
    addFeatureDiscovery(discovery: Omit<FeatureDiscovery, 'shown' | 'dismissed'>): void {
        const discoveries = this.getFeatureDiscoveries();
        const newDiscovery: FeatureDiscovery = {
            ...discovery,
            shown: false,
            dismissed: false,
        };
        discoveries.push(newDiscovery);
        this.saveFeatureDiscoveries(discoveries);
    }

    /**
     * Mark feature as shown
     */
    markFeatureShown(featureId: string): void {
        const discoveries = this.getFeatureDiscoveries();
        const discovery = discoveries.find(d => d.id === featureId);
        if (discovery) {
            discovery.shown = true;
            discovery.shownAt = Date.now();
            this.saveFeatureDiscoveries(discoveries);
        }
    }

    /**
     * Dismiss feature discovery
     */
    dismissFeatureDiscovery(featureId: string): void {
        const discoveries = this.getFeatureDiscoveries();
        const discovery = discoveries.find(d => d.id === featureId);
        if (discovery) {
            discovery.dismissed = true;
            discovery.dismissedAt = Date.now();
            this.saveFeatureDiscoveries(discoveries);
        }
    }

    /**
     * Get unshown feature discoveries
     */
    getUnshownFeatures(): FeatureDiscovery[] {
        return this.getFeatureDiscoveries().filter(
            f => !f.shown && !f.dismissed
        );
    }

    /**
     * Save feature discoveries
     */
    private saveFeatureDiscoveries(discoveries: FeatureDiscovery[]): void {
        try {
            localStorage.setItem(this.DISCOVERY_KEY, JSON.stringify(discoveries));
        } catch (error) {
            console.error('Failed to save feature discoveries:', error);
        }
    }
}

export const onboardingService = OnboardingService.getInstance();
