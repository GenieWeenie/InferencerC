import { parseJsonRpcMessageLine } from '../src/main/mcp-client';

describe('mcp-client JSON-RPC line parser', () => {
  it('accepts valid JSON-RPC result responses', () => {
    const parsed = parseJsonRpcMessageLine('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}');
    expect('message' in parsed).toBe(true);
  });

  it('accepts valid JSON-RPC notifications', () => {
    const parsed = parseJsonRpcMessageLine('{"jsonrpc":"2.0","method":"tools/list_changed"}');
    expect('message' in parsed).toBe(true);
  });

  it('rejects non-object payloads', () => {
    const parsed = parseJsonRpcMessageLine('"not-an-object"');
    expect(parsed).toEqual({ error: 'JSON-RPC payload must be an object' });
  });

  it('rejects payloads missing jsonrpc version', () => {
    const parsed = parseJsonRpcMessageLine('{"id":1,"result":{}}');
    expect(parsed).toEqual({ error: 'JSON-RPC payload must include jsonrpc: "2.0"' });
  });

  it('rejects responses with invalid id type', () => {
    const parsed = parseJsonRpcMessageLine('{"jsonrpc":"2.0","id":{"bad":1},"result":{}}');
    expect(parsed).toEqual({ error: 'JSON-RPC response has invalid id' });
  });

  it('rejects payloads that include both result and error', () => {
    const parsed = parseJsonRpcMessageLine(
      '{"jsonrpc":"2.0","id":1,"result":{"ok":true},"error":{"code":-1,"message":"bad"}}'
    );
    expect(parsed).toEqual({ error: 'JSON-RPC payload cannot include both result and error' });
  });

  it('rejects requests with invalid params type when params is present', () => {
    const parsed = parseJsonRpcMessageLine('{"jsonrpc":"2.0","method":"tools/list","params":"bad"}');
    expect(parsed).toEqual({ error: 'JSON-RPC request has invalid params' });
  });
});
