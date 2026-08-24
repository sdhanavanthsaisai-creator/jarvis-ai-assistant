// src/pages/Stocks.tsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, Plus, RefreshCw } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { fetchIndianIndices, fetchSectorIndices, fetchStockWatchlist } from '../lib/api';
import IndexCard from '../components/IndexCard';
import StockCard from '../components/StockCard';

// ══════════════════════════════════════════════════════
// INDIAN STOCKS PAGE
// ══════════════════════════════════════════════════════

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function Stocks() {
  const { indianIndices, sectorIndices, stockWatchlist, stockMarketStatus } = useJarvisStore();

  useEffect(() => {
    fetchIndianIndices();
    fetchSectorIndices();
    fetchStockWatchlist();
  }, []);

  const marketStatusColors: Record<string, string> = {
    open: 'text-green-400',
    closed: 'text-jarvis-text-dim',
    'pre-market': 'text-jarvis-gold',
    'post-market': 'text-jarvis-cyan',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-jarvis-gold" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-gold uppercase glow-text-gold">Indian Stocks</h1>
          <span className={`font-mono text-[0.6rem] uppercase tracking-wider ${marketStatusColors[stockMarketStatus] || 'text-jarvis-text-dim'}`}>
            ● {stockMarketStatus.replace('-', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-text-dim" />
            <input
              type="text"
              placeholder="Search symbol..."
              className="bg-jarvis-bg-elevated border border-jarvis-border rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-jarvis-text placeholder:text-jarvis-text-dim/50 focus:outline-none focus:border-jarvis-gold/40 w-48"
            />
          </div>
          <button className="btn-hud btn-hud-gold text-xs">
            <Plus size={14} /> Add
          </button>
          <button
            onClick={() => { fetchIndianIndices(); fetchSectorIndices(); fetchStockWatchlist(); }}
            className="btn-hud text-xs"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Major Indices ── */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indianIndices.length > 0 ? (
          indianIndices.map((index) => (
            <IndexCard key={index.symbol} data={index} />
          ))
        ) : (
          <>
            <div className="glass-card neon-border p-4 animate-pulse">
              <div className="h-3 bg-jarvis-border rounded w-20 mb-3" />
              <div className="h-7 bg-jarvis-border rounded w-32 mb-2" />
              <div className="h-3 bg-jarvis-border rounded w-16" />
            </div>
            <div className="glass-card neon-border p-4 animate-pulse">
              <div className="h-3 bg-jarvis-border rounded w-16 mb-3" />
              <div className="h-7 bg-jarvis-border rounded w-28 mb-2" />
              <div className="h-3 bg-jarvis-border rounded w-14" />
            </div>
            <div className="glass-card neon-border p-4 animate-pulse">
              <div className="h-3 bg-jarvis-border rounded w-24 mb-3" />
              <div className="h-7 bg-jarvis-border rounded w-30 mb-2" />
              <div className="h-3 bg-jarvis-border rounded w-18" />
            </div>
          </>
        )}
      </motion.div>

      {/* ── Watchlist ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">Watchlist</h2>
          <a href="#/stocks" className="text-[0.65rem] text-jarvis-cyan/50 hover:text-jarvis-cyan transition-colors">View All →</a>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stockWatchlist.length > 0 ? (
            stockWatchlist.map((stock) => (
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

      {/* ── Sector Indices ── */}
      <motion.div variants={item}>
        <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase mb-3">Sector Indices</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sectorIndices.length > 0 ? (
            sectorIndices.map((sector) => (
              <IndexCard key={sector.symbol} data={sector} compact />
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card neon-border p-3 animate-pulse">
                <div className="h-3 bg-jarvis-border rounded w-16 mb-2" />
                <div className="h-5 bg-jarvis-border rounded w-20 mb-1" />
                <div className="h-3 bg-jarvis-border rounded w-10" />
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
