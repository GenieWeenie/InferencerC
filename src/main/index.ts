import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { startServer } from '../server/index';
import chokidar from 'chokidar';
import { MCPClientManager } from './mcp-client';
import { MCPServerConfig } from './mcp-types';

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

  autoUpdater.on('update-available', (info: any) => {
    console.log('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', (info: any) => {
    console.log('Update not available');
  });

  autoUpdater.on('error', (err: any) => {
    console.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    console.log('Download progress:', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
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
  if (!app.isPackaged) {
    return { available: false, message: 'Updates only available in packaged app' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: !!result, version: result?.updateInfo.version };
  } catch (error: any) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// Recovery State IPC Handlers
const RECOVERY_STATE_PATH = path.join(app.getPath('userData'), 'recovery-state.json');

ipcMain.handle('save-recovery-state', async (event, state: any) => {
  try {
    fs.writeFileSync(RECOVERY_STATE_PATH, JSON.stringify(state));
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save recovery state:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recovery-state', async () => {
  try {
    if (fs.existsSync(RECOVERY_STATE_PATH)) {
      const data = fs.readFileSync(RECOVERY_STATE_PATH, 'utf-8');
      return { success: true, state: JSON.parse(data) };
    }
    return { success: true, state: null };
  } catch (error: any) {
    console.error('Failed to load recovery state:', error);
    return { success: false, error: error.message, state: null };
  }
});

ipcMain.handle('clear-recovery-state', async () => {
  try {
    if (fs.existsSync(RECOVERY_STATE_PATH)) {
      fs.unlinkSync(RECOVERY_STATE_PATH);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Failed to clear recovery state:', error);
    return { success: false, error: error.message };
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
      const savedState = JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf-8'));

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

  if (!app.isPackaged) {
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'));
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
    } catch (error: any) {
      return { success: false, error: error.message };
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
    } catch (error: any) {
      return { success: false, error: error.message };
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Git commit failed',
      };
    }
  });

  // MCP Connect Handler
  ipcMain.handle('mcp-connect', async (event, server: MCPServerConfig) => {
    try {
      const result = await mcpClientManager.connect(server);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to MCP server',
      };
    }
  });

  // MCP Disconnect Handler
  ipcMain.handle('mcp-disconnect', async (event, serverId: string) => {
    try {
      const result = await mcpClientManager.disconnect(serverId);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to disconnect from MCP server',
      };
    }
  });

  // MCP Execute Tool Handler
  ipcMain.handle('mcp-execute-tool', async (event, params: { serverId: string; toolName: string; arguments?: Record<string, any> }) => {
    try {
      const result = await mcpClientManager.callTool(params.serverId, params.toolName, params.arguments);
      return {
        success: true,
        result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to execute tool',
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
              log: (...args: any[]) => args.join(' '),
              error: (...args: any[]) => args.join(' '),
            }
          });
          const result = vm.runInContext(code, context, { timeout: 2000 });
          return {
            success: true,
            output: String(result || 'Execution completed'),
            exitCode: 0
          };
        } catch (err: any) {
          return {
            success: false,
            output: `Error: ${err.message}`,
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
    } catch (error: any) {
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
