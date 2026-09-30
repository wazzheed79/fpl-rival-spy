'use client';

import React, { useMemo, useState } from 'react';
import {
  CandidatePlayer,
  SquadPlayer,
  generateLeapfrogRecommendations,
  LeapfrogTransferRecommendation,
} from '@/lib/leapfrog';

interface LeapfrogEngineProps {
  squad: SquadPlayer[];
  playerPool: CandidatePlayer[];
  bank: number;
  userTotalPoints: number;
  rivalTotalPoints: number;
  currentGw: number;
  rivalPicksIds: number[];
}

const POSITION_LABELS: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const LeapfrogEngine: React.FC<LeapfrogEngineProps> = ({
  squad,
  playerPool,
  bank,
  userTotalPoints,
  rivalTotalPoints,
  currentGw,
  rivalPicksIds,
}) => {
  // Determine natural default mode based on standings:
  // If user is behind, default to CHASING; if user is ahead, default to DEFENDING
  const pointMargin = userTotalPoints - rivalTotalPoints;
  const isNaturallyChasing = pointMargin < 0;

  const [mode, setMode] = useState<'CHASING' | 'DEFENDING'>(
    isNaturallyChasing ? 'CHASING' : 'DEFENDING'
  );
  const [maxFdr, setMaxFdr] = useState<number>(2.6);
  const [zeroOwnershipOnly, setZeroOwnershipOnly] = useState<boolean>(true);

  // Sync mode if rival selection changes
  React.useEffect(() => {
    setMode(pointMargin < 0 ? 'CHASING' : 'DEFENDING');
  }, [userTotalPoints, rivalTotalPoints]);

  const remainingGws = Math.max(1, 38 - currentGw);
  const deficit = Math.abs(pointMargin);
  const weeklyTarget = Number((deficit / remainingGws).toFixed(1));

  const rivalPlayerIdSet = useMemo(() => new Set(rivalPicksIds), [rivalPicksIds]);

  const recommendations = useMemo(() => {
    return generateLeapfrogRecommendations(
      squad,
      playerPool,
      bank,
      rivalPlayerIdSet,
      {
        mode,
        deficitOrLead: pointMargin,
        remainingGws,
        maxFdr,
        enforceZeroLocalOwnership: zeroOwnershipOnly,
      }
    );
  }, [squad, playerPool, bank, rivalPlayerIdSet, mode, pointMargin, remainingGws, maxFdr, zeroOwnershipOnly]);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Header and Tactical Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-3 w-3 rounded-full ${
                mode === 'CHASING' ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <h2 className="text-xl font-black tracking-tight text-white">
              ⚡ Leapfrog Transfer Engine
            </h2>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                mode === 'CHASING'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {mode} MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'CHASING'
              ? `You trail by ${deficit} pts. Field differential weapons to claw back +${weeklyTarget} pts/GW over the next${remainingGws} gameweeks.`
              : `You lead by +${pointMargin} pts. Recommend block transfers to eliminate your rival's comeback avenues.`}
          </p>
        </div>

        {/* Tactical Controls & Mode Switch */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setMode('CHASING')}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                mode === 'CHASING'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 Chasing ({deficit > 0 ? `-${deficit}` : '0'})
            </button>
            <button
              onClick={() => setMode('DEFENDING')}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                mode === 'DEFENDING'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛡️️ Defending ({pointMargin > 0 ? `+${pointMargin}` : '0'})
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <span>Bank:</span>
            <span className="font-mono font-bold text-emerald-400">£{bank.toFixed(1)}m</span>
          </div>

          {mode === 'CHASING' && (
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:border-slate-700">
              <input
                type="checkbox"
                checked={zeroOwnershipOnly}
                onChange={(e) => setZeroOwnershipOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>0% Local Only</span>
            </label>
          )}

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <span>Max FDR:</span>
            <select
              value={maxFdr}
              onChange={(e) => setMaxFdr(parseFloat(e.target.value))}
              className="bg-transparent font-bold text-cyan-400 outline-none cursor-pointer"
            >
              <option value="2.3" className="bg-slate-900 text-white">≤ 2.3</option>
              <option value="2.6" className="bg-slate-900 text-white">≤ 2.6</option>
              <option value="3.0" className="bg-slate-900 text-white">≤ 3.0</option>
            </select>
          </div>
        </div>
      </div>

      {/* Target Run-Rate Callout (for Chasing) */}
      {mode === 'CHASING' && deficit > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-2.5 text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <span>📈</span>
            <span>
              Target Catch-Up Velocity: <b className="text-white">+{weeklyTarget} pts/GW</b> needed across the remaining <b className="text-white">{remainingGws} gameweeks</b>.
            </span>
          </div>
          <span className="font-mono font-bold text-cyan-400">
            Est. Differentials Needed: {weeklyTarget >= 4.0 ? '2-3 Weapons' : '1-2 Weapons'}
          </span>
        </div>
      )}

      {/* Recommendations Cards Grid */}
      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
          <p className="text-sm font-medium text-slate-400">
            {mode === 'DEFENDING'
              ? 'No immediate high-threat block targets found. Your rival owns no in-form differentials outside your squad.'
              : 'No differential targets match the current budget and FDR constraints.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting the Max FDR filter or switching tactical modes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <TransferCard key={`${rec.sell.id}-${rec.buy.id}-${idx}`} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
};

const TransferCard: React.FC<{ rec: LeapfrogTransferRecommendation }> = ({ rec }) => {
  const { type, sell, buy, deltaForm, deltaFdr, costDifference, netImpactScore, strategicNote } = rec;

  const isBlock = type === 'BLOCK_SHIELD';

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-150 shadow-lg ${
        isBlock
          ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-400'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
              {POSITION_LABELS[sell.elementType]}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                isBlock
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              }`}
            >
              {isBlock ? '🛡️ Rival Block' : '⚡ Differential'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Impact
            </span>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-xs font-black text-cyan-400 border border-cyan-500/30">
              +{netImpactScore}
            </span>
          </div>
        </div>

        {/* Sell vs Buy Comparison Rows */}
        <div className="space-y-3">
          {/* Outgoing Asset */}
          <div className="flex items-center justify-between rounded-lg bg-rose-950/20 border border-rose-900/30 p-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase">Sell</span>
                <span className="text-xs font-bold text-white">{sell.webName}</span>
                <span className="text-[10px] text-slate-400 font-medium">({sell.teamShort})</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex gap-2 font-mono">
                <span>Form: {sell.form}</span>
                <span>FDR: {sell.fdrNext3Avg.toFixed(1)}</span>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-300">
              £{sell.sellingPrice.toFixed(1)}m
            </span>
          </div>

          {/* Incoming Weapon or Block */}
          <div className="flex items-center justify-between rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Buy</span>
                <span className="text-xs font-bold text-white">{buy.webName}</span>
                <span className="text-[10px] text-slate-400 font-medium">({buy.teamShort})</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex gap-2 font-mono">
                <span>Form: <b className="text-emerald-400">{buy.form}</b></span>
                <span>FDR: <b className="text-emerald-400">{buy.fdrNext3Avg.toFixed(1)}</b></span>
                <span>xGI: {buy.xgi.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-semibold text-slate-300 block">
                £{buy.cost.toFixed(1)}m
              </span>
              <span
                className={`text-[9px] font-bold uppercase px-1 rounded border ${
                  isBlock
                    ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                    : 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40'
                }`}
              >
                {isBlock ? 'Owned By Rival' : '0% Mini-League'}
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Strategic Note */}
        <p className="mt-3 text-[11px] text-slate-400 leading-tight">
          💡 {strategicNote}
        </p>
      </div>

      {/* Delta Metrics Summary */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div>
          <span>Form Swing: </span>
          <span className="font-bold text-emerald-400">+{deltaForm}</span>
        </div>
        <div>
          <span>FDR Relief: </span>
          <span className={`font-bold ${deltaFdr < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {deltaFdr > 0 ? `+${deltaFdr}` : deltaFdr}
          </span>
        </div>
        <div>
          <span>Cost: </span>
          <span className={costDifference > 0 ? 'text-amber-400' : 'text-emerald-400'}>
            {costDifference > 0 ? `+£${costDifference}m` : `£${costDifference}m`}
          </span>
        </div>
      </div>
    </div>
  );
};
