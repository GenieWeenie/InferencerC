/**
 * Workspace memory boundaries and context controls (GEN-153).
 * Per-workspace settings: scope what the app remembers per workspace; stored in localStorage.
 */

const CURRENT_WORKSPACE_ID_KEY = 'workspace_current_id_v1';
const WORKSPACE_MEMORY_PREFIX = 'workspace_memory_';
const DEFAULT_WORKSPACE_ID = 'default';

export interface WorkspaceMemory {
    label?: string;
    maxContextItems?: number;
    includeProjectContext?: boolean;
}

function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h = ((h << 5) - h) + c;
        h = h & 0x7fff_ffff;
    }
    return Math.abs(h).toString(36);
}

function storageKey(id: string): string {
    return `${WORKSPACE_MEMORY_PREFIX}${id}`;
}

function parseMemory(raw: string | null): WorkspaceMemory {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const out: WorkspaceMemory = {};
        if (typeof parsed.label === 'string') out.label = parsed.label.trim().slice(0, 128);
        if (typeof parsed.maxContextItems === 'number' && Number.isFinite(parsed.maxContextItems) && parsed.maxContextItems >= 0) {
            out.maxContextItems = Math.min(100, Math.floor(parsed.maxContextItems));
        }
        if (typeof parsed.includeProjectContext === 'boolean') out.includeProjectContext = parsed.includeProjectContext;
        return out;
    } catch {
        return {};
    }
}

export function getCurrentWorkspaceId(): string {
    try {
        const id = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_WORKSPACE_ID_KEY) : null;
        return (id && id.trim()) ? id.trim() : DEFAULT_WORKSPACE_ID;
    } catch {
        return DEFAULT_WORKSPACE_ID;
    }
}

export function setCurrentWorkspaceId(id: string): void {
    const normalized = (id && id.trim()) ? id.trim() : DEFAULT_WORKSPACE_ID;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CURRENT_WORKSPACE_ID_KEY, normalized);
        }
    } catch {
        // ignore
    }
}

export function deriveWorkspaceIdFromPath(path: string): string {
    return path ? simpleHash(path) : DEFAULT_WORKSPACE_ID;
}

export function setCurrentWorkspaceIdFromPath(path: string): void {
    setCurrentWorkspaceId(deriveWorkspaceIdFromPath(path));
}

export function getWorkspaceMemory(workspaceId: string): WorkspaceMemory {
    const id = workspaceId || DEFAULT_WORKSPACE_ID;
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(id)) : null;
        return parseMemory(raw);
    } catch {
        return {};
    }
}

export function setWorkspaceMemory(workspaceId: string, data: Partial<WorkspaceMemory>): void {
    const id = workspaceId || DEFAULT_WORKSPACE_ID;
    try {
        const current = getWorkspaceMemory(id);
        const next: WorkspaceMemory = {
            ...current,
            ...data,
        };
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey(id), JSON.stringify(next));
        }
    } catch {
        // ignore
    }
}

export function getCurrentWorkspaceMemory(): WorkspaceMemory {
    return getWorkspaceMemory(getCurrentWorkspaceId());
}
