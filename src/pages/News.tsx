import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, RefreshCw, Filter } from 'lucide-react';

// ══════════════════════════════════════════════════════
// NEWS PAGE — AI-Curated Feed
// ══════════════════════════════════════════════════════

const categories = ['All', 'Tech', 'Finance', 'Science', 'World', 'AI'];

const articles = [
  {
    id: 1,
    title: 'Apple Unveils M4 Ultra: 80-Core GPU Redefines Desktop Performance',
    source: 'TechCrunch',
    time: '2h ago',
    category: 'Tech',
    summary: 'The new M4 Ultra chip features 32 performance cores and 80 GPU cores, targeting professional workflows and AI development.',
    sentiment: 'positive' as const,
  },
  {
    id: 2,
    title: 'Federal Reserve Signals Rate Pause Through Q1 2025',
    source: 'Reuters',
    time: '3h ago',
    category: 'Finance',
    summary: 'Fed Chair Jerome Powell indicated that current economic data supports maintaining the federal funds rate at current levels.',
    sentiment: 'neutral' as const,
  },
  {
    id: 3,
    title: 'SpaceX Starship Completes 6th Orbital Flight Test Successfully',
    source: 'Space.com',
    time: '4h ago',
    category: 'Science',
    summary: 'Starship successfully reached orbit and performed a controlled reentry, marking a major milestone for Mars mission preparation.',
    sentiment: 'positive' as const,
  },
  {
    id: 4,
    title: 'OpenAI Announces GPT-5 with Reasoning Capabilities',
    source: 'The Verge',
    time: '5h ago',
    category: 'AI',
    summary: 'The latest model demonstrates significant improvements in multi-step reasoning, code generation, and factual accuracy.',
    sentiment: 'positive' as const,
  },
  {
    id: 5,
    title: 'EU Passes Comprehensive AI Regulation Framework',
    source: 'BBC News',
    time: '6h ago',
    category: 'World',
    summary: 'The European Parliament voted to implement strict guidelines for AI development and deployment across member states.',
    sentiment: 'neutral' as const,
  },
  {
    id: 6,
    title: 'NVIDIA Surpasses $2 Trillion Market Cap on AI Demand',
    source: 'Bloomberg',
    time: '7h ago',
    category: 'Finance',
    summary: 'NVIDIA stock surged as demand for AI chips continues to outpace supply, with data center revenue up 400% YoY.',
    sentiment: 'positive' as const,
  },
];

export default function News() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredArticles = activeCategory === 'All'
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper size={20} className="text-jarvis-cyan" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">News Feed</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-hud text-xs">
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-hud text-xs">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredArticles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card neon-border p-5 group cursor-pointer hover:border-jarvis-cyan/40 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.65rem] font-mono text-jarvis-cyan/60 uppercase tracking-wider">{article.category}</span>
                <span className="text-[0.6rem] font-mono text-jarvis-text-dim">{article.time}</span>
              </div>
              <h3 className="text-sm font-semibold text-jarvis-text group-hover:text-jarvis-cyan transition-colors leading-relaxed mb-2">
                {article.title}
              </h3>
              <p className="text-xs text-jarvis-text-dim leading-relaxed mb-3">{article.summary}</p>
              <div className="flex items-center justify-between">
                <span className="text-[0.6rem] font-mono text-jarvis-text-dim/60">{article.source}</span>
                <ExternalLink size={12} className="text-jarvis-text-dim/30 group-hover:text-jarvis-cyan/60 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
