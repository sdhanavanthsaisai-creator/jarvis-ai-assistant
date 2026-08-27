import { EventEmitter } from 'events';

/**
 * JARVIS Health Tracker
 * ─────────────────────
 * Manages habit tracking, streaks, and daily goals.
 * Uses SQLite for persistent storage via better-sqlite3.
 */

interface Habit {
  id: number;
  name: string;
  icon: string;
  createdAt: string;
  isActive: boolean;
}

interface HabitEntry {
  id: number;
  habitId: number;
  date: string;
  completed: boolean;
}

interface HabitWithStreak extends Habit {
  streak: number;
  bestStreak: number;
  completedToday: boolean;
}

class HealthTracker {
  private eventBus: EventEmitter;
  private db: any = null;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('habit:initialize', () => this.initializeDB());
  }

  /**
   * Initialize SQLite database
   */
  initializeDB(): void {
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const { app } = require('electron');

      const dbPath = path.join(app.getPath('userData'), 'jarvis-habits.db');
      this.db = new Database(dbPath);

      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '✅',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS habit_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          FOREIGN KEY (habit_id) REFERENCES habits(id),
          UNIQUE(habit_id, date)
        );
      `);

      console.log('[Health Tracker] Database initialized');
    } catch (err: any) {
      console.error('[Health Tracker] DB init failed:', err.message);
    }
  }

  /**
   * Add a new habit
   */
  addHabit(name: string, icon: string = '✅'): Habit | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('INSERT INTO habits (name, icon) VALUES (?, ?)');
    const result = stmt.run(name, icon);
    return { id: result.lastInsertRowid, name, icon, createdAt: new Date().toISOString(), isActive: true };
  }

  /**
   * Get all habits with today's status
   */
  getAllHabits(): HabitWithStreak[] {
    if (!this.db) return [];
    const habits = this.db.prepare('SELECT * FROM habits WHERE is_active = 1').all();
    const today = new Date().toISOString().split('T')[0];

    return habits.map((habit: Habit) => {
      const entry = this.db.prepare(
        'SELECT completed FROM habit_entries WHERE habit_id = ? AND date = ?'
      ).get(habit.id, today);

      // Calculate streak
      const streak = this.calculateStreak(habit.id);
      const bestStreak = this.calculateBestStreak(habit.id);

      return {
        ...habit,
        streak,
        bestStreak,
        completedToday: entry?.completed || false,
      };
    });
  }

  /**
   * Toggle habit completion for today
   */
  toggleHabit(habitId: number): boolean {
    if (!this.db) return false;
    const today = new Date().toISOString().split('T')[0];

    const existing = this.db.prepare(
      'SELECT id, completed FROM habit_entries WHERE habit_id = ? AND date = ?'
    ).get(habitId, today);

    if (existing) {
      this.db.prepare('UPDATE habit_entries SET completed = ? WHERE id = ?')
        .run(!existing.completed, existing.id);
      return !existing.completed;
    } else {
      this.db.prepare('INSERT INTO habit_entries (habit_id, date, completed) VALUES (?, ?, 1)')
        .run(habitId, today);
      return true;
    }
  }

  /**
   * Calculate current streak for a habit
   */
  private calculateStreak(habitId: number): number {
    if (!this.db) return 0;
    const entries = this.db.prepare(
      'SELECT date, completed FROM habit_entries WHERE habit_id = ? ORDER BY date DESC LIMIT 60'
    ).all(habitId);

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = entries.find((e: any) => e.date === dateStr);

      if (entry?.completed) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate best streak ever
   */
  private calculateBestStreak(habitId: number): number {
    if (!this.db) return 0;
    const entries = this.db.prepare(
      'SELECT completed FROM habit_entries WHERE habit_id = ? ORDER BY date ASC'
    ).all(habitId);

    let best = 0;
    let current = 0;

    for (const entry of entries) {
      if (entry.completed) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    return best;
  }
}

export default HealthTracker;
