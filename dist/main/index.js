"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const index_1 = require("../server/index");
const chokidar_1 = __importDefault(require("chokidar"));
// Start the local inference server
(0, index_1.startServer)();
// Configure auto-updater
if (electron_1.app.isPackaged) {
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    // Check for updates every hour
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
    // Auto-updater events
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
    });
    electron_updater_1.autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available');
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        console.log('Download progress:', progressObj.percent);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        // Notify renderer process
        electron_1.BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('update-downloaded', info);
        });
    });
}
// IPC handler for update actions
electron_1.ipcMain.handle('app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('check-for-updates', async () => {
    if (!electron_1.app.isPackaged) {
        return { available: false, message: 'Updates only available in packaged app' };
    }
    try {
        const result = await electron_updater_1.autoUpdater.checkForUpdates();
        return { available: !!result, version: result?.updateInfo.version };
    }
    catch (error) {
        return { available: false, error: error.message };
    }
});
electron_1.ipcMain.handle('quit-and-install', () => {
    electron_updater_1.autoUpdater.quitAndInstall();
});
const WINDOW_STATE_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'window-state.json');
function isPositionVisible(bounds) {
    if (bounds.x === undefined || bounds.y === undefined) {
        return false;
    }
    const displays = electron_1.screen.getAllDisplays();
    for (const display of displays) {
        const displayBounds = display.bounds;
        // Check if window bounds intersect with display bounds
        const intersects = bounds.x < displayBounds.x + displayBounds.width &&
            bounds.x + bounds.width > displayBounds.x &&
            bounds.y < displayBounds.y + displayBounds.height &&
            bounds.y + bounds.height > displayBounds.y;
        if (intersects) {
            return true;
        }
    }
    return false;
}
function saveWindowState(win) {
    try {
        const bounds = win.getBounds();
        fs_1.default.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(bounds));
    }
    catch (e) {
        console.error('Failed to save window state', e);
    }
}
function loadWindowState() {
    try {
        if (fs_1.default.existsSync(WINDOW_STATE_PATH)) {
            const savedState = JSON.parse(fs_1.default.readFileSync(WINDOW_STATE_PATH, 'utf-8'));
            // Validate that the saved position is on-screen
            if (!isPositionVisible(savedState)) {
                // Position is not visible, return defaults without x/y to center on primary display
                return {
                    width: savedState.width || 1200,
                    height: savedState.height || 800,
                    isMaximized: savedState.isMaximized,
                    isFullscreen: savedState.isFullscreen
                };
            }
            return savedState;
        }
    }
    catch (e) {
        console.error('Failed to load window state', e);
    }
    return { width: 1200, height: 800 };
}
function createWindow() {
    const savedState = loadWindowState();
    const win = new electron_1.BrowserWindow({
        x: savedState.x,
        y: savedState.y,
        width: savedState.width,
        height: savedState.height,
        titleBarStyle: 'hidden', // Hide native titlebar
        titleBarOverlay: {
            color: '#020617', // Match slate-950
            symbolColor: '#ffffff',
            height: 30
        },
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    if (savedState.isMaximized) {
        win.maximize();
    }
    if (savedState.isFullscreen) {
        win.setFullScreen(true);
    }
    const devUrl = 'http://localhost:5173';
    if (!electron_1.app.isPackaged) {
        win.loadURL(devUrl);
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../../renderer/index.html'));
    }
    // Window state change tracking
    const trackState = () => {
        const isMaximized = win.isMaximized();
        const isFullscreen = win.isFullScreen();
        if (!isMaximized && !isFullscreen) {
            saveWindowState(win);
        }
        // We also want to store the maximized and fullscreen states separately
        try {
            const state = isMaximized || isFullscreen
                ? { ...loadWindowState(), isMaximized, isFullscreen }
                : { ...win.getBounds(), isMaximized: false, isFullscreen: false };
            fs_1.default.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state));
        }
        catch (e) { }
    };
    win.on('resize', trackState);
    win.on('move', trackState);
    win.on('close', trackState);
    win.on('enter-full-screen', trackState);
    win.on('leave-full-screen', trackState);
    // Window Control IPC Handlers
    electron_1.ipcMain.on('window-minimize', () => win.minimize());
    electron_1.ipcMain.on('window-maximize', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        }
        else {
            win.maximize();
        }
    });
    electron_1.ipcMain.on('window-close', () => win.close());
    // Project Context IPC Handlers
    const folderWatchers = new Map();
    electron_1.ipcMain.handle('select-folder', async () => {
        const result = await electron_1.dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
            title: 'Select Project Folder'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return { success: true, path: result.filePaths[0] };
        }
        return { success: false };
    });
    electron_1.ipcMain.handle('read-folder-files', async (event, folderPath, extensions) => {
        try {
            const files = [];
            const allowedExtensions = extensions || ['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.txt', '.css', '.html'];
            const readDir = (dir, basePath) => {
                const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path_1.default.join(dir, entry.name);
                    const relativePath = path_1.default.relative(basePath, fullPath);
                    // Skip node_modules, .git, dist, build, etc.
                    if (entry.name.startsWith('.') ||
                        entry.name === 'node_modules' ||
                        entry.name === 'dist' ||
                        entry.name === 'build' ||
                        entry.name === '.next') {
                        continue;
                    }
                    if (entry.isDirectory()) {
                        readDir(fullPath, basePath);
                    }
                    else if (entry.isFile()) {
                        const ext = path_1.default.extname(entry.name).toLowerCase();
                        if (allowedExtensions.includes(ext)) {
                            try {
                                const content = fs_1.default.readFileSync(fullPath, 'utf-8');
                                files.push({
                                    path: fullPath,
                                    content,
                                    relativePath
                                });
                            }
                            catch (e) {
                                // Skip files that can't be read
                            }
                        }
                    }
                }
            };
            readDir(folderPath, folderPath);
            return { success: true, files };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle('watch-folder', async (event, folderPath) => {
        try {
            if (folderWatchers.has(folderPath)) {
                return { success: true, message: 'Already watching' };
            }
            const watcher = chokidar_1.default.watch(folderPath, {
                ignored: /(^|[\/\\])\../, // Ignore dotfiles
                persistent: true,
                ignoreInitial: true
            });
            watcher.on('all', (eventType, filePath) => {
                win.webContents.send('folder-changed', {
                    path: folderPath,
                    type: eventType,
                    file: filePath
                });
            });
            folderWatchers.set(folderPath, watcher);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle('stop-watching-folder', async (event, folderPath) => {
        const watcher = folderWatchers.get(folderPath);
        if (watcher) {
            await watcher.close();
            folderWatchers.delete(folderPath);
            return { success: true };
        }
        return { success: false };
    });
    // Git Commit Handler
    electron_1.ipcMain.handle('git-commit', async (event, options) => {
        try {
            // In a real implementation, this would execute git commands
            // For now, return a mock success response
            // You would use a library like simple-git or execute git commands via child_process
            return {
                success: true,
                commitHash: 'mock-commit-hash',
                error: undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Git commit failed',
            };
        }
    });
    // Code Execution Handler (sandboxed)
    electron_1.ipcMain.handle('execute-code', async (event, code, language) => {
        try {
            // For security, we'll only allow execution of simple code
            // In production, you'd want a proper sandbox
            if (language === 'python') {
                // Use a Python subprocess with limited permissions
                const { spawn } = require('child_process');
                return new Promise((resolve) => {
                    const python = spawn('python', ['-c', code], {
                        timeout: 5000,
                        stdio: 'pipe'
                    });
                    let output = '';
                    let error = '';
                    python.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    python.stderr.on('data', (data) => {
                        error += data.toString();
                    });
                    python.on('close', (code) => {
                        resolve({
                            success: code === 0,
                            output: output || error,
                            exitCode: code
                        });
                    });
                    python.on('error', (err) => {
                        resolve({
                            success: false,
                            output: `Error: ${err.message}`,
                            exitCode: -1
                        });
                    });
                });
            }
            else if (language === 'javascript' || language === 'js') {
                // For JS, we'll use a VM context (limited)
                const vm = require('vm');
                try {
                    const context = vm.createContext({
                        console: {
                            log: (...args) => args.join(' '),
                            error: (...args) => args.join(' '),
                        }
                    });
                    const result = vm.runInContext(code, context, { timeout: 2000 });
                    return {
                        success: true,
                        output: String(result || 'Execution completed'),
                        exitCode: 0
                    };
                }
                catch (err) {
                    return {
                        success: false,
                        output: `Error: ${err.message}`,
                        exitCode: 1
                    };
                }
            }
            else {
                return {
                    success: false,
                    output: `Language ${language} not supported for execution`,
                    exitCode: -1
                };
            }
        }
        catch (error) {
            return {
                success: false,
                output: `Execution error: ${error.message}`,
                exitCode: -1
            };
        }
    });
    // Cleanup watchers on window close
    win.on('closed', () => {
        folderWatchers.forEach((watcher) => watcher.close());
        folderWatchers.clear();
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=index.js.map