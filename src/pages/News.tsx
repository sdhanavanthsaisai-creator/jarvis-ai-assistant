import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { useJarvisStore } from '../lib/store';
import { fetchLiveNews, timeAgo } from '../lib/api';

// ══════════════════════════════════════════════════════
// NEWS PAGE — Live RSS Feed
// ══════════════════════════════════════════════════════

const categories = ['All', 'Tech', 'World', 'India', 'Finance', 'Science'];

const CATEGORY_COLORS: Record<string, string> = {
  Tech: 'text-jarvis-cyan',
  World: 'text-jarvis-gold',
  India: 'text-orange-400',
  Finance: 'text-green-400',
  Science: 'text-purple-400',
};

export default function News() {
  const { newsArticles, newsLoading } = useJarvisStore();
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchLiveNews();
  }, []);

  const filtered = activeCategory === 'All'
    ? newsArticles
    : newsArticles.filter((a) => a.category === activeCategory);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper size={20} className="text-jarvis-cyan" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">
            Live News Feed
          </h1>
          {newsLoading && <Loader2 size={14} className="text-jarvis-cyan animate-spin" />}
        </div>
        <button
          onClick={fetchLiveNews}
          disabled={newsLoading}
          className="btn-hud text-xs disabled:opacity-40"
        >
          <RefreshCw size={14} className={newsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              activeCategory === cat
                ? 'bg-jarvis-cyan/15 border border-jarvis-cyan/40 text-jarvis-cyan'
                : 'border border-jarvis-border text-jarvis-text-dim hover:text-jarvis-text hover:border-jarvis-text-dim'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Articles Grid ── */}
      <div className="flex-1 overflow-y-auto">
        {newsArticles.length === 0 && !newsLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-jarvis-text-dim text-sm">No news loaded. Click Refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((article, i) => (
              <motion.a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card neon-border p-5 group cursor-pointer hover:border-jarvis-cyan/40 transition-all block no-underline"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[0.65rem] font-mono uppercase tracking-wider ${CATEGORY_COLORS[article.category] || 'text-jarvis-cyan/60'}`}>
                    {article.category}
                  </span>
                  <span className="text-[0.6rem] font-mono text-jarvis-text-dim">
                    {timeAgo(article.publishedAt)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-jarvis-text group-hover:text-jarvis-cyan transition-colors leading-relaxed mb-2">
                  {article.title}
                </h3>
                {article.summary && (
                  <p className="text-xs text-jarvis-text-dim leading-relaxed mb-3 line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] font-mono text-jarvis-text-dim/60">{article.source}</span>
                  <ExternalLink size={12} className="text-jarvis-text-dim/30 group-hover:text-jarvis-cyan/60 transition-colors" />
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
