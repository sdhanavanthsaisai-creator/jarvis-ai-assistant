import { EventEmitter } from 'events';

/**
 * JARVIS Obsidian Sync
 * ────────────────────
 * Watches an Obsidian vault directory for changes using chokidar.
 * Emits events when files are created, modified, or deleted.
 */

import type { FSWatcher } from 'chokidar';

class ObsidianSync {
  private eventBus: EventEmitter;
  private watcher: FSWatcher | null = null;
  private vaultPath: string = '';
  private watchPattern: string = '**/*.md';

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('obsidian:start', (vaultPath: string) => this.startWatching(vaultPath));
    this.eventBus.on('obsidian:stop', () => this.stopWatching());
  }

  /**
   * Start watching a vault directory
   */
  async startWatching(vaultPath: string): Promise<void> {
    this.vaultPath = vaultPath;
    this.stopWatching(); // Stop any existing watcher

    try {
      const chokidar = await import('chokidar');
      this.watcher = chokidar.default.watch(
        `${vaultPath}/${this.watchPattern}`,
        {
          ignored: /(^|[\/\\])\.(?!obsidian)|node_modules/,
          persistent: true,
          ignoreInitial: false,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
          },
        }
      );

      this.watcher
        .on('add', (filePath: string) => {
          console.log(`[Obsidian] File added: ${filePath}`);
          this.eventBus.emit('file_changed', { type: 'add', path: filePath });
        })
        .on('change', (filePath: string) => {
          console.log(`[Obsidian] File changed: ${filePath}`);
          this.eventBus.emit('file_changed', { type: 'change', path: filePath });
        })
        .on('unlink', (filePath: string) => {
          console.log(`[Obsidian] File removed: ${filePath}`);
          this.eventBus.emit('file_changed', { type: 'unlink', path: filePath });
        })
        .on('error', (error: Error) => {
          console.error('[Obsidian] Watcher error:', error);
        });

      console.log(`[Obsidian] Watching vault: ${vaultPath}`);
    } catch (err: any) {
      console.error('[Obsidian] Failed to start watcher:', err.message);
    }
  }

  /**
   * Stop watching
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[Obsidian] Watcher stopped');
    }
  }

  /**
   * Get sync status
   */
  getStatus(): { isWatching: boolean; vaultPath: string } {
    return {
      isWatching: this.watcher !== null,
      vaultPath: this.vaultPath,
    };
  }
}

export default ObsidianSync;
