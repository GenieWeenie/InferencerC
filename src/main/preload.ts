import { contextBridge, ipcRenderer } from 'electron';

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
});
