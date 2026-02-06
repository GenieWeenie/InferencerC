/**
 * Scheduled Conversations Service
 *
 * Schedule conversations to run at specific times
 */

import { ChatMessage } from '../../shared/types';

export interface ScheduledConversation {
    id: string;
    name: string;
    prompt: string;
    systemPrompt?: string;
    modelId: string;
    scheduledTime: number; // Unix timestamp
    recurrence?: RecurrencePattern;
    enabled: boolean;
    lastRun?: number;
    nextRun: number;
    runCount: number;
    createdAt: number;
}

export interface RecurrencePattern {
    type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number; // For custom: run every N days
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
    dayOfMonth?: number; // 1-31
    endDate?: number; // Unix timestamp
}

export interface ScheduledRun {
    scheduleId: string;
    executedAt: number;
    result?: {
        success: boolean;
        messageId?: string;
        error?: string;
    };
}

export class ScheduledConversationsService {
    private static instance: ScheduledConversationsService;
    private readonly STORAGE_KEY = 'scheduled_conversations';
    private readonly RUNS_KEY = 'scheduled_runs';
    private checkInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.startScheduler();
    }

    static getInstance(): ScheduledConversationsService {
        if (!ScheduledConversationsService.instance) {
            ScheduledConversationsService.instance = new ScheduledConversationsService();
        }
        return ScheduledConversationsService.instance;
    }

    /**
     * Start the scheduler
     */
    private startScheduler(): void {
        // Check every minute for scheduled conversations
        this.checkInterval = setInterval(() => {
            this.checkAndExecuteScheduled();
        }, 60000); // 1 minute
    }

    /**
     * Stop the scheduler
     */
    stopScheduler(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Create a scheduled conversation
     */
    createSchedule(schedule: Omit<ScheduledConversation, 'id' | 'createdAt' | 'nextRun' | 'runCount'>): ScheduledConversation {
        const newSchedule: ScheduledConversation = {
            ...schedule,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            nextRun: this.calculateNextRun(schedule.scheduledTime, schedule.recurrence),
            runCount: 0,
        };

        this.saveSchedule(newSchedule);
        return newSchedule;
    }

    /**
     * Calculate next run time
     */
    private calculateNextRun(scheduledTime: number, recurrence?: RecurrencePattern): number {
        if (!recurrence || recurrence.type === 'once') {
            return scheduledTime;
        }

        const now = Date.now();
        let next = scheduledTime;

        while (next <= now) {
            switch (recurrence.type) {
                case 'daily':
                    next += 24 * 60 * 60 * 1000;
                    break;
                case 'weekly':
                    next += 7 * 24 * 60 * 60 * 1000;
                    break;
                case 'monthly':
                    // Approximate: add 30 days
                    next += 30 * 24 * 60 * 60 * 1000;
                    break;
                case 'custom':
                    next += (recurrence.interval || 1) * 24 * 60 * 60 * 1000;
                    break;
            }

            // Check end date
            if (recurrence.endDate && next > recurrence.endDate) {
                return recurrence.endDate;
            }
        }

        return next;
    }

    /**
     * Check and execute scheduled conversations
     */
    private async checkAndExecuteScheduled(): Promise<void> {
        const schedules = this.getAllSchedules();
        const now = Date.now();

        for (const schedule of schedules) {
            if (!schedule.enabled) continue;
            if (schedule.nextRun > now) continue;
            if (schedule.recurrence?.endDate && now > schedule.recurrence.endDate) continue;

            // Execute the scheduled conversation
            await this.executeSchedule(schedule);

            // Update next run time
            schedule.lastRun = now;
            schedule.nextRun = this.calculateNextRun(schedule.nextRun, schedule.recurrence);
            schedule.runCount++;

            // If it's a one-time schedule and we've run it, disable it
            if (!schedule.recurrence || schedule.recurrence.type === 'once') {
                schedule.enabled = false;
            }

            this.saveSchedule(schedule);
        }
    }

    /**
     * Execute a scheduled conversation
     */
    private async executeSchedule(schedule: ScheduledConversation): Promise<void> {
        // This would trigger the actual conversation execution
        // For now, we'll just log it and store the run record
        const run: ScheduledRun = {
            scheduleId: schedule.id,
            executedAt: Date.now(),
            result: {
                success: true,
            },
        };

        this.saveRun(run);

        // Emit event that can be listened to by the chat component
        window.dispatchEvent(new CustomEvent('scheduled-conversation-execute', {
            detail: schedule,
        }));
    }

    /**
     * Get all schedules
     */
    getAllSchedules(): ScheduledConversation[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            return JSON.parse(stored);
        } catch (error) {
            console.error('Failed to load schedules:', error);
            return [];
        }
    }

    /**
     * Get a schedule by ID
     */
    getSchedule(id: string): ScheduledConversation | null {
        const schedules = this.getAllSchedules();
        return schedules.find(s => s.id === id) || null;
    }

    /**
     * Update a schedule
     */
    updateSchedule(id: string, updates: Partial<ScheduledConversation>): boolean {
        const schedule = this.getSchedule(id);
        if (!schedule) return false;

        const updated = { ...schedule, ...updates };
        if (updates.scheduledTime || updates.recurrence) {
            updated.nextRun = this.calculateNextRun(updated.scheduledTime, updated.recurrence);
        }
        this.saveSchedule(updated);
        return true;
    }

    /**
     * Delete a schedule
     */
    deleteSchedule(id: string): boolean {
        const schedules = this.getAllSchedules();
        const filtered = schedules.filter(s => s.id !== id);
        if (filtered.length === schedules.length) return false;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Save a schedule
     */
    private saveSchedule(schedule: ScheduledConversation): void {
        const schedules = this.getAllSchedules();
        const index = schedules.findIndex(s => s.id === schedule.id);
        if (index >= 0) {
            schedules[index] = schedule;
        } else {
            schedules.push(schedule);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schedules));
    }

    /**
     * Save a run record
     */
    private saveRun(run: ScheduledRun): void {
        try {
            const stored = localStorage.getItem(this.RUNS_KEY);
            const runs: ScheduledRun[] = stored ? JSON.parse(stored) : [];
            runs.push(run);
            // Keep only last 100 runs
            if (runs.length > 100) {
                runs.shift();
            }
            localStorage.setItem(this.RUNS_KEY, JSON.stringify(runs));
        } catch (error) {
            console.error('Failed to save run:', error);
        }
    }

    /**
     * Get run history for a schedule
     */
    getRunHistory(scheduleId: string, limit: number = 20): ScheduledRun[] {
        try {
            const stored = localStorage.getItem(this.RUNS_KEY);
            if (!stored) return [];
            const runs: ScheduledRun[] = JSON.parse(stored);
            return runs
                .filter(r => r.scheduleId === scheduleId)
                .sort((a, b) => b.executedAt - a.executedAt)
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to load run history:', error);
            return [];
        }
    }
}

export const scheduledConversationsService = ScheduledConversationsService.getInstance();
