'use client';

import React, { useState, useMemo } from 'react';
import { ManagerSummary, EnrichedPlayer } from '@/types/fpl';
import { CandidatePlayer } from '@/lib/leapfrog';

interface RivalTransferPredictorProps {
  user: ManagerSummary;
  rival: ManagerSummary;
  currentGw: number;
  marketPool?: CandidatePlayer[];
}

export interface PredictedTransfer {
  id: string;
  probabilityPct: number;
  confidence: 'HIGH' | 'MEDIUM' | 'SPECULATIVE';
  threatType: 'BLOCK_THREAT' | 'TEMPLATE_AMBUSH' | 'FIXTURE_PIVOT' | 'INJURY_REPLACEMENT';
  sellPlayer: {
    id: number;
    name: string;
    team: string;
    cost: number;
    form: number;
    fdrNext3Avg: number;
    issueReason: string;
  };
  buyPlayer: {
    id: number;
    name: string;
    team: string;
    cost: number;
    form: number;
    fdrNext3Avg: number;
    isUserWeapon: boolean;
  };
  financialDelta: number;
  remainingBankAfter: number;
  tacticalVerdict: string;
  counterStrategy: string;
}

const THREAT_BADGES: Record<
  PredictedTransfer['threatType'],
  { label: string; style: string; icon: string }
> = {
  BLOCK_THREAT: {
    label: 'BLOCK THREAT',
    style: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    icon: '🛡️',
  },
  TEMPLATE_AMBUSH: {
    label: 'TEMPLATE AMBUSH',
    style: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    icon: '⚡',
  },
  FIXTURE_PIVOT: {
    label: 'FIXTURE PIVOT',
    style: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    icon: '📈',
  },
  INJURY_REPLACEMENT: {
    label: 'INJURY REPLACEMENT',
    style: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    icon: '🚑',
  },
};

