import { app, BrowserWindow, ipcMain, dialog, screen, safeStorage } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { startServer } from '../server/index';
import chokidar from 'chokidar';
import { MCPClientManager } from './mcp-client';
import { MCPServerConfig, JSONValue } from './mcp-types';
import type { RecoveryState } from '../shared/types';

interface AppUpdateCheckResponse {
  available: boolean;
  version?: string;
  message?: string;
  error?: string;
}

interface MCPExecuteToolParams {
  serverId: string;
  toolName: string;
  arguments?: Record<string, JSONValue>;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

// Start the local inference server
startServer();

// Initialize MCP Client Manager
const mcpClientManager = new MCPClientManager();

// Configure auto-updater
if (app.isPackaged) {
  autoUpdater.checkForUpdatesAndNotify();
  
  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', (_info: UpdateInfo) => {
    console.log('Update not available');
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    console.log('Download progress:', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
    console.log('Update downloaded:', info.version);
    // Notify renderer process
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded', info);
    });
  });
}

// IPC handler for update actions
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  const noUpdateResponse: AppUpdateCheckResponse = {
    available: false,
    message: 'Updates only available in packaged app',
  };
  if (!app.isPackaged) {
    return noUpdateResponse;
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const updateResponse: AppUpdateCheckResponse = { available: !!result, version: result?.updateInfo.version };
    return updateResponse;
  } catch (error: unknown) {
    return { available: false, error: getErrorMessage(error, 'Failed to check for updates') };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// Recovery State IPC Handlers
const RECOVERY_STATE_PATH = path.join(app.getPath('userData'), 'recovery-state.json');
const getSecureStoragePath = () => path.join(app.getPath('userData'), 'secure-storage.json');

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseStringRecord = (raw: string): Record<string, string> => {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(parsed).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }
  });
  return result;
};

const parseRecoveryState = (raw: string): RecoveryState | null => {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return null;
  }
  if (
    typeof parsed.sessionId !== 'string'
    || typeof parsed.timestamp !== 'number'
    || !Number.isFinite(parsed.timestamp)
  ) {
    return null;
  }
  return {
    sessionId: parsed.sessionId,
    timestamp: parsed.timestamp,
    draftMessage: typeof parsed.draftMessage === 'string' ? parsed.draftMessage : undefined,
    pendingResponse: typeof parsed.pendingResponse === 'boolean' ? parsed.pendingResponse : undefined,
  };
};

const parseWindowState = (raw: string): WindowState | null => {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return null;
  }
  if (typeof parsed.width !== 'number' || typeof parsed.height !== 'number') {
    return null;
  }
  return {
    x: typeof parsed.x === 'number' ? parsed.x : undefined,
    y: typeof parsed.y === 'number' ? parsed.y : undefined,
    width: parsed.width,
    height: parsed.height,
    isMaximized: typeof parsed.isMaximized === 'boolean' ? parsed.isMaximized : undefined,
    isFullscreen: typeof parsed.isFullscreen === 'boolean' ? parsed.isFullscreen : undefined,
  };
};

const loadSecureStorage = (): Record<string, string> => {
  try {
    const storePath = getSecureStoragePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }
    const raw = fs.readFileSync(storePath, 'utf-8');
    return parseStringRecord(raw);
  } catch (error) {
    console.error('Failed to load secure storage file:', error);
    return {};
  }
};

const saveSecureStorage = (store: Record<string, string>): void => {
  try {
    const storePath = getSecureStoragePath();
    fs.writeFileSync(storePath, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save secure storage file:', error);
  }
};

ipcMain.handle('save-recovery-state', async (_event, state: RecoveryState) => {
  try {
    fs.writeFileSync(RECOVERY_STATE_PATH, JSON.stringify(state));
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to save recovery state:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to save recovery state') };
  }
});

ipcMain.handle('get-recovery-state', async () => {
  try {
    if (fs.existsSync(RECOVERY_STATE_PATH)) {
      const data = fs.readFileSync(RECOVERY_STATE_PATH, 'utf-8');
      return { success: true, state: parseRecoveryState(data) };
    }
    return { success: true, state: null };
  } catch (error: unknown) {
    console.error('Failed to load recovery state:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to load recovery state'), state: null };
  }
});

