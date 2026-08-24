import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Flame, Trophy, Calendar } from 'lucide-react';

// ══════════════════════════════════════════════════════
// HABITS PAGE — Daily Tracker
// ══════════════════════════════════════════════════════

interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  bestStreak: number;
  completedToday: boolean;
  history: boolean[]; // last 7 days
}

const initialHabits: Habit[] = [
  { id: '1', name: 'Exercise 30min', icon: '💪', streak: 12, bestStreak: 21, completedToday: true, history: [true, true, true, true, true, true, true] },
  { id: '2', name: 'Read 30min', icon: '📚', streak: 7, bestStreak: 14, completedToday: false, history: [true, true, true, true, true, true, false] },
  { id: '3', name: 'Meditate', icon: '🧘', streak: 21, bestStreak: 30, completedToday: true, history: [true, true, true, true, true, true, true] },
  { id: '4', name: 'Code 1hr', icon: '💻', streak: 5, bestStreak: 18, completedToday: true, history: [true, true, true, false, true, true, true] },
  { id: '5', name: 'No Social Media', icon: '📵', streak: 3, bestStreak: 7, completedToday: false, history: [true, true, false, true, true, true, false] },
  { id: '6', name: 'Journal', icon: '📝', streak: 9, bestStreak: 15, completedToday: true, history: [true, true, true, true, true, true, true] },
];

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Habits() {
  const [habits, setHabits] = useState(initialHabits);

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, completedToday: !h.completedToday } : h
      )
    );
  };

  const totalCompleted = habits.filter((h) => h.completedToday).length;
  const completionRate = Math.round((totalCompleted / habits.length) * 100);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={20} className="text-jarvis-gold" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-gold uppercase glow-text-gold">Habits</h1>
        </div>
        <button className="btn-hud btn-hud-gold text-xs">
          <Plus size={14} /> Add Habit
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: `${totalCompleted}/${habits.length}`, sub: `${completionRate}%`, icon: Calendar, color: 'text-jarvis-cyan' },
          { label: 'Longest Streak', value: '30d', sub: 'Meditate', icon: Trophy, color: 'text-jarvis-gold' },
          { label: 'Active Streaks', value: `${habits.filter((h) => h.streak > 0).length}`, sub: 'consecutive days', icon: Flame, color: 'text-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card neon-border p-4 flex items-center gap-3">
            <stat.icon size={20} className={stat.color} />
            <div>
              <p className="font-mono text-lg text-jarvis-text">{stat.value}</p>
              <p className="text-[0.6rem] text-jarvis-text-dim uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress Ring ── */}
      <div className="glass-card neon-border p-5 flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(42,42,42,0.8)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="#00d4ff" strokeWidth="6"
              strokeDasharray={`${(completionRate / 100) * 251.2} 251.2`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xl text-jarvis-cyan glow-text-cyan">{completionRate}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-jarvis-text">{totalCompleted} of {habits.length} habits completed today</p>
          <p className="text-xs text-jarvis-text-dim mt-1">
            {completionRate === 100
              ? '🏆 Perfect day! All habits completed.'
              : completionRate >= 70
              ? '💪 Great progress, sir!'
              : '⚡ Keep pushing, sir!'}
          </p>
        </div>
      </div>

      {/* ── Habit List ── */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {habits.map((habit, i) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card neon-border p-4 group"
          >
            <div className="flex items-center gap-4">
              {/* Toggle */}
              <button
                onClick={() => toggleHabit(habit.id)}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  habit.completedToday
                    ? 'bg-jarvis-cyan shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                    : 'border border-jarvis-border hover:border-jarvis-cyan/40'
                }`}
              >
                {habit.completedToday && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{habit.icon}</span>
                  <span className={`text-sm font-medium ${habit.completedToday ? 'text-jarvis-text' : 'text-jarvis-text-dim'}`}>
                    {habit.name}
                  </span>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-jarvis-gold/5">
                <Flame size={12} className="text-jarvis-gold" />
                <span className="font-mono text-xs text-jarvis-gold">{habit.streak}d</span>
              </div>

              {/* Weekly History */}
              <div className="flex gap-1">
                {habit.history.map((done, j) => (
                  <div
                    key={j}
                    className={`w-3 h-3 rounded-sm ${
                      done
                        ? 'bg-jarvis-cyan/60 shadow-[0_0_4px_rgba(0,212,255,0.3)]'
                        : 'bg-jarvis-border'
                    }`}
                    title={dayLabels[j]}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
