/**
 * Prompt Variables Service
 * 
 * Enables dynamic variables in prompts that get replaced at runtime.
 * Examples:
 * - {{date}} -> "January 24, 2026"
 * - {{time}} -> "12:09 AM"
 * - {{datetime}} -> "January 24, 2026 at 12:09 AM"
 * - {{user_name}} -> User's configured name
 * - {{model}} -> Current model name
 * - {{random}} -> Random number
 * - {{uuid}} -> Unique identifier
 * - {{clipboard}} -> Clipboard contents (async)
 */

export interface PromptVariable {
    name: string;
    description: string;
    example: string;
    getValue: (context: VariableContext) => string | Promise<string>;
    category: 'datetime' | 'user' | 'system' | 'random' | 'custom';
}

export interface VariableContext {
    modelId?: string;
    modelName?: string;
    sessionId?: string;
    sessionTitle?: string;
    messageCount?: number;
    userName?: string;
    customVariables?: Record<string, string>;
}

export interface ParsedVariable {
    original: string; // e.g., "{{date}}"
    name: string;     // e.g., "date"
    format?: string;  // e.g., "YYYY-MM-DD" for {{date:YYYY-MM-DD}}
    start: number;
    end: number;
}

const CUSTOM_VARIABLES_KEY = 'prompt_custom_variables';
const USER_NAME_KEY = 'prompt_user_name';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeCustomVariableRecord = (value: unknown): Record<string, string> => {
    if (!isRecord(value)) {
        return {};
    }

    const sanitized: Record<string, string> = {};
    Object.entries(value).forEach(([key, entry]) => {
        if (typeof entry === 'string') {
            sanitized[key] = entry;
        }
    });
    return sanitized;
};

// Built-in variables
const builtInVariables: PromptVariable[] = [
    // DateTime variables
    {
        name: 'date',
        description: 'Current date in long format',
        example: 'January 24, 2026',
        category: 'datetime',
        getValue: () => new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    },
    {
        name: 'date_short',
        description: 'Current date in short format',
        example: '01/24/2026',
        category: 'datetime',
        getValue: () => new Date().toLocaleDateString('en-US')
    },
    {
        name: 'date_iso',
        description: 'Current date in ISO format',
        example: '2026-01-24',
        category: 'datetime',
        getValue: () => new Date().toISOString().split('T')[0]
    },
    {
        name: 'time',
        description: 'Current time',
        example: '12:09 AM',
        category: 'datetime',
        getValue: () => new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    },
    {
        name: 'time_24h',
        description: 'Current time in 24-hour format',
        example: '00:09',
        category: 'datetime',
        getValue: () => new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    },
    {
        name: 'datetime',
        description: 'Current date and time',
        example: 'January 24, 2026 at 12:09 AM',
        category: 'datetime',
        getValue: () => new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    },
    {
        name: 'timestamp',
        description: 'Unix timestamp in milliseconds',
        example: '1737702548000',
        category: 'datetime',
        getValue: () => Date.now().toString()
    },
    {
        name: 'day',
        description: 'Day of the week',
        example: 'Friday',
        category: 'datetime',
        getValue: () => new Date().toLocaleDateString('en-US', { weekday: 'long' })
    },
    {
        name: 'year',
        description: 'Current year',
        example: '2026',
        category: 'datetime',
        getValue: () => new Date().getFullYear().toString()
    },
    {
        name: 'month',
        description: 'Current month',
        example: 'January',
        category: 'datetime',
        getValue: () => new Date().toLocaleDateString('en-US', { month: 'long' })
    },

    // User variables
    {
        name: 'user_name',
        description: 'Your configured name',
        example: 'Alex',
        category: 'user',
        getValue: (ctx) => ctx.userName || localStorage.getItem(USER_NAME_KEY) || 'User'
    },

    // System variables
    {
        name: 'model',
        description: 'Current model ID',
        example: 'gpt-4',
        category: 'system',
        getValue: (ctx) => ctx.modelId || 'unknown'
    },
    {
        name: 'model_name',
        description: 'Current model display name',
        example: 'GPT-4',
        category: 'system',
        getValue: (ctx) => ctx.modelName || ctx.modelId || 'Unknown Model'
    },
    {
        name: 'session_id',
        description: 'Current session ID',
        example: 'abc-123-def',
        category: 'system',
        getValue: (ctx) => ctx.sessionId || 'no-session'
    },
    {
        name: 'session_title',
        description: 'Current session title',
        example: 'Code Review Discussion',
        category: 'system',
        getValue: (ctx) => ctx.sessionTitle || 'New Chat'
    },
    {
        name: 'message_count',
        description: 'Number of messages in current conversation',
        example: '12',
        category: 'system',
        getValue: (ctx) => (ctx.messageCount || 0).toString()
    },

    // Random/Utility variables
    {
        name: 'random',
        description: 'Random number between 0-100',
        example: '42',
        category: 'random',
        getValue: () => Math.floor(Math.random() * 101).toString()
    },
    {
        name: 'random_float',
        description: 'Random decimal between 0-1',
        example: '0.7234',
        category: 'random',
        getValue: () => Math.random().toFixed(4)
    },
    {
        name: 'uuid',
        description: 'Unique identifier',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        category: 'random',
        getValue: () => crypto.randomUUID()
    },
    {
        name: 'short_id',
        description: 'Short unique identifier',
        example: 'x7k9m2',
        category: 'random',
        getValue: () => Math.random().toString(36).substring(2, 8)
    },
];

