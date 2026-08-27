// src/pages/Dashboard.tsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  TrendingUp,
  Newspaper,
  CheckSquare,
  Clock,
  Cpu,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { fetchIndianIndices, fetchStockWatchlist, fetchChennaiWeather, fetchLiveNews, timeAgo } from '../lib/api';
import IndexCard from '../components/IndexCard';
import StockCard from '../components/StockCard';
import WeatherWidget from '../components/WeatherWidget';

// ══════════════════════════════════════════════════════
// DASHBOARD — JARVIS COMMAND CENTER
// ══════════════════════════════════════════════════════

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const habitData = [
  { name: 'Exercise', streak: 12, completed: true },
  { name: 'Read 30min', streak: 7, completed: false },
  { name: 'Meditate', streak: 21, completed: true },
  { name: 'Code Review', streak: 5, completed: true },
];

export default function Dashboard() {
  const { indianIndices, stockWatchlist, weather, newsArticles } = useJarvisStore();

  useEffect(() => {
    fetchIndianIndices();
    fetchStockWatchlist();
    fetchChennaiWeather();
    fetchLiveNews();
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Dynamic morning briefing
  const nifty = indianIndices.find(i => i.symbol === '^NSEI');
  const briefingParts = [];
  if (nifty) {
    const dir = nifty.changePercent >= 0 ? 'up' : 'down';
    briefingParts.push(`Nifty is ${dir} ${Math.abs(nifty.changePercent).toFixed(2)}% at ${nifty.price.toLocaleString('en-IN')}`);
  }
  if (weather) {
    briefingParts.push(`Chennai is ${weather.temp}°C with ${weather.condition}`);
  }
  briefingParts.push('You have 3 meetings today.');
  const briefing = `Good Morning, Sir. ${briefingParts.join('. ')}.`;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-end justify-between">
        <div>
          <h1 className="font-hud text-2xl tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">
            Good Morning, Sir
          </h1>
          <p className="text-jarvis-text-dim text-sm mt-1">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl text-jarvis-cyan glow-text-cyan">{timeStr}</p>
          <div className="flex items-center gap-2 justify-end mt-1">
            <Clock size={12} className="text-jarvis-text-dim" />
            <span className="font-mono text-xs text-jarvis-text-dim">SYSTEM ACTIVE</span>
          </div>
        </div>
      </motion.div>

      {/* ── Morning Briefing ── */}
      <motion.div variants={item} className="glass-card neon-border p-5 hud-corners">
        <div className="flex items-center gap-3 mb-3">
          <Activity size={16} className="text-jarvis-cyan" />
          <h2 className="font-hud text-xs tracking-[0.2em] text-jarvis-cyan uppercase">Morning Briefing</h2>
        </div>
        <p className="text-jarvis-text text-sm leading-relaxed">{briefing}</p>
      </motion.div>

      {/* ── Top Indices ── */}
      <motion.div variants={item}>
        <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-3">Market Indices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {indianIndices.length > 0 ? (
            indianIndices.map((index) => (
              <IndexCard key={index.symbol} data={index} compact />
            ))
          ) : (
            <>
              <div className="glass-card neon-border p-3 animate-pulse">
                <div className="h-3 bg-jarvis-border rounded w-20 mb-2" />
                <div className="h-6 bg-jarvis-border rounded w-28" />
              </div>
              <div className="glass-card neon-border p-3 animate-pulse">
                <div className="h-3 bg-jarvis-border rounded w-16 mb-2" />
                <div className="h-6 bg-jarvis-border rounded w-24" />
              </div>
              <div className="glass-card neon-border p-3 animate-pulse">
                <div className="h-3 bg-jarvis-border rounded w-24 mb-2" />
                <div className="h-6 bg-jarvis-border rounded w-20" />
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Stock Watchlist + Weather ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Watchlist ── */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-gold uppercase flex items-center gap-2">
              <TrendingUp size={14} className="text-jarvis-gold" /> Watchlist
            </h2>
            <a href="#/stocks" className="text-[0.65rem] text-jarvis-cyan/50 hover:text-jarvis-cyan flex items-center gap-1 transition-colors">
              View All <ArrowRight size={10} />
            </a>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stockWatchlist.length > 0 ? (
              stockWatchlist.slice(0, 5).map((stock) => (
                <StockCard key={stock.symbol} data={stock} compact />
              ))
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-card neon-border p-3 min-w-[140px] animate-pulse">
                  <div className="h-3 bg-jarvis-border rounded w-12 mb-2" />
                  <div className="h-4 bg-jarvis-border rounded w-16 mb-1" />
                  <div className="h-3 bg-jarvis-border rounded w-10" />
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* ── Weather Widget ── */}
        <motion.div variants={item}>
          <WeatherWidget />
        </motion.div>
      </div>

      {/* ── News + Habits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Recent News ── */}
        <motion.div variants={item} className="glass-card neon-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={14} className="text-jarvis-cyan" />
            <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">Top News</h2>
          </div>
          <div className="space-y-3">
            {newsArticles.length > 0 ? (
              newsArticles.slice(0, 5).map((article, i) => (
                <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group cursor-pointer no-underline">
                  <span className="font-mono text-xs text-jarvis-cyan/40 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="text-sm text-jarvis-text-dim group-hover:text-jarvis-text transition-colors leading-relaxed">{article.title}</p>
                    <p className="text-[0.6rem] text-jarvis-text-dim/40 mt-0.5 font-mono">{article.source} · {timeAgo(article.publishedAt)}</p>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-sm text-jarvis-text-dim/40">Loading news...</p>
            )}
          </div>
        </motion.div>

        {/* ── Daily Habits ── */}
        <motion.div variants={item} className="glass-card neon-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={14} className="text-jarvis-gold" />
            <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-gold uppercase">Daily Habits</h2>
          </div>
          <div className="space-y-3">
            {habitData.map((habit) => (
              <div key={habit.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${habit.completed ? 'bg-jarvis-cyan shadow-[0_0_6px_rgba(0,212,255,0.4)]' : 'border border-jarvis-border'}`} />
                  <span className={`text-sm ${habit.completed ? 'text-jarvis-text' : 'text-jarvis-text-dim'}`}>{habit.name}</span>
                </div>
                <span className="font-mono text-xs text-jarvis-gold">{habit.streak}d 🔥</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── System Status ── */}
      <motion.div variants={item} className="glass-card neon-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={14} className="text-jarvis-cyan" />
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">System Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Ollama', value: 'Connected', color: 'text-green-400' },
            { label: 'Model', value: 'Llama 3.2', color: 'text-jarvis-cyan' },
            { label: 'CPU', value: '23%', color: 'text-jarvis-cyan' },
            { label: 'Memory', value: '2.1GB', color: 'text-jarvis-gold' },
            { label: 'Uptime', value: '14h 32m', color: 'text-jarvis-text' },
            { label: 'Vault', value: 'Synced', color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-[0.65rem] text-jarvis-text-dim uppercase tracking-wider">{stat.label}</p>
              <p className={`font-mono text-sm ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
