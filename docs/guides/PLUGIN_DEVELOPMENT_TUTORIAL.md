# Plugin Development Tutorial

Sample plugin path: `examples/plugins/sample-hello-plugin`

## Step 1: Create plugin files

Create two files:
- `manifest.json`
- `index.js`

## Step 2: Write a valid manifest

Required fields:
- `id`, `name`, `version`, `description`, `author`
- `entryPoint`, `apiVersion`, `permissions`

Use this starter:

```json
{
  "id": "sample.hello-plugin",
  "name": "Hello Plugin",
  "version": "1.0.0",
  "description": "Adds a simple command and export format.",
  "author": "InferencerC Docs",
  "entryPoint": "index.js",
  "apiVersion": "1.0.0",
  "permissions": [{ "type": "storage" }],
  "commands": [
    {
      "id": "hello-command",
      "label": "Say Hello",
      "description": "Displays a hello notification",
      "category": "Actions",
      "keywords": ["hello", "sample"]
    }
  ]
}
```

## Step 3: Add plugin runtime entry point

```javascript
export default function register(api) {
  api.ui.showNotification('Hello Plugin loaded', 'success');

  return {
    name: 'sample.hello-plugin',
    commands: {
      'hello-command': async () => {
        api.ui.showNotification('Hello from plugin command!', 'info');
      }
    }
  };
}
```

## Step 4: Install and verify

1. Open Plugin Manager.
2. Install from manifest.
3. Enable the plugin.
4. Confirm command is visible and executes.
