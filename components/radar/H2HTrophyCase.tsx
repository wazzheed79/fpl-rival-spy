'use client';

import React, { useMemo } from 'react';
import type { HeadToHeadPoint } from '@/types/fpl';

interface H2HTrophyCaseProps {
  points: HeadToHeadPoint[];
  userName: string;
  rivalName: string;
}

export const H2HTrophyCase: React.FC<H2HTrophyCaseProps> = ({
  points,
  userName,
  rivalName,
}) => {
  const stats = useMemo(() => {
    let userWins = 0;
    let rivalWins = 0;
    let draws = 0;
    let biggestWinMargin = 0;
    let biggestLossMargin = 0;
    let userTotalPoints = 0;
    let rivalTotalPoints = 0;

    points.forEach((p) => {
      userTotalPoints += p.userPoints;
      rivalTotalPoints += p.rivalPoints;
      const margin = p.userPoints - p.rivalPoints;

      if (margin > 0) {
        userWins += 1;
        if (margin > biggestWinMargin) biggestWinMargin = margin;
      } else if (margin < 0) {
        rivalWins += 1;
        if (Math.abs(margin) > biggestLossMargin) biggestLossMargin = Math.abs(margin);
      } else {
        draws += 1;
      }
    });

    const totalGames = points.length;
    const winRate = totalGames > 0 ? Math.round((userWins / totalGames) * 100) : 0;
    const avgMargin = totalGames > 0 ? Number(((userTotalPoints - rivalTotalPoints) / totalGames).toFixed(1)) : 0;

    return {
      totalGames,
      userWins,
      rivalWins,
      draws,
      winRate,
      biggestWinMargin,
      biggestLossMargin,
      avgMargin,
      userTotalPoints,
      rivalTotalPoints,
    };
  }, [points]);

  if (points.length < 1) {
    return null;
  }

  const isDominating = stats.userWins > stats.rivalWins;
  const isDeadHeat = stats.userWins === stats.rivalWins;

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Head-to-Head Trophy Case & Rivalry Record
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Season-long head-to-head match outcomes and rivalry dominance statistics.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs">
          <span className="text-slate-400">Verdict:</span>
          <span
            className={`font-black ${
              isDominating
                ? 'text-cyan-400'
                : isDeadHeat
                ? 'text-slate-300'
                : 'text-rose-400'
            }`}
          >
            {isDominating ? '👑 YOU HOLD THE HEAD-TO-HEAD CROWN' : isDeadHeat ? '🤝 DEAD HEAT RIVALRY' : '⚠️ RIVAL HAS THE ADVANTAGE'}
          </span>
        </div>
      </div>

      {/* Trophy / Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Match Record (W-D-L)
          </span>
          <div className="text-2xl font-mono font-black text-white">
            <span className="text-cyan-400">{stats.userWins}</span> -{' '}
            <span className="text-slate-400">{stats.draws}</span> -{' '}
            <span className="text-rose-400">{stats.rivalWins}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block">
            Across {stats.totalGames} Gameweeks
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Win Percentage
          </span>
          <div className="text-2xl font-mono font-black text-emerald-400">
            {stats.winRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block">
            {stats.userWins} gameweeks claimed
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Biggest Massacre
          </span>
          <div className="text-2xl font-mono font-black text-cyan-400">
            +{stats.biggestWinMargin} <span className="text-xs font-sans text-slate-400 font-normal">pts</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block">
            Your top single GW blowout
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Average Weekly Margin
          </span>
          <div
            className={`text-2xl font-mono font-black ${
              stats.avgMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.avgMargin >= 0 ? `+${stats.avgMargin}` : stats.avgMargin}{' '}
            <span className="text-xs font-sans text-slate-400 font-normal">pts/gw</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block">
            Aggregate points difference
          </span>
        </div>
      </div>
    </div>
  );
};