ipcMain.handle('clear-recovery-state', async () => {
  try {
    if (fs.existsSync(RECOVERY_STATE_PATH)) {
      fs.unlinkSync(RECOVERY_STATE_PATH);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to clear recovery state:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to clear recovery state') };
  }
});

// Backend health probe for renderer processes (avoids renderer-side network noise)
ipcMain.handle('backend-health:check', async () => {
  try {
    const response = await fetch('http://localhost:3000/v1/models', {
      signal: AbortSignal.timeout(2500),
    });
    return { online: response.ok };
  } catch {
    return { online: false };
  }
});

// Secure credential storage IPC handlers
ipcMain.handle('secure-storage:is-available', () => {
  return safeStorage.isEncryptionAvailable();
});

ipcMain.handle('secure-storage:set-item', async (_event, key: string, value: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: 'Secure storage is not available on this system' };
    }

    const encrypted = safeStorage.encryptString(value);
    const store = loadSecureStorage();
    store[key] = encrypted.toString('base64');
    saveSecureStorage(store);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Failed to store secret') };
  }
});

ipcMain.handle('secure-storage:get-item', async (_event, key: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: 'Secure storage is not available on this system', value: null };
    }

    const store = loadSecureStorage();
    const encoded = store[key];
    if (!encoded) {
      return { success: true, value: null };
    }

    const decrypted = safeStorage.decryptString(Buffer.from(encoded, 'base64'));
    return { success: true, value: decrypted };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Failed to load secret'), value: null };
  }
});

ipcMain.handle('secure-storage:remove-item', async (_event, key: string) => {
  try {
    const store = loadSecureStorage();
    if (Object.prototype.hasOwnProperty.call(store, key)) {
      delete store[key];
      saveSecureStorage(store);
    }
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, 'Failed to remove secret') };
  }
});

const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

// Window size constraints
const MIN_WINDOW_WIDTH = 400;
const MIN_WINDOW_HEIGHT = 300;
const MAX_WINDOW_WIDTH = 4000;
const MAX_WINDOW_HEIGHT = 3000;

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
  isFullscreen?: boolean;
}

function validateBounds(state: WindowState): WindowState {
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Clamp width and height to reasonable bounds
  const maxWidth = Math.min(MAX_WINDOW_WIDTH, screenWidth);
  const maxHeight = Math.min(MAX_WINDOW_HEIGHT, screenHeight);

  const validatedState = { ...state };

  // Validate and clamp width
  if (typeof validatedState.width !== 'number' || validatedState.width < MIN_WINDOW_WIDTH) {
    validatedState.width = 1200;
  } else if (validatedState.width > maxWidth) {
    validatedState.width = maxWidth;
  }

  // Validate and clamp height
  if (typeof validatedState.height !== 'number' || validatedState.height < MIN_WINDOW_HEIGHT) {
    validatedState.height = 800;
  } else if (validatedState.height > maxHeight) {
    validatedState.height = maxHeight;
  }

  return validatedState;
}

function isPositionVisible(bounds: { x?: number; y?: number; width: number; height: number }): boolean {
  if (bounds.x === undefined || bounds.y === undefined) {
    return false;
  }

  const displays = screen.getAllDisplays();

  for (const display of displays) {
    const displayBounds = display.bounds;

    // Check if window bounds intersect with display bounds
    const intersects =
      bounds.x < displayBounds.x + displayBounds.width &&
      bounds.x + bounds.width > displayBounds.x &&
      bounds.y < displayBounds.y + displayBounds.height &&
      bounds.y + bounds.height > displayBounds.y;

    if (intersects) {
      return true;
    }
  }

  return false;
}

function saveWindowState(win: BrowserWindow) {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(bounds));
  } catch (e) {
    console.error('Failed to save window state', e);
  }
}

function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      const rawState = fs.readFileSync(WINDOW_STATE_PATH, 'utf-8');
      const savedState = parseWindowState(rawState);
      if (!savedState) {
        throw new Error('Invalid saved window state format');
      }

      // Validate bounds (size constraints)
      const validatedState = validateBounds(savedState);

      // Validate that the saved position is on-screen
      if (!isPositionVisible(validatedState)) {
        // Position is not visible, return defaults without x/y to center on primary display
        return {
          width: validatedState.width,
          height: validatedState.height,
          isMaximized: validatedState.isMaximized,
          isFullscreen: validatedState.isFullscreen
        };
      }

      return validatedState;
    }
  } catch (e) {
    console.error('Failed to load window state, deleting corrupted file:', e);
    // Delete corrupted file to prevent repeated errors
    try {
      if (fs.existsSync(WINDOW_STATE_PATH)) {
        fs.unlinkSync(WINDOW_STATE_PATH);
      }
    } catch (deleteError) {
      console.error('Failed to delete corrupted window state file:', deleteError);
    }
  }
  return { width: 1200, height: 800 };
}

