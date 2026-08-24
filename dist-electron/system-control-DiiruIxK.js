"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const child_process = require("child_process");
const util = require("util");
const execAsync = util.promisify(child_process.exec);
const APP_MAP = {
  chrome: "start chrome",
  firefox: "start firefox",
  edge: "start msedge",
  explorer: "start explorer",
  "file explorer": "start explorer",
  notepad: "start notepad",
  calculator: "start calc",
  terminal: "start cmd",
  cmd: "start cmd",
  powershell: "start powershell",
  vscode: "start code",
  code: "start code",
  spotify: "start spotify",
  discord: "start discord",
  slack: "start slack",
  obsidian: "start obsidian",
  outlook: "start outlook",
  word: "start winword",
  excel: "start excel",
  powerpoint: "start powerpnt",
  teams: "start ms-teams",
  zoom: "start zoom",
  steam: "start steam"
};
class SystemControl {
  constructor(eventBus) {
    __publicField(this, "eventBus");
    __publicField(this, "isWindows");
    this.eventBus = eventBus;
    this.isWindows = process.platform === "win32";
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("system:open", (appName) => {
      this.openApp(appName);
    });
  }
  /**
   * Open an application by name
   */
  async openApp(appName) {
    const lowerName = appName.toLowerCase().trim();
    const command = APP_MAP[lowerName];
    if (!command) {
      return {
        success: false,
        message: `I don't recognize the application "${appName}", sir.`
      };
    }
    try {
      await execAsync(command);
      this.eventBus.emit("speak", `Opening ${appName}, sir.`);
      return {
        success: true,
        message: `Opened ${appName}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open ${appName}: ${error.message}`
      };
    }
  }
  /**
   * Run a shell command
   */
  async runCommand(command) {
    try {
      const blocked = ["rm -rf", "format", "del /s", "shutdown", "reboot"];
      const lowerCmd = command.toLowerCase();
      for (const b of blocked) {
        if (lowerCmd.includes(b)) {
          return {
            success: false,
            output: "I cannot execute that command for safety reasons, sir."
          };
        }
      }
      const { stdout, stderr } = await execAsync(command, { timeout: 3e4 });
      return {
        success: true,
        output: stdout || stderr || "Command executed successfully."
      };
    } catch (error) {
      return {
        success: false,
        output: error.message
      };
    }
  }
  /**
   * Gather system information
   */
  async getSystemInfo() {
    try {
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      };
      if (this.isWindows) {
        try {
          const { stdout: hostname } = await execAsync("hostname");
          info.hostname = hostname.trim();
          const { stdout: username } = await execAsync("echo %USERNAME%");
          info.username = username.trim();
          const { stdout: osInfo } = await execAsync(
            'powershell -Command "(Get-CimInstance Win32_OperatingSystem).Caption"'
          );
          info.os = osInfo.trim();
        } catch {
        }
      }
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
  async getVolume() {
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
exports.default = SystemControl;
