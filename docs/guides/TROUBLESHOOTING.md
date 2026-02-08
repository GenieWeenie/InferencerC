# Troubleshooting

## API connection errors

Symptoms:
- API playground requests fail immediately
- `Failed to fetch` or timeouts

Checks:
1. Start app server (`npm run dev`).
2. Verify `http://localhost:3000/v1/models` loads.
3. Confirm port `3000` is not in use by another process.

## Model not found on chat completion

Symptoms:
- `Model '<id>' not found in configuration`

Checks:
1. Call `GET /v1/models` to get valid IDs.
2. Use one of those exact IDs in request payload.

## Integration auth failures

Symptoms:
- 401/403 on GitHub, Notion, Slack, or Discord actions

Checks:
1. Re-save credentials in Settings.
2. Regenerate token with required scopes.
3. For Notion, ensure integration is invited to database.

## Plugin install validation failures

Symptoms:
- Plugin Manager rejects manifest

Checks:
1. Confirm required manifest fields exist.
2. Ensure permission types are supported by Plugin API.
3. Compare against `examples/plugins/sample-hello-plugin/manifest.json`.

## Frequent context window warnings

Symptoms:
- Context optimizer repeatedly warns around 80% usage

Checks:
1. Use `Apply Suggested Trim` in Context Optimizer.
2. Keep auto-summarize enabled.
3. Lower max output tokens for large histories.