const POSITION_MAP: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const RivalTransferPredictor: React.FC<RivalTransferPredictorProps> = ({
  user,
  rival,
  currentGw,
  marketPool = [],
}) => {
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'GKP' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [minConfidence, setMinConfidence] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [budgetOffset, setBudgetOffset] = useState<number>(0); // Allows simulating rival taking hits or extra funds

  // List of user's weapon player IDs (players user owns that rival does not)
  const userWeaponIds = useMemo(() => {
    const rivalPickIds = new Set(rival.picks.map((p) => p.id));
    return new Set(user.picks.filter((p) => !rivalPickIds.has(p.id)).map((p) => p.id));
  }, [user.picks, rival.picks]);

  // Model and predict rival transfers
  const predictions: PredictedTransfer[] = useMemo(() => {
    const list: PredictedTransfer[] = [];
    const effectiveBank = Math.max(0, Number((rival.bank + budgetOffset).toFixed(1)));

    // 1. Identify Rival's Vulnerable Players (Sell Candidates)
    const sellCandidates: Array<{
      player: EnrichedPlayer;
      estimatedCost: number;
      form: number;
      fdr: number;
      reason: string;
      vulnerabilityScore: number;
    }> = [];

    for (const p of rival.picks) {
      // Heuristic form & FDR based on player data
      const estForm = p.effectivePoints > 0 ? Number((p.effectivePoints * 0.85).toFixed(1)) : 2.0;
      const isCold = estForm < 3.2;
      const hasZeroMins = p.hasFinishedMatch && p.stats.minutes === 0;
      const isCarded = p.stats.minutes > 0 && p.effectivePoints <= 1;
      const estCost = p.elementType === 4 ? 6.5 : p.elementType === 3 ? 6.5 : p.elementType === 2 ? 5.0 : 4.5;
      const estFdr = p.category === 'WEAPON' ? 2.5 : 3.8;

      let reason = '';
      let score = 0;

      if (hasZeroMins) {
        reason = 'Doubtful/Injured (0 mins played)';
        score += 50;
      } else if (isCarded) {
        reason = 'Disciplinary risk / blanked match';
        score += 30;
      } else if (isCold && estFdr >= 3.5) {
        reason = `Cold form (${estForm}) + tough fixture run (FDR ${estFdr})`;
        score += 40;
      } else if (isCold) {
        reason = `Form slump (${estForm} avg)`;
        score += 25;
      } else if (estFdr >= 4.0) {
        reason = `Fixtures turn red (FDR ${estFdr})`;
        score += 20;
      }

      if (score > 0 || !p.isStarter) {
        sellCandidates.push({
          player: p,
          estimatedCost: estCost,
          form: estForm,
          fdr: estFdr,
          reason: reason || 'Squad restructuring candidate',
          vulnerabilityScore: score + (!p.isStarter ? 10 : 0),
        });
      }
    }

    // Sort sells by urgency
    const sortedSells = sellCandidates.sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);

    // 2. Identify Buy Candidates from marketPool and trending targets
    const rivalOwnedIds = new Set(rival.picks.map((p) => p.id));
    const potentialBuys = marketPool.filter((c) => !rivalOwnedIds.has(c.id));

    // Fallback candidates if market pool is minimal
    const fallbackBuys: CandidatePlayer[] = [
      { id: 911, webName: 'Saka', teamShort: 'ARS', elementType: 3, cost: 10.1, form: 7.2, xgi: 0.82, fdrNext3Avg: 2.3, localOwnershipPct: 15, chanceOfPlaying: 100 },
      { id: 912, webName: 'Palmer', teamShort: 'CHE', elementType: 3, cost: 10.8, form: 7.8, xgi: 0.88, fdrNext3Avg: 2.6, localOwnershipPct: 15, chanceOfPlaying: 100 },
      { id: 913, webName: 'Wood', teamShort: 'NFO', elementType: 4, cost: 6.4, form: 6.2, xgi: 0.72, fdrNext3Avg: 2.0, localOwnershipPct: 0, chanceOfPlaying: 100 },
      { id: 914, webName: 'Semenyo', teamShort: 'BOU', elementType: 3, cost: 5.7, form: 5.8, xgi: 0.68, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100 },
      { id: 915, webName: 'Delap', teamShort: 'IPS', elementType: 4, cost: 5.6, form: 4.8, xgi: 0.49, fdrNext3Avg: 2.6, localOwnershipPct: 0, chanceOfPlaying: 100 },
      { id: 916, webName: 'Aït-Nouri', teamShort: 'WOL', elementType: 2, cost: 4.7, form: 4.5, xgi: 0.38, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100 },
      { id: 917, webName: 'Lewis', teamShort: 'MCI', elementType: 2, cost: 4.8, form: 4.2, xgi: 0.31, fdrNext3Avg: 2.6, localOwnershipPct: 0, chanceOfPlaying: 100 },
    ];

    const allCandidateBuys = potentialBuys.length > 0 ? potentialBuys : fallbackBuys;

    // 3. Match Sells and Buys to generate predicted moves
    for (const sell of sortedSells) {
      const maxBudget = Number((sell.estimatedCost + effectiveBank).toFixed(1));

      // Same position targets
      const matchingBuys = allCandidateBuys.filter(
        (b) => b.elementType === sell.player.elementType && b.cost <= maxBudget + 0.3
      );

      for (const buy of matchingBuys) {
        const costDiff = Number((buy.cost - sell.estimatedCost).toFixed(1));
        const remaining = Number((effectiveBank - costDiff).toFixed(1));
        const formGain = Number((buy.form - sell.form).toFixed(1));
        const fdrImprovement = Number((sell.fdr - buy.fdrNext3Avg).toFixed(1));
        const isUserWeapon = userWeaponIds.has(buy.id);

        if (formGain < 0.5 && fdrImprovement < 0.5 && !isUserWeapon) {
          continue; // Unlikely sideways move
        }

        // Calculate probability & threat category
        let baseProb = 40;
        let threatType: PredictedTransfer['threatType'] = 'FIXTURE_PIVOT';

        if (sell.vulnerabilityScore >= 50) {
          baseProb += 30;
          threatType = 'INJURY_REPLACEMENT';
        } else if (isUserWeapon) {
          baseProb += 25;
          threatType = 'BLOCK_THREAT';
        } else if (buy.form >= 6.0) {
          baseProb += 20;
          threatType = 'TEMPLATE_AMBUSH';
        } else if (fdrImprovement >= 1.2) {
          baseProb += 15;
          threatType = 'FIXTURE_PIVOT';
        }

        if (remaining >= 0) {
          baseProb += 10; // Fits smoothly within bank
        } else {
          baseProb -= 15; // Requires an extra transfer hit
        }

        const probabilityPct = Math.min(94, Math.max(25, baseProb));
        const confidence: PredictedTransfer['confidence'] =
          probabilityPct >= 75 ? 'HIGH' : probabilityPct >= 50 ? 'MEDIUM' : 'SPECULATIVE';

        // Strategic explanation & counter-measure
        let verdict = '';
        let counter = '';

        if (threatType === 'BLOCK_THREAT') {
          verdict = `🚨 HIGH DANGER: Rival is looking to copy your differential weapon ${buy.webName}. If they buy him, your exclusive points upside is eliminated!`;
          counter = `Maintain differential leverage by banking your FT or rotating to an alternate differential in midfield/attack.`;
        } else if (threatType === 'INJURY_REPLACEMENT') {
          verdict = `Rival has urgent squad issues with ${sell.player.webName}. Buying ${buy.webName} provides an immediate high-form starter within their £${maxBudget.toFixed(1)}m budget.`;
          counter = `Capitalize on their defensive instability while they use transfers on forced repairs.`;
        } else if (threatType === 'TEMPLATE_AMBUSH') {
          verdict = `${buy.webName} is on blistering form (${buy.form} avg). Rival likely targeting this bandwagon to protect their rank.`;
          counter = `Check if you can afford ${buy.webName} first via the Leapfrog Engine to neutralize their play.`;
        } else {
          verdict = `${buy.webName}'s fixtures swing favourably (FDR ${buy.fdrNext3Avg}). Rival is poised to jump ahead of the fixture curve.`;
          counter = `Monitor price changes on ${buy.webName} tonight before rival locks in the price rise.`;
        }

        list.push({
          id: `${sell.player.id}->${buy.id}`,
          probabilityPct,
          confidence,
          threatType,
          sellPlayer: {
            id: sell.player.id,
            name: sell.player.webName,
            team: sell.player.teamShort,
            cost: sell.estimatedCost,
            form: sell.form,
            fdrNext3Avg: sell.fdr,
            issueReason: sell.reason,
          },
          buyPlayer: {
            id: buy.id,
            name: buy.webName,
            team: buy.teamShort,
            cost: buy.cost,
            form: buy.form,
            fdrNext3Avg: buy.fdrNext3Avg,
            isUserWeapon,
          },
          financialDelta: costDiff,
          remainingBankAfter: remaining,
          tacticalVerdict: verdict,
          counterStrategy: counter,
        });
      }
    }

    // Sort by probability descending
    return list.sort((a, b) => b.probabilityPct - a.probabilityPct);
  }, [rival, user, userWeaponIds, marketPool, budgetOffset]);

  // Filtered predictions
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      if (minConfidence === 'HIGH' && p.confidence !== 'HIGH') return false;
      if (minConfidence === 'MEDIUM' && p.confidence === 'SPECULATIVE') return false;
      if (positionFilter !== 'ALL') {
        const rivalPick = rival.picks.find((pick) => pick.id === p.sellPlayer.id);
        if (rivalPick && POSITION_MAP[rivalPick.elementType] !== positionFilter) {
          return false;
        }
      }
      return true;
    });
  }, [predictions, minConfidence, positionFilter, rival.picks]);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Title & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕵️‍♂️</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Predictive Transfer Espionage
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Model anticipated rival moves using remaining bank, flagged assets, fixture swings, and market bandwagons.
          </p>
        </div>

        {/* Rival Bank & Liquidity Pill */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Rival Bank</span>
            <span className="font-mono font-bold text-emerald-400">
              £{rival.bank.toFixed(1)}m {budgetOffset !== 0 ? `(${budgetOffset > 0 ? '+' : ''}${budgetOffset.toFixed(1)}m)` : ''}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Free Transfers</span>
            <span className="font-bold text-white">1 FT</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Budget Simulation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Position:
          </span>
          {(['ALL', 'FWD', 'MID', 'DEF', 'GKP'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                positionFilter === pos
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Likelihood:
          </span>
          {(['ALL', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setMinConfidence(lvl)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                minConfidence === lvl
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lvl === 'ALL' ? 'All Odds' : lvl === 'MEDIUM' ? '≥50% Odds' : '≥75% High Odds'}
            </button>
          ))}
        </div>

        {/* Rival Bank Simulation Slider */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Simulate Bank Swing:
          </span>
          <select
            value={budgetOffset}
            onChange={(e) => setBudgetOffset(parseFloat(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-cyan-400 font-bold outline-none"
          >
            <option value="0">Exact (£{rival.bank.toFixed(1)}m)</option>
            <option value="0.5">+£0.5m extra</option>
            <option value="1.0">+£1.0m extra</option>
            <option value="1.5">+£1.5m extra</option>
            <option value="-0.5">-£0.5m less</option>
          </select>
        </div>
      </div>

      {/* Predictions Feed */}
      {filteredPredictions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-400">
            No transfers meet the current filter criteria.
          </p>
          <p className="text-xs text-slate-500">
            Try switching to 'All Positions' or broadening likelihood thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPredictions.slice(0, 6).map((item) => {
            const badge = THREAT_BADGES[item.threatType];

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 p-4 transition-all shadow-md space-y-3"
              >
                {/* Prediction Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.style}`}>
                      <span>{badge.icon}</span> {badge.label}
                    </span>
                    {item.buyPlayer.isUserWeapon && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 rounded px-2 py-0.5">
                        Your Weapon Differential!
                      </span>
                    )}
                  </div>

                  {/* Probability Gauge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold">Predicted Probability:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.probabilityPct >= 75
                              ? 'bg-rose-500'
                              : item.probabilityPct >= 50
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${item.probabilityPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-black text-white">
                        {item.probabilityPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transfer Out -> Transfer In Visual Pair */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* SELL SIDE */}
                  <div className="rounded-lg border border-rose-950/60 bg-rose-950/20 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 block">
                        Likely Transfer Out
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-sm font-bold text-white">{item.sellPlayer.name}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">({item.sellPlayer.team})</span>
                        <span className="text-xs font-mono font-bold text-slate-300 ml-1">
                          £{item.sellPlayer.cost.toFixed(1)}m
                        </span>
                      </div>
                      <p className="text-[10px] text-rose-300/80 mt-1 font-medium">
                        ⚠️ {item.sellPlayer.issueReason}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Recent Form</span>
                      <span className="font-mono text-xs font-bold text-rose-400">
                        {item.sellPlayer.form.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* BUY SIDE */}
                  <div className="rounded-lg border border-emerald-950/60 bg-emerald-950/20 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">
                        Likely Transfer In
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-sm font-bold text-white">{item.buyPlayer.name}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">({item.buyPlayer.team})</span>
                        <span className="text-xs font-mono font-bold text-emerald-300 ml-1">
                          £{item.buyPlayer.cost.toFixed(1)}m
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-300/80 mt-1 font-medium">
                        ✨ Next 3 FDR: {item.buyPlayer.fdrNext3Avg.toFixed(1)} • {item.remainingBankAfter >= 0 ? `£${item.remainingBankAfter.toFixed(1)}m left in bank` : `Requires £${Math.abs(item.remainingBankAfter).toFixed(1)}m extra`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Target Form</span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {item.buyPlayer.form.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactical Espionage Analysis & Counter-Measure */}
                <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-3 text-xs space-y-1.5">
                  <div className="text-slate-300">
                    <b className="text-rose-400">Espionage Brief:</b> {item.tacticalVerdict}
                  </div>
                  <div className="text-slate-300 border-t border-slate-800/60 pt-1.5">
                    <b className="text-cyan-400">Counter-Measure:</b> {item.counterStrategy}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
