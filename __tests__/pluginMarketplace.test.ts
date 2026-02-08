import { pluginMarketplaceService } from '../src/renderer/services/pluginMarketplace';
import { Plugin } from '../src/renderer/services/pluginSystem';

const installedPlugin = (id: string, version: string): Plugin => ({
  manifest: {
    id,
    name: id,
    version,
    description: 'Installed plugin',
    author: 'Test',
    entryPoint: 'index.js',
    apiVersion: '1.0.0',
    permissions: [],
  },
  enabled: true,
  installedAt: Date.now(),
});

describe('PluginMarketplaceService', () => {
  test('returns a searchable catalog', () => {
    const all = pluginMarketplaceService.getCatalog();
    expect(all.length).toBeGreaterThan(0);

    const searchByName = pluginMarketplaceService.searchCatalog('workflow accelerator');
    expect(searchByName.some(entry => entry.manifest.id === 'devtools.workflow-accelerator')).toBe(true);

    const searchByTag = pluginMarketplaceService.searchCatalog('security');
    expect(searchByTag.some(entry => entry.manifest.id === 'security.scope-auditor')).toBe(true);
  });

  test('detects available updates from marketplace versions', () => {
    const installed: Plugin[] = [
      installedPlugin('devtools.workflow-accelerator', '1.2.0'),
      installedPlugin('security.scope-auditor', '1.2.3'),
      installedPlugin('not-in-marketplace', '9.9.9'),
    ];

    const updates = pluginMarketplaceService.getAvailableUpdates(installed);

    expect(updates.some(update => update.pluginId === 'devtools.workflow-accelerator')).toBe(true);
    expect(updates.some(update => update.pluginId === 'security.scope-auditor')).toBe(false);
    expect(updates.some(update => update.pluginId === 'not-in-marketplace')).toBe(false);

    const workflowUpdate = updates.find(update => update.pluginId === 'devtools.workflow-accelerator');
    expect(workflowUpdate?.currentVersion).toBe('1.2.0');
    expect(workflowUpdate?.latestVersion).toBe('1.4.0');
  });
});
