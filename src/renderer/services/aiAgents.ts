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
    typeof value === 'object' && value !== null
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is string => typeof entry === 'string');
};

const sanitizeTask = (value: unknown): AgentTask | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.agentId !== 'string'
        || !TASK_TYPES.has(value.type as AgentTask['type'])
        || typeof value.description !== 'string'
        || !TASK_STATUSES.has(value.status as AgentTask['status'])
        || typeof value.createdAt !== 'number') {
        return null;
    }

    return {
        id: value.id,
        agentId: value.agentId,
        type: value.type as AgentTask['type'],
        description: value.description,
        parameters: isRecord(value.parameters) ? value.parameters : {},
        status: value.status as AgentTask['status'],
        result: value.result,
        error: typeof value.error === 'string' ? value.error : undefined,
        createdAt: value.createdAt,
        completedAt: typeof value.completedAt === 'number' ? value.completedAt : undefined,
    };
};

const sanitizeAgent = (value: unknown): AIAgent | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.name !== 'string'
        || typeof value.description !== 'string'
        || typeof value.role !== 'string'
        || typeof value.model !== 'string'
        || typeof value.systemPrompt !== 'string'
        || typeof value.isActive !== 'boolean'
        || !Array.isArray(value.taskQueue)
        || !Array.isArray(value.completedTasks)
        || typeof value.createdAt !== 'number'
        || typeof value.lastActive !== 'number') {
        return null;
    }

    return {
        id: value.id,
        name: value.name,
        description: value.description,
        role: value.role,
        capabilities: sanitizeStringArray(value.capabilities),
        model: value.model,
        systemPrompt: value.systemPrompt,
        isActive: value.isActive,
        taskQueue: value.taskQueue
            .map((entry) => sanitizeTask(entry))
            .filter((entry): entry is AgentTask => entry !== null),
        completedTasks: value.completedTasks
            .map((entry) => sanitizeTask(entry))
            .filter((entry): entry is AgentTask => entry !== null),
        createdAt: value.createdAt,
        lastActive: value.lastActive,
    };
};

const parseStoredAgents = (raw: string): AIAgent[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeAgent(entry))
        .filter((entry): entry is AIAgent => entry !== null);
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
        const newAgent: AIAgent = {
            ...agent,
            id: crypto.randomUUID(),
            capabilities: sanitizeStringArray(agent.capabilities),
            taskQueue: [],
            completedTasks: [],
            createdAt: Date.now(),
            lastActive: Date.now(),
        };

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

        const newTask: AgentTask = {
            ...task,
            id: crypto.randomUUID(),
            agentId,
            status: 'pending',
            createdAt: Date.now(),
        };

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
