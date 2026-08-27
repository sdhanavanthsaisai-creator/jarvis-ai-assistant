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
let emailService: any;
let webSearch: any;
let browserAutomation: any;

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

  // ── Email Service (Gmail) ──
  ipcMain.handle('email:authenticate', async (_event, clientId: string, clientSecret: string) => {
    if (!emailService) return { success: false, message: 'Email service not initialized' };
    return emailService.authenticate(clientId, clientSecret);
  });

  ipcMain.handle('email:auth-callback', async (_event, code: string) => {
    if (!emailService) return { success: false, message: 'Email service not initialized' };
    return emailService.handleAuthCallback(code);
  });

  ipcMain.handle('email:parse-draft', async (_event, input: string) => {
    if (!emailService) return null;
    return emailService.parseEmailCommand(input);
  });

  ipcMain.handle('email:confirm-send', async (_event, draft: any) => {
    if (!emailService) return { success: false, message: 'Email service not initialized' };
    return emailService.confirmAndSend(draft);
  });

  ipcMain.handle('email:read-inbox', async (_event, maxResults?: number) => {
    if (!emailService) return { success: false, messages: [], message: 'Email service not initialized' };
    return emailService.readInbox(maxResults);
  });

  ipcMain.handle('email:search-emails', async (_event, query: string, maxResults?: number) => {
    if (!emailService) return { success: false, messages: [], message: 'Email service not initialized' };
    return emailService.searchEmails(query, maxResults);
  });

  ipcMain.handle('email:get-status', async () => {
    if (!emailService) return { isAuthenticated: false, email: '' };
    return emailService.getStatus();
  });

  // ── Web Search ──
  ipcMain.handle('web:search', async (_event, query: string, numResults?: number) => {
    if (!webSearch) return { results: [], query };
    return webSearch.searchWeb(query, numResults);
  });

  ipcMain.handle('web:fetch', async (_event, url: string, maxLength?: number) => {
    if (!webSearch) return { success: false, content: '', title: '', url };
    return webSearch.fetchPage(url, maxLength);
  });

  ipcMain.handle('web:summarize', async (_event, query: string) => {
    if (!webSearch) return { query, results: [], content: '' };
    return webSearch.searchAndSummarize(query);
  });

  // ── Browser Automation ──
  ipcMain.handle('browser:open', async () => {
    if (!browserAutomation) return { success: false, message: 'Browser automation not initialized' };
    return browserAutomation.openBrowser();
  });

  ipcMain.handle('browser:navigate', async (_event, url: string) => {
    if (!browserAutomation) return { success: false, title: '', url, message: 'Browser automation not initialized' };
    return browserAutomation.navigateTo(url);
  });

  ipcMain.handle('browser:action', async (_event, type: string, selector?: string, text?: string) => {
    if (!browserAutomation) return { success: false, message: 'Browser automation not initialized' };
    switch (type) {
      case 'click': return browserAutomation.clickElement(selector);
      case 'type': return browserAutomation.typeText(selector, text);
      case 'extract': return browserAutomation.extractText(selector);
      default: return { success: false, message: `Unknown action: ${type}` };
    }
  });

  ipcMain.handle('browser:get-content', async () => {
    if (!browserAutomation) return { success: false, content: '', title: '', message: 'Browser automation not initialized' };
    return browserAutomation.getPageContent();
  });

  ipcMain.handle('browser:screenshot', async () => {
    if (!browserAutomation) return { success: false, screenshot: '', message: 'Browser automation not initialized' };
    return browserAutomation.takeScreenshot();
  });

  ipcMain.handle('browser:close', async () => {
    if (!browserAutomation) return { success: false, message: 'Browser automation not initialized' };
    return browserAutomation.closeBrowser();
  });

  ipcMain.handle('browser:get-status', async () => {
    if (!browserAutomation) return { isRunning: false, currentUrl: '' };
    return browserAutomation.getStatus();
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
  const { default: EmailServiceModule } = await import('./modules/email-service');
  const { default: WebSearchModule } = await import('./modules/web-search');
  const { default: BrowserAutomationModule } = await import('./modules/browser-automation');

  eventBus = new JarvisEventBus();
  aiBrain = new AIBrain(eventBus);
  systemControl = new SystemControl(eventBus);
  stockEngine = new StockEngineModule(eventBus);
  weatherService = new WeatherServiceModule(eventBus);
  emailService = new EmailServiceModule(eventBus);
  webSearch = new WebSearchModule(eventBus);
  browserAutomation = new BrowserAutomationModule(eventBus);

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

  eventBus.on('email:authenticated', (data: any) => {
    mainWindow?.webContents.send('email:authenticated', data);
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
