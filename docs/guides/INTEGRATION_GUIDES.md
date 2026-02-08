# Integration Guides

## GitHub

Use case:
- Fetch repository files into chat context
- Create gists from assistant code blocks

Setup:
1. Create a GitHub personal access token.
2. Save it in InferencerC Settings under API keys.
3. Use GitHub fetch in chat (`owner/repo/path` or full GitHub URL).

Validation:
- Fetching inserts a context block into chat.
- Gist action returns a valid gist URL.

Common failures:
- `404`: wrong path/ref
- `403`: missing scope or rate limit

## Notion

Use case:
- Export full conversations into a Notion database page

Setup:
1. Create a Notion integration and token.
2. Share target database with that integration.
3. Save token and database ID in InferencerC Settings.
4. Use `Notion` export from chat actions.

Validation:
- Page appears in target database with message content.

Common failures:
- Not configured (missing token/database ID)
- Permission denied (database not shared)

## Slack

Use case:
- Send conversation summaries to channels

Setup:
1. Create Slack incoming webhook or bot token.
2. Save credentials in InferencerC Settings.
3. Use `Slack` action from chat export controls.

Validation:
- Message blocks render in target channel.

Common failures:
- Invalid webhook URL
- `invalid_auth` with bot token

## Discord

Use case:
- Post conversation transcript embeds to Discord

Setup:
1. Create a Discord channel webhook.
2. Save webhook URL in InferencerC Settings.
3. Use `Discord` action from chat exports.

Validation:
- First embed is posted and long messages continue in follow-up posts.

Common failures:
- Missing webhook configuration
- Payload too large when custom payloads are manually oversized
