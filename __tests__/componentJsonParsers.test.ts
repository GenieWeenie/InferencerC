/**
 * @jest-environment jsdom
 */

import { mergeRequestFromEditorJson } from '../src/renderer/components/APIPlayground';
import { parsePluginManifestJson } from '../src/renderer/components/PluginManager';
import type { APIRequest } from '../src/renderer/services/apiClient';

describe('component JSON parser guards', () => {
  it('merges request editor JSON only with valid API request fields', () => {
    const initial: APIRequest = {
      url: 'http://localhost:3000/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { model: 'a' },
    };

    const merged = mergeRequestFromEditorJson(
      initial,
      JSON.stringify({
        url: 'https://example.com/v1',
        method: 'GET',
        headers: { Authorization: 'Bearer test', Invalid: 123 },
        body: { ping: true },
      }),
    );

    expect(merged).toEqual({
      url: 'https://example.com/v1',
      method: 'GET',
      headers: { Authorization: 'Bearer test' },
      body: { ping: true },
    });
  });

  it('ignores malformed or invalid request editor JSON', () => {
    const initial: APIRequest = {
      url: 'http://localhost',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {},
    };

    expect(mergeRequestFromEditorJson(initial, '{bad-json')).toBe(initial);
    expect(mergeRequestFromEditorJson(initial, JSON.stringify({ method: 'PATCH' }))).toEqual(initial);
  });

  it('parses plugin manifest JSON only when payload is an object', () => {
    expect(parsePluginManifestJson('{"id":"plugin.a"}')).toEqual({ id: 'plugin.a' });
    expect(parsePluginManifestJson('[1,2,3]')).toBeNull();
    expect(parsePluginManifestJson('{bad-json')).toBeNull();
  });
});
