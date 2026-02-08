import { developerDocsService } from '../src/renderer/services/developerDocs';

describe('DeveloperDocsService', () => {
  test('includes complete API endpoint reference for local server routes', () => {
    const endpoints = developerDocsService.getApiReference();
    const routeKeys = endpoints.map(endpoint => `${endpoint.method} ${endpoint.path}`);

    expect(routeKeys).toEqual(expect.arrayContaining([
      'POST /v1/chat/completions',
      'GET /v1/models',
      'GET /v1/models/search',
      'GET /v1/models/files',
      'POST /v1/models/download',
      'GET /v1/downloads',
      'GET /v1/stats',
      'POST /v1/tools/web-fetch',
    ]));
  });

  test('includes required integration guides and plugin tutorial sample path', () => {
    const guides = developerDocsService.getIntegrationGuides();
    const guideIds = guides.map(guide => guide.id);

    expect(guideIds).toEqual(expect.arrayContaining(['github', 'notion', 'slack', 'discord']));

    const tutorial = developerDocsService.getPluginTutorial();
    expect(tutorial.samplePluginPath).toBe('examples/plugins/sample-hello-plugin');
    expect(tutorial.manifestExample).toContain('"apiVersion": "1.0.0"');
  });

  test('contains troubleshooting entries for API, integrations, and plugins', () => {
    const entries = developerDocsService.getTroubleshootingGuide();
    const entryIds = entries.map(entry => entry.id);

    expect(entryIds).toEqual(expect.arrayContaining([
      'api-connection-failed',
      'integration-auth-errors',
      'plugin-install-rejected',
    ]));
  });
});
