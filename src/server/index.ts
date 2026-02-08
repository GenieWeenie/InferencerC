import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MockAdapter } from './adapters/mock';
import { LMStudioAdapter } from './adapters/lmstudio';
import { ModelManager } from './services/downloader';
import { ConfigService } from './services/config';
import { StatsService } from './services/stats';
import { WebService } from './services/web';
import { CollaborationService } from './services/collaboration';
import { CloudSyncService } from './services/cloudSync';
import { ChatRequest, ModelRuntimeAdapter } from '../shared/types';
import { logger } from './services/logger';

const app = express();
const PORT = 3000;

logger.info('Starting InferencerC server...', { port: PORT });

// Restrict CORS for desktop application
// During development, allow requests from Vite dev server
// For Electron apps, the renderer runs in a special context, but during development
// we need to allow requests from the Vite dev server
app.use(cors({
  origin: ['app://.', 'http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both Electron and Vite dev server
  credentials: true
}));
app.use(bodyParser.json());

// Services
const configService = new ConfigService();
const modelManager = new ModelManager(configService);
const statsService = new StatsService();
const webService = new WebService();
const collaborationService = new CollaborationService();
const cloudSyncService = new CloudSyncService();

// Adapters
const mockAdapter = new MockAdapter();
const lmStudioAdapter = new LMStudioAdapter('http://localhost:1234');

// --- Chat Routes ---

app.post('/v1/chat/completions', async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      logger.warn('Chat request with empty body', { ip: req.ip });
      return res.status(400).json({ error: { message: 'Request body is required.' } });
    }

    const body = req.body as ChatRequest;

    // Validate required fields
    if (!body.model) {
      logger.warn('Chat request without model field', { ip: req.ip, bodyKeys: Object.keys(body) });
      return res.status(400).json({ error: { message: 'Model field is required.' } });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      logger.warn('Chat request without messages', { ip: req.ip, model: body.model });
      return res.status(400).json({ error: { message: 'Messages array is required and cannot be empty.' } });
    }

    const models = configService.getModels();
    const modelConfig = models.find(m => m.id === body.model);

    if (!modelConfig) {
      logger.warn('Chat request for non-configured model', { model: body.model, availableModels: models.map(m => m.id) });
      return res.status(400).json({ error: { message: `Model '${body.model}' not found in configuration.` } });
    }

    let adapter: ModelRuntimeAdapter;
    if (modelConfig.adapter === 'lm-studio') {
      adapter = lmStudioAdapter;
    } else if (modelConfig.adapter === 'mock') {
      adapter = mockAdapter;
    } else {
      logger.error('Unsupported adapter type', { adapter: modelConfig.adapter, model: body.model });
      return res.status(400).json({ error: { message: `Unsupported adapter type: ${modelConfig.adapter}` } });
    }

    logger.info('Processing chat request', { model: body.model, messageCount: body.messages.length, stream: body.stream });

    if (body.stream && adapter.chatStream) {
      // Handle Streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = await adapter.chatStream(body);
        // stream is a Web ReadableStream (from fetch)
        // We need to pipe it to the Express response (Node Writable)

        // @ts-ignore - Iterate over the stream
        for await (const chunk of stream) {
          res.write(chunk);
        }
        res.end();
        logger.info('Chat stream completed', { model: body.model });
        return;
      } catch (err: any) {
        logger.error("Error during streaming", { error: err.message });
        // If headers sent, we can't send JSON error, just end.
        if (!res.headersSent) {
          res.status(500).json({ error: { message: err.message } });
        } else {
          res.end();
        }
        return;
      }
    }

    const response = await adapter.chat(body);

    // DEBUG: Log the first token's structure to verify top_logprobs
    if (response.choices && response.choices.length > 0) {
      const firstChoice = response.choices[0];
      if (firstChoice.logprobs && firstChoice.logprobs.content && firstChoice.logprobs.content.length > 0) {
        logger.debug("First token data", { token: firstChoice.logprobs.content[0] });
      }
    }

    logger.info('Chat request completed', { model: body.model, choiceCount: response.choices.length });
    res.json(response);
  } catch (error: any) {
    logger.error("Error processing chat request", { error: error.message, stack: error.stack });
    res.status(500).json({ error: { message: error.message } });
  }
});

// Add error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error in server:', { error: error.message, stack: error.stack, url: req.url });
  res.status(500).json({ error: { message: 'An unexpected error occurred.' } });
});

// --- Model Management Routes ---

app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: configService.getModels()
  });
});

app.get('/v1/models/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);
  const results = await modelManager.searchHuggingFace(query);
  res.json(results);
});

app.get('/v1/models/files', async (req, res) => {
  const repoId = req.query.repoId as string;
  if (!repoId) return res.status(400).json([]);
  const files = await modelManager.getRepoFiles(repoId);
  res.json(files);
});

app.post('/v1/models/download', (req, res) => {
  const { repoId, fileName, name } = req.body;
  if (!repoId || !fileName) {
    return res.status(400).json({ error: "Missing repoId or fileName" });
  }
  const id = modelManager.startDownload(repoId, fileName, name || fileName);
  res.json({ downloadId: id });
});

app.get('/v1/downloads', (req, res) => {
  res.json(modelManager.getAllDownloads());
});

app.get('/v1/stats', async (req, res) => {
  const stats = await statsService.getStats();
  res.json(stats);
});

app.post('/v1/tools/web-fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  try {
    const content = await webService.fetchUrl(url);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Cloud Sync Routes ---

const parseBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) return null;
  const [type, token] = authorizationHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const authenticateCloudSync = (authorizationHeader: string | undefined): { accountId: string } => {
  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    throw new Error('Unauthorized');
  }
  const account = cloudSyncService.authenticate(token);
  return { accountId: account.id };
};

