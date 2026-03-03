import request from 'supertest';

jest.mock('../src/server/services/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

const mockGetModels = jest.fn().mockReturnValue([
    { id: 'test-model', name: 'Test', adapter: 'mock' },
    { id: 'lm-model', name: 'LM', adapter: 'lm-studio' },
]);

jest.mock('../src/server/services/config', () => ({
    ConfigService: jest.fn().mockImplementation(() => ({
        getModels: mockGetModels,
        getConfig: jest.fn(),
    })),
}));

const mockSearchHuggingFace = jest.fn().mockResolvedValue([{ id: 'repo1' }]);
const mockGetRepoFiles = jest.fn().mockResolvedValue([{ name: 'model.gguf' }]);
const mockStartDownload = jest.fn().mockReturnValue('dl-1');
const mockGetAllDownloads = jest.fn().mockReturnValue([]);

jest.mock('../src/server/services/downloader', () => ({
    ModelManager: jest.fn().mockImplementation(() => ({
        searchHuggingFace: mockSearchHuggingFace,
        getRepoFiles: mockGetRepoFiles,
        startDownload: mockStartDownload,
        getAllDownloads: mockGetAllDownloads,
    })),
}));

const mockGetStats = jest.fn().mockResolvedValue({ cpuUsage: 42 });

jest.mock('../src/server/services/stats', () => ({
    StatsService: jest.fn().mockImplementation(() => ({
        getStats: mockGetStats,
    })),
}));

const mockFetchUrl = jest.fn().mockResolvedValue('<html>ok</html>');

jest.mock('../src/server/services/web', () => ({
    WebService: jest.fn().mockImplementation(() => ({
        fetchUrl: mockFetchUrl,
    })),
}));

const mockCreateSession = jest.fn();
const mockJoinSession = jest.fn();
const mockLeaveSession = jest.fn();
const mockGetSession = jest.fn();
const mockPollEvents = jest.fn();
const mockUpdatePresence = jest.fn();
const mockAddMessage = jest.fn();
const mockEditMessage = jest.fn();
const mockKickParticipant = jest.fn();

jest.mock('../src/server/services/collaboration', () => ({
    CollaborationService: jest.fn().mockImplementation(() => ({
        createSession: mockCreateSession,
        joinSession: mockJoinSession,
        leaveSession: mockLeaveSession,
        getSession: mockGetSession,
        pollEvents: mockPollEvents,
        updatePresence: mockUpdatePresence,
        addMessage: mockAddMessage,
        editMessage: mockEditMessage,
        kickParticipant: mockKickParticipant,
    })),
}));

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockAuthenticate = jest.fn();
const mockGetProfile = jest.fn();
const mockSync = jest.fn();

jest.mock('../src/server/services/cloudSync', () => ({
    CloudSyncService: jest.fn().mockImplementation(() => ({
        register: mockRegister,
        login: mockLogin,
        logout: mockLogout,
        authenticate: mockAuthenticate,
        getProfile: mockGetProfile,
        sync: mockSync,
    })),
}));

const mockChat = jest.fn();
const mockChatStream = jest.fn();

jest.mock('../src/server/adapters/mock', () => ({
    MockAdapter: jest.fn().mockImplementation(() => ({
        chat: mockChat,
        chatStream: mockChatStream,
    })),
}));

const mockLmChat = jest.fn();
const mockLmChatStream = jest.fn();

jest.mock('../src/server/adapters/lmstudio', () => ({
    LMStudioAdapter: jest.fn().mockImplementation(() => ({
        chat: mockLmChat,
        chatStream: mockLmChatStream,
    })),
}));

import { app } from '../src/server/index';

describe('Server Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetModels.mockReturnValue([
            { id: 'test-model', name: 'Test', adapter: 'mock' },
            { id: 'lm-model', name: 'LM', adapter: 'lm-studio' },
        ]);
    });

    // === Models ===

    describe('GET /v1/models', () => {
        it('returns model list', async () => {
            const res = await request(app).get('/v1/models');
            expect(res.status).toBe(200);
            expect(res.body.object).toBe('list');
            expect(res.body.data).toHaveLength(2);
        });
    });

    describe('GET /v1/models/search', () => {
        it('returns results for query', async () => {
            const res = await request(app).get('/v1/models/search?q=llama');
            expect(res.status).toBe(200);
            expect(mockSearchHuggingFace).toHaveBeenCalledWith('llama');
        });

        it('returns empty array without query', async () => {
            const res = await request(app).get('/v1/models/search');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe('GET /v1/models/files', () => {
        it('returns files for repoId', async () => {
            const res = await request(app).get('/v1/models/files?repoId=repo1');
            expect(res.status).toBe(200);
            expect(mockGetRepoFiles).toHaveBeenCalledWith('repo1');
        });

        it('returns 400 without repoId', async () => {
            const res = await request(app).get('/v1/models/files');
            expect(res.status).toBe(400);
        });
    });

    describe('POST /v1/models/download', () => {
        it('starts download', async () => {
            const res = await request(app)
                .post('/v1/models/download')
                .send({ repoId: 'r1', fileName: 'f.gguf', name: 'My Model' });
            expect(res.status).toBe(200);
            expect(res.body.downloadId).toBe('dl-1');
            expect(mockStartDownload).toHaveBeenCalledWith('r1', 'f.gguf', 'My Model');
        });

        it('returns 400 without required fields', async () => {
            const res = await request(app)
                .post('/v1/models/download')
                .send({ repoId: 'r1' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /v1/downloads', () => {
        it('returns all downloads', async () => {
            const res = await request(app).get('/v1/downloads');
            expect(res.status).toBe(200);
            expect(mockGetAllDownloads).toHaveBeenCalled();
        });
    });

    describe('GET /v1/stats', () => {
        it('returns system stats', async () => {
            const res = await request(app).get('/v1/stats');
            expect(res.status).toBe(200);
            expect(res.body.cpuUsage).toBe(42);
        });
    });

    // === Chat ===

    describe('POST /v1/chat/completions', () => {
        const validBody = {
            model: 'test-model',
            messages: [{ role: 'user', content: 'Hello' }],
        };

        it('returns 400 without body', async () => {
            const res = await request(app)
                .post('/v1/chat/completions')
                .send(undefined);
            expect(res.status).toBe(400);
        });

        it('returns 400 without model field', async () => {
            const res = await request(app)
                .post('/v1/chat/completions')
                .send({ messages: [{ role: 'user', content: 'hi' }] });
            expect(res.status).toBe(400);
            expect(res.body.error.message).toContain('Model field');
        });

        it('returns 400 without messages', async () => {
            const res = await request(app)
                .post('/v1/chat/completions')
                .send({ model: 'test-model' });
            expect(res.status).toBe(400);
            expect(res.body.error.message).toContain('Messages array');
        });

        it('returns 400 for unknown model', async () => {
            const res = await request(app)
                .post('/v1/chat/completions')
                .send({ model: 'unknown', messages: [{ role: 'user', content: 'hi' }] });
            expect(res.status).toBe(400);
            expect(res.body.error.message).toContain('not found');
        });

        it('returns chat completion from mock adapter', async () => {
            mockChat.mockResolvedValue({
                choices: [{ message: { content: 'Hi!' } }],
            });
            const res = await request(app)
                .post('/v1/chat/completions')
                .send(validBody);
            expect(res.status).toBe(200);
            expect(res.body.choices[0].message.content).toBe('Hi!');
        });

        it('returns chat completion from lm-studio adapter', async () => {
            mockLmChat.mockResolvedValue({
                choices: [{ message: { content: 'LM reply' } }],
            });
            const res = await request(app)
                .post('/v1/chat/completions')
                .send({ model: 'lm-model', messages: [{ role: 'user', content: 'hi' }] });
            expect(res.status).toBe(200);
            expect(res.body.choices[0].message.content).toBe('LM reply');
        });

        it('returns 400 for unsupported adapter', async () => {
            mockGetModels.mockReturnValue([
                { id: 'bad-model', name: 'Bad', adapter: 'unsupported' },
            ]);
            const res = await request(app)
                .post('/v1/chat/completions')
                .send({ model: 'bad-model', messages: [{ role: 'user', content: 'hi' }] });
            expect(res.status).toBe(400);
            expect(res.body.error.message).toContain('Unsupported adapter');
        });

        it('handles chat error with 500', async () => {
            mockChat.mockRejectedValue(new Error('adapter crash'));
            const res = await request(app)
                .post('/v1/chat/completions')
                .send(validBody);
            expect(res.status).toBe(500);
            expect(res.body.error.message).toContain('adapter crash');
        });

        it('logs response with logprobs data', async () => {
            mockChat.mockResolvedValue({
                choices: [{
                    message: { content: 'ok' },
                    logprobs: { content: [{ token: 'ok', logprob: -0.1 }] },
                }],
            });
            const res = await request(app)
                .post('/v1/chat/completions')
                .send(validBody);
            expect(res.status).toBe(200);
        });
    });

    // === Web Fetch ===

    describe('POST /v1/tools/web-fetch', () => {
        it('fetches URL', async () => {
            const res = await request(app)
                .post('/v1/tools/web-fetch')
                .send({ url: 'https://example.com' });
            expect(res.status).toBe(200);
            expect(res.body.content).toBe('<html>ok</html>');
        });

        it('returns 400 without url', async () => {
            const res = await request(app)
                .post('/v1/tools/web-fetch')
                .send({});
            expect(res.status).toBe(400);
        });

        it('returns 500 on fetch error', async () => {
            mockFetchUrl.mockRejectedValue(new Error('timeout'));
            const res = await request(app)
                .post('/v1/tools/web-fetch')
                .send({ url: 'https://bad.com' });
            expect(res.status).toBe(500);
        });
    });

    // === Cloud Sync ===

    describe('POST /v1/cloud-sync/register', () => {
        it('registers user', async () => {
            mockRegister.mockReturnValue({ token: 'tok', accountId: 'a1' });
            const res = await request(app)
                .post('/v1/cloud-sync/register')
                .send({ email: 'a@b.com', password: 'pass' });
            expect(res.status).toBe(200);
            expect(res.body.token).toBe('tok');
        });

        it('returns 409 if email exists', async () => {
            mockRegister.mockImplementation(() => {
                throw new Error('Account already exists');
            });
            const res = await request(app)
                .post('/v1/cloud-sync/register')
                .send({ email: 'a@b.com', password: 'pass' });
            expect(res.status).toBe(409);
        });
    });

    describe('POST /v1/cloud-sync/login', () => {
        it('logs in', async () => {
            mockLogin.mockReturnValue({ token: 'tok' });
            const res = await request(app)
                .post('/v1/cloud-sync/login')
                .send({ email: 'a@b.com', password: 'pass' });
            expect(res.status).toBe(200);
        });

        it('returns 401 for bad credentials', async () => {
            mockLogin.mockImplementation(() => {
                throw new Error('Invalid credentials');
            });
            const res = await request(app)
                .post('/v1/cloud-sync/login')
                .send({ email: 'a@b.com', password: 'wrong' });
            expect(res.status).toBe(401);
        });
    });

    describe('POST /v1/cloud-sync/logout', () => {
        it('logs out with token', async () => {
            const res = await request(app)
                .post('/v1/cloud-sync/logout')
                .set('Authorization', 'Bearer my-token');
            expect(res.status).toBe(200);
            expect(mockLogout).toHaveBeenCalledWith('my-token');
        });

        it('returns 401 without token', async () => {
            const res = await request(app).post('/v1/cloud-sync/logout');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /v1/cloud-sync/profile', () => {
        it('returns profile', async () => {
            mockAuthenticate.mockReturnValue({ id: 'a1' });
            mockGetProfile.mockReturnValue({ email: 'a@b.com' });
            const res = await request(app)
                .get('/v1/cloud-sync/profile')
                .set('Authorization', 'Bearer tok');
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('a@b.com');
        });

        it('returns 401 without auth', async () => {
            mockAuthenticate.mockImplementation(() => {
                throw new Error('Unauthorized');
            });
            const res = await request(app).get('/v1/cloud-sync/profile');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /v1/cloud-sync/sync', () => {
        it('syncs data', async () => {
            mockAuthenticate.mockReturnValue({ id: 'a1' });
            mockSync.mockReturnValue({ revision: 5 });
            const res = await request(app)
                .post('/v1/cloud-sync/sync')
                .set('Authorization', 'Bearer tok')
                .send({ conversations: [] });
            expect(res.status).toBe(200);
            expect(res.body.revision).toBe(5);
        });
    });

    // === Collaboration ===

    describe('POST /v1/collaboration/sessions', () => {
        it('creates session', async () => {
            mockCreateSession.mockReturnValue({ id: 's1', name: 'test' });
            const res = await request(app)
                .post('/v1/collaboration/sessions')
                .send({ name: 'My Session', hostName: 'Alice' });
            expect(res.status).toBe(200);
            expect(mockCreateSession).toHaveBeenCalledWith('My Session', 'Alice');
        });

        it('returns 400 without name', async () => {
            const res = await request(app)
                .post('/v1/collaboration/sessions')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('POST /v1/collaboration/sessions/:id/join', () => {
        it('joins session', async () => {
            mockJoinSession.mockReturnValue({ participantId: 'p1' });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/join')
                .send({ name: 'Bob' });
            expect(res.status).toBe(200);
        });

        it('returns 404 for unknown session', async () => {
            mockJoinSession.mockImplementation(() => {
                throw new Error('Session not found');
            });
            const res = await request(app)
                .post('/v1/collaboration/sessions/bad/join')
                .send({ name: 'Bob' });
            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/collaboration/sessions/:id/leave', () => {
        it('leaves session', async () => {
            mockLeaveSession.mockReturnValue({ id: 's1' });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/leave')
                .send({ participantId: 'p1' });
            expect(res.status).toBe(200);
        });

        it('returns 400 without participantId', async () => {
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/leave')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('GET /v1/collaboration/sessions/:id', () => {
        it('returns session', async () => {
            mockGetSession.mockReturnValue({ id: 's1', name: 'test' });
            const res = await request(app).get('/v1/collaboration/sessions/s1');
            expect(res.status).toBe(200);
            expect(res.body.session.name).toBe('test');
        });
    });

    describe('POST /v1/collaboration/sessions/:id/messages', () => {
        it('adds message', async () => {
            mockAddMessage.mockReturnValue({ id: 'm1', content: 'hi' });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/messages')
                .send({ participantId: 'p1', content: 'hi' });
            expect(res.status).toBe(200);
        });

        it('returns 400 without content', async () => {
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/messages')
                .send({ participantId: 'p1' });
            expect(res.status).toBe(400);
        });
    });

    describe('PUT /v1/collaboration/sessions/:id/messages/:msgId', () => {
        it('edits message', async () => {
            mockEditMessage.mockReturnValue({ id: 'm1', content: 'edited' });
            const res = await request(app)
                .put('/v1/collaboration/sessions/s1/messages/m1')
                .send({ participantId: 'p1', content: 'edited', baseVersion: 1 });
            expect(res.status).toBe(200);
        });

        it('returns 400 without baseVersion', async () => {
            const res = await request(app)
                .put('/v1/collaboration/sessions/s1/messages/m1')
                .send({ participantId: 'p1', content: 'edited' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /v1/collaboration/sessions/:id/presence', () => {
        it('updates presence', async () => {
            mockUpdatePresence.mockReturnValue({ id: 's1' });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/presence')
                .send({ participantId: 'p1', isTyping: true });
            expect(res.status).toBe(200);
        });

        it('returns 400 without participantId', async () => {
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/presence')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('POST /v1/collaboration/sessions/:id/participants/:pid/kick', () => {
        it('kicks participant', async () => {
            mockKickParticipant.mockReturnValue({ id: 's1' });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/participants/p2/kick')
                .send({ requesterId: 'p1' });
            expect(res.status).toBe(200);
        });

        it('returns 403 if non-host kicks', async () => {
            mockKickParticipant.mockImplementation(() => {
                throw new Error('Only the host can kick');
            });
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/participants/p2/kick')
                .send({ requesterId: 'p3' });
            expect(res.status).toBe(403);
        });

        it('returns 400 without requesterId', async () => {
            const res = await request(app)
                .post('/v1/collaboration/sessions/s1/participants/p2/kick')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe('GET /v1/collaboration/sessions/:id/events', () => {
        it('returns events', async () => {
            mockPollEvents.mockResolvedValue({ events: [], seq: 0 });
            const res = await request(app)
                .get('/v1/collaboration/sessions/s1/events?participantId=p1&since=0&timeoutMs=100');
            expect(res.status).toBe(200);
        });

        it('returns 400 without participantId', async () => {
            const res = await request(app)
                .get('/v1/collaboration/sessions/s1/events');
            expect(res.status).toBe(400);
        });
    });
});