export class PromptVariableService {
    private static variables: Map<string, PromptVariable> = new Map();
    private static customVariables: Map<string, string> = new Map();
    private static initialized = false;

    /**
     * Initialize the service
     */
    static init(): void {
        if (this.initialized) return;

        // Register built-in variables
        builtInVariables.forEach(v => this.variables.set(v.name, v));

        // Load custom variables
        try {
            const stored = localStorage.getItem(CUSTOM_VARIABLES_KEY);
            if (stored) {
                const parsed = sanitizeCustomVariableRecord(parseJson(stored));
                Object.entries(parsed).forEach(([key, value]) => {
                    this.customVariables.set(key, value);
                });
            }
        } catch (error) {
            console.error('Failed to load custom variables:', error);
        }

        this.initialized = true;
    }

    /**
     * Get all available variables
     */
    static getAllVariables(): PromptVariable[] {
        this.init();

        // Include built-in variables
        const all = Array.from(this.variables.values());

        // Add custom variables as PromptVariable objects
        this.customVariables.forEach((value, name) => {
            all.push({
                name,
                description: 'Custom variable',
                example: value,
                category: 'custom',
                getValue: () => value
            });
        });

        return all;
    }

    /**
     * Get variables by category
     */
    static getVariablesByCategory(category: PromptVariable['category']): PromptVariable[] {
        return this.getAllVariables().filter(v => v.category === category);
    }

