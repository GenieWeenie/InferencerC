/**
 * AI Agents Service
 *
 * Deploy autonomous AI agents for tasks
 */

export interface AIAgent {
    id: string;
    name: string;
    description: string;
    role: string;
    capabilities: string[];
    model: string;
    systemPrompt: string;
    isActive: boolean;
    taskQueue: AgentTask[];
    completedTasks: AgentTask[];
    createdAt: number;
    lastActive: number;
}

export interface AgentTask {
    id: string;
    agentId: string;
    type: 'research' | 'analysis' | 'generation' | 'automation' | 'monitoring';
    description: string;
    parameters: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: unknown;
    error?: string;
    createdAt: number;
    completedAt?: number;
}

export interface AgentExecution {
    agentId: string;
    taskId: string;
    startTime: number;
    endTime?: number;
    result?: unknown;
    error?: string;
}

const TASK_TYPES = new Set<AgentTask['type']>(['research', 'analysis', 'generation', 'automation', 'monitoring']);
const TASK_STATUSES = new Set<AgentTask['status']>(['pending', 'running', 'completed', 'failed']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseJson = (raw: string): unknown => {
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

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    value.forEach((entry) => {
        const normalized = sanitizeNonEmptyString(entry);
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        result.push(normalized);
    });
    return result;
};

const sanitizeTask = (value: unknown): AgentTask | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const agentId = sanitizeNonEmptyString(value.agentId);
    const description = sanitizeNonEmptyString(value.description);
    const createdAt = sanitizeFiniteNonNegativeInteger(value.createdAt);
    if (
        !id
        || !agentId
        || !description
        || !TASK_TYPES.has(value.type as AgentTask['type'])
        || !TASK_STATUSES.has(value.status as AgentTask['status'])
        || createdAt === null
    ) {
        return null;
    }
    const completedAtCandidate = sanitizeFiniteNonNegativeInteger(value.completedAt);
    const completedAt = completedAtCandidate !== null
        ? Math.max(createdAt, completedAtCandidate)
        : undefined;

    return {
        id,
        agentId,
        type: value.type as AgentTask['type'],
        description,
        parameters: isRecord(value.parameters) ? value.parameters : {},
        status: value.status as AgentTask['status'],
        result: value.result,
        error: sanitizeNonEmptyString(value.error) || undefined,
        createdAt,
        completedAt,
    };
};

const sanitizeAgent = (value: unknown): AIAgent | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const description = sanitizeNonEmptyString(value.description);
    const role = sanitizeNonEmptyString(value.role);
    const model = sanitizeNonEmptyString(value.model);
    const systemPrompt = sanitizeNonEmptyString(value.systemPrompt);
    const createdAt = sanitizeFiniteNonNegativeInteger(value.createdAt);
    const lastActiveCandidate = sanitizeFiniteNonNegativeInteger(value.lastActive);
    if (
        !id
        || !name
        || !description
        || !role
        || !model
        || !systemPrompt
        || typeof value.isActive !== 'boolean'
        || !Array.isArray(value.taskQueue)
        || !Array.isArray(value.completedTasks)
        || createdAt === null
        || lastActiveCandidate === null
    ) {
        return null;
    }
    const sanitizeTaskCollection = (source: unknown[]): AgentTask[] => {
        const seen = new Set<string>();
        const tasks: AgentTask[] = [];
        source.forEach((entry) => {
            const task = sanitizeTask(entry);
            if (!task || task.agentId !== id || seen.has(task.id)) {
                return;
            }
            seen.add(task.id);
            tasks.push(task);
        });
        return tasks;
    };

    return {
        id,
        name,
        description,
        role,
        capabilities: sanitizeStringArray(value.capabilities),
        model,
        systemPrompt,
        isActive: value.isActive,
        taskQueue: sanitizeTaskCollection(value.taskQueue),
        completedTasks: sanitizeTaskCollection(value.completedTasks),
        createdAt,
        lastActive: Math.max(createdAt, lastActiveCandidate),
    };
};

const parseStoredAgents = (raw: string): AIAgent[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const seenIds = new Set<string>();
    return parsed
        .map((entry) => sanitizeAgent(entry))
        .filter((entry): entry is AIAgent => {
            if (!entry) {
                return false;
            }
            if (seenIds.has(entry.id)) {
                return false;
            }
            seenIds.add(entry.id);
            return true;
        });
};

export class AIAgentsService {
    private static instance: AIAgentsService;
    private readonly STORAGE_KEY = 'ai_agents';
    private agents: Map<string, AIAgent> = new Map();
    private activeExecutions: Map<string, AgentExecution> = new Map();

    private constructor() {
        this.loadAgents();
    }

    static getInstance(): AIAgentsService {
        if (!AIAgentsService.instance) {
            AIAgentsService.instance = new AIAgentsService();
        }
        return AIAgentsService.instance;
    }

    /**
     * Load agents from storage
     */
    private loadAgents(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const agents = parseStoredAgents(stored);
                agents.forEach(agent => {
                    this.agents.set(agent.id, agent);
                });
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }

