/** @jest-environment jsdom */

jest.mock('../src/renderer/services/credentials', () => ({
  credentialService: {
    setGithubApiKey: jest.fn(),
    getGithubApiKey: jest.fn().mockResolvedValue(null),
    clearGithubApiKey: jest.fn(),
    hasGithubApiKey: jest.fn().mockReturnValue(false),
  },
}));

describe('GitHubService', () => {
  const credentialModule = () =>
    require('../src/renderer/services/credentials') as {
      credentialService: {
        setGithubApiKey: jest.Mock;
        getGithubApiKey: jest.Mock;
        clearGithubApiKey: jest.Mock;
        hasGithubApiKey: jest.Mock;
      };
    };

  const getService = () => {
    const mod = require('../src/renderer/services/github') as { githubService: { setApiKey: (k: string) => Promise<void>; getApiKey: () => Promise<string | null>; clearApiKey: () => Promise<void>; isConfigured: () => boolean; fetchFileContent: (o: string, r: string, p: string, ref?: string) => Promise<{ success: boolean; content?: string; error?: string }>; createGist: (d: string, f: string, c: string, isPublic?: boolean) => Promise<{ success: boolean; gist?: unknown; error?: string }>; parseGitHubUrl: (url: string) => { owner: string; repo: string; path: string; ref: string } | null } };
    return mod.githubService;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (typeof (global as unknown as { fetch?: unknown }).fetch === 'undefined') {
      (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
    }
    const cred = credentialModule();
    cred.credentialService.getGithubApiKey.mockResolvedValue(null);
    cred.credentialService.hasGithubApiKey.mockReturnValue(false);
  });

  describe('parseGitHubUrl', () => {
    it('parses full blob URL', () => {
      const service = getService();
      const result = service.parseGitHubUrl(
        'https://github.com/owner/repo/blob/main/src/file.ts'
      );
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        path: 'src/file.ts',
        ref: 'main',
      });
    });

    it('parses full tree URL', () => {
      const service = getService();
      const result = service.parseGitHubUrl(
        'https://github.com/owner/repo/tree/develop/src/dir'
      );
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        path: 'src/dir',
        ref: 'develop',
      });
    });

    it('parses short format owner/repo/path', () => {
      const service = getService();
      const result = service.parseGitHubUrl('owner/repo/path/to/file');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/file',
        ref: 'main',
      });
    });

    it('returns null for invalid URL', () => {
      const service = getService();
      expect(service.parseGitHubUrl('not-a-github-url')).toBeNull();
      expect(service.parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(service.parseGitHubUrl('owner/repo')).toBeNull();
    });
  });

  describe('setApiKey / getApiKey / clearApiKey / isConfigured', () => {
    it('setApiKey trims and stores via credentialService', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.setGithubApiKey.mockResolvedValue(undefined);

      await service.setApiKey('  my-key  ');
      expect(cred.credentialService.setGithubApiKey).toHaveBeenCalledWith(
        'my-key'
      );
    });

    it('setApiKey with empty string clears via credentialService', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.clearGithubApiKey.mockResolvedValue(undefined);

      await service.setApiKey('');
      expect(cred.credentialService.clearGithubApiKey).toHaveBeenCalled();
    });

    it('setApiKey with whitespace-only clears', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.clearGithubApiKey.mockResolvedValue(undefined);

      await service.setApiKey('   ');
      expect(cred.credentialService.clearGithubApiKey).toHaveBeenCalled();
    });

    it('getApiKey returns cached value after setApiKey', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.setGithubApiKey.mockResolvedValue(undefined);

      await service.setApiKey('cached-key');
      const key = await service.getApiKey();
      expect(key).toBe('cached-key');
      expect(cred.credentialService.getGithubApiKey).not.toHaveBeenCalled();
    });

    it('getApiKey fetches from credentialService when not cached', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.getGithubApiKey.mockResolvedValue('stored-key');

      const key = await service.getApiKey();
      expect(key).toBe('stored-key');
      expect(cred.credentialService.getGithubApiKey).toHaveBeenCalled();
    });

    it('clearApiKey nulls cache and clears via credentialService', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.setGithubApiKey.mockResolvedValue(undefined);
      cred.credentialService.clearGithubApiKey.mockResolvedValue(undefined);

      await service.setApiKey('key');
      await service.clearApiKey();
      expect(cred.credentialService.clearGithubApiKey).toHaveBeenCalled();
      const key = await service.getApiKey();
      expect(key).toBeNull();
    });

    it('isConfigured returns true when apiKey is set', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.setGithubApiKey.mockResolvedValue(undefined);

      expect(service.isConfigured()).toBe(false);
      await service.setApiKey('key');
      expect(service.isConfigured()).toBe(true);
    });

    it('isConfigured returns true when credentialService.hasGithubApiKey', () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.hasGithubApiKey.mockReturnValue(true);

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('fetchFileContent', () => {
    it('success with base64 encoding decodes content', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.getGithubApiKey.mockResolvedValue('token');

      const base64Content = Buffer.from('hello world', 'utf8').toString('base64');
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: base64Content,
            encoding: 'base64',
            size: 11,
            name: 'file.ts',
            path: 'src/file.ts',
            sha: 'abc',
            url: 'https://api.github.com/...',
          }),
      });

      const result = await service.fetchFileContent(
        'owner',
        'repo',
        'src/file.ts',
        'main'
      );

      expect(result.success).toBe(true);
      expect(result.content).toBe('hello world');
    });

    it('404 returns error about file not found', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.getGithubApiKey.mockResolvedValue(null);

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await service.fetchFileContent(
        'owner',
        'repo',
        'missing.ts',
        'main'
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/file not found|File not found/i);
    });

    it('403 returns error about rate limit', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.getGithubApiKey.mockResolvedValue(null);

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({ ok: false, status: 403 });

      const result = await service.fetchFileContent(
        'owner',
        'repo',
        'file.ts',
        'main'
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/rate limit|access denied|API key/i);
    });

    it('network error returns error message', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.getGithubApiKey.mockResolvedValue(null);

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const result = await service.fetchFileContent(
        'owner',
        'repo',
        'file.ts',
        'main'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/Network failure|Failed to fetch/i);
    });
  });

  describe('createGist', () => {
    it('returns error when not configured', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.hasGithubApiKey.mockReturnValue(false);

      const result = await service.createGist(
        'desc',
        'file.ts',
        'content',
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not configured|API key/i);
    });

    it('success returns gist object', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.hasGithubApiKey.mockReturnValue(true);
      cred.credentialService.getGithubApiKey.mockResolvedValue('token');

      const gistPayload = {
        id: 'gist-123',
        html_url: 'https://gist.github.com/gist-123',
        description: 'desc',
        files: { 'file.ts': { filename: 'file.ts', content: 'content' } },
      };

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(gistPayload),
      });

      const result = await service.createGist(
        'desc',
        'file.ts',
        'content',
        false
      );

      expect(result.success).toBe(true);
      expect(result.gist).toEqual(gistPayload);
    });

    it('API error returns error', async () => {
      const service = getService();
      const cred = credentialModule();
      cred.credentialService.hasGithubApiKey.mockReturnValue(true);
      cred.credentialService.getGithubApiKey.mockResolvedValue('token');

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Bad credentials' }),
      });

      const result = await service.createGist(
        'desc',
        'file.ts',
        'content',
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Bad credentials|401/i);
    });
  });
});
