import { ChatSession } from '../src/shared/types';

jest.mock('../src/renderer/services/history', () => ({
  HistoryService: {
    getAllSessions: jest.fn(),
    getSession: jest.fn(),
  },
}));

jest.mock('../src/renderer/services/searchIndex', () => ({
  SearchIndexService: {
    searchSessions: jest.fn(),
  },
}));

jest.mock('../src/renderer/services/autoTagging', () => ({
  autoTaggingService: {
    getTags: jest.fn(() => undefined),
    getTagsLookup: jest.fn(() => new Map()),
    getAllTags: jest.fn(() => []),
  },
}));

jest.mock('../src/renderer/services/workerManager', () => ({
  workerManager: {
    search: jest.fn(),
  },
}));

jest.mock('../src/renderer/services/performance', () => ({
  performanceService: {
    reportSearchTime: jest.fn(),
  },
}));

import { SearchService } from '../src/renderer/services/search';
import { HistoryService } from '../src/renderer/services/history';
import { SearchIndexService } from '../src/renderer/services/searchIndex';
import { autoTaggingService } from '../src/renderer/services/autoTagging';
import { workerManager } from '../src/renderer/services/workerManager';
import { performanceService } from '../src/renderer/services/performance';

const createSession = (id: string, title: string, content: string): ChatSession => ({
  id,
  title,
  lastModified: Date.now(),
  modelId: 'test-model',
  messages: [{ role: 'user', content }],
});

