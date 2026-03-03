/** @jest-environment jsdom */

jest.mock('../src/renderer/services/history', () => ({
    HistoryService: {
        getSession: jest.fn(),
        getAllSessions: jest.fn().mockReturnValue([]),
    },
}));
jest.mock('../src/renderer/services/keyPointExtraction', () => ({
    keyPointExtractionService: {
        extractKeyPoints: jest.fn().mockReturnValue({
            topics: ['topic1', 'topic2'],
            keyPoints: [],
        }),
    },
}));
jest.mock('../src/renderer/services/analyticsStore', () => ({
    readAnalyticsUsageStats: jest.fn().mockReturnValue([]),
}));

import { HistoryService } from '../src/renderer/services/history';
import { ConversationAnalyticsService } from '../src/renderer/services/conversationAnalytics';
import type { ChatMessage, ChatSession } from '../src/shared/types';

const mockGetSession = HistoryService.getSession as jest.MockedFunction<
    typeof HistoryService.getSession
>;
const mockGetAllSessions = HistoryService.getAllSessions as jest.MockedFunction<
    typeof HistoryService.getAllSessions
>;

const msg = (
    role: 'user' | 'assistant' | 'system',
    content: string,
    generationTime?: number
): ChatMessage => ({ role, content, ...(generationTime != null && { generationTime }) });

const session = (
    id: string,
    messages: ChatMessage[],
    overrides?: Partial<ChatSession>
): ChatSession => ({
    id,
    title: 'Test Session',
    modelId: 'model-1',
    messages,
    lastModified: Date.now(),
    ...overrides,
});