app.post('/v1/cloud-sync/register', (req, res) => {
  try {
    const email = String(req.body?.email || '');
    const password = String(req.body?.password || '');
    const result = cloudSyncService.register(email, password);
    res.json(result);
  } catch (error: any) {
    const message = error?.message || 'Registration failed';
    const status = message.includes('exists') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/cloud-sync/login', (req, res) => {
  try {
    const email = String(req.body?.email || '');
    const password = String(req.body?.password || '');
    const result = cloudSyncService.login(email, password);
    res.json(result);
  } catch (error: any) {
    const message = error?.message || 'Login failed';
    const status = message.includes('credentials') ? 401 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/cloud-sync/logout', (req, res) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    cloudSyncService.logout(token);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Logout failed' });
  }
});

app.get('/v1/cloud-sync/profile', (req, res) => {
  try {
    const auth = authenticateCloudSync(req.headers.authorization);
    const profile = cloudSyncService.getProfile(auth.accountId);
    res.json(profile);
  } catch (error: any) {
    const message = error?.message || 'Unauthorized';
    const status = message.includes('Unauthorized') ? 401 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/cloud-sync/sync', (req, res) => {
  try {
    const auth = authenticateCloudSync(req.headers.authorization);
    const response = cloudSyncService.sync(auth.accountId, req.body || {});
    res.json(response);
  } catch (error: any) {
    const message = error?.message || 'Sync failed';
    const status = message.includes('Unauthorized') ? 401 : 400;
    res.status(status).json({ error: message });
  }
});

// --- Collaboration Routes ---

app.post('/v1/collaboration/sessions', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const hostName = String(req.body?.hostName || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    const created = collaborationService.createSession(name, hostName || 'Host');
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create session' });
  }
});

app.post('/v1/collaboration/sessions/:sessionId/join', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const name = String(req.body?.name || '').trim();
    const joined = collaborationService.joinSession(sessionId, name || 'Participant');
    res.json(joined);
  } catch (error: any) {
    const message = error?.message || 'Failed to join session';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/collaboration/sessions/:sessionId/leave', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const participantId = String(req.body?.participantId || '');
    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }
    const session = collaborationService.leaveSession(sessionId, participantId);
    res.json({ session });
  } catch (error: any) {
    const message = error?.message || 'Failed to leave session';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.get('/v1/collaboration/sessions/:sessionId', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const participantId = typeof req.query.participantId === 'string'
      ? req.query.participantId
      : undefined;
    const session = collaborationService.getSession(sessionId, participantId);
    res.json({ session });
  } catch (error: any) {
    const message = error?.message || 'Failed to load session';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.get('/v1/collaboration/sessions/:sessionId/events', async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const participantId = String(req.query.participantId || '');
    const sinceRaw = Number(req.query.since);
    const timeoutRaw = Number(req.query.timeoutMs);

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    const since = Number.isFinite(sinceRaw) && sinceRaw >= 0 ? sinceRaw : 0;
    const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0
      ? timeoutRaw
      : 25000;

    const payload = await collaborationService.pollEvents(
      sessionId,
      participantId,
      since,
      timeoutMs
    );
    res.json(payload);
  } catch (error: any) {
    const message = error?.message || 'Failed to poll events';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/collaboration/sessions/:sessionId/presence', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const participantId = String(req.body?.participantId || '');
    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    const isTyping = req.body?.isTyping;
    const cursor = req.body?.cursorPosition;
    const session = collaborationService.updatePresence(sessionId, participantId, {
      isTyping: typeof isTyping === 'boolean' ? isTyping : undefined,
      cursorPosition: cursor && typeof cursor === 'object'
        ? {
          line: Number(cursor.line) || 1,
          column: Number(cursor.column) || 1,
        }
        : undefined,
    });

    res.json({ session });
  } catch (error: any) {
    const message = error?.message || 'Failed to update presence';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/collaboration/sessions/:sessionId/messages', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const participantId = String(req.body?.participantId || '');
    const content = String(req.body?.content || '').trim();

    if (!participantId || !content) {
      return res.status(400).json({ error: 'participantId and content are required' });
    }

    const message = collaborationService.addMessage(sessionId, participantId, content);
    res.json({ message });
  } catch (error: any) {
    const message = error?.message || 'Failed to add message';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.put('/v1/collaboration/sessions/:sessionId/messages/:messageId', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const messageId = String(req.params.messageId || '');
    const participantId = String(req.body?.participantId || '');
    const content = String(req.body?.content || '').trim();
    const baseVersion = Number(req.body?.baseVersion);

    if (!participantId || !content || !Number.isFinite(baseVersion)) {
      return res.status(400).json({ error: 'participantId, content, and baseVersion are required' });
    }

    const result = collaborationService.editMessage(
      sessionId,
      participantId,
      messageId,
      content,
      baseVersion
    );

    res.json(result);
  } catch (error: any) {
    const message = error?.message || 'Failed to edit message';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/v1/collaboration/sessions/:sessionId/participants/:participantId/kick', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    const targetId = String(req.params.participantId || '');
    const requesterId = String(req.body?.requesterId || '');

    if (!requesterId || !targetId) {
      return res.status(400).json({ error: 'requesterId and target participantId are required' });
    }

    const session = collaborationService.kickParticipant(sessionId, requesterId, targetId);
    res.json({ session });
  } catch (error: any) {
    const message = error?.message || 'Failed to remove participant';
    const status = message.includes('Only the host') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

export function startServer() {
  return app.listen(PORT, () => {
    console.log(`[Server] Local Inference Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}
