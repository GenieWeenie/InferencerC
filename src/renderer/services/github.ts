/**
 * GitHub Integration Service
 * Handles fetching file contents from repos and creating gists
 */

export interface GitHubFileContent {
  content: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  sha: string;
  url: string;
}

export interface GitHubGist {
  id: string;
  html_url: string;
  description: string;
  files: Record<string, { filename: string; content: string }>;
}

class GitHubService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.github.com';

  /**
   * Initialize with API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
    localStorage.setItem('github_api_key', key);
  }

  /**
   * Get stored API key
   */
  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('github_api_key');
    }
    return this.apiKey;
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.apiKey = null;
    localStorage.removeItem('github_api_key');
  }

  /**
   * Check if API key is set
   */
  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const key = this.getApiKey();
    if (key) {
      headers['Authorization'] = `token ${key}`;
    }

    return headers;
  }

  /**
   * Fetch file contents from a GitHub repository
   * @param owner Repository owner (username or org)
   * @param repo Repository name
   * @param path File path in the repository
   * @param ref Optional branch/tag/commit SHA (default: main)
   */
  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'File not found. Check the repository, path, and branch.' };
        }
        if (response.status === 403) {
          return { success: false, error: 'Rate limit exceeded or access denied. Check your API key.' };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `HTTP ${response.status}` };
      }

      const data: GitHubFileContent = await response.json();
      
      // Decode base64 content
      if (data.encoding === 'base64') {
        const content = atob(data.content);
        return { success: true, content };
      }

      return { success: true, content: data.content };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch file' };
    }
  }

  /**
   * Create a GitHub Gist from code
   * @param description Gist description
   * @param filename File name
   * @param content File content
   * @param isPublic Whether the gist should be public
   */
  async createGist(
    description: string,
    filename: string,
    content: string,
    isPublic: boolean = false
  ): Promise<{ success: boolean; gist?: GitHubGist; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'GitHub API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/gists`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          description,
          public: isPublic,
          files: {
            [filename]: {
              content,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `HTTP ${response.status}` };
      }

      const gist: GitHubGist = await response.json();
      return { success: true, gist };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create gist' };
    }
  }

  /**
   * Parse GitHub URL to extract owner, repo, path, and ref
   * Supports formats:
   * - https://github.com/owner/repo/blob/branch/path/to/file
   * - https://github.com/owner/repo/tree/branch/path/to/dir
   * - owner/repo/path/to/file
   */
  parseGitHubUrl(url: string): { owner: string; repo: string; path: string; ref: string } | null {
    // Full GitHub URL
    const fullUrlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|tree)\/([^\/]+)\/(.+)/);
    if (fullUrlMatch) {
      return {
        owner: fullUrlMatch[1],
        repo: fullUrlMatch[2],
        ref: fullUrlMatch[3],
        path: fullUrlMatch[4],
      };
    }

    // Short format: owner/repo/path
    const shortMatch = url.match(/^([^\/]+)\/([^\/]+)\/(.+)$/);
    if (shortMatch) {
      return {
        owner: shortMatch[1],
        repo: shortMatch[2],
        path: shortMatch[3],
        ref: 'main',
      };
    }

    return null;
  }
}

export const githubService = new GitHubService();
