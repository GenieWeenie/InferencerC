export interface ApiActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  model: string;
  request?: unknown;
  response?: unknown;
  error?: string;
  duration?: number;
}

const ACTIVITY_LOG_KEY = 'api_activity_log_entries';
const MAX_ACTIVITY_LOG_ENTRIES = 200;

export class ActivityLogService {
  private static instance: ActivityLogService;

  private constructor() {}

  static getInstance(): ActivityLogService {
    if (!ActivityLogService.instance) {
      ActivityLogService.instance = new ActivityLogService();
    }
    return ActivityLogService.instance;
  }

  getEntries(): ApiActivityLogEntry[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(this.isValidEntry);
    } catch {
      return [];
    }
  }

  append(entry: ApiActivityLogEntry): ApiActivityLogEntry[] {
    const current = this.getEntries();
    const next = [...current, entry].slice(-MAX_ACTIVITY_LOG_ENTRIES);
    this.save(next);
    return next;
  }

  clear(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(ACTIVITY_LOG_KEY);
    } catch {
      // ignore storage errors
    }
  }

  private save(entries: ApiActivityLogEntry[]): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries));
    } catch {
      // ignore storage errors
    }
  }

  private isValidEntry(entry: unknown): entry is ApiActivityLogEntry {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as Partial<ApiActivityLogEntry>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.timestamp === 'number' &&
      (candidate.type === 'request' || candidate.type === 'response' || candidate.type === 'error') &&
      typeof candidate.model === 'string'
    );
  }
}

export const activityLogService = ActivityLogService.getInstance();