describe('SearchService.searchAsync', () => {
  const getAllSessionsMock = HistoryService.getAllSessions as jest.MockedFunction<typeof HistoryService.getAllSessions>;
  const getSessionMock = HistoryService.getSession as jest.MockedFunction<typeof HistoryService.getSession>;
  const searchSessionsMock = SearchIndexService.searchSessions as jest.MockedFunction<typeof SearchIndexService.searchSessions>;
  const getTagsLookupMock = autoTaggingService.getTagsLookup as jest.MockedFunction<typeof autoTaggingService.getTagsLookup>;
  const workerSearchMock = workerManager.search as jest.MockedFunction<typeof workerManager.search>;
  const reportSearchTimeMock = performanceService.reportSearchTime as jest.MockedFunction<typeof performanceService.reportSearchTime>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefilters async search sessions with SearchIndexService candidates', async () => {
    const s1 = createSession('s1', 'alpha session', 'contains alpha beta gamma');
    const s2 = createSession('s2', 'other session', 'different content');
    const s3 = createSession('s3', 'third session', 'contains alpha beta gamma delta');
    const byId = new Map<string, ChatSession>([
      [s1.id, s1],
      [s2.id, s2],
      [s3.id, s3],
    ]);

    getAllSessionsMock.mockReturnValue([s1, s2, s3]);
    searchSessionsMock.mockReturnValue(new Set(['s1', 's3']));
    getSessionMock.mockImplementation((id: string) => byId.get(id) || null);
    workerSearchMock.mockResolvedValue({
      results: [],
      stats: {
        totalResults: 0,
        sessionsSearched: 2,
        messagesSearched: 0,
        searchTimeMs: 4,
        topKeywords: [],
      },
    });

    await SearchService.searchAsync('alpha beta gamma');

    expect(searchSessionsMock).toHaveBeenCalledWith('alpha beta gamma');
    expect(getSessionMock).toHaveBeenCalledTimes(2);
    expect(workerSearchMock).toHaveBeenCalledTimes(1);
    const sessionsArg = workerSearchMock.mock.calls[0][0] as ChatSession[];
    expect(sessionsArg.map((s) => s.id)).toEqual(['s1', 's3']);
  });

  it('returns early with empty stats when index prefilter has no candidates', async () => {
    const s1 = createSession('s1', 'alpha session', 'alpha beta');
    const s2 = createSession('s2', 'other session', 'gamma delta');
    getAllSessionsMock.mockReturnValue([s1, s2]);
    searchSessionsMock.mockReturnValue(new Set());

    const result = await SearchService.searchAsync('alpha beta gamma');

    expect(result.results).toEqual([]);
    expect(result.stats.totalResults).toBe(0);
    expect(result.stats.sessionsSearched).toBe(0);
    expect(result.stats.messagesSearched).toBe(0);
    expect(Array.isArray(result.stats.topKeywords)).toBe(true);
    expect(typeof result.stats.searchTimeMs).toBe('number');
    expect(result.stats.searchTimeMs).toBeGreaterThanOrEqual(0);
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(workerSearchMock).not.toHaveBeenCalled();
    expect(reportSearchTimeMock).toHaveBeenCalledWith(result.stats.searchTimeMs);
  });

  it('normalizes async worker stats shape and reports search time', async () => {
    const s1 = createSession('s1', 'alpha session', 'alpha beta gamma');
    getAllSessionsMock.mockReturnValue([s1]);
    searchSessionsMock.mockReturnValue(new Set(['s1']));
    getSessionMock.mockReturnValue(s1);
    workerSearchMock.mockResolvedValue({
      results: [
        {
          sessionId: s1.id,
          sessionTitle: s1.title,
          messageIndex: 0,
          messageRole: 'user',
          content: 'alpha beta gamma',
          matchedText: 'alpha',
          matchStart: 0,
          matchEnd: 5,
          relevanceScore: 100,
          timestamp: s1.lastModified,
        },
      ],
      stats: {
        searchTimeMs: 12,
      } as any,
    });

    const result = await SearchService.searchAsync('alpha beta gamma');

    expect(result.stats).toEqual({
      totalResults: 1,
      sessionsSearched: 1,
      messagesSearched: 0,
      searchTimeMs: 12,
      topKeywords: [],
    });
    expect(reportSearchTimeMock).toHaveBeenCalledWith(12);
  });

  it('skips index prefilter for short queries', async () => {
    const s1 = createSession('s1', 'tiny query session', 'ok');
    getAllSessionsMock.mockReturnValue([s1]);
    getSessionMock.mockReturnValue(s1);
    workerSearchMock.mockResolvedValue({
      results: [],
      stats: {
        totalResults: 0,
        sessionsSearched: 1,
        messagesSearched: 1,
        searchTimeMs: 2,
        topKeywords: [],
      },
    });

    await SearchService.searchAsync('ok');

    expect(searchSessionsMock).not.toHaveBeenCalled();
    expect(workerSearchMock).toHaveBeenCalledTimes(1);
  });

  it('applies tag filter through bulk tag lookup before hydrating sessions', async () => {
    const s1 = createSession('s1', 'tagged one', 'alpha beta gamma');
    const s2 = createSession('s2', 'tagged two', 'alpha beta gamma');
    const s3 = createSession('s3', 'untagged', 'alpha beta gamma');
    const byId = new Map<string, ChatSession>([
      [s1.id, s1],
      [s2.id, s2],
      [s3.id, s3],
    ]);

    getAllSessionsMock.mockReturnValue([s1, s2, s3]);
    getTagsLookupMock.mockReturnValue(new Map([
      [s1.id, { sessionId: s1.id, tags: ['focus-tag'], autoGenerated: false, taggedAt: 1 }],
      [s2.id, { sessionId: s2.id, tags: ['other-tag'], autoGenerated: false, taggedAt: 1 }],
    ]));
    searchSessionsMock.mockReturnValue(new Set(['s1', 's2', 's3']));
    getSessionMock.mockImplementation((id: string) => byId.get(id) || null);
    workerSearchMock.mockResolvedValue({
      results: [],
      stats: {
        totalResults: 0,
        sessionsSearched: 1,
        messagesSearched: 0,
        searchTimeMs: 5,
        topKeywords: [],
      },
    });

    await SearchService.searchAsync('alpha beta gamma', { tags: ['focus-tag'] });

    expect(getTagsLookupMock).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const sessionsArg = workerSearchMock.mock.calls[0][0] as ChatSession[];
    expect(sessionsArg.map((s) => s.id)).toEqual(['s1']);
  });

  it('applies combined model/date/tag filters before worker dispatch', async () => {
    const now = Date.now();
    const s1 = createSession('s1', 'good candidate', 'alpha beta gamma');
    s1.lastModified = now - 1_000;
    s1.modelId = 'model-a';
    const s2 = createSession('s2', 'wrong model', 'alpha beta gamma');
    s2.lastModified = now - 1_000;
    s2.modelId = 'model-b';
    const s3 = createSession('s3', 'out of range', 'alpha beta gamma');
    s3.lastModified = now - 100_000;
    s3.modelId = 'model-a';

    const byId = new Map<string, ChatSession>([
      [s1.id, s1],
      [s2.id, s2],
      [s3.id, s3],
    ]);

    getAllSessionsMock.mockReturnValue([s1, s2, s3]);
    getTagsLookupMock.mockReturnValue(new Map([
      [s1.id, { sessionId: s1.id, tags: ['focus-tag'], autoGenerated: false, taggedAt: 1 }],
      [s2.id, { sessionId: s2.id, tags: ['focus-tag'], autoGenerated: false, taggedAt: 1 }],
      [s3.id, { sessionId: s3.id, tags: ['focus-tag'], autoGenerated: false, taggedAt: 1 }],
    ]));
    searchSessionsMock.mockReturnValue(new Set(['s1', 's2', 's3']));
    getSessionMock.mockImplementation((id: string) => byId.get(id) || null);
    workerSearchMock.mockResolvedValue({
      results: [],
      stats: {
        totalResults: 0,
        sessionsSearched: 1,
        messagesSearched: 0,
        searchTimeMs: 6,
        topKeywords: [],
      },
    });

    await SearchService.searchAsync('alpha beta gamma', {
      model: 'model-a',
      tags: ['focus-tag'],
      dateFrom: new Date(now - 10_000),
      dateTo: new Date(now + 10_000),
    });

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const sessionsArg = workerSearchMock.mock.calls[0][0] as ChatSession[];
    expect(sessionsArg.map((s) => s.id)).toEqual(['s1']);
  });
});
