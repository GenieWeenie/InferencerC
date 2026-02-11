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
const ACTIVITY_LOG_COUNT_KEY = 'api_activity_log_count';
const MAX_ACTIVITY_LOG_ENTRIES = 200;

const parseJson = (raw: string): unknown | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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
      const parsed = parseJson(raw);
      if (!Array.isArray(parsed)) return [];
      const validEntries = parsed.filter(this.isValidEntry);
      this.saveCount(validEntries.length);
      return validEntries;
    } catch {
      return [];
    }
  }

  getEntryCount(): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const rawCount = localStorage.getItem(ACTIVITY_LOG_COUNT_KEY);
      if (rawCount !== null) {
        const parsedCount = Number(rawCount);
        if (Number.isInteger(parsedCount) && parsedCount >= 0) {
          return parsedCount;
        }
      }
      const fallbackCount = this.getEntries().length;
      this.saveCount(fallbackCount);
      return fallbackCount;
    } catch {
      return 0;
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
      localStorage.removeItem(ACTIVITY_LOG_COUNT_KEY);
    } catch {
      // ignore storage errors
    }
  }

  private save(entries: ApiActivityLogEntry[]): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries));
      this.saveCount(entries.length);
    } catch {
      // ignore storage errors
    }
  }

  private saveCount(count: number): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ACTIVITY_LOG_COUNT_KEY, String(Math.max(0, count)));
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
