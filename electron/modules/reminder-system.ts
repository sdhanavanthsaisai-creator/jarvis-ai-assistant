import { EventEmitter } from 'events';
import cron from 'node-cron';

/**
 * JARVIS Reminder System
 * ──────────────────────
 * Manages scheduled reminders and notifications
 * using node-cron for scheduling and node-notifier for alerts.
 */

interface Reminder {
  id: string;
  title: string;
  message: string;
  schedule: string; // Cron expression
  isActive: boolean;
  createdAt: number;
}

class ReminderSystem {
  private eventBus: EventEmitter;
  private reminders: Map<string, Reminder> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('reminder:add', (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
      this.addReminder(reminder);
    });
    this.eventBus.on('reminder:remove', (id: string) => {
      this.removeReminder(id);
    });
  }

  /**
   * Add a new reminder
   */
  addReminder(data: Omit<Reminder, 'id' | 'createdAt'>): Reminder | null {
    if (!cron.validate(data.schedule)) {
      console.warn('[Reminder] Invalid cron expression:', data.schedule);
      return null;
    }

    const reminder: Reminder = {
      ...data,
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };

    this.reminders.set(reminder.id, reminder);

    // Schedule the cron job
    const task = cron.schedule(reminder.schedule, () => {
      this.eventBus.emit('notification', {
        title: reminder.title,
        body: reminder.message,
      });
      this.eventBus.emit('speak', reminder.message);
    });

    this.scheduledTasks.set(reminder.id, task);
    console.log(`[Reminder] Added: ${reminder.title} (${reminder.schedule})`);

    return reminder;
  }

  /**
   * Remove a reminder
   */
  removeReminder(id: string): boolean {
    const task = this.scheduledTasks.get(id);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(id);
    }
    this.reminders.delete(id);
    return true;
  }

  /**
   * Get all reminders
   */
  getReminders(): Reminder[] {
    return Array.from(this.reminders.values());
  }
}

export default ReminderSystem;
