# InferencerC API Reference

Base URL: `http://localhost:3000`

## Authentication

Local endpoints do not require auth by default. If you add a reverse proxy or API gateway, apply auth there.

## Endpoints

### `POST /v1/chat/completions`
Create a chat completion from a configured model.

Required request fields:
- `model` (string)
- `messages` (array of `{ role, content }`)

Optional fields:
- `temperature` (number)
- `top_p` (number)
- `max_tokens` (number)
- `stream` (boolean)

Example:

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mock-model",
    "messages": [{"role":"user","content":"Hello"}],
    "stream": false
  }'
```

### `GET /v1/models`
Return all configured models.

### `GET /v1/models/search?q=<query>`
Search model repositories (Hugging Face).

### `GET /v1/models/files?repoId=<owner/model>`
List downloadable files for a repository.

### `POST /v1/models/download`
Start a model download.

Required body fields:
- `repoId`
- `fileName`

Optional body field:
- `name`

### `GET /v1/downloads`
List active and completed downloads.

### `GET /v1/stats`
Return server usage and performance statistics.

### `POST /v1/tools/web-fetch`
Fetch and sanitize remote page content.

Required body field:
- `url`

## Error format

Typical error response format:

```json
{
  "error": {
    "message": "Human-readable failure reason"
  }
}
```
