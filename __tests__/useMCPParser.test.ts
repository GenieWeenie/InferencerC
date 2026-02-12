import { parseToolCallPayload, parseToolCallPayloadFromRaw } from '../src/renderer/hooks/useMCP';

describe('useMCP parser helpers', () => {
    it('parses valid payload names and object args', () => {
        expect(parseToolCallPayload({
            name: '  web.search  ',
            arguments: { q: 'hello' },
        })).toEqual({
            name: 'web.search',
            args: { q: 'hello' },
        });
    });

    it('accepts JSON-string arguments and falls back to parameters when needed', () => {
        expect(parseToolCallPayload({
            name: 'tool-a',
            arguments: '{"limit":10,"query":"hello"}',
        })).toEqual({
            name: 'tool-a',
            args: { limit: 10, query: 'hello' },
        });

        expect(parseToolCallPayload({
            name: 'tool-b',
            arguments: '[]',
            parameters: { mode: 'fast' },
        })).toEqual({
            name: 'tool-b',
            args: { mode: 'fast' },
        });
    });

    it('returns empty args object for malformed argument payloads', () => {
        expect(parseToolCallPayload({
            name: 'tool-c',
            arguments: '[1,2,3]',
            parameters: 'not-json',
        })).toEqual({
            name: 'tool-c',
            args: {},
        });
    });

    it('rejects invalid payload shapes and invalid raw json blocks', () => {
        expect(parseToolCallPayload(null)).toBeNull();
        expect(parseToolCallPayload({ name: '   ' })).toBeNull();
        expect(parseToolCallPayloadFromRaw('{bad-json')).toBeNull();
        expect(parseToolCallPayloadFromRaw('{"name":"   ","arguments":{}}')).toBeNull();
    });

    it('parses valid raw tool payload blocks', () => {
        expect(parseToolCallPayloadFromRaw('{"name":"file.read","arguments":{"path":"README.md"}}')).toEqual({
            name: 'file.read',
            args: { path: 'README.md' },
        });
    });
});