describe('ConversationAnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAllSessions.mockReturnValue([]);
    });

    describe('getInstance', () => {
        it('returns same instance', () => {
            const a = ConversationAnalyticsService.getInstance();
            const b = ConversationAnalyticsService.getInstance();
            expect(a).toBe(b);
        });
    });

    describe('analyzeConversation', () => {
        it('returns null for missing session', async () => {
            mockGetSession.mockReturnValue(undefined);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('missing-id');
            expect(result).toBeNull();
        });

        it('returns null for session with no messages', async () => {
            mockGetSession.mockReturnValue(session('s1', []));
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).toBeNull();
        });

        it('returns correct messageCount, userMessageCount, assistantMessageCount for valid session', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hello'),
                msg('assistant', 'Hi there'),
                msg('user', 'How are you?'),
                msg('assistant', 'I am fine'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.messageCount).toBe(4);
            expect(result!.userMessageCount).toBe(2);
            expect(result!.assistantMessageCount).toBe(2);
        });

        it('estimates tokens ~ content.length/4', async () => {
            const content = 'x'.repeat(40);
            const messages: ChatMessage[] = [
                msg('user', content),
                msg('assistant', content),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.totalTokens).toBe(20);
        });

        it('engagement score > 0 for multi-message conversation', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hello'),
                msg('assistant', 'Hi'),
                msg('user', 'How are you?'),
                msg('assistant', 'Good'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.effectiveness.engagementScore).toBeGreaterThan(0);
        });

        it('sentiment detects positive words (great, thanks)', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'This is great'),
                msg('assistant', 'Thanks for the feedback'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.sentiment).toBeDefined();
            expect(result!.sentiment!.overall).toBeGreaterThan(0);
        });

        it('sentiment detects negative words (error, wrong)', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'There was an error'),
                msg('assistant', 'That is wrong'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.sentiment).toBeDefined();
            expect(result!.sentiment!.overall).toBeLessThan(0);
        });

        it('completionRate = 1.0 when last message is assistant and >5 messages', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'A'),
                msg('assistant', 'B'),
                msg('user', 'C'),
                msg('assistant', 'D'),
                msg('user', 'E'),
                msg('assistant', 'F'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.effectiveness.completionRate).toBe(1.0);
        });

        it('branchCount from conversationTree', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hello'),
                msg('assistant', 'Hi'),
            ];
            mockGetSession.mockReturnValue(
                session('s1', messages, {
                    conversationTree: { branches: [{}, {}, {}] },
                }) as ChatSession
            );
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.branchCount).toBe(3);
        });

        it('responseQuality = 1 when no regens/edits', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hello'),
                msg('assistant', 'Hi'),
            ];
            mockGetSession.mockReturnValue(session('s1', messages) as ChatSession);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeConversation('s1');
            expect(result).not.toBeNull();
            expect(result!.effectiveness.responseQuality).toBe(1);
        });
    });

    describe('analyzeAllConversations', () => {
        it('processes all sessions', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hi'),
                msg('assistant', 'Hello'),
            ];
            mockGetAllSessions.mockReturnValue([
                session('s1', messages),
                session('s2', messages),
            ] as ChatSession[]);
            mockGetSession.mockImplementation((id: string) => {
                if (id === 's1') return session('s1', messages) as ChatSession;
                if (id === 's2') return session('s2', messages) as ChatSession;
                return undefined as unknown as ChatSession;
            });
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.analyzeAllConversations();
            expect(result).toHaveLength(2);
        });
    });

    describe('getModelPerformance', () => {
        it('groups by modelId, sorted by engagement', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hi'),
                msg('assistant', 'Hello'),
            ];
            mockGetAllSessions.mockReturnValue([
                session('s1', messages, { modelId: 'model-a' }),
                session('s2', messages, { modelId: 'model-b' }),
                session('s3', messages, { modelId: 'model-a' }),
            ] as ChatSession[]);
            mockGetSession.mockImplementation((id: string) => {
                const sessions = [
                    session('s1', messages, { modelId: 'model-a' }),
                    session('s2', messages, { modelId: 'model-b' }),
                    session('s3', messages, { modelId: 'model-a' }),
                ];
                return sessions.find((s) => s.id === id) as ChatSession;
            });
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.getModelPerformance();
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result.every((r) => ['model-a', 'model-b'].includes(r.modelId))).toBe(true);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].avgEngagementScore).toBeLessThanOrEqual(
                    result[i - 1].avgEngagementScore
                );
            }
        });
    });

    describe('getPatternAnalysis', () => {
        it('returns valid structure with conversationLengths', async () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hi'),
                msg('assistant', 'Hello'),
            ];
            mockGetAllSessions.mockReturnValue([
                session('s1', messages, { lastModified: Date.now() }),
            ] as ChatSession[]);
            mockGetSession.mockReturnValue(
                session('s1', messages, { lastModified: Date.now() }) as ChatSession
            );
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.getPatternAnalysis();
            expect(result).toHaveProperty('peakHours');
            expect(result).toHaveProperty('peakDays');
            expect(result).toHaveProperty('conversationLengths');
            expect(result.conversationLengths).toMatchObject({
                short: expect.any(Number),
                medium: expect.any(Number),
                long: expect.any(Number),
            });
        });

        it('handles empty sessions without error', async () => {
            mockGetAllSessions.mockReturnValue([]);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.getPatternAnalysis();
            expect(result.conversationLengths).toEqual({
                short: 0,
                medium: 0,
                long: 0,
            });
        });
    });

    describe('getTrends', () => {
        it('returns date-sorted trend data', async () => {
            const now = Date.now();
            const messages: ChatMessage[] = [
                msg('user', 'Hi'),
                msg('assistant', 'Hello'),
            ];
            mockGetAllSessions.mockReturnValue([
                session('s1', messages, { lastModified: now }),
                session('s2', messages, {
                    lastModified: now - 86400000,
                }),
            ] as ChatSession[]);
            mockGetSession.mockImplementation((id: string) => {
                if (id === 's1')
                    return session('s1', messages, { lastModified: now }) as ChatSession;
                if (id === 's2')
                    return session('s2', messages, {
                        lastModified: now - 86400000,
                    }) as ChatSession;
                return undefined as unknown as ChatSession;
            });
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.getTrends(30);
            expect(Array.isArray(result)).toBe(true);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].date >= result[i - 1].date).toBe(true);
            }
        });

        it('returns empty array when no sessions in range', async () => {
            mockGetAllSessions.mockReturnValue([]);
            const service = ConversationAnalyticsService.getInstance();
            const result = await service.getTrends(7);
            expect(result).toEqual([]);
        });
    });
});
