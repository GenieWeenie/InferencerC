"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Secure API exposed to renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => electron_1.ipcRenderer.send('window-minimize'),
    maximize: () => electron_1.ipcRenderer.send('window-maximize'),
    close: () => electron_1.ipcRenderer.send('window-close'),
    // Project Context APIs
    selectFolder: () => electron_1.ipcRenderer.invoke('select-folder'),
    watchFolder: (folderPath) => electron_1.ipcRenderer.invoke('watch-folder', folderPath),
    stopWatchingFolder: (folderPath) => electron_1.ipcRenderer.invoke('stop-watching-folder', folderPath),
    readFolderFiles: (folderPath, extensions) => electron_1.ipcRenderer.invoke('read-folder-files', folderPath, extensions),
    // Code Execution APIs
    executeCode: (code, language) => electron_1.ipcRenderer.invoke('execute-code', code, language),
    // File watcher events
    onFolderChanged: (callback) => {
        electron_1.ipcRenderer.on('folder-changed', callback);
        return () => electron_1.ipcRenderer.removeAllListeners('folder-changed');
    },
    // MCP APIs
    mcpConnect: (server) => electron_1.ipcRenderer.invoke('mcp-connect', server),
    mcpDisconnect: (serverId) => electron_1.ipcRenderer.invoke('mcp-disconnect', serverId),
    mcpExecuteTool: (params) => electron_1.ipcRenderer.invoke('mcp-execute-tool', params),
    // Auto-updater
    getAppVersion: () => electron_1.ipcRenderer.invoke('app-version'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('quit-and-install'),
    onUpdateDownloaded: (callback) => {
        electron_1.ipcRenderer.on('update-downloaded', callback);
        return () => electron_1.ipcRenderer.removeAllListeners('update-downloaded');
    },
    // Git Integration
    gitCommit: (options) => electron_1.ipcRenderer.invoke('git-commit', options),
});
//# sourceMappingURL=preload.js.map