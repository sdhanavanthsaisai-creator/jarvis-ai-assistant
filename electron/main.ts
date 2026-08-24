import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import path from 'path';

// ── Prevent multiple instances ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ── Module imports (lazy loaded after ready) ──
let eventBus: any;
let aiBrain: any;
let systemControl: any;
let stockEngine: any;
let weatherService: any;

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'J.A.R.V.I.S',
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#00d4ff',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/jarvis-icon.png'),
    show: false,
  });

  // ── Load the app ──
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ── Show when ready ──
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ── Open external links in browser ──
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ══════════════════════════════════════════════════════
// IPC HANDLERS
// ══════════════════════════════════════════════════════

function setupIPC() {
  // ── AI Brain ──
  ipcMain.handle('ai:query', async (_event, prompt: string) => {
    if (!aiBrain) return { error: 'AI Brain not initialized' };
    return aiBrain.query(prompt);
  });

  ipcMain.handle('ai:stream', async (event, prompt: string) => {
    if (!aiBrain) return;
    const channel = `ai:stream:${Date.now()}`;

    aiBrain.streamQuery(prompt, (chunk: string) => {
      event.sender.send(channel, { type: 'chunk', data: chunk });
    }).then(() => {
      event.sender.send(channel, { type: 'done' });
    }).catch((err: Error) => {
      event.sender.send(channel, { type: 'error', data: err.message });
    });

    return channel;
  });

  ipcMain.handle('ai:models', async () => {
    if (!aiBrain) return [];
    return aiBrain.listModels();
  });

  ipcMain.handle('ai:set-model', async (_event, model: string) => {
    if (!aiBrain) return false;
    return aiBrain.setModel(model);
  });

  // ── System Control ──
  ipcMain.handle('system:open-app', async (_event, appName: string) => {
    if (!systemControl) return { error: 'System control not initialized' };
    return systemControl.openApp(appName);
  });

  ipcMain.handle('system:run-command', async (_event, command: string) => {
    if (!systemControl) return { error: 'System control not initialized' };
    return systemControl.runCommand(command);
  });

  ipcMain.handle('system:info', async () => {
    if (!systemControl) return {};
    return systemControl.getSystemInfo();
  });

  // ── Stock Engine ──
  ipcMain.handle('stock:get-quotes', async (_event, symbols: string[]) => {
    if (!stockEngine) return [];
    return stockEngine.fetchQuotes(symbols);
  });

  ipcMain.handle('stock:get-indices', async () => {
    if (!stockEngine) return [];
    return stockEngine.fetchIndices();
  });

  ipcMain.handle('stock:get-sectors', async () => {
    if (!stockEngine) return [];
    return stockEngine.fetchSectorIndices();
  });

  ipcMain.handle('stock:market-status', () => {
    if (!stockEngine) return 'closed';
    return stockEngine.getMarketStatus();
  });

  // ── Weather Service ──
  ipcMain.handle('weather:get', async () => {
    if (!weatherService) return null;
    return weatherService.fetchCurrentWeather();
  });

  // ── Window Controls ──
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // ── Theme ──
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
}

// ══════════════════════════════════════════════════════
// APP LIFECYCLE
// ══════════════════════════════════════════════════════

app.whenReady().then(async () => {
  // Initialize modules
  const { default: JarvisEventBus } = await import('./modules/event-bus');
  const { default: AIBrain } = await import('./modules/ai-brain');
  const { default: SystemControl } = await import('./modules/system-control');
  const { default: StockEngineModule } = await import('./modules/stock-engine');
  const { default: WeatherServiceModule } = await import('./modules/weather-service');

  eventBus = new JarvisEventBus();
  aiBrain = new AIBrain(eventBus);
  systemControl = new SystemControl(eventBus);
  stockEngine = new StockEngineModule(eventBus);
  weatherService = new WeatherServiceModule(eventBus);

  // Load API keys from env
  weatherService.setApiKey(process.env.OPENWEATHER_API_KEY || '');
  weatherService.setWAQIToken(process.env.WAQI_TOKEN || '');

  // Wire up event bus → renderer
  eventBus.on('ai:response', (data: string) => {
    mainWindow?.webContents.send('ai:response', data);
  });

  eventBus.on('ai:stream-chunk', (data: string) => {
    mainWindow?.webContents.send('ai:stream-chunk', data);
  });

  eventBus.on('ai:stream-done', () => {
    mainWindow?.webContents.send('ai:stream-done');
  });

  eventBus.on('stock:update', (data: any[]) => {
    mainWindow?.webContents.send('stock:update', data);
  });

  eventBus.on('weather:update', (data: any) => {
    mainWindow?.webContents.send('weather:update', data);
  });

  eventBus.on('weather:error', (error: string) => {
    mainWindow?.webContents.send('weather:error', error);
  });

  // Start auto-refresh
  stockEngine.startAutoRefresh();
  weatherService.startAutoRefresh();

  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── Single instance lock ──
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
