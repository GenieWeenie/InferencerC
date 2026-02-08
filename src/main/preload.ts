import { contextBridge, ipcRenderer } from 'electron';
import type { RecoveryState } from '../shared/types';

// Secure API exposed to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Project Context APIs
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  watchFolder: (folderPath: string) => ipcRenderer.invoke('watch-folder', folderPath),
  stopWatchingFolder: (folderPath: string) => ipcRenderer.invoke('stop-watching-folder', folderPath),
  readFolderFiles: (folderPath: string, extensions?: string[]) => ipcRenderer.invoke('read-folder-files', folderPath, extensions),

  // Code Execution APIs
  executeCode: (code: string, language: string) => ipcRenderer.invoke('execute-code', code, language),

  // File watcher events
  onFolderChanged: (callback: (event: any, data: { path: string; type: string; file: string }) => void) => {
    ipcRenderer.on('folder-changed', callback);
    return () => ipcRenderer.removeAllListeners('folder-changed');
  },

  // MCP APIs
  mcpConnect: (server: any) => ipcRenderer.invoke('mcp-connect', server),
  mcpDisconnect: (serverId: string) => ipcRenderer.invoke('mcp-disconnect', serverId),
  mcpExecuteTool: (params: any) => ipcRenderer.invoke('mcp-execute-tool', params),

  // Auto-updater
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeAllListeners('update-downloaded');
  },

  // Git Integration
  gitCommit: (options: { filePath: string; content: string; message: string }) =>
    ipcRenderer.invoke('git-commit', options),

  // Recovery APIs
  saveRecoveryState: (state: RecoveryState) => ipcRenderer.invoke('save-recovery-state', state),
  getRecoveryState: () => ipcRenderer.invoke('get-recovery-state'),
  clearRecoveryState: () => ipcRenderer.invoke('clear-recovery-state'),

  // Secure storage APIs
  secureStorageIsAvailable: () => ipcRenderer.invoke('secure-storage:is-available'),
  secureStorageSetItem: (key: string, value: string) => ipcRenderer.invoke('secure-storage:set-item', key, value),
  secureStorageGetItem: (key: string) => ipcRenderer.invoke('secure-storage:get-item', key),
  secureStorageRemoveItem: (key: string) => ipcRenderer.invoke('secure-storage:remove-item', key),

  // Backend health probe
  checkBackendHealth: () => ipcRenderer.invoke('backend-health:check'),
});