    /**
     * Save agents to storage
     */
    private saveAgents(): void {
        try {
            const agents = Array.from(this.agents.values())
                .map((entry) => sanitizeAgent(entry))
                .filter((entry): entry is AIAgent => entry !== null);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(agents));
        } catch (error) {
            console.error('Failed to save agents:', error);
        }
    }

    /**
     * Create a new AI agent
     */
    createAgent(agent: Omit<AIAgent, 'id' | 'taskQueue' | 'completedTasks' | 'createdAt' | 'lastActive'>): AIAgent {
        const candidate: AIAgent = {
            ...agent,
            id: crypto.randomUUID(),
            capabilities: sanitizeStringArray(agent.capabilities),
            taskQueue: [],
            completedTasks: [],
            createdAt: Date.now(),
            lastActive: Date.now(),
        };
        const newAgent = sanitizeAgent(candidate);
        if (!newAgent) {
            throw new Error('Invalid AI agent configuration');
        }

        this.agents.set(newAgent.id, newAgent);
        this.saveAgents();
        return newAgent;
    }

    /**
     * Get all agents
     */
    getAllAgents(): AIAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get active agents
     */
    getActiveAgents(): AIAgent[] {
        return Array.from(this.agents.values()).filter(a => a.isActive);
    }

    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AIAgent | null {
        return this.agents.get(agentId) || null;
    }

    /**
     * Update agent
     */
    updateAgent(agentId: string, updates: Partial<AIAgent>): void {
        const agent = this.agents.get(agentId);
        if (agent) {
            const merged = sanitizeAgent({
                ...agent,
                ...updates,
                id: agent.id,
                createdAt: agent.createdAt,
                capabilities: typeof updates.capabilities !== 'undefined'
                    ? sanitizeStringArray(updates.capabilities)
                    : agent.capabilities,
                taskQueue: typeof updates.taskQueue !== 'undefined' ? updates.taskQueue : agent.taskQueue,
                completedTasks: typeof updates.completedTasks !== 'undefined' ? updates.completedTasks : agent.completedTasks,
                lastActive: Date.now(),
            });
            if (!merged) {
                return;
            }
            this.agents.set(agentId, merged);
            this.saveAgents();
        }
    }

    /**
     * Delete agent
     */
    deleteAgent(agentId: string): void {
        this.agents.delete(agentId);
        this.saveAgents();
    }

    /**
     * Add task to agent queue
     */
    addTask(agentId: string, task: Omit<AgentTask, 'id' | 'agentId' | 'status' | 'createdAt'>): AgentTask {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const newTask = sanitizeTask({
            ...task,
            id: crypto.randomUUID(),
            agentId,
            status: 'pending',
            createdAt: Date.now(),
        });
        if (!newTask) {
            throw new Error('Invalid agent task configuration');
        }

        agent.taskQueue.push(newTask);
        agent.lastActive = Date.now();
        this.saveAgents();

        // Auto-execute if agent is active
        if (agent.isActive) {
            this.executeTask(agentId, newTask.id);
        }

        return newTask;
    }

    /**
     * Execute a task
     */
    async executeTask(
        agentId: string,
        taskId: string,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<AgentExecution> {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const task = agent.taskQueue.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        const execution: AgentExecution = {
            agentId,
            taskId,
            startTime: Date.now(),
        };

        this.activeExecutions.set(taskId, execution);
        task.status = 'running';
        agent.lastActive = Date.now();
        this.saveAgents();

        try {
            // Build prompt based on task type
            const prompt = this.buildTaskPrompt(task, agent);
            const response = await executePrompt(prompt, agent.systemPrompt);

            task.status = 'completed';
            task.result = response.content;
            task.completedAt = Date.now();

            execution.endTime = Date.now();
            execution.result = response.content;

            // Move task to completed
            agent.taskQueue = agent.taskQueue.filter(t => t.id !== taskId);
            agent.completedTasks.push(task);
            agent.lastActive = Date.now();
            this.saveAgents();
        } catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : 'Unknown error';
            task.completedAt = Date.now();

            execution.endTime = Date.now();
            execution.error = task.error;

            agent.taskQueue = agent.taskQueue.filter(t => t.id !== taskId);
            agent.completedTasks.push(task);
            this.saveAgents();
        } finally {
            this.activeExecutions.delete(taskId);
        }

        return execution;
    }

    /**
     * Build task prompt
     */
    private buildTaskPrompt(task: AgentTask, agent: AIAgent): string {
        let prompt = `As ${agent.name}, ${agent.description}\n\n`;
        prompt += `Task: ${task.description}\n`;
        prompt += `Type: ${task.type}\n`;

        if (Object.keys(task.parameters).length > 0) {
            prompt += `Parameters: ${JSON.stringify(task.parameters, null, 2)}\n`;
        }

        prompt += `\nPlease complete this task using your capabilities: ${agent.capabilities.join(', ')}`;

        return prompt;
    }

    /**
     * Get agent tasks
     */
    getAgentTasks(agentId: string): { pending: AgentTask[]; completed: AgentTask[] } {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return { pending: [], completed: [] };
        }

        return {
            pending: agent.taskQueue,
            completed: agent.completedTasks,
        };
    }

    /**
     * Get active executions
     */
    getActiveExecutions(): AgentExecution[] {
        return Array.from(this.activeExecutions.values());
    }
}

export const aiAgentsService = AIAgentsService.getInstance();
