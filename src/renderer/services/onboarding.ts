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

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
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
        const id = sanitizeNonEmptyString(value.id);
        const title = sanitizeNonEmptyString(value.title);
        const description = sanitizeNonEmptyString(value.description);
        if (!id || !title || !description) {
            return null;
        }
        return {
            id,
            title,
            description,
            target: sanitizeNonEmptyString(value.target) || undefined,
            position: STEP_POSITIONS.has(value.position as NonNullable<TutorialStep['position']>)
                ? value.position as NonNullable<TutorialStep['position']>
                : undefined,
            action: STEP_ACTIONS.has(value.action as NonNullable<TutorialStep['action']>)
                ? value.action as NonNullable<TutorialStep['action']>
                : undefined,
            actionTarget: sanitizeNonEmptyString(value.actionTarget) || undefined,
            skipable: typeof value.skipable === 'boolean' ? value.skipable : undefined,
        };
    }

    private sanitizeTutorial(value: unknown): Tutorial | null {
        if (!isRecord(value)) {
            return null;
        }
        const id = sanitizeNonEmptyString(value.id);
        const name = sanitizeNonEmptyString(value.name);
        const description = sanitizeNonEmptyString(value.description);
        if (!id
            || !name
            || !description
            || typeof value.completed !== 'boolean'
            || !Array.isArray(value.steps)) {
            return null;
        }
        const steps = value.steps
            .map((entry) => this.sanitizeTutorialStep(entry))
            .filter((entry): entry is TutorialStep => entry !== null);
        const seenStepIds = new Set<string>();
        const dedupedSteps = steps.filter((step) => {
            if (seenStepIds.has(step.id)) {
                return false;
            }
            seenStepIds.add(step.id);
            return true;
        });
        if (dedupedSteps.length === 0) {
            return null;
        }
        const completedAt = sanitizeFiniteNonNegativeInteger(value.completedAt);
        return {
            id,
            name,
            description,
            completed: value.completed,
            completedAt: completedAt === null ? undefined : completedAt,
            steps: dedupedSteps,
        };
    }

    private parseStoredTutorials(raw: string): Tutorial[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const tutorials = parsed
            .map((entry) => this.sanitizeTutorial(entry))
            .filter((entry): entry is Tutorial => entry !== null);
        const seenIds = new Set<string>();
        return tutorials.filter((entry) => {
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
    }

    private sanitizeFeatureDiscovery(value: unknown): FeatureDiscovery | null {
        if (!isRecord(value)) {
            return null;
        }
        const id = sanitizeNonEmptyString(value.id);
        const featureName = sanitizeNonEmptyString(value.featureName);
        const description = sanitizeNonEmptyString(value.description);
        if (!id
            || !featureName
            || !description
            || typeof value.shown !== 'boolean'
            || typeof value.dismissed !== 'boolean') {
            return null;
        }
        const shownAt = sanitizeFiniteNonNegativeInteger(value.shownAt);
        const dismissedAt = sanitizeFiniteNonNegativeInteger(value.dismissedAt);
        return {
            id,
            featureName,
            description,
            target: sanitizeNonEmptyString(value.target) || undefined,
            version: sanitizeNonEmptyString(value.version) || undefined,
            shown: value.shown,
            shownAt: shownAt === null ? undefined : shownAt,
            dismissed: value.dismissed,
            dismissedAt: dismissedAt === null ? undefined : dismissedAt,
        };
    }

    private parseStoredDiscoveries(raw: string): FeatureDiscovery[] {
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const discoveries = parsed
            .map((entry) => this.sanitizeFeatureDiscovery(entry))
            .filter((entry): entry is FeatureDiscovery => entry !== null);
        const seenIds = new Set<string>();
        return discoveries.filter((entry) => {
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
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
            const sanitized = tutorials
                .map((entry) => this.sanitizeTutorial(entry))
                .filter((entry): entry is Tutorial => entry !== null);
            const deduped: Tutorial[] = [];
            const seenIds = new Set<string>();
            for (let index = sanitized.length - 1; index >= 0; index--) {
                const entry = sanitized[index];
                if (seenIds.has(entry.id)) {
                    continue;
                }
                seenIds.add(entry.id);
                deduped.push(entry);
            }
            deduped.reverse();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deduped));
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
        const newDiscoveryCandidate: FeatureDiscovery = {
            ...discovery,
            shown: false,
            dismissed: false,
        };
        const newDiscovery = this.sanitizeFeatureDiscovery(newDiscoveryCandidate);
        if (!newDiscovery) {
            return;
        }
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
            const sanitized = discoveries
                .map((entry) => this.sanitizeFeatureDiscovery(entry))
                .filter((entry): entry is FeatureDiscovery => entry !== null);
            const deduped: FeatureDiscovery[] = [];
            const seenIds = new Set<string>();
            for (let index = sanitized.length - 1; index >= 0; index--) {
                const entry = sanitized[index];
                if (seenIds.has(entry.id)) {
                    continue;
                }
                seenIds.add(entry.id);
                deduped.push(entry);
            }
            deduped.reverse();
            localStorage.setItem(this.DISCOVERY_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save feature discoveries:', error);
        }
    }
}

export const onboardingService = OnboardingService.getInstance();
