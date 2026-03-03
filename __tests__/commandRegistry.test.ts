/** @jest-environment jsdom */
import { CommandRegistry, type Command } from '../src/renderer/lib/commandRegistry';

const makeCommand = (
    id: string,
    overrides?: Partial<Command>
): Command => ({
    id,
    label: `Label ${id}`,
    category: 'Actions',
    action: () => {},
    ...overrides,
});

describe('CommandRegistry', () => {
    let registry: CommandRegistry;

    beforeEach(() => {
        registry = new CommandRegistry();
    });

    describe('register', () => {
        it('adds a command and get retrieves it', () => {
            const cmd = makeCommand('cmd-1');
            registry.register(cmd);
            expect(registry.get('cmd-1')).toBe(cmd);
        });
    });

    describe('registerMany', () => {
        it('adds multiple commands', () => {
            const cmd1 = makeCommand('cmd-1');
            const cmd2 = makeCommand('cmd-2');
            registry.registerMany([cmd1, cmd2]);
            expect(registry.get('cmd-1')).toBe(cmd1);
            expect(registry.get('cmd-2')).toBe(cmd2);
        });
    });

    describe('unregister', () => {
        it('removes a command', () => {
            const cmd = makeCommand('cmd-1');
            registry.register(cmd);
            expect(registry.get('cmd-1')).toBe(cmd);
            registry.unregister('cmd-1');
            expect(registry.get('cmd-1')).toBeUndefined();
        });
    });

    describe('getAll', () => {
        it('returns all registered commands', () => {
            const cmd1 = makeCommand('cmd-1');
            const cmd2 = makeCommand('cmd-2');
            registry.registerMany([cmd1, cmd2]);
            const all = registry.getAll();
            expect(all).toHaveLength(2);
            expect(all).toContain(cmd1);
            expect(all).toContain(cmd2);
        });
    });

    describe('getByCategory', () => {
        it('filters correctly by category', () => {
            const nav = makeCommand('nav-1', { category: 'Navigation' });
            const act = makeCommand('act-1', { category: 'Actions' });
            const act2 = makeCommand('act-2', { category: 'Actions' });
            registry.registerMany([nav, act, act2]);
            expect(registry.getByCategory('Navigation')).toEqual([nav]);
            expect(registry.getByCategory('Actions')).toHaveLength(2);
            expect(registry.getByCategory('Actions')).toContain(act);
            expect(registry.getByCategory('Actions')).toContain(act2);
        });
    });

    describe('execute', () => {
        it('calls action when enabled (default true)', () => {
            const action = jest.fn();
            registry.register(makeCommand('cmd-1', { action }));
            registry.execute('cmd-1');
            expect(action).toHaveBeenCalledTimes(1);
        });

        it('does NOT call action when enabled() returns false', () => {
            const action = jest.fn();
            registry.register(makeCommand('cmd-1', { action, enabled: () => false }));
            registry.execute('cmd-1');
            expect(action).not.toHaveBeenCalled();
        });

        it('calls action when enabled() returns true', () => {
            const action = jest.fn();
            registry.register(makeCommand('cmd-1', { action, enabled: () => true }));
            registry.execute('cmd-1');
            expect(action).toHaveBeenCalledTimes(1);
        });

        it('is a no-op for unknown commandId', () => {
            const action = jest.fn();
            registry.register(makeCommand('cmd-1', { action }));
            registry.execute('unknown-id');
            expect(action).not.toHaveBeenCalled();
        });
    });

    describe('search', () => {
        it("returns all commands when query is ''", () => {
            const cmd1 = makeCommand('cmd-1');
            const cmd2 = makeCommand('cmd-2');
            registry.registerMany([cmd1, cmd2]);
            expect(registry.search('')).toHaveLength(2);
            expect(registry.search(' ')).toHaveLength(2);
        });

        it('ranks exact match highest', () => {
            const exact = makeCommand('exact', { label: 'New Chat' });
            const partial = makeCommand('partial', { label: 'New Chat Session' });
            registry.registerMany([partial, exact]);
            const results = registry.search('New Chat');
            expect(results[0]).toBe(exact);
            expect(results[1]).toBe(partial);
        });

        it('works with partial match', () => {
            const cmd = makeCommand('cmd-1', { label: 'Open Settings' });
            registry.register(cmd);
            const results = registry.search('settings');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe(cmd);
        });

        it('matches keywords', () => {
            const cmd = makeCommand('cmd-1', {
                label: 'Create New',
                keywords: ['add', 'create', 'new'],
            });
            registry.register(cmd);
            const results = registry.search('add');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe(cmd);
        });

        it('returns empty when no matches', () => {
            registry.register(makeCommand('cmd-1', { label: 'Open File' }));
            expect(registry.search('xyznonexistent')).toEqual([]);
        });
    });

    describe('subscribe', () => {
        it('is called on register', () => {
            const listener = jest.fn();
            registry.subscribe(listener);
            registry.register(makeCommand('cmd-1'));
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('is called on unregister', () => {
            const listener = jest.fn();
            registry.register(makeCommand('cmd-1'));
            registry.subscribe(listener);
            registry.unregister('cmd-1');
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('is called on clear', () => {
            const listener = jest.fn();
            registry.register(makeCommand('cmd-1'));
            registry.subscribe(listener);
            registry.clear();
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('unsubscribe function works', () => {
            const listener = jest.fn();
            const unsubscribe = registry.subscribe(listener);
            unsubscribe();
            registry.register(makeCommand('cmd-1'));
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        it('removes all commands', () => {
            registry.registerMany([
                makeCommand('cmd-1'),
                makeCommand('cmd-2'),
            ]);
            expect(registry.getAll()).toHaveLength(2);
            registry.clear();
            expect(registry.getAll()).toHaveLength(0);
            expect(registry.get('cmd-1')).toBeUndefined();
            expect(registry.get('cmd-2')).toBeUndefined();
        });
    });
});
