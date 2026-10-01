'use client';

import React from 'react';
import { RankSwingForecast as ForecastData } from '@/lib/rankSwing';

interface RankSwingForecastProps {
  forecast: ForecastData;
  userName: string;
  rivalName: string;
  remainingGws: number;
}

// Tailwind only picks up fully-static class names, so every color variant is spelled out
// literally here rather than built via template-literal interpolation.
const TREND_STYLES: Record<ForecastData['trend'], { badgeClass: string; icon: string }> = {
  USER_PULLING_AWAY: { badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: '🚀' },
  USER_CLOSING_GAP: { badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: '📈' },
  RIVAL_PULLING_AWAY: { badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: '⚠️' },
  RIVAL_CLOSING_GAP: { badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: '👀' },
  STABLE: { badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/40', icon: '⚖️' },
};

export const RankSwingForecast: React.FC<RankSwingForecastProps> = ({
  forecast,
  userName,
  rivalName,
  remainingGws,
}) => {
  const { userExpectedPerGw, rivalExpectedPerGw, swingPerGw, projectedMarginIn5Gws, trend, narrative } = forecast;
  const style = TREND_STYLES[trend];

  const maxBar = Math.max(userExpectedPerGw, rivalExpectedPerGw, 1);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.icon}</span>
          <h2 className="text-xl font-black tracking-tight text-white">Predictive Rank-Swing Model</h2>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${style.badgeClass}`}
        >
          {trend.replaceAll('_', ' ')}
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{narrative}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ExpectedBar label={userName} value={userExpectedPerGw} max={maxBar} color="cyan" />
        <ExpectedBar label={rivalName} value={rivalExpectedPerGw} max={maxBar} color="rose" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <StatTile
          label="Swing / GW"
          value={`${swingPerGw > 0 ? '+' : ''}${swingPerGw}`}
          sub="Current form & fixtures"
          positive={swingPerGw >= 0}
        />
        <StatTile
          label={`Margin in 5 GWs`}
          value={`${projectedMarginIn5Gws > 0 ? '+' : ''}${projectedMarginIn5Gws}`}
          sub={`Projected over ${Math.min(5, remainingGws)} gameweeks`}
          positive={projectedMarginIn5Gws >= 0}
        />
      </div>
    </div>
  );
};

const BAR_STYLES: Record<'cyan' | 'rose', { label: string; gradient: string }> = {
  cyan: { label: 'text-cyan-400', gradient: 'bg-gradient-to-r from-cyan-500 to-cyan-400' },
  rose: { label: 'text-rose-400', gradient: 'bg-gradient-to-r from-rose-500 to-rose-400' },
};

const ExpectedBar: React.FC<{ label: string; value: number; max: number; color: 'cyan' | 'rose' }> = ({
  label,
  value,
  max,
  color,
}) => {
  const widthPct = Math.min(100, (value / max) * 100);
  const styles = BAR_STYLES[color];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${styles.label}`}>{label}</span>
        <span className="font-mono text-sm font-black text-white">{value} pts/GW</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${styles.gradient}`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: string; sub: string; positive: boolean }> = ({
  label,
  value,
  sub,
  positive,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <div className={`text-lg font-black mt-1 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{value}</div>
    <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
  </div>
);