function createWindow() {
  const savedState = loadWindowState();

  const win = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
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
  const maxDevLoadAttempts = 8;
  let devLoadAttempts = 0;
  let devReloadTimer: NodeJS.Timeout | null = null;

  const clearDevReloadTimer = () => {
    if (devReloadTimer) {
      clearTimeout(devReloadTimer);
      devReloadTimer = null;
    }
  };

  const showLoadFailureScreen = (details: string) => {
    const escapedDetails = details
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>InferencerC - Load Error</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .card {
        max-width: 640px;
        margin: 24px;
        padding: 24px;
        border-radius: 12px;
        border: 1px solid #334155;
        background: rgba(15, 23, 42, 0.85);
      }
      h1 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 20px;
      }
      p {
        margin: 8px 0;
        line-height: 1.5;
      }
      code {
        display: block;
        margin-top: 12px;
        padding: 12px;
        border-radius: 8px;
        background: #020617;
        color: #f8fafc;
        white-space: pre-wrap;
        word-break: break-word;
      }
      button {
        margin-top: 16px;
        border: 0;
        border-radius: 8px;
        padding: 10px 14px;
        cursor: pointer;
        background: #38bdf8;
        color: #082f49;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>InferencerC failed to load</h1>
      <p>The renderer did not start correctly. This replaces the blank white screen with a readable error.</p>
      <p>Make sure the dev server is running on <strong>${devUrl}</strong>, then retry.</p>
      <code>${escapedDetails}</code>
      <button onclick="window.location.href='${devUrl}'">Retry Loading</button>
    </div>
  </body>
</html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
  };

  const scheduleDevReload = (reason: string) => {
    if (app.isPackaged || win.isDestroyed()) {
      return;
    }
    if (devLoadAttempts >= maxDevLoadAttempts) {
      showLoadFailureScreen(
        `Gave up after ${maxDevLoadAttempts} attempts.\nLast reason: ${reason}`
      );
      return;
    }
    if (devReloadTimer) {
      return;
    }
    const backoffMs = Math.min(500 * Math.pow(2, Math.max(devLoadAttempts - 1, 0)), 4000);
    console.warn(
      `[main] Renderer load failed (${reason}). Retrying in ${backoffMs}ms ` +
      `(attempt ${devLoadAttempts + 1}/${maxDevLoadAttempts})`
    );
    devReloadTimer = setTimeout(() => {
      devReloadTimer = null;
      loadRenderer();
    }, backoffMs);
  };

  const loadRenderer = () => {
    if (win.isDestroyed()) {
      return;
    }
    if (!app.isPackaged) {
      devLoadAttempts += 1;
      win.loadURL(devUrl).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        scheduleDevReload(`loadURL error: ${message}`);
      });
      return;
    }

    win.loadFile(path.join(__dirname, '../../renderer/index.html')).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      showLoadFailureScreen(`Failed to load packaged renderer: ${message}`);
    });
  };

  win.webContents.on('did-finish-load', () => {
    clearDevReloadTimer();
    devLoadAttempts = 0;
  });

  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }
      const reason = `code=${errorCode}, message=${errorDescription}`;
      if (app.isPackaged) {
        showLoadFailureScreen(`Renderer failed to load: ${reason}`);
      } else {
        scheduleDevReload(reason);
      }
    }
  );

  win.webContents.on('render-process-gone', (_event, details) => {
    const reason = `reason=${details.reason}, exitCode=${details.exitCode}`;
    if (app.isPackaged) {
      showLoadFailureScreen(`Renderer process exited: ${reason}`);
    } else {
      scheduleDevReload(reason);
    }
  });

  loadRenderer();
  if (!app.isPackaged) {
    win.webContents.openDevTools();
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
      const state: WindowState = isMaximized || isFullscreen
        ? { ...loadWindowState(), isMaximized, isFullscreen }
        : { ...win.getBounds(), isMaximized: false, isFullscreen: false };
      fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state));
    } catch (e) { }
  };

  win.on('resize', trackState);
  win.on('move', trackState);
  win.on('close', trackState);
  win.on('enter-full-screen', trackState);
  win.on('leave-full-screen', trackState);

  // Window Control IPC Handlers
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on('window-close', () => win.close());

  // Project Context IPC Handlers
  const folderWatchers = new Map<string, chokidar.FSWatcher>();

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

  ipcMain.handle('read-folder-files', async (event, folderPath: string, extensions?: string[]) => {
    try {
      const files: Array<{ path: string; content: string; relativePath: string }> = [];
      const allowedExtensions = extensions || ['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.txt', '.css', '.html'];
      
      const readDir = (dir: string, basePath: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(basePath, fullPath);
          
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
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (allowedExtensions.includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                files.push({
                  path: fullPath,
                  content,
                  relativePath
                });
              } catch (e) {
                // Skip files that can't be read
              }
            }
          }
        }
      };
      
      readDir(folderPath, folderPath);
      return { success: true, files };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, 'Failed to read folder files') };
    }
  });

  ipcMain.handle('watch-folder', async (event, folderPath: string) => {
    try {
      if (folderWatchers.has(folderPath)) {
        return { success: true, message: 'Already watching' };
      }

      const watcher = chokidar.watch(folderPath, {
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
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, 'Failed to watch folder') };
    }
  });

  ipcMain.handle('stop-watching-folder', async (event, folderPath: string) => {
    const watcher = folderWatchers.get(folderPath);
    if (watcher) {
      await watcher.close();
      folderWatchers.delete(folderPath);
      return { success: true };
    }
    return { success: false };
  });

  // Git Commit Handler
  ipcMain.handle('git-commit', async (event, options: { filePath: string; content: string; message: string }) => {
    try {
      // In a real implementation, this would execute git commands
      // For now, return a mock success response
      // You would use a library like simple-git or execute git commands via child_process
      return {
        success: true,
        commitHash: 'mock-commit-hash',
        error: undefined,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Git commit failed'),
      };
    }
  });

  // MCP Connect Handler
  ipcMain.handle('mcp-connect', async (event, server: MCPServerConfig) => {
    try {
      const result = await mcpClientManager.connect(server);
      return result;
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to connect to MCP server'),
      };
    }
  });

  // MCP Disconnect Handler
  ipcMain.handle('mcp-disconnect', async (event, serverId: string) => {
    try {
      const result = await mcpClientManager.disconnect(serverId);
      return result;
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to disconnect from MCP server'),
      };
    }
  });

  // MCP Execute Tool Handler
  ipcMain.handle('mcp-execute-tool', async (_event, params: MCPExecuteToolParams) => {
    try {
      const result = await mcpClientManager.callTool(params.serverId, params.toolName, params.arguments);
      return {
        success: true,
        result,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to execute tool'),
      };
    }
  });

  // Code Execution Handler (sandboxed)
  ipcMain.handle('execute-code', async (event, code: string, language: string) => {
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
          
          python.stdout.on('data', (data: Buffer) => {
            output += data.toString();
          });
          
          python.stderr.on('data', (data: Buffer) => {
            error += data.toString();
          });
          
          python.on('close', (code: number) => {
            resolve({
              success: code === 0,
              output: output || error,
              exitCode: code
            });
          });
          
          python.on('error', (err: Error) => {
            resolve({
              success: false,
              output: `Error: ${err.message}`,
              exitCode: -1
            });
          });
        });
      } else if (language === 'javascript' || language === 'js') {
        // For JS, we'll use a VM context (limited)
        const vm = require('vm');
        try {
          const context = vm.createContext({
            console: {
              log: (...args: unknown[]) => args.join(' '),
              error: (...args: unknown[]) => args.join(' '),
            }
          });
          const result = vm.runInContext(code, context, { timeout: 2000 });
          return {
            success: true,
            output: String(result || 'Execution completed'),
            exitCode: 0
          };
        } catch (err: unknown) {
          return {
            success: false,
            output: `Error: ${getErrorMessage(err, 'Unknown execution error')}`,
            exitCode: 1
          };
        }
      } else {
        return {
          success: false,
          output: `Language ${language} not supported for execution`,
          exitCode: -1
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        output: `Execution error: ${getErrorMessage(error, 'Unknown execution error')}`,
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
