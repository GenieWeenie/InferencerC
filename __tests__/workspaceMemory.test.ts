/** @jest-environment jsdom */
import {
    getCurrentWorkspaceId,
    setCurrentWorkspaceId,
    deriveWorkspaceIdFromPath,
    setCurrentWorkspaceIdFromPath,
    getWorkspaceMemory,
    setWorkspaceMemory,
    getCurrentWorkspaceMemory,
    type WorkspaceMemory,
} from '../src/renderer/services/workspaceMemory';

const store: Record<string, string> = {};
const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
        store[key] = value;
    },
    clear: () => {
        for (const k of Object.keys(store)) delete store[k];
    },
    removeItem: (key: string) => {
        delete store[key];
    },
    get length() {
        return Object.keys(store).length;
    },
    key: () => null,
};

describe('workspaceMemory', () => {
    const originalLocalStorage = globalThis.localStorage;

    beforeAll(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            value: mockLocalStorage,
            configurable: true,
            writable: true,
        });
    });

    afterAll(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            value: originalLocalStorage,
            configurable: true,
            writable: true,
        });
    });

    beforeEach(() => {
        mockLocalStorage.clear();
    });

    describe('getCurrentWorkspaceId / setCurrentWorkspaceId', () => {
        it('returns default when unset', () => {
            expect(getCurrentWorkspaceId()).toBe('default');
        });

        it('round-trips workspace id', () => {
            setCurrentWorkspaceId('my-workspace');
            expect(getCurrentWorkspaceId()).toBe('my-workspace');
        });

        it('trims whitespace when setting', () => {
            setCurrentWorkspaceId('  trimmed  ');
            expect(getCurrentWorkspaceId()).toBe('trimmed');
        });

        it('treats empty string as default', () => {
            setCurrentWorkspaceId('');
            expect(getCurrentWorkspaceId()).toBe('default');
        });

        it('handles missing localStorage key', () => {
            mockLocalStorage.clear();
            expect(getCurrentWorkspaceId()).toBe('default');
        });
    });

    describe('deriveWorkspaceIdFromPath', () => {
        it('returns consistent IDs for same path', () => {
            const id1 = deriveWorkspaceIdFromPath('/home/user/project');
            const id2 = deriveWorkspaceIdFromPath('/home/user/project');
            expect(id1).toBe(id2);
        });

        it('returns different IDs for different paths', () => {
            const id1 = deriveWorkspaceIdFromPath('/home/user/project-a');
            const id2 = deriveWorkspaceIdFromPath('/home/user/project-b');
            expect(id1).not.toBe(id2);
        });

        it('returns default for empty string path', () => {
            expect(deriveWorkspaceIdFromPath('')).toBe('default');
        });

        it('handles unicode path', () => {
            const path = '/Users/日本語/プロジェクト';
            const id = deriveWorkspaceIdFromPath(path);
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
            expect(deriveWorkspaceIdFromPath(path)).toBe(id);
        });
    });

    describe('setCurrentWorkspaceIdFromPath', () => {
        it('derives and sets workspace id from path', () => {
            setCurrentWorkspaceIdFromPath('/home/user/my-project');
            const derived = deriveWorkspaceIdFromPath('/home/user/my-project');
            expect(getCurrentWorkspaceId()).toBe(derived);
        });
    });

    describe('getWorkspaceMemory / setWorkspaceMemory', () => {
        it('round-trips WorkspaceMemory object', () => {
            const data: WorkspaceMemory = {
                label: 'My Workspace',
                maxContextItems: 50,
                includeProjectContext: true,
            };
            setWorkspaceMemory('ws-1', data);
            expect(getWorkspaceMemory('ws-1')).toEqual(data);
        });

        it('merges partial updates', () => {
            setWorkspaceMemory('ws-2', { label: 'Initial' });
            setWorkspaceMemory('ws-2', { maxContextItems: 25 });
            expect(getWorkspaceMemory('ws-2')).toEqual({
                label: 'Initial',
                maxContextItems: 25,
            });
        });

        it('returns empty object for unknown workspace', () => {
            expect(getWorkspaceMemory('nonexistent')).toEqual({});
        });

        it('handles empty workspace id as default', () => {
            setWorkspaceMemory('', { label: 'Default WS' });
            expect(getWorkspaceMemory('')).toEqual({ label: 'Default WS' });
        });
    });

    describe('getCurrentWorkspaceMemory', () => {
        it('returns defaults when no workspace set', () => {
            expect(getCurrentWorkspaceMemory()).toEqual({});
        });

        it('returns stored data when workspace is set', () => {
            setCurrentWorkspaceId('ws-stored');
            setWorkspaceMemory('ws-stored', {
                label: 'Stored Workspace',
                includeProjectContext: false,
            });
            expect(getCurrentWorkspaceMemory()).toEqual({
                label: 'Stored Workspace',
                includeProjectContext: false,
            });
        });

        it('returns memory for default workspace when current is default', () => {
            setWorkspaceMemory('default', { label: 'Default Label' });
            expect(getCurrentWorkspaceMemory()).toEqual({ label: 'Default Label' });
        });
    });

    describe('edge cases', () => {
        it('handles invalid JSON in storage gracefully', () => {
            const key = 'workspace_memory_test-ws';
            mockLocalStorage.setItem(key, '{invalid json');
            expect(getWorkspaceMemory('test-ws')).toEqual({});
        });

        it('sanitizes label to max 128 chars', () => {
            const longLabel = 'a'.repeat(200);
            setWorkspaceMemory('ws-sanitize', { label: longLabel });
            expect(getWorkspaceMemory('ws-sanitize').label).toHaveLength(128);
        });

        it('clamps maxContextItems to 100', () => {
            setWorkspaceMemory('ws-clamp', { maxContextItems: 999 });
            expect(getWorkspaceMemory('ws-clamp').maxContextItems).toBe(100);
        });

        it('rejects negative maxContextItems', () => {
            setWorkspaceMemory('ws-neg', { maxContextItems: -5 });
            expect(getWorkspaceMemory('ws-neg').maxContextItems).toBeUndefined();
        });
    });
});
