'use client';

import React, { useMemo } from 'react';
import { ManagerSummary, EnrichedPlayer } from '@/types/fpl';
import { CandidatePlayer } from '@/lib/leapfrog';

interface RivalTransferPredictorProps {
  rival: ManagerSummary;
  user: ManagerSummary;
  marketPool: CandidatePlayer[];
  currentGw: number;
}

export interface PredictedTransferScenario {
  id: string;
  playerOut: EnrichedPlayer;
  playerIn: CandidatePlayer;
  likelihood: 'VERY HIGH' | 'HIGH' | 'MODERATE';
  reason: string;
  costDiff: number;
  tacticalImpact: 'DANGER_FOR_YOU' | 'BLOCK_TARGET' | 'NEUTRAL';
}

export const RivalTransferPredictor: React.FC<RivalTransferPredictorProps> = ({
  rival,
  user,
  marketPool,
  currentGw,
}) => {
  const userPicksIds = useMemo(() => new Set(user.picks.map((p) => p.id)), [user.picks]);

  const predictions = useMemo(() => {
    const list: PredictedTransferScenario[] = [];
    const rivalSquad = rival.picks;
    const rivalBank = rival.bank;

    // 1. Identify potential SELL candidates in rival squad
    // Candidates are:
    // - Low form outfielders
    // - High cost bench players or starters underperforming
    // - Players with tough upcoming fixture average
    const outCandidates = rivalSquad
      .map((p) => {
        const poolInfo = marketPool.find((m) => m.id === p.id);
        const form = poolInfo?.form ?? 3.0;
        const fdr = poolInfo?.fdrNext3Avg ?? 3.0;
        const cost = poolInfo?.cost ?? 5.5;

        // Sell urgency score (higher = more likely rival wants to ship them out)
        let sellScore = 0;
        if (form < 2.5) sellScore += 3;
        if (fdr >= 3.7) sellScore += 2;
        if (!p.isStarter && cost >= 5.5) sellScore += 2; // bench funds locked up

        return {
          player: p,
          form,
          fdr,
          cost,
          sellScore,
        };
      })
      .filter((c) => c.sellScore >= 2)
      .sort((a, b) => b.sellScore - a.sellScore)
      .slice(0, 3); // top 3 potential outs

    // 2. Identify BUY targets for rival within budget (cost <= sellCandidate.cost + rivalBank)
    // Filter hot players in the market who are in the same element_type
    outCandidates.forEach((out) => {
      const maxBudget = Number((out.cost + rivalBank).toFixed(1));

      const buyTargets = marketPool
        .filter(
          (m) =>
            m.elementType === out.player.elementType &&
            m.id !== out.player.id &&
            !rivalSquad.some((rp) => rp.id === m.id) &&
            m.cost <= maxBudget &&
            m.form >= 4.0
        )
        .sort((a, b) => {
          // Sort by form, then favorable FDR
          const scoreA = a.form * 2 - a.fdrNext3Avg;
          const scoreB = b.form * 2 - b.fdrNext3Avg;
          return scoreB - scoreA;
        })
        .slice(0, 2);

      buyTargets.forEach((inCandidate) => {
        let likelihood: 'VERY HIGH' | 'HIGH' | 'MODERATE' = 'MODERATE';
        if (inCandidate.form >= 6.0 && inCandidate.fdrNext3Avg <= 2.8) {
          likelihood = 'VERY HIGH';
        } else if (inCandidate.form >= 4.5) {
          likelihood = 'HIGH';
        }

        const isUserOwned = userPicksIds.has(inCandidate.id);
        const tacticalImpact: 'DANGER_FOR_YOU' | 'BLOCK_TARGET' | 'NEUTRAL' = isUserOwned
          ? 'BLOCK_TARGET'
          : inCandidate.localOwnershipPct > 20
          ? 'DANGER_FOR_YOU'
          : 'NEUTRAL';

        const reasons: string[] = [];
        if (out.form < 2.5) reasons.push(`${out.player.webName} form slumping (${out.form})`);
        if (out.fdr >= 3.7) reasons.push(`tough fixture run`);
        if (inCandidate.form >= 5.0) reasons.push(`${inCandidate.webName} in blistering form (${inCandidate.form})`);
        if (inCandidate.fdrNext3Avg <= 2.5) reasons.push(`sweet FDR run (${inCandidate.fdrNext3Avg})`);

        list.push({
          id: `${out.player.id}->${inCandidate.id}`,
          playerOut: out.player,
          playerIn: inCandidate,
          likelihood,
          reason: reasons.join(' & '),
          costDiff: Number((inCandidate.cost - out.cost).toFixed(1)),
          tacticalImpact,
        });
      });
    });

    return list.slice(0, 4);
  }, [rival, userPicksIds, marketPool]);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕵️‍♂️</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Spy Sabotage: Rival Move Predictor
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AI anticipation of {rival.managerName}&apos;s next transfers based on £{rival.bank.toFixed(1)}m bank, form slumps, and fixture swings.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="text-slate-400">Rival Bank:</span>
          <span className="font-mono font-bold text-emerald-400">£{rival.bank.toFixed(1)}m</span>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-500">
            Rival squad has solid form stability or insufficient market data to model transfer leaks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map((p) => {
            const likelihoodBadge =
              p.likelihood === 'VERY HIGH'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : p.likelihood === 'HIGH'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${likelihoodBadge}`}
                  >
                    {p.likelihood} PROBABILITY
                  </span>

                  {p.tacticalImpact === 'BLOCK_TARGET' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      🛡️ You already own {p.playerIn.webName}
                    </span>
                  )}
                  {p.tacticalImpact === 'DANGER_FOR_YOU' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      ⚡ Threat if rival buys
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold text-sm">OUT</span>
                    <div>
                      <div className="font-bold text-white text-xs">{p.playerOut.webName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.playerOut.teamShort}
                      </div>
                    </div>
                  </div>

                  <span className="text-slate-600 font-bold text-sm">➔</span>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="font-bold text-emerald-400 text-xs">{p.playerIn.webName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        £{p.playerIn.cost.toFixed(1)}m • Form {p.playerIn.form}
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm">IN</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="text-slate-400 truncate max-w-[280px]">
                    💡 {p.reason}
                  </span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {p.costDiff > 0 ? `+£${p.costDiff.toFixed(1)}m` : `£${p.costDiff.toFixed(1)}m`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
