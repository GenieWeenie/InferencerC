/**
 * @jest-environment jsdom
 */

jest.mock('../src/renderer/services/search', () => ({
  SearchService: {
    getRecentSearches: jest.fn(() => []),
    searchAsync: jest.fn(async () => ({
      results: [],
      stats: {
        totalResults: 0,
        sessionsSearched: 0,
        messagesSearched: 0,
        searchTimeMs: 0,
        topKeywords: [],
      },
    })),
    saveRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  },
}));

jest.mock('../src/renderer/services/history', () => ({
  HistoryService: {
    getAllSessions: jest.fn(() => []),
  },
}));

jest.mock('../src/renderer/services/autoTagging', () => ({
  autoTaggingService: {
    getAllTags: jest.fn(() => []),
  },
}));

import { mergeRequestFromEditorJson } from '../src/renderer/components/APIPlayground';
import { parseBooleanRecord } from '../src/renderer/components/GlobalSearchDialog';
import { parsePluginManifestJson } from '../src/renderer/components/PluginManager';
import { parseSavedRequests } from '../src/renderer/components/RequestBuilder';
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

  it('parses search dialog boolean records and ignores malformed payloads', () => {
    expect(parseBooleanRecord('{"a":true,"b":"x","c":false}')).toEqual({ a: true, c: false });
    expect(parseBooleanRecord('[]')).toEqual({});
    expect(parseBooleanRecord('{bad-json')).toEqual({});
  });

  it('sanitizes and dedupes saved request entries from storage payloads', () => {
    expect(parseSavedRequests(JSON.stringify([
      {
        name: ' Saved ',
        request: {
          url: 'https://example.com',
          method: 'GET',
          headers: { Authorization: 'token', Bad: 1 },
          body: { ok: true },
        },
      },
      {
        name: 'Saved',
        request: {
          url: 'https://example.com/dupe',
          method: 'POST',
          headers: {},
          body: {},
        },
      },
      {
        name: 'Bad',
        request: { url: 'https://example.com', method: 'PATCH' },
      },
    ]))).toEqual([
      {
        name: 'Saved',
        request: {
          url: 'https://example.com',
          method: 'GET',
          headers: { Authorization: 'token' },
          body: { ok: true },
        },
      },
    ]);
  });
});
