import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Search, FileText, Clock, Tag, Grid, List } from 'lucide-react';

// ══════════════════════════════════════════════════════
// FILES PAGE — Search & Organize
// ══════════════════════════════════════════════════════

const recentFiles = [
  { name: 'Project Roadmap Q1.md', path: '/vault/projects/', modified: '2h ago', size: '4.2 KB', tags: ['project', 'planning'] },
  { name: 'Meeting Notes - Jan 15.md', path: '/vault/meetings/', modified: '1d ago', size: '8.1 KB', tags: ['meeting'] },
  { name: 'API Design Spec.md', path: '/vault/docs/', modified: '2d ago', size: '12.3 KB', tags: ['technical', 'api'] },
  { name: 'Daily Journal - Week 3.md', path: '/vault/journal/', modified: '3d ago', size: '6.7 KB', tags: ['personal', 'journal'] },
  { name: 'Investment Thesis.md', path: '/vault/finance/', modified: '5d ago', size: '3.4 KB', tags: ['finance'] },
  { name: 'Recipe Collection.md', path: '/vault/personal/', modified: '1w ago', size: '15.2 KB', tags: ['personal'] },
];

export default function Files() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredFiles = searchQuery
    ? recentFiles.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.tags.some((t) => t.includes(searchQuery.toLowerCase()))
      )
    : recentFiles;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen size={20} className="text-jarvis-cyan" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">Files</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-mono text-jarvis-text-dim flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Vault Synced
          </span>
        </div>
      </div>

      {/* ── Search + Controls ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, tags, content..."
            className="w-full bg-jarvis-bg-elevated border border-jarvis-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-jarvis-text placeholder:text-jarvis-text-dim/50 focus:outline-none focus:border-jarvis-cyan/40 focus:shadow-[0_0_15px_rgba(0,212,255,0.1)] transition-all"
          />
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          className="btn-hud text-xs"
        >
          {viewMode === 'list' ? <Grid size={14} /> : <List size={14} />}
        </button>
      </div>

      {/* ── File List ── */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredFiles.map((file, i) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card neon-border p-4 flex items-center gap-4 group cursor-pointer hover:border-jarvis-cyan/40 transition-all"
              >
                <FileText size={20} className="text-jarvis-cyan/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-jarvis-text group-hover:text-jarvis-cyan transition-colors truncate">{file.name}</p>
                  <p className="text-[0.65rem] text-jarvis-text-dim font-mono truncate">{file.path}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {file.tags.map((tag) => (
                    <span key={tag} className="text-[0.6rem] font-mono px-2 py-0.5 rounded bg-jarvis-cyan/5 text-jarvis-cyan/50 border border-jarvis-cyan/10">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[0.65rem] font-mono text-jarvis-text-dim flex-shrink-0 w-16 text-right">{file.size}</span>
                <span className="text-[0.65rem] font-mono text-jarvis-text-dim/50 flex items-center gap-1 flex-shrink-0 w-16">
                  <Clock size={10} /> {file.modified}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file, i) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card neon-border p-4 cursor-pointer hover:border-jarvis-cyan/40 transition-all"
              >
                <FileText size={24} className="text-jarvis-cyan/30 mb-3" />
                <p className="text-sm text-jarvis-text truncate mb-1">{file.name}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {file.tags.map((tag) => (
                    <span key={tag} className="text-[0.55rem] font-mono px-1.5 py-0.5 rounded bg-jarvis-cyan/5 text-jarvis-cyan/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
