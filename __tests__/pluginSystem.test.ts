import { ChatMessage } from '../src/shared/types';
import {
  pluginSystemService,
  PluginManifest,
  RegisteredPluginExportFormat,
} from '../src/renderer/services/pluginSystem';

const baseManifest = (id: string, overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id,
  name: `Plugin ${id}`,
  version: '1.0.0',
  description: 'Test plugin',
  author: 'Test Author',
  entryPoint: 'index.js',
  apiVersion: '1.0.0',
  permissions: [],
  commands: [],
  exportFormats: [],
  uiExtensions: [],
  ...overrides,
});

const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there' },
];

describe('PluginSystemService', () => {
  beforeEach(() => {
    pluginSystemService.getAllPlugins().forEach(plugin => {
      pluginSystemService.uninstallPlugin(plugin.manifest.id);
    });
  });

  test('registers plugin commands when plugin is enabled', async () => {
    const manifest = baseManifest('cmd-plugin', {
      commands: [
        {
          id: 'run',
          label: 'Run Test Command',
          category: 'Actions',
          keywords: ['test'],
        },
      ],
    });

    await pluginSystemService.installPlugin(manifest);
    await pluginSystemService.enablePlugin(manifest.id);

    const commands = pluginSystemService.getRegisteredCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].runtimeId).toBe('plugin:cmd-plugin:command:run');
    expect(commands[0].command.label).toBe('Run Test Command');
  });

  test('registers plugin export formats and renders built-in strategy', async () => {
    const manifest = baseManifest('export-plugin', {
      exportFormats: [
        {
          id: 'jsonl-export',
          label: 'JSONL Export',
          description: 'JSON lines',
          fileExtension: 'jsonl',
          mimeType: 'application/x-ndjson',
          strategy: 'jsonl',
        },
      ],
    });

    await pluginSystemService.installPlugin(manifest);
    await pluginSystemService.enablePlugin(manifest.id);

    const exportFormats: RegisteredPluginExportFormat[] = pluginSystemService.getRegisteredExportFormats();
    expect(exportFormats).toHaveLength(1);

    const runtimeId = exportFormats[0].runtimeId;
    const rendered = await pluginSystemService.exportWithRegisteredFormat(runtimeId, messages, {
      title: 'Test',
      includeMetadata: true,
    });

    expect(rendered.fileExtension).toBe('jsonl');
    expect(rendered.mimeType).toBe('application/x-ndjson');
    expect(rendered.content).toContain('"role":"user"');
    expect(rendered.content).toContain('"content":"Hello"');
  });

  test('enforces storage permission', async () => {
    const manifest = baseManifest('no-storage-plugin');

    await pluginSystemService.installPlugin(manifest);
    await pluginSystemService.enablePlugin(manifest.id);

    const instance = pluginSystemService.getPlugin(manifest.id)?.instance;
    expect(instance).toBeDefined();

    await expect(instance!.api.storage.get('secret')).rejects.toThrow('Permission denied: storage');
  });

  test('enforces network scope restrictions', async () => {
    const manifest = baseManifest('network-plugin', {
      permissions: [
        {
          type: 'network-access',
          scope: 'api.example.com',
        },
      ],
    });

    await pluginSystemService.installPlugin(manifest);
    await pluginSystemService.enablePlugin(manifest.id);

    const instance = pluginSystemService.getPlugin(manifest.id)?.instance;
    expect(instance).toBeDefined();

    await expect(instance!.api.network.fetch('https://not-allowed.example.org')).rejects.toThrow(
      'outside plugin scope'
    );
  });

  test('supports plugin update by manifest id', async () => {
    const manifest = baseManifest('update-plugin', {
      commands: [{ id: 'v1', label: 'Version 1', category: 'Actions' }],
    });

    await pluginSystemService.installPlugin(manifest);
    await pluginSystemService.enablePlugin(manifest.id);

    const updatedManifest = baseManifest('update-plugin', {
      version: '1.1.0',
      commands: [{ id: 'v2', label: 'Version 2', category: 'Actions' }],
    });

    await pluginSystemService.updatePlugin(updatedManifest);

    const commands = pluginSystemService.getRegisteredCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].runtimeId).toBe('plugin:update-plugin:command:v2');
    expect(commands[0].command.label).toBe('Version 2');

    const plugin = pluginSystemService.getPlugin('update-plugin');
    expect(plugin?.manifest.version).toBe('1.1.0');
    expect(plugin?.lastUpdated).toBeDefined();
  });
});
