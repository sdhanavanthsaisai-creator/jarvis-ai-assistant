// src/components/IndexCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockQuote } from '../lib/types';

interface IndexCardProps {
  data: StockQuote;
  compact?: boolean;
}

export default function IndexCard({ data, compact = false }: IndexCardProps) {
  const isUp = data.changePercent >= 0;

  return (
    <div className={`glass-card neon-border p-4 ${compact ? 'py-3' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-hud text-[0.65rem] tracking-[0.15em] text-jarvis-cyan uppercase">
          {data.name}
        </h3>
        <div className={`flex items-center gap-1 font-mono text-xs ${isUp ? 'text-green-400' : 'text-jarvis-arc'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isUp ? '+' : ''}{data.changePercent}%
        </div>
      </div>

      <p className={`font-mono ${compact ? 'text-lg' : 'text-2xl'} text-jarvis-text`}>
        {data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>

      {!compact && (
        <div className="flex items-center gap-3 mt-2 text-[0.6rem] font-mono text-jarvis-text-dim">
          <span>H: {data.dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span>L: {data.dayLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      )}


    </div>
  );
}
