'use client';

import React, { useEffect, useState } from 'react';
import type { HeadToHeadPoint } from '@/types/fpl';

interface HeadToHeadTrendChartProps {
  userId: number;
  rivalId: number;
  userName: string;
  rivalName: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 28;

// Hand-rolled SVG line chart (no charting dependency) so the install stays lightweight.
export const HeadToHeadTrendChart: React.FC<HeadToHeadTrendChartProps> = ({
  userId,
  rivalId,
  userName,
  rivalName,
}) => {
  const [points, setPoints] = useState<HeadToHeadPoint[]>([]);
  const [mode, setMode] = useState<'cumulative' | 'weekly'>('cumulative');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/history?userId=${userId}&rivalId=${rivalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPoints(data.points || []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, rivalId]);

  // Derived head-to-head match stats for Trophy Banner
  const h2hStats = React.useMemo(() => {
    let userWins = 0;
    let rivalWins = 0;
    let draws = 0;
    let biggestWin = 0;

    points.forEach((p) => {
      const margin = p.userPoints - p.rivalPoints;
      if (margin > 0) {
        userWins += 1;
        if (margin > biggestWin) biggestWin = margin;
      } else if (margin < 0) {
        rivalWins += 1;
      } else {
        draws += 1;
      }
    });

    return { userWins, rivalWins, draws, biggestWin, total: points.length };
  }, [points]);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <p className="text-xs text-slate-500 text-center py-10">Loading season history...</p>
      </div>
    );
  }

  if (points.length < 2) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <p className="text-xs text-slate-500 text-center py-10">Not enough shared gameweek history yet.</p>
      </div>
    );
  }

  const userSeries = points.map((p) => (mode === 'cumulative' ? p.userTotal : p.userPoints));
  const rivalSeries = points.map((p) => (mode === 'cumulative' ? p.rivalTotal : p.rivalPoints));
  const allValues = [...userSeries, ...rivalSeries];
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues, 0);
  const range = Math.max(1, maxVal - minVal);

  const toX = (idx: number) => PADDING + (idx / (points.length - 1)) * (WIDTH - PADDING * 2);
  const toY = (val: number) => HEIGHT - PADDING - ((val - minVal) / range) * (HEIGHT - PADDING * 2);

  const buildPath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

  const latest = points[points.length - 1];
  const leadLabel =
    latest.userTotal === latest.rivalTotal
      ? 'Tied overall'
      : latest.userTotal > latest.rivalTotal
      ? `${userName} leads by ${latest.userTotal - latest.rivalTotal}`
      : `${rivalName} leads by ${latest.rivalTotal - latest.userTotal}`;

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-xl font-black tracking-tight text-white">Head-to-Head Trend & Trophy Case</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{leadLabel}</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
          <button
            onClick={() => setMode('cumulative')}
            className={`rounded px-3 py-1 font-bold transition-all ${
              mode === 'cumulative' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setMode('weekly')}
            className={`rounded px-3 py-1 font-bold transition-all ${
              mode === 'weekly' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Per-GW
          </button>
        </div>
      </div>

      {/* Mini Trophy Record Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">H2H Gameweeks</span>
          <span className="text-sm font-mono font-bold text-white">
            <span className="text-cyan-400">{h2hStats.userWins}W</span> - <span className="text-slate-400">{h2hStats.draws}D</span> - <span className="text-rose-400">{h2hStats.rivalWins}L</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Win Rate</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {h2hStats.total > 0 ? Math.round((h2hStats.userWins / h2hStats.total) * 100) : 0}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Biggest Win</span>
          <span className="text-sm font-mono font-bold text-cyan-400">
            +{h2hStats.biggestWin} pts
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Dominance</span>
          <span className="text-xs font-bold text-slate-200">
            {h2hStats.userWins > h2hStats.rivalWins ? '👑 You lead H2H' : h2hStats.userWins === h2hStats.rivalWins ? '🤝 Dead heat' : '⚠️ Rival leads H2H'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span className="h-2 w-2 rounded-full bg-cyan-400" /> {userName}
        </span>
        <span className="flex items-center gap-1.5 text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-400" /> {rivalName}
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Head-to-head trend chart">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PADDING}
            x2={WIDTH - PADDING}
            y1={PADDING + t * (HEIGHT - PADDING * 2)}
            y2={PADDING + t * (HEIGHT - PADDING * 2)}
            stroke="#1e293b"
            strokeWidth={1}
          />
        ))}
        <path d={buildPath(rivalSeries)} fill="none" stroke="#fb7185" strokeWidth={2.5} />
        <path d={buildPath(userSeries)} fill="none" stroke="#22d3ee" strokeWidth={2.5} />
        {points.map((p, i) => (
          <g key={p.event}>
            <circle cx={toX(i)} cy={toY(userSeries[i])} r={2.5} fill="#22d3ee" />
            <circle cx={toX(i)} cy={toY(rivalSeries[i])} r={2.5} fill="#fb7185" />
          </g>
        ))}
        {points
          .filter((_, i) => i % Math.ceil(points.length / 10 || 1) === 0)
          .map((p) => (
            <text
              key={`label-${p.event}`}
              x={toX(points.indexOf(p))}
              y={HEIGHT - 6}
              fontSize={9}
              fill="#64748b"
              textAnchor="middle"
            >
              GW{p.event}
            </text>
          ))}
      </svg>
    </div>
  );
};
