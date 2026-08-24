// src/components/StockCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockQuote } from '../lib/types';

interface StockCardProps {
  data: StockQuote;
  compact?: boolean;
}

export default function StockCard({ data, compact = false }: StockCardProps) {
  const isUp = data.changePercent >= 0;

  return (
    <div className={`glass-card neon-border p-3 ${compact ? 'min-w-[140px]' : ''}`}>
      <span className="font-mono text-xs text-jarvis-text font-medium">{data.symbol.replace('.NS', '')}</span>

      <p className="font-mono text-sm text-jarvis-text mt-1">
        ₹{data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>

      <div className={`flex items-center gap-1 mt-1 font-mono text-xs ${isUp ? 'text-green-400' : 'text-jarvis-arc'}`}>
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? '+' : ''}{data.changePercent}%
      </div>
    </div>
  );
}
