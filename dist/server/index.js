"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const mock_1 = require("./adapters/mock");
const lmstudio_1 = require("./adapters/lmstudio");
const downloader_1 = require("./services/downloader");
const config_1 = require("./services/config");
const stats_1 = require("./services/stats");
const web_1 = require("./services/web");
const logger_1 = require("./services/logger");
const app = (0, express_1.default)();
const PORT = 3000;
logger_1.logger.info('Starting InferencerC server...', { port: PORT });
// Restrict CORS for desktop application
// During development, allow requests from Vite dev server
// For Electron apps, the renderer runs in a special context, but during development
// we need to allow requests from the Vite dev server
app.use((0, cors_1.default)({
    origin: ['app://.', 'http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both Electron and Vite dev server
    credentials: true
}));
app.use(body_parser_1.default.json());
// Services
const configService = new config_1.ConfigService();
const modelManager = new downloader_1.ModelManager(configService);
const statsService = new stats_1.StatsService();
const webService = new web_1.WebService();
// Adapters
const mockAdapter = new mock_1.MockAdapter();
const lmStudioAdapter = new lmstudio_1.LMStudioAdapter('http://localhost:1234');
// --- Chat Routes ---
app.post('/v1/chat/completions', async (req, res) => {
    try {
        // Validate request body
        if (!req.body) {
            logger_1.logger.warn('Chat request with empty body', { ip: req.ip });
            return res.status(400).json({ error: { message: 'Request body is required.' } });
        }
        const body = req.body;
        // Validate required fields
        if (!body.model) {
            logger_1.logger.warn('Chat request without model field', { ip: req.ip, bodyKeys: Object.keys(body) });
            return res.status(400).json({ error: { message: 'Model field is required.' } });
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
            logger_1.logger.warn('Chat request without messages', { ip: req.ip, model: body.model });
            return res.status(400).json({ error: { message: 'Messages array is required and cannot be empty.' } });
        }
        const models = configService.getModels();
        const modelConfig = models.find(m => m.id === body.model);
        if (!modelConfig) {
            logger_1.logger.warn('Chat request for non-configured model', { model: body.model, availableModels: models.map(m => m.id) });
            return res.status(400).json({ error: { message: `Model '${body.model}' not found in configuration.` } });
        }
        let adapter;
        if (modelConfig.adapter === 'lm-studio') {
            adapter = lmStudioAdapter;
        }
        else if (modelConfig.adapter === 'mock') {
            adapter = mockAdapter;
        }
        else {
            logger_1.logger.error('Unsupported adapter type', { adapter: modelConfig.adapter, model: body.model });
            return res.status(400).json({ error: { message: `Unsupported adapter type: ${modelConfig.adapter}` } });
        }
        logger_1.logger.info('Processing chat request', { model: body.model, messageCount: body.messages.length, stream: body.stream });
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
                logger_1.logger.info('Chat stream completed', { model: body.model });
                return;
            }
            catch (err) {
                logger_1.logger.error("Error during streaming", { error: err.message });
                // If headers sent, we can't send JSON error, just end.
                if (!res.headersSent) {
                    res.status(500).json({ error: { message: err.message } });
                }
                else {
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
                logger_1.logger.debug("First token data", { token: firstChoice.logprobs.content[0] });
            }
        }
        logger_1.logger.info('Chat request completed', { model: body.model, choiceCount: response.choices.length });
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error("Error processing chat request", { error: error.message, stack: error.stack });
        res.status(500).json({ error: { message: error.message } });
    }
});
// Add error handling middleware
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error in server:', { error: error.message, stack: error.stack, url: req.url });
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
    const query = req.query.q;
    if (!query)
        return res.json([]);
    const results = await modelManager.searchHuggingFace(query);
    res.json(results);
});
app.get('/v1/models/files', async (req, res) => {
    const repoId = req.query.repoId;
    if (!repoId)
        return res.status(400).json([]);
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
    if (!url)
        return res.status(400).json({ error: "Missing URL" });
    try {
        const content = await webService.fetchUrl(url);
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
function startServer() {
    return app.listen(PORT, () => {
        console.log(`[Server] Local Inference Server running on http://localhost:${PORT}`);
    });
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map