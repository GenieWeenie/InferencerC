/**
 * Project Context Service
 * Manages project folder selection, file reading, and watching
 */

export interface ProjectFile {
  path: string;
  content: string;
  relativePath: string;
}

export interface ProjectContext {
  folderPath: string;
  files: ProjectFile[];
  isWatching: boolean;
  lastUpdated: number;
}

class ProjectContextService {
  private currentContext: ProjectContext | null = null;
  private listeners: Array<(context: ProjectContext | null) => void> = [];

  /**
   * Select a project folder
   */
  async selectFolder(): Promise<boolean> {
    if (!window.electronAPI?.selectFolder) {
      console.warn('Electron API not available');
      return false;
    }

    try {
      const result = await window.electronAPI.selectFolder();
      if (result.success && result.path) {
        await this.loadFolder(result.path);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error selecting folder:', error);
      return false;
    }
  }

  /**
   * Load files from a folder
   */
  async loadFolder(folderPath: string, extensions?: string[]): Promise<boolean> {
    if (!window.electronAPI?.readFolderFiles) {
      console.warn('Electron API not available');
      return false;
    }

    try {
      const result = await window.electronAPI.readFolderFiles(folderPath, extensions);
      if (result.success && result.files) {
        this.currentContext = {
          folderPath,
          files: result.files,
          isWatching: false,
          lastUpdated: Date.now()
        };
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading folder:', error);
      return false;
    }
  }

  /**
   * Start watching a folder for changes
   */
  async startWatching(): Promise<boolean> {
    if (!this.currentContext) return false;
    if (!window.electronAPI?.watchFolder) return false;

    try {
      const result = await window.electronAPI.watchFolder(this.currentContext.folderPath);
      if (result.success) {
        this.currentContext.isWatching = true;
        this.notifyListeners();

        // Listen for file changes
        if (window.electronAPI.onFolderChanged) {
          window.electronAPI.onFolderChanged((event: any, data: { path: string; type: string; file: string }) => {
            if (data.path === this.currentContext?.folderPath) {
              // Reload folder on change
              this.loadFolder(data.path);
            }
          });
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting watcher:', error);
      return false;
    }
  }

  /**
   * Stop watching a folder
   */
  async stopWatching(): Promise<boolean> {
    if (!this.currentContext) return false;
    if (!window.electronAPI?.stopWatchingFolder) return false;

    try {
      const result = await window.electronAPI.stopWatchingFolder(this.currentContext.folderPath);
      if (result.success) {
        this.currentContext.isWatching = false;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error stopping watcher:', error);
      return false;
    }
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    if (this.currentContext?.isWatching) {
      this.stopWatching();
    }
    this.currentContext = null;
    this.notifyListeners();
  }

  /**
   * Get current context
   */
  getContext(): ProjectContext | null {
    return this.currentContext;
  }

  /**
   * Get context summary for inclusion in chat
   */
  getContextSummary(maxFiles: number = 10): string {
    if (!this.currentContext || this.currentContext.files.length === 0) {
      return '';
    }

    const files = this.currentContext.files.slice(0, maxFiles);
    const summary = files.map(f => 
      `\n--- FILE: ${f.relativePath} ---\n${f.content.substring(0, 5000)}${f.content.length > 5000 ? '\n... (truncated)' : ''}\n--- END FILE ---`
    ).join('\n');

    return `\n\n[PROJECT CONTEXT FROM: ${this.currentContext.folderPath}]\n${summary}${this.currentContext.files.length > maxFiles ? `\n\n... and ${this.currentContext.files.length - maxFiles} more files` : ''}`;
  }

  /**
   * Subscribe to context changes
   */
  subscribe(listener: (context: ProjectContext | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentContext));
  }
}

export const projectContextService = new ProjectContextService();
