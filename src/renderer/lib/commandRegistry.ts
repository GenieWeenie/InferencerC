import { LucideIcon } from 'lucide-react';

export interface Command {
    id: string;
    label: string;
    description?: string;
    category: CommandCategory;
    icon?: LucideIcon;
    keywords?: string[]; // For better search matching
    shortcut?: string[]; // e.g., ['Ctrl', 'N']
    action: () => void | Promise<void>;
    enabled?: () => boolean; // Dynamic enabling/disabling
}

export type CommandCategory =
    | 'Navigation'
    | 'Actions'
    | 'Editing'
    | 'Settings'
    | 'Models'
    | 'Sessions'
    | 'Export'
    | 'View'
    | 'Help';

export class CommandRegistry {
    private commands: Map<string, Command> = new Map();
    private listeners: Set<() => void> = new Set();

    register(command: Command): void {
        this.commands.set(command.id, command);
        this.notifyListeners();
    }

    registerMany(commands: Command[]): void {
        commands.forEach(cmd => this.commands.set(cmd.id, cmd));
        this.notifyListeners();
    }

    unregister(commandId: string): void {
        this.commands.delete(commandId);
        this.notifyListeners();
    }

    get(commandId: string): Command | undefined {
        return this.commands.get(commandId);
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    getByCategory(category: CommandCategory): Command[] {
        return this.getAll().filter(cmd => cmd.category === category);
    }

    execute(commandId: string): void {
        const command = this.commands.get(commandId);
        if (command) {
            const enabled = command.enabled ? command.enabled() : true;
            if (enabled) {
                command.action();
            }
        }
    }

    search(query: string): Command[] {
        if (!query.trim()) {
            return this.getAll();
        }

        const normalizedQuery = query.toLowerCase().trim();
        const terms = normalizedQuery.split(/\s+/);

        return this.getAll()
            .map(command => ({
                command,
                score: this.calculateScore(command, terms, normalizedQuery)
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ command }) => command);
    }

    private calculateScore(command: Command, terms: string[], fullQuery: string): number {
        let score = 0;
        const label = command.label.toLowerCase();
        const description = command.description?.toLowerCase() || '';
        const keywords = command.keywords?.map(k => k.toLowerCase()) || [];
        const category = command.category.toLowerCase();

        // Exact match bonus
        if (label === fullQuery) {
            score += 1000;
        }

        // Label starts with query
        if (label.startsWith(fullQuery)) {
            score += 500;
        }

        // Label contains full query
        if (label.includes(fullQuery)) {
            score += 250;
        }

        // All terms match
        const allTermsMatch = terms.every(term =>
            label.includes(term) ||
            description.includes(term) ||
            keywords.some(kw => kw.includes(term)) ||
            category.includes(term)
        );

        if (!allTermsMatch) {
            return 0; // Filter out non-matches
        }

        // Score based on individual term matches
        terms.forEach(term => {
            if (label.includes(term)) score += 100;
            if (description.includes(term)) score += 50;
            if (keywords.some(kw => kw.includes(term))) score += 75;
            if (category.includes(term)) score += 25;
        });

        // Prefer shorter labels (more specific)
        score += Math.max(0, 50 - label.length);

        return score;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    clear(): void {
        this.commands.clear();
        this.notifyListeners();
    }
}

// Global singleton instance
export const commandRegistry = new CommandRegistry();
