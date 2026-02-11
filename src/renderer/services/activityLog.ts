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

const sanitizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
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
      const validEntries = parsed
        .map((entry) => this.sanitizeEntry(entry))
        .filter((entry): entry is ApiActivityLogEntry => entry !== null);
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
    const sanitized = this.sanitizeEntry(entry);
    if (!sanitized) {
      return current;
    }
    const next = [...current, sanitized].slice(-MAX_ACTIVITY_LOG_ENTRIES);
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
      const normalized = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
      localStorage.setItem(ACTIVITY_LOG_COUNT_KEY, String(normalized));
    } catch {
      // ignore storage errors
    }
  }

  private sanitizeEntry(entry: unknown): ApiActivityLogEntry | null {
    if (!entry || typeof entry !== 'object') return null;
    const candidate = entry as Partial<ApiActivityLogEntry>;
    const id = sanitizeNonEmptyString(candidate.id);
    const model = sanitizeNonEmptyString(candidate.model);
    const timestamp = sanitizeFiniteNonNegativeNumber(candidate.timestamp);
    if (!id || !model || timestamp === null) {
      return null;
    }
    if (candidate.type !== 'request' && candidate.type !== 'response' && candidate.type !== 'error') {
      return null;
    }
    const duration = candidate.duration === undefined
      ? undefined
      : sanitizeFiniteNonNegativeNumber(candidate.duration);
    const error = sanitizeNonEmptyString(candidate.error);

    return {
      id,
      timestamp,
      type: candidate.type,
      model,
      request: candidate.request,
      response: candidate.response,
      error: error ?? undefined,
      duration: duration ?? undefined,
    };
  }
}

export const activityLogService = ActivityLogService.getInstance();
