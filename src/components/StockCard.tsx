// src/components/StockCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import type { StockQuote } from '../lib/types';

interface StockCardProps {
  data: StockQuote;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function StockCard({ data, selected = false, onClick, compact = false }: StockCardProps) {
  const isUp = data.changePercent >= 0;

  return (
    <button
      onClick={onClick}
      className={`glass-card p-3 text-left transition-all cursor-pointer ${
        selected
          ? 'neon-border border-jarvis-cyan/40'
          : 'neon-border hover:border-jarvis-cyan/30'
      } ${compact ? 'min-w-[140px]' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-jarvis-text font-medium">{data.symbol.replace('.NS', '')}</span>
        <Star size={10} className="text-jarvis-gold/30" />
      </div>

      <p className="font-mono text-sm text-jarvis-text">
        ₹{data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>

      <div className={`flex items-center gap-1 mt-1 font-mono text-xs ${isUp ? 'text-green-400' : 'text-jarvis-arc'}`}>
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? '+' : ''}{data.changePercent}%
      </div>
    </button>
  );
}
