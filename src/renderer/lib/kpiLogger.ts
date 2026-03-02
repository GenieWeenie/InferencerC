/**
 * Optional local-only KPI logging for product decisions (first success time,
 * crash-free sessions, weekly retained users). No network; stores in localStorage.
 */

const KPI_STORAGE_KEY = 'app_kpi_stats';
const MAX_SESSIONS = 500;

export interface KpiSession {
    startedAt: string;
    endedClean?: boolean;
}

export interface KpiData {
    firstSuccessAt: string | null;
    sessions: KpiSession[];
}

export interface KpiSnapshot {
    firstSuccessAt: string | null;
    totalSessions: number;
    crashFreeSessions: number;
    weeksWithActivity: string[];
}

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const isValidIsoDate = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

const sanitizeSession = (value: unknown): KpiSession | null => {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    const startedAt = typeof entry.startedAt === 'string' ? entry.startedAt : null;
    if (!startedAt || !/^\d{4}-\d{2}-\d{2}/.test(startedAt)) return null;
    const endedClean =
        typeof entry.endedClean === 'boolean' ? entry.endedClean : undefined;
    return { startedAt, endedClean };
};

const load = (): KpiData => {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KPI_STORAGE_KEY) : null;
        if (!raw) return { firstSuccessAt: null, sessions: [] };
        const parsed = parseJson(raw);
        if (!parsed || typeof parsed !== 'object') return { firstSuccessAt: null, sessions: [] };
        const obj = parsed as Record<string, unknown>;
        const firstSuccessAt = isValidIsoDate(obj.firstSuccessAt) ? obj.firstSuccessAt : null;
        const sessionsRaw = Array.isArray(obj.sessions) ? obj.sessions : [];
        const sessions = sessionsRaw
            .map(sanitizeSession)
            .filter((s): s is KpiSession => s !== null)
            .slice(-MAX_SESSIONS);
        return { firstSuccessAt, sessions };
    } catch {
        return { firstSuccessAt: null, sessions: [] };
    }
};

const save = (data: KpiData): void => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(data));
        }
    } catch {
        // Best-effort; avoid breaking app
    }
};

/**
 * Record the first successful outcome (e.g. first successful inference). Idempotent.
 */
export function recordFirstSuccess(): void {
    const data = load();
    if (data.firstSuccessAt) return;
    data.firstSuccessAt = new Date().toISOString();
    save(data);
}

/**
 * Call when a session starts (e.g. app or chat window open). Pair with recordSessionEnd on exit.
 */
export function recordSessionStart(): void {
    const data = load();
    data.sessions.push({ startedAt: new Date().toISOString() });
    if (data.sessions.length > MAX_SESSIONS) {
        data.sessions = data.sessions.slice(-MAX_SESSIONS);
    }
    save(data);
}

/**
 * Call when the session is ending (e.g. beforeunload). Pass true if the exit was clean (no crash).
 */
export function recordSessionEnd(cleanExit: boolean): void {
    const data = load();
    const last = data.sessions[data.sessions.length - 1];
    if (last) {
        last.endedClean = cleanExit;
        save(data);
    }
}

/** Returns ISO week key (e.g. "2026-W09") for a date. No external deps. */
function getWeekKey(date: Date): string | null {
    if (Number.isNaN(date.getTime())) return null;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = d.getDay() || 7; // Mon=1 .. Sun=7
    d.setDate(d.getDate() + 4 - dayNum); // Thursday of this week
    const y = d.getFullYear();
    const start = new Date(y, 0, 1);
    const weekNo = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + 1) / 7);
    return `${y}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Return a snapshot of KPIs for product decisions. All data is local; no network.
 */
export function getKpiSnapshot(): KpiSnapshot {
    const data = load();
    const crashFreeSessions = data.sessions.filter((s) => s.endedClean === true).length;
    const weekSet = new Set<string>();
    for (const s of data.sessions) {
        const key = getWeekKey(new Date(s.startedAt));
        if (key) weekSet.add(key);
    }
    return {
        firstSuccessAt: data.firstSuccessAt,
        totalSessions: data.sessions.length,
        crashFreeSessions,
        weeksWithActivity: Array.from(weekSet).sort(),
    };
}
