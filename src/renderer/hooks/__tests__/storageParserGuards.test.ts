/**
 * @jest-environment jsdom
 */

describe('hook parser guards', () => {
    it('parses and filters stored excluded indices', () => {
        const { parseStoredExcludedIndices } = require('../useChatContextOptimizer') as typeof import('../useChatContextOptimizer');
        const parsed = parseStoredExcludedIndices('[0, 1, -1, "3", 4]');
        expect(Array.from(parsed)).toEqual([0, 1, 4]);
    });

    it('returns empty excluded indices when persisted value is malformed', () => {
        const { parseStoredExcludedIndices } = require('../useChatContextOptimizer') as typeof import('../useChatContextOptimizer');
        const parsed = parseStoredExcludedIndices('{bad-json');
        expect(Array.from(parsed)).toEqual([]);
    });

    it('keeps only boolean collapse flags from stored collapse state', () => {
        const { parseStoredCollapseState } = require('../useCollapseState') as typeof import('../useCollapseState');
        const parsed = parseStoredCollapseState('{"message":true,"code":"yes","block":false}');
        expect(parsed).toEqual({ message: true, block: false });
    });

    it('normalizes MCP tool call payload arguments', () => {
        const { parseToolCallPayload } = require('../useMCP') as typeof import('../useMCP');

        expect(parseToolCallPayload({
            name: 'search',
            arguments: { query: 'latency' },
        })).toEqual({
            name: 'search',
            args: { query: 'latency' },
        });

        expect(parseToolCallPayload({
            name: 'search',
            parameters: { query: 'fallback' },
        })).toEqual({
            name: 'search',
            args: { query: 'fallback' },
        });

        expect(parseToolCallPayload({ name: 123 })).toBeNull();
    });
});
