# Plugin API (v1.0.0)

InferencerC plugins are defined by a JSON manifest and loaded through the in-app Plugin Manager.

## Quickstart sample

Use the starter package at:

- `examples/plugins/sample-hello-plugin/manifest.json`
- `examples/plugins/sample-hello-plugin/index.js`

Installation flow:

1. Open Plugin Manager.
2. Install from manifest.
3. Select the sample `manifest.json`.
4. Enable plugin and run `hello-command`.

## Manifest shape

```json
{
  "id": "example.plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "Adds a custom command and export format",
  "author": "Example Dev",
  "entryPoint": "index.js",
  "apiVersion": "1.0.0",
  "permissions": [
    { "type": "storage" },
    { "type": "network-access", "scope": "api.example.com" },
    { "type": "access-files", "scope": "/Users/you/project" }
  ],
  "commands": [
    {
      "id": "run-audit",
      "label": "Run Audit",
      "description": "Runs plugin audit workflow",
      "category": "Actions",
      "keywords": ["audit", "plugin"]
    }
  ],
  "exportFormats": [
    {
      "id": "jsonl-transcript",
      "label": "JSONL Transcript",
      "description": "One message per line",
      "fileExtension": "jsonl",
      "mimeType": "application/x-ndjson",
      "strategy": "jsonl"
    }
  ],
  "uiExtensions": [
    {
      "id": "my-settings-panel",
      "type": "settings-section",
      "title": "My Plugin Settings",
      "description": "Plugin configuration UI"
    }
  ]
}
```

## Permissions and sandboxing

- `storage`: required for plugin key-value storage (`plugin:<id>:*` namespace).
- `network-access`: requires `scope` (`host`, `*.domain.com`, or full URL host). Requests outside scope are blocked.
- `access-files`: requires `scope` (comma-separated allowed path prefixes). Paths outside scope are blocked.
- `read-conversations` / `write-conversations`: required for conversation APIs.
- `execute-code`: reserved for future secure runtimes.

## Commands

- Manifest `commands` are registered into the command palette when the plugin is enabled.
- Runtime command IDs are namespaced: `plugin:<pluginId>:command:<commandId>`.

## Export formats

- Manifest `exportFormats` are exposed in Export Dialog while plugin is enabled.
- Runtime format IDs are namespaced: `plugin:<pluginId>:export:<formatId>`.
- Built-in strategies:
  - `plain-text`
  - `jsonl`
  - `markdown-transcript`

## UI extensions

`uiExtensions` allows plugins to declare UI integration points for host rendering:

- `settings-section`
- `chat-panel`
- `toolbar-action`

## Marketplace behavior

- The Plugin Manager includes a searchable in-app marketplace.
- Listings expose ratings, review counts, and verified publisher badges.
- Installed plugins receive automatic update notifications when a higher marketplace version exists.
- Marketplace install/update actions are one-click and use the same manifest validation as manual install.

## Hooks

Plugin runtime hooks are namespaced:

- `plugin:command:<runtimeCommandId>`
- `plugin:export:<runtimeExportId>`

Hooks can return data to override default behaviors (for example, a custom export payload).
