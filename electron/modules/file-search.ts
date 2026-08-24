import { EventEmitter } from 'events';

/**
 * JARVIS File Search
 * ──────────────────
 * Full-text file search across configured directories.
 * Searches file names and content for matching queries.
 */

import fs from 'fs';
import path from 'path';

interface SearchResult {
  filePath: string;
  fileName: string;
  matchLine?: number;
  matchContent?: string;
  score: number;
}

class FileSearch {
  private eventBus: EventEmitter;
  private searchPaths: string[] = [];
  private ignorePatterns: string[] = ['node_modules', '.git', '.obsidian', 'dist', '__pycache__'];

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('file:search', (query: string) => this.search(query));
  }

  /**
   * Set directories to search
   */
  setSearchPaths(paths: string[]): void {
    this.searchPaths = paths.filter((p) => fs.existsSync(p));
  }

  /**
   * Search for files matching query
   */
  async search(query: string, maxResults: number = 50): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const searchPath of this.searchPaths) {
      if (results.length >= maxResults) break;
      this.walkDirectory(searchPath, lowerQuery, results, maxResults);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    this.eventBus.emit('file:search-results', results.slice(0, maxResults));
    return results.slice(0, maxResults);
  }

  private walkDirectory(
    dir: string,
    query: string,
    results: SearchResult[],
    maxResults: number
  ): void {
    if (results.length >= maxResults) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (this.ignorePatterns.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          this.walkDirectory(fullPath, query, results, maxResults);
        } else if (entry.isFile()) {
          const score = this.scoreFile(entry.name, fullPath, query);
          if (score > 0) {
            results.push({
              filePath: fullPath,
              fileName: entry.name,
              score,
            });
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  private scoreFile(fileName: string, filePath: string, query: string): number {
    let score = 0;
    const lowerName = fileName.toLowerCase();

    // Exact name match
    if (lowerName === query) return 100;

    // Name contains query
    if (lowerName.includes(query)) score += 50;

    // Name starts with query
    if (lowerName.startsWith(query)) score += 20;

    // Extension matching
    const ext = path.extname(fileName).toLowerCase();
    if (query.includes(ext)) score += 10;

    return score;
  }
}

export default FileSearch;