    /**
     * Parse a text string and find all variables
     */
    static parseVariables(text: string): ParsedVariable[] {
        const regex = /\{\{(\w+)(?::([^}]+))?\}\}/g;
        const variables: ParsedVariable[] = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            variables.push({
                original: match[0],
                name: match[1],
                format: match[2],
                start: match.index,
                end: match.index + match[0].length
            });
        }

        return variables;
    }

    /**
     * Check if text contains any variables
     */
    static hasVariables(text: string): boolean {
        return /\{\{\w+(?::[^}]+)?\}\}/.test(text);
    }

    /**
     * Process a text string and replace all variables with their values
     */
    static async processText(text: string, context: VariableContext = {}): Promise<string> {
        this.init();

        const variables = this.parseVariables(text);
        if (variables.length === 0) return text;

        // Include custom variables in context
        const fullContext: VariableContext = {
            ...context,
            customVariables: Object.fromEntries(this.customVariables)
        };

        // Process each variable (from end to start to preserve positions)
        let result = text;
        for (let i = variables.length - 1; i >= 0; i--) {
            const parsed = variables[i];
            const value = await this.getVariableValue(parsed.name, fullContext);
            result = result.substring(0, parsed.start) + value + result.substring(parsed.end);
        }

        return result;
    }

    /**
     * Get the value of a specific variable
     */
    static async getVariableValue(name: string, context: VariableContext = {}): Promise<string> {
        this.init();

        // Check custom variables first
        if (this.customVariables.has(name)) {
            return this.customVariables.get(name)!;
        }

        // Check built-in variables
        const variable = this.variables.get(name);
        if (variable) {
            const value = variable.getValue(context);
            return value instanceof Promise ? await value : value;
        }

        // Check context custom variables
        if (context.customVariables?.[name]) {
            return context.customVariables[name];
        }

        // Return original if not found
        return `{{${name}}}`;
    }

    /**
     * Set a custom variable
     */
    static setCustomVariable(name: string, value: string): void {
        this.init();
        if (!name) {
            return;
        }
        this.customVariables.set(name, value);
        this.persistCustomVariables();
    }

    /**
     * Delete a custom variable
     */
    static deleteCustomVariable(name: string): boolean {
        this.init();
        const deleted = this.customVariables.delete(name);
        if (deleted) {
            this.persistCustomVariables();
        }
        return deleted;
    }

    /**
     * Get all custom variables
     */
    static getCustomVariables(): Map<string, string> {
        this.init();
        return new Map(this.customVariables);
    }

    /**
     * Set user name
     */
    static setUserName(name: string): void {
        const normalized = name.trim();
        localStorage.setItem(USER_NAME_KEY, normalized || 'User');
    }

    /**
     * Get user name
     */
    static getUserName(): string {
        const stored = localStorage.getItem(USER_NAME_KEY);
        return stored && stored.trim() ? stored : 'User';
    }

    /**
     * Preview how variables will be replaced
     */
    static async previewText(text: string, context: VariableContext = {}): Promise<{
        original: string;
        processed: string;
        variables: Array<{ name: string; value: string }>;
    }> {
        this.init();

        const parsed = this.parseVariables(text);
        const variableValues: Array<{ name: string; value: string }> = [];

        for (const v of parsed) {
            const value = await this.getVariableValue(v.name, context);
            variableValues.push({ name: v.name, value });
        }

        return {
            original: text,
            processed: await this.processText(text, context),
            variables: variableValues
        };
    }

    /**
     * Get a formatted help text showing all available variables
     */
    static getHelpText(): string {
        this.init();

        const categories = ['datetime', 'user', 'system', 'random', 'custom'] as const;
        let help = '# Available Prompt Variables\n\n';

        for (const category of categories) {
            const vars = this.getVariablesByCategory(category);
            if (vars.length === 0) continue;

            help += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

            for (const v of vars) {
                help += `- \`{{${v.name}}}\` - ${v.description}\n`;
                help += `  Example: ${v.example}\n\n`;
            }
        }

        return help;
    }

    /**
     * Persist custom variables to localStorage
     */
    private static persistCustomVariables(): void {
        try {
            const obj = Object.fromEntries(this.customVariables);
            localStorage.setItem(CUSTOM_VARIABLES_KEY, JSON.stringify(obj));
        } catch (error) {
            console.error('Failed to persist custom variables:', error);
        }
    }

    /**
     * Clear all custom variables
     */
    static clearCustomVariables(): void {
        this.customVariables.clear();
        localStorage.removeItem(CUSTOM_VARIABLES_KEY);
    }

    /**
     * Import custom variables from JSON
     */
    static importVariables(json: string): { imported: number; errors: string[] } {
        this.init();
        const errors: string[] = [];
        let imported = 0;

        try {
            const data = parseJson(json);
            if (!isRecord(data)) {
                errors.push('Invalid JSON format');
                return { imported, errors };
            }

            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') {
                    this.setCustomVariable(key, value);
                    imported++;
                } else {
                    errors.push(`Skipped "${key}": value must be a string`);
                }
            }
        } catch (e) {
            errors.push('Failed to parse JSON');
        }

        return { imported, errors };
    }

    /**
     * Export custom variables to JSON
     */
    static exportVariables(): string {
        this.init();
        return JSON.stringify(Object.fromEntries(this.customVariables), null, 2);
    }
}

// Initialize on load
PromptVariableService.init();

export default PromptVariableService;
