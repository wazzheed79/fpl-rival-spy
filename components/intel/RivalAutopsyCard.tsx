import React, { useState } from "react";
import { DuelResponse } from "@/types/fpl";

interface RivalAutopsyCardProps {
  data?: DuelResponse;
}

export const RivalAutopsyCard: React.FC<RivalAutopsyCardProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  if (!data || !data.rival) {
    return null;
  }

  const { rival, gameweek, metrics } = data;

  // Calculate wasted points on bench
  const benchedPlayers = rival.picks?.filter((p) => !p.isStarter) || [];
  const pointsOnBench = benchedPlayers.reduce(
    (acc, p) => acc + (p.effectivePoints ?? p.rawLivePoints ?? 0),
    0
  );
  const topBenched = benchedPlayers.sort(
    (a, b) => (b.effectivePoints ?? 0) - (a.effectivePoints ?? 0)
  )[0];

  const transferHitsTax = rival.eventTransfersCost || 0;

  const generateBanterText = () => {
    return `🚨 FPL RIVAL AUTOPSY: GW${gameweek} 🚨
Manager: ${rival.managerName} (${rival.teamName})
🪑 Points Benched: ${pointsOnBench} pts ${topBenched ? `(left ${topBenched.webName} on the bench!)` : ""}
💸 Hit Regret: -${transferHitsTax} pts in transfer deductions
⚔️ Threat Breakdown: Facing ${metrics?.userWeaponsCount ?? 0} weapon differentials
Conclusion: Tactical catastrophe in progress. 💀`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateBanterText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#0b0e14] border border-rose-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Post-Deadline Autopsy
          </span>
          <h3 className="text-base font-bold text-white mt-1">
            {rival.managerName} — Tactical Report
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-xl">
          <p className="text-xs text-zinc-400">Bench Points Wasted</p>
          <p className="text-xl font-mono font-bold text-rose-400 mt-1">
            {pointsOnBench} <span className="text-xs text-zinc-500">pts</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {topBenched ? `Highest: ${topBenched.webName} (${topBenched.effectivePoints ?? 0} pts)` : "None"}
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-xl">
          <p className="text-xs text-zinc-400">Transfer Hits Incurred</p>
          <p className="text-xl font-mono font-bold text-amber-400 mt-1">
            -{transferHitsTax} <span className="text-xs text-zinc-500">pts</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Deducted from gameweek score
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-white/[0.06] p-3 rounded-xl">
          <p className="text-xs text-zinc-400">Tactical Weapons Faced</p>
          <p className="text-xl font-mono font-bold text-cyan-400 mt-1">
            {metrics?.userWeaponsCount ?? 0} <span className="text-xs text-zinc-500">differentials</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Players you own that they do not
          </p>
        </div>
      </div>
    </div>
  );
};
