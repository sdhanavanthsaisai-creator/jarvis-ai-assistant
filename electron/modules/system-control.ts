import { EventEmitter } from 'events';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * JARVIS System Control
 * ──────────────────────
 * Manages system-level operations:
 *   - Opening applications
 *   - Running shell commands
 *   - Gathering system information
 *   - Managing volume, brightness, etc.
 */

// ── Application name → executable mapping ──
const APP_MAP: Record<string, string> = {
  chrome: 'start chrome',
  firefox: 'start firefox',
  edge: 'start msedge',
  explorer: 'start explorer',
  'file explorer': 'start explorer',
  notepad: 'start notepad',    calculator: 'start calc',
  terminal: 'start cmd',
  cmd: 'start cmd',
  powershell: 'start powershell',
  vscode: 'start code',
  code: 'start code',
  spotify: 'start spotify',
  discord: 'start discord',
  slack: 'start slack',
  obsidian: 'start obsidian',
  outlook: 'start outlook',
  word: 'start winword',
  excel: 'start excel',
  powerpoint: 'start powerpnt',
  teams: 'start ms-teams',
  zoom: 'start zoom',
  steam: 'start steam',
};

class SystemControl {
  private eventBus: EventEmitter;
  private isWindows: boolean;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.isWindows = process.platform === 'win32';
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for instant commands that need system actions
    this.eventBus.on('system:open', (appName: string) => {
      this.openApp(appName);
    });
  }

  /**
   * Open an application by name
   */
  async openApp(appName: string): Promise<{ success: boolean; message: string }> {
    const lowerName = appName.toLowerCase().trim();
    const command = APP_MAP[lowerName];

    if (!command) {
      return {
        success: false,
        message: `I don't recognize the application "${appName}", sir.`,
      };
    }

    try {
      await execAsync(command);
      this.eventBus.emit('speak', `Opening ${appName}, sir.`);
      return {
        success: true,
        message: `Opened ${appName}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to open ${appName}: ${error.message}`,
      };
    }
  }

  /**
   * Run a shell command
   */
  async runCommand(command: string): Promise<{ success: boolean; output: string }> {
    try {
      // Safety: Only allow certain commands
      const blocked = ['rm -rf', 'format', 'del /s', 'shutdown', 'reboot'];
      const lowerCmd = command.toLowerCase();

      for (const b of blocked) {
        if (lowerCmd.includes(b)) {
          return {
            success: false,
            output: 'I cannot execute that command for safety reasons, sir.',
          };
        }
      }

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return {
        success: true,
        output: stdout || stderr || 'Command executed successfully.',
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message,
      };
    }
  }

  /**
   * Gather system information
   */
  async getSystemInfo(): Promise<Record<string, string>> {
    try {
      const info: Record<string, string> = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      };

      if (this.isWindows) {
        // Get Windows-specific info via PowerShell
        try {
          const { stdout: hostname } = await execAsync('hostname');
          info.hostname = hostname.trim();

          const { stdout: username } = await execAsync('echo %USERNAME%');
          info.username = username.trim();

          const { stdout: osInfo } = await execAsync(
            'powershell -Command "(Get-CimInstance Win32_OperatingSystem).Caption"'
          );
          info.os = osInfo.trim();
        } catch {
          // Non-critical
        }
      }

      // Memory info
      const totalMem = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
      const usedMem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      info.memory = `${usedMem}MB / ${totalMem}MB`;

      return info;
    } catch {
      return { platform: process.platform };
    }
  }

  /**
   * Get volume info (Windows only)
   */
  async getVolume(): Promise<number> {
    if (!this.isWindows) return -1;
    try {
      const { stdout } = await execAsync(
        'powershell -Command "(Get-AudioDevice -PlaybackVolume)"'
      );
      return parseInt(stdout.trim(), 10) || -1;
    } catch {
      return -1;
    }
  }
}

export default SystemControl;
