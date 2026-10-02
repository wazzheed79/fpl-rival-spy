import React, { useState } from "react";

export interface AutopsyMetrics {
  rivalName: string;
  gameweek: number;
  pointsOnBench: number;
  benchedTopScorer: string;
  captainPointsLost: number;
  transferCostTax: number;
  transferredOutScored: number;
  transferredInScored: number;
}

interface RivalAutopsyCardProps {
  metrics: AutopsyMetrics;
}

export const RivalAutopsyCard: React.FC<RivalAutopsyCardProps> = ({ metrics }) => {
  const [copied, setCopied] = useState(false);

  const transferNetLoss =
    metrics.transferredOutScored - metrics.transferredInScored + metrics.transferCostTax;

  const generateBanterText = () => {
    return `🚨 FPL RIVAL AUTOPSY: GW${metrics.gameweek} 🚨
Manager: ${metrics.rivalName}
🪑 Points Benched: ${metrics.pointsOnBench} pts (left ${metrics.benchedTopScorer} cold!)
👑 Captain Blunder: -${metrics.captainPointsLost} pts lost vs optimum pick
💸 Hit Regret: -${metrics.transferCostTax} pts paid for transfers
📉 Net Transfer Swing: ${transferNetLoss > 0 ? `-${transferNetLoss} pts lost` : "None"}
Conclusion: Down astronomically this gameweek. 💀`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateBanterText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#0b0e14] border border-rose-500/20 rounded-xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Post-Matchday Autopsy
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            {metrics.rivalName} — Tactical Breakdown
          </h3>
        </div>

        <button
          onClick={copyToClipboard}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <span className="text-emerald-400">Copied for WhatsApp!</span>
          ) : (
            <span>Copy Banter Summary</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Bench Points Wasted</p>
          <p className="text-xl font-mono font-bold text-rose-400 mt-1">
            {metrics.pointsOnBench} <span className="text-xs text-zinc-500">pts</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            Top benched: {metrics.benchedTopScorer}
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Transfer Hits Incurred</p>
          <p className="text-xl font-mono font-bold text-amber-400 mt-1">
            -{metrics.transferCostTax} <span className="text-xs text-zinc-500">pts</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Immediate deadline deduction
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-lg">
          <p className="text-xs text-zinc-400">Armband Deficit</p>
          <p className="text-xl font-mono font-bold text-zinc-200 mt-1">
            -{metrics.captainPointsLost} <span className="text-xs text-zinc-500">pts</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Lost vs best possible starter
          </p>
        </div>
      </div>
    </div>
  );
};
